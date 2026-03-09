"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { Loader2, ShoppingBag, ArrowLeft, Tag, X, Truck, Check } from "lucide-react";
import type { ShippingOption } from "@/lib/shipping";

export default function CheckoutPage() {
  const { items, total } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_type: "percent" | "fixed_cart" | "fixed_product";
    amount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    fetch("/api/shipping")
      .then((res) => res.json())
      .then((data: ShippingOption[]) => {
        const sorted = [...data].sort((a, b) => a.cost - b.cost);
        setShippingOptions(sorted);
        if (sorted.length) setSelectedShipping(sorted[0]);
      })
      .catch(() => {});
  }, []);

  const shippingCost = selectedShipping?.cost || 0;
  const discount = appliedCoupon
    ? appliedCoupon.discount_type === "percent"
      ? total() * (appliedCoupon.amount / 100)
      : appliedCoupon.amount
    : 0;

  const handleApplyCoupon = async () => {
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error);
      } else {
        setAppliedCoupon(data);
        setCouponCode("");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            image: item.product.images[0]?.src,
            variationId: item.variationId,
          })),
          couponCode: appliedCoupon?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout session");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ShoppingBag className="size-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Your cart is empty</p>
        <Link href="/product">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/product"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Continue shopping
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-8">Checkout</h1>

      {/* Cart Items */}
      <div className="divide-y rounded-xl border">
        {items.map((item) => (
          <div key={`${item.product.id}-${item.variationId}`} className="flex gap-4 p-4">
            {item.product.images[0] && (
              <Image
                src={item.product.images[0].src}
                alt={item.product.images[0].alt || item.product.name}
                width={80}
                height={80}
                sizes="80px"
                className="rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.product.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Qty: {item.quantity}
              </p>
            </div>
            <p className="text-sm font-medium">
              {formatPrice(item.product.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      {/* Coupon */}
      <div className="mt-6 space-y-2">
        {appliedCoupon ? (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            <span className="flex items-center gap-2">
              <Tag className="size-4" />
              &ldquo;{appliedCoupon.code}&rdquo; &mdash;{" "}
              {appliedCoupon.discount_type === "percent"
                ? `${appliedCoupon.amount}% off`
                : `${formatPrice(appliedCoupon.amount)} off`}
            </span>
            <button
              type="button"
              onClick={() => setAppliedCoupon(null)}
              className="text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && couponCode && handleApplyCoupon()}
            />
            <Button
              variant="outline"
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponCode}
            >
              {couponLoading ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        )}
        {couponError && <p className="text-sm text-rose-500">{couponError}</p>}
      </div>

      {/* Shipping */}
      {shippingOptions.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Truck className="size-4 text-muted-foreground" />
            Shipping
          </div>
          <div className="space-y-1.5">
            {shippingOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedShipping(opt)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                  selectedShipping?.id === opt.id
                    ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  {selectedShipping?.id === opt.id && (
                    <Check className="size-3.5 text-sky-600" />
                  )}
                  {opt.title}
                </span>
                <span className="font-medium">
                  {opt.cost === 0 ? "Free" : formatPrice(opt.cost)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(total())}</span>
        </div>
        {appliedCoupon && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-medium">
            {selectedShipping
              ? selectedShipping.cost === 0
                ? "Free"
                : formatPrice(selectedShipping.cost)
              : "—"}
          </span>
        </div>
        <div className="border-t pt-2 flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatPrice(total() - discount + shippingCost)}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
          {error}
        </div>
      )}

      <Button
        onClick={handleCheckout}
        disabled={loading}
        className="mt-6 w-full bg-sky-500 text-white hover:bg-sky-600"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Redirecting to payment...
          </>
        ) : (
          `Proceed to Payment — ${formatPrice(total() - discount + shippingCost)}`
        )}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        You&apos;ll be redirected to Stripe&apos;s secure checkout to complete your payment.
      </p>
    </div>
  );
}
