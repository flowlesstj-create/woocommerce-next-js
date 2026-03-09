import { supabaseAdmin } from "./supabase";
import { getProducts } from "./woocommerce";
import type { WCProduct } from "./types";

export async function syncProducts(): Promise<{ synced: number; errors: string | null }> {
  // Check if already syncing
  const { data: state } = await supabaseAdmin
    .from("sync_state")
    .select("*")
    .eq("id", 1)
    .single();

  if (state?.status === "syncing") {
    return { synced: 0, errors: "Sync already in progress" };
  }

  // Mark as syncing
  const syncStartedAt = new Date().toISOString();
  await supabaseAdmin
    .from("sync_state")
    .update({ status: "syncing", started_at: syncStartedAt, errors: null })
    .eq("id", 1);

  let totalSynced = 0;
  let syncError: string | null = null;

  try {
    const lastSyncedAt = state?.last_synced_at || null;
    let page = 1;

    while (true) {
      const params: Record<string, string | number> = {
        per_page: 100,
        page,
      };
      if (lastSyncedAt) {
        params.modified_after = lastSyncedAt;
      }

      const products = await getProducts(params as any);
      if (!products.length) break;

      await upsertProducts(products);
      totalSynced += products.length;
      page++;
    }

    // After the main sync loop, on full syncs (no modified_after), clean up deleted products
    if (!lastSyncedAt) {
      // This is a full sync — get all WC product IDs
      const allWcIds = new Set<number>();
      let cleanPage = 1;
      while (true) {
        const batch = await getProducts({ per_page: 100, page: cleanPage });
        if (!batch.length) break;
        batch.forEach((p) => allWcIds.add(p.id));
        cleanPage++;
      }

      // Delete Supabase products not in WC
      const { data: sbProducts } = await supabaseAdmin.from("products").select("id");
      const toDelete = (sbProducts || [])
        .filter((p) => !allWcIds.has(p.id))
        .map((p) => p.id);

      if (toDelete.length) {
        await supabaseAdmin.from("products").delete().in("id", toDelete);
      }
    }
  } catch (err) {
    syncError = err instanceof Error ? err.message : "Unknown sync error";
  }

  // Update sync state — use startedAt as last_synced_at so overlapping changes get caught
  await supabaseAdmin
    .from("sync_state")
    .update({
      status: syncError ? "error" : "idle",
      last_synced_at: syncStartedAt,
      products_synced: totalSynced,
      errors: syncError,
      completed_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return { synced: totalSynced, errors: syncError };
}

async function upsertProducts(products: WCProduct[]) {
  // Upsert product rows
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
    categories: p.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    wc_updated_at: p.date_modified,
    synced_at: new Date().toISOString(),
  }));

  await supabaseAdmin.from("products").upsert(rows, { onConflict: "id" });

  // Rebuild attributes and categories for these products
  const productIds = products.map((p) => p.id);

  // Delete old attributes/categories for these products
  await supabaseAdmin.from("product_attributes").delete().in("product_id", productIds);
  await supabaseAdmin.from("product_categories").delete().in("product_id", productIds);

  // Insert fresh attributes
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
    await supabaseAdmin.from("product_attributes").insert(attrRows);
  }

  // Insert fresh categories
  const catRows = products.flatMap((p) =>
    p.categories.map((cat) => ({
      product_id: p.id,
      category_id: cat.id,
      category_name: cat.name,
      category_slug: cat.slug,
    }))
  );
  if (catRows.length) {
    await supabaseAdmin.from("product_categories").insert(catRows);
  }
}
