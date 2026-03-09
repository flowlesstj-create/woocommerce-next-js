import { NextRequest, NextResponse } from "next/server";
import { syncProducts } from "@/lib/sync";

export async function POST(req: NextRequest) {
  // Verify this is from Vercel Cron or admin
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncProducts();
  return NextResponse.json(result);
}
