import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { WCProduct } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supabaseUrl,
      supabaseServiceRoleKey,
      wordpressUrl,
      wcConsumerKey,
      wcConsumerSecret,
    } = body;

    if (!supabaseUrl || !supabaseServiceRoleKey || !wordpressUrl || !wcConsumerKey || !wcConsumerSecret) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create temporary clients
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Mark sync as started
    await supabase
      .from("sync_state")
      .update({
        status: "syncing",
        started_at: new Date().toISOString(),
        errors: null,
      })
      .eq("id", 1);

    let totalSynced = 0;
    let syncError: string | null = null;

    try {
      let page = 1;
      while (true) {
        const url = new URL("/wp-json/wc/v3/products", wordpressUrl);
        url.searchParams.set("consumer_key", wcConsumerKey);
        url.searchParams.set("consumer_secret", wcConsumerSecret);
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(`WooCommerce API error: ${res.status}`);
        }

        const products: WCProduct[] = await res.json();
        if (!products.length) break;

        // Upsert products
        const rows = products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: p.type || "simple",
          description: p.description,
          short_description: p.short_description,
          price: parseFloat(p.price) || 0,
          regular_price: p.regular_price ? parseFloat(p.regular_price) : null,
          sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
          on_sale: p.on_sale,
          stock_status: p.stock_status,
          images: p.images,
          categories: p.categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          })),
          wc_updated_at: p.date_modified,
          synced_at: new Date().toISOString(),
        }));

        await supabase.from("products").upsert(rows, { onConflict: "id" });

        // Rebuild attributes and categories
        const productIds = products.map((p) => p.id);
        await supabase.from("product_attributes").delete().in("product_id", productIds);
        await supabase.from("product_categories").delete().in("product_id", productIds);

        const attrRows = products.flatMap((p) =>
          p.attributes.flatMap((attr) =>
            attr.options.map((value) => ({
              product_id: p.id,
              attribute_name: attr.name,
              attribute_value: value,
            }))
          )
        );
        if (attrRows.length) {
          await supabase.from("product_attributes").insert(attrRows);
        }

        const catRows = products.flatMap((p) =>
          p.categories.map((cat) => ({
            product_id: p.id,
            category_id: cat.id,
            category_name: cat.name,
            category_slug: cat.slug,
          }))
        );
        if (catRows.length) {
          await supabase.from("product_categories").insert(catRows);
        }

        totalSynced += products.length;
        page++;
      }
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Unknown sync error";
    }

    // Update sync state
    await supabase
      .from("sync_state")
      .update({
        status: syncError ? "error" : "idle",
        last_synced_at: new Date().toISOString(),
        products_synced: totalSynced,
        errors: syncError,
        completed_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (syncError) {
      return NextResponse.json({ ok: false, error: syncError, synced: totalSynced });
    }

    return NextResponse.json({ ok: true, synced: totalSynced });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
