"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/cart-store";
import { ShippingSelector } from "./shipping-selector";
import { formatPrice } from "@/lib/format";
import type { WCAddress } from "@/lib/types";
import type { ShippingOption } from "@/lib/shipping";

interface Props {
  shippingOptions: ShippingOption[];
}

export function CheckoutForm({ shippingOptions }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] =
    useState<ShippingOption | null>(shippingOptions[0] || null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_type: "percent" | "fixed_cart" | "fixed_product";
    amount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [billing, setBilling] = useState<WCAddress>({
    first_name: "",
    last_name: "",
    address_1: "",
    city: "",
    state: "",
    postcode: "",
    country: "GB",
    email: "",
    phone: "",
  });

  const updateField = (field: keyof WCAddress, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  const shippingCost = selectedShipping?.cost || 0;
  const discount = appliedCoupon
    ? appliedCoupon.discount_type === "percent"
      ? total() * (appliedCoupon.amount / 100)
      : appliedCoupon.amount
    : 0;
  const grandTotal = total() + shippingCost - discount;

  const handleApplyCoupon = async () => {
    setCouponLoading(true);
    setCouponError(null);
    const res = await fetch("/api/validate-coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode }),
    });
    const data = await res.json();
    setCouponLoading(false);

    if (!res.ok) {
      setCouponError(data.error);
      return;
    }
    setAppliedCoupon(data);
    setCouponCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !selectedShipping) return;

    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billing,
          shipping: billing,
          line_items: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            ...(item.variationId && { variation_id: item.variationId }),
          })),
          shipping_lines: [
            {
              method_id: selectedShipping.id,
              method_title: selectedShipping.title,
              total: selectedShipping.cost.toFixed(2),
            },
          ],
          coupon_lines: appliedCoupon ? [{ code: appliedCoupon.code }] : [],
        }),
      });

      const order = await res.json();
      if (!res.ok) throw new Error(order.error || "Order creation failed");

      clearCart();
      router.push(`/order-confirmation/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order creation failed");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            required
            value={billing.first_name}
            onChange={(e) => updateField("first_name", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            required
            value={billing.last_name}
            onChange={(e) => updateField("last_name", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={billing.email}
          onChange={(e) => updateField("email", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="address_1">Address</Label>
        <Input
          id="address_1"
          required
          value={billing.address_1}
          onChange={(e) => updateField("address_1", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            required
            value={billing.city}
            onChange={(e) => updateField("city", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="state">State / County</Label>
          <Input
            id="state"
            required
            value={billing.state}
            onChange={(e) => updateField("state", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            required
            value={billing.postcode}
            onChange={(e) => updateField("postcode", e.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div>
        <Label htmlFor="coupon">Coupon Code</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="coupon"
            placeholder="Enter code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode}>
            {couponLoading ? "Checking..." : "Apply"}
          </Button>
        </div>
        {couponError && <p className="text-sm text-destructive mt-1">{couponError}</p>}
        {appliedCoupon && (
          <div className="flex items-center justify-between text-sm text-green-600 mt-1">
            <span>&quot;{appliedCoupon.code}&quot; applied — {appliedCoupon.discount_type === "percent" ? `${appliedCoupon.amount}% off` : `${formatPrice(appliedCoupon.amount)} off`}</span>
            <button type="button" className="underline" onClick={() => setAppliedCoupon(null)}>Remove</button>
          </div>
        )}
      </div>

      <ShippingSelector
        options={shippingOptions}
        selected={selectedShipping?.id || null}
        onSelect={setSelectedShipping}
      />

      <Separator />

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(total())}</span>
        </div>
        {appliedCoupon && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Shipping ({selectedShipping?.title})</span>
          <span>
            {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatPrice(grandTotal)}</span>
        </div>
      </div>

      <div>
        <Label>Payment</Label>
        <div className="mt-2 p-4 border rounded-lg">
          <PaymentElement />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || loading}
      >
        {loading ? "Processing..." : `Pay ${formatPrice(grandTotal)}`}
      </Button>
    </form>
  );
}
