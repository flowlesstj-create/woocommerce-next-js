import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { storeConfig } from "../../../../store.config";

export async function POST(req: NextRequest) {
  const { amount } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: storeConfig.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
