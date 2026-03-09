import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createOrder } from "@/lib/woocommerce";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      // Parse cart items from metadata
      const cartItems: { pid: number; qty: number; vid?: number }[] = JSON.parse(
        session.metadata?.cart_items || "[]"
      );
      const wcCouponCode = session.metadata?.wc_coupon_code;

      if (!cartItems.length) {
        console.error("No cart items in session metadata:", session.id);
        return NextResponse.json({ received: true });
      }

      // Extract customer details from Stripe session
      const customer = session.customer_details;
      const shipping = (session as any).shipping_details;
      const shippingCost = (session as any).shipping_cost;

      // Parse name into first/last
      const billingName = customer?.name?.split(" ") || [""];
      const shippingName = shipping?.name?.split(" ") || billingName;

      const billingAddress = {
        first_name: billingName[0] || "",
        last_name: billingName.slice(1).join(" ") || "",
        address_1: customer?.address?.line1 || "",
        address_2: customer?.address?.line2 || "",
        city: customer?.address?.city || "",
        state: customer?.address?.state || "",
        postcode: customer?.address?.postal_code || "",
        country: customer?.address?.country || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
      };

      const shippingAddress = {
        first_name: shippingName[0] || "",
        last_name: shippingName.slice(1).join(" ") || "",
        address_1: shipping?.address?.line1 || customer?.address?.line1 || "",
        address_2: shipping?.address?.line2 || customer?.address?.line2 || "",
        city: shipping?.address?.city || customer?.address?.city || "",
        state: shipping?.address?.state || customer?.address?.state || "",
        postcode: shipping?.address?.postal_code || customer?.address?.postal_code || "",
        country: shipping?.address?.country || customer?.address?.country || "",
      };

      // Build shipping lines
      const shipping_lines: { method_id: string; method_title: string; total: string }[] = [];
      if (shippingCost && shippingCost.amount_total > 0) {
        // Try to get WC method info from the shipping rate metadata
        let methodId = "flat_rate";
        let methodTitle = "Shipping";

        if (shippingCost.shipping_rate) {
          try {
            const rate = await stripe.shippingRates.retrieve(shippingCost.shipping_rate as string);
            methodId = rate.metadata?.wc_method_id || "flat_rate";
            methodTitle = rate.metadata?.wc_method_title || rate.display_name || "Shipping";
          } catch {
            // Use defaults
          }
        }

        shipping_lines.push({
          method_id: methodId,
          method_title: methodTitle,
          total: (shippingCost.amount_total / 100).toFixed(2),
        });
      }

      // Create WooCommerce order
      await createOrder({
        payment_method: "stripe",
        payment_method_title: "Stripe Checkout",
        set_paid: true,
        billing: billingAddress,
        shipping: shippingAddress,
        line_items: cartItems.map((item) => ({
          product_id: item.pid,
          quantity: item.qty,
          ...(item.vid && { variation_id: item.vid }),
        })),
        shipping_lines,
        coupon_lines: wcCouponCode ? [{ code: wcCouponCode }] : [],
      });
    } catch (err) {
      console.error("Failed to create WC order from webhook:", err);
      // Return 200 so Stripe doesn't retry — log the error for investigation
      return NextResponse.json({ received: true, error: "Order creation failed" });
    }
  }

  return NextResponse.json({ received: true });
}
