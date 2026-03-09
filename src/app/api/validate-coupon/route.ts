import { NextRequest, NextResponse } from "next/server";
import { wcFetch } from "@/lib/woocommerce";

interface WCCoupon {
  id: number;
  code: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product";
  amount: string;
  minimum_amount: string;
  maximum_amount: string;
  usage_limit: number | null;
  usage_count: number;
}

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  try {
    const coupons = await wcFetch<WCCoupon[]>(`/coupons?code=${encodeURIComponent(code)}`);
    if (!coupons.length) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
    }

    const coupon = coupons[0];

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }

    return NextResponse.json({
      code: coupon.code,
      discount_type: coupon.discount_type,
      amount: parseFloat(coupon.amount),
      minimum_amount: parseFloat(coupon.minimum_amount) || 0,
    });
  } catch {
    return NextResponse.json({ error: "Could not validate coupon" }, { status: 500 });
  }
}
