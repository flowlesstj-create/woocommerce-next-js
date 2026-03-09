"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutForm } from "@/components/checkout-form";
import { useCartStore } from "@/lib/cart-store";
import type { ShippingOption } from "@/lib/shipping";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function CheckoutPage() {
  const { items, total } = useCartStore();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);

  useEffect(() => {
    // Fetch shipping options
    fetch("/api/shipping")
      .then((res) => res.json())
      .then((data) => setShippingOptions(data));
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    // Create payment intent with estimated total (shipping added later)
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: total() + (shippingOptions[0]?.cost || 0),
      }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [items, total, shippingOptions]);

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Your cart is empty.
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm shippingOptions={shippingOptions} />
        </Elements>
      ) : (
        <p className="text-center text-muted-foreground">Loading...</p>
      )}
    </div>
  );
}
