import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  try {
    // Check if .env.local already exists - if so, require admin auth
    const { existsSync } = await import("fs");
    const envPath = join(process.cwd(), ".env.local");
    if (existsSync(envPath)) {
      const { cookies } = await import("next/headers");
      const { createHmac } = await import("crypto");
      const cookieStore = await cookies();
      const token = cookieStore.get("admin_session")?.value;
      if (!token) {
        return NextResponse.json({ ok: false, error: "Unauthorized - admin authentication required" }, { status: 401 });
      }
      const [nonce, sig] = token.split(".");
      const secret = process.env.ADMIN_PASSWORD || "";
      const expected = createHmac("sha256", secret).update(nonce).digest("hex");
      if (sig !== expected) {
        return NextResponse.json({ ok: false, error: "Unauthorized - invalid session" }, { status: 401 });
      }
    }
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "storeName", "wordpressUrl", "wcConsumerKey", "wcConsumerSecret",
      "supabaseUrl", "supabaseAnonKey", "supabaseServiceRoleKey",
      "stripePublishableKey", "stripeSecretKey", "adminPassword", "cronSecret"
    ];
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== "string") {
        return NextResponse.json({ ok: false, error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const {
      storeName,
      storeDescription,
      currency,
      currencySymbol,
      locale,
      wordpressUrl,
      wcConsumerKey,
      wcConsumerSecret,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
      stripePublishableKey,
      stripeSecretKey,
      stripeWebhookSecret,
      adminPassword,
      cronSecret,
      hideOutOfStock,
    } = body;

    const envContent = `# Store
NEXT_PUBLIC_STORE_NAME=${storeName}
NEXT_PUBLIC_STORE_DESCRIPTION=${storeDescription}
NEXT_PUBLIC_CURRENCY=${currency}
NEXT_PUBLIC_CURRENCY_SYMBOL=${currencySymbol}
NEXT_PUBLIC_LOCALE=${locale}
NEXT_PUBLIC_HIDE_OUT_OF_STOCK=${hideOutOfStock === "true" ? "true" : "false"}

# WooCommerce
NEXT_PUBLIC_WORDPRESS_URL=${wordpressUrl}
WC_CONSUMER_KEY=${wcConsumerKey}
WC_CONSUMER_SECRET=${wcConsumerSecret}

# Supabase
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceRoleKey}

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey}
STRIPE_SECRET_KEY=${stripeSecretKey}
STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret}

# Admin
ADMIN_PASSWORD=${adminPassword}

# Cron
CRON_SECRET=${cronSecret}
`;

    await writeFile(join(process.cwd(), ".env.local"), envContent, "utf-8");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
