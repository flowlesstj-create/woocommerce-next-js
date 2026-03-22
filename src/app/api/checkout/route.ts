import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getShippingOptions } from "@/lib/shipping";
import { wcFetch } from "@/lib/woocommerce";
import { storeConfig } from "../../../../store.config";

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variationId?: number;
}

interface WCCoupon {
  id: number;
  code: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product";
  amount: string;
  usage_limit: number | null;
  usage_count: number;
}

export async function POST(req: NextRequest) {
  try {
    const { items, couponCode } = (await req.json()) as {
      items: CartItem[];
      couponCode?: string;
    };

    if (!items?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const stripe = getStripe();
    const currency = storeConfig.currency.toLowerCase();
    const origin = req.headers.get("origin") || "";

    // Build line items
    const line_items = items.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
          ...(item.image && { images: [item.image] }),
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Fetch and format shipping options (cheapest first so free shipping is the default)
    const wcShipping = await getShippingOptions();
    wcShipping.sort((a, b) => a.cost - b.cost);
    const shipping_options = wcShipping.map((opt) => ({
      shipping_rate_data: {
        display_name: opt.title,
        type: "fixed_amount" as const,
        fixed_amount: {
          amount: Math.round(opt.cost * 100),
          currency,
        },
        metadata: { wc_method_id: opt.id, wc_method_title: opt.title },
      },
    }));

    // Handle WooCommerce coupon
    let discounts: { coupon: string }[] | undefined;
    let wcCouponCode: string | undefined;

    if (couponCode) {
      try {
        const coupons = await wcFetch<WCCoupon[]>(
          `/coupons?code=${encodeURIComponent(couponCode)}`
        );
        if (coupons.length) {
          const wc = coupons[0];
          if (!wc.usage_limit || wc.usage_count < wc.usage_limit) {
            const stripeCoupon = await stripe.coupons.create({
              ...(wc.discount_type === "percent"
                ? { percent_off: parseFloat(wc.amount) }
                : {
                    amount_off: Math.round(parseFloat(wc.amount) * 100),
                    currency,
                  }),
              duration: "once",
              name: `WC: ${wc.code}`,
              max_redemptions: 1,
            });
            discounts = [{ coupon: stripeCoupon.id }];
            wcCouponCode = wc.code;
          }
        }
      } catch {
        // Coupon validation failed — proceed without discount
      }
    }

    // Store cart data in metadata for the webhook
    const cartMeta = JSON.stringify(
      items.map((i) => ({
        pid: i.productId,
        qty: i.quantity,
        ...(i.variationId && { vid: i.variationId }),
      }))
    );

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items,
      success_url: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      shipping_address_collection: {
        allowed_countries: ["GB", "US", "CA", "AU", "NZ", "IE", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "SE", "DK", "NO", "FI", "PT", "PL"],
      },
      billing_address_collection: "required",
      metadata: {
        cart_items: cartMeta,
        ...(wcCouponCode && { wc_coupon_code: wcCouponCode }),
      },
    };

    if (shipping_options.length) {
      sessionParams.shipping_options = shipping_options;
    }
    if (discounts?.length) {
      sessionParams.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
