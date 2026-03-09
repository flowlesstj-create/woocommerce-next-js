import { NextResponse } from "next/server";
import { getShippingOptions } from "@/lib/shipping";

export async function GET() {
  const options = await getShippingOptions();
  return NextResponse.json(options);
}
