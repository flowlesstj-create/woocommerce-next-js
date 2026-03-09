import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { ClearCart } from "@/components/clear-cart";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/");

  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items"],
    });
  } catch {
    redirect("/");
  }

  if (session.payment_status !== "paid") {
    redirect("/checkout");
  }

  const customer = session.customer_details;
  const amountTotal = (session.amount_total || 0) / 100;

  return (
    <div className="mx-auto max-w-lg py-12">
      <ClearCart />

      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="size-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Order Confirmed</h1>
        <p className="mt-2 text-muted-foreground">
          Thanks{customer?.name ? `, ${customer.name.split(" ")[0]}` : ""}! Your payment was successful.
        </p>
      </div>

      {/* Order Details */}
      <div className="rounded-xl border divide-y">
        {session.line_items?.data.map((item) => (
          <div key={item.id} className="flex justify-between px-4 py-3 text-sm">
            <span>
              {item.description}{" "}
              <span className="text-muted-foreground">&times; {item.quantity}</span>
            </span>
            <span className="font-medium">
              {formatPrice((item.amount_total || 0) / 100)}
            </span>
          </div>
        ))}

        {session.total_details?.amount_shipping ? (
          <div className="flex justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">
              {formatPrice(session.total_details.amount_shipping / 100)}
            </span>
          </div>
        ) : null}

        {session.total_details?.amount_discount ? (
          <div className="flex justify-between px-4 py-3 text-sm text-emerald-600">
            <span>Discount</span>
            <span>-{formatPrice(session.total_details.amount_discount / 100)}</span>
          </div>
        ) : null}

        <div className="flex justify-between px-4 py-3 font-semibold">
          <span>Total</span>
          <span>{formatPrice(amountTotal)}</span>
        </div>
      </div>

      {customer?.email && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          A confirmation email will be sent to {customer.email}
        </p>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/product">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
}
