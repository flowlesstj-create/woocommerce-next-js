import { supabaseAdmin, getSupabaseAdmin } from "./supabase";
import { getProducts, getProductsPage } from "./woocommerce";
import { ensureImageBucket, syncProductImages } from "./image-sync";
import type { WCProduct } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function syncProducts(): Promise<{ synced: number; errors: string | null }> {
  const admin = getSupabaseAdmin();

  // Use atomic update to prevent race conditions
  const { data: updatedState, error } = await admin
    .from("sync_state")
    .update({
      status: "syncing",
      sync_phase: "fetching",
      products_synced: 0,
      products_total: 0,
      started_at: new Date().toISOString(),
      errors: null,
    })
    .eq("id", 1)
    .eq("status", "idle")
    .select()
    .single();

  // If no row was updated, another sync is already in progress
  if (error || !updatedState) {
    return { synced: 0, errors: "Sync already in progress" };
  }

  // Ensure image bucket exists
  await ensureImageBucket(admin);

  let totalSynced = 0;
  let syncError: string | null = null;

  try {
    const lastSyncedAt = state?.last_synced_at || null;
    let page = 1;

    // First page — get total count from headers
    const firstParams: Record<string, string | number> = { per_page: 100, page: 1 };
    if (lastSyncedAt) firstParams.modified_after = lastSyncedAt;

    const firstResult = await getProductsPage(firstParams);
    if (firstResult.products.length) {
      // Update total so frontend can show X of Y
      await admin
        .from("sync_state")
        .update({ products_total: firstResult.total, products_synced: 0 })
        .eq("id", 1);

      await upsertProducts(firstResult.products);
      totalSynced += firstResult.products.length;
      await admin
        .from("sync_state")
        .update({ products_synced: totalSynced })
        .eq("id", 1);

      page = 2;
      while (page <= firstResult.totalPages) {
        const params: Record<string, string | number> = { per_page: 100, page };
        if (lastSyncedAt) params.modified_after = lastSyncedAt;

        const products = await getProducts(params as any);
        if (!products.length) break;

        await upsertProducts(products);
        totalSynced += products.length;

        await admin
          .from("sync_state")
          .update({ products_synced: totalSynced })
          .eq("id", 1);

        page++;
      }
    }

    // After the main sync loop, on full syncs (no modified_after), clean up deleted products
    if (!lastSyncedAt) {
      const allWcIds = new Set<number>();
      let cleanPage = 1;
      while (true) {
        const batch = await getProducts({ per_page: 100, page: cleanPage });
        if (!batch.length) break;
        batch.forEach((p) => allWcIds.add(p.id));
        cleanPage++;
      }

      const { data: sbProducts } = await admin.from("products").select("id");
      const toDelete = (sbProducts || [])
        .filter((p) => !allWcIds.has(p.id))
        .map((p) => p.id);

      if (toDelete.length) {
        // Delete images from storage for removed products
        for (const id of toDelete) {
          const { data: files } = await admin.storage.from("product-images").list(String(id));
          if (files?.length) {
            await admin.storage
              .from("product-images")
              .remove(files.map((f) => `${id}/${f.name}`));
          }
        }
        await admin.from("products").delete().in("id", toDelete);
      }
    }
  } catch (err) {
    syncError = err instanceof Error ? err.message : "Unknown sync error";
  }

  await admin
    .from("sync_state")
    .update({
      status: syncError ? "error" : "idle",
      sync_phase: null,
      last_synced_at: syncStartedAt,
      products_synced: totalSynced,
      errors: syncError,
      completed_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return { synced: totalSynced, errors: syncError };
}

async function upsertProducts(products: WCProduct[]) {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Sync images to Supabase Storage
  const imageMap = await syncProductImages(admin, SUPABASE_URL, products);

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status || "publish",
    type: p.type || "simple",
    description: p.description,
    short_description: p.short_description,
    price: parseFloat(p.price) || 0,
    regular_price: p.regular_price ? parseFloat(p.regular_price) : null,
    sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
    on_sale: p.on_sale,
    stock_status: p.stock_status,
    images: imageMap.get(p.id) || p.images,
    categories: p.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    wc_updated_at: p.date_modified,
    synced_at: now,
  }));

  const productIds = products.map((p) => p.id);

  // Upsert products and delete old relations in parallel
  await Promise.all([
    admin.from("products").upsert(rows, { onConflict: "id" }),
    admin.from("product_attributes").delete().in("product_id", productIds),
    admin.from("product_categories").delete().in("product_id", productIds),
  ]);

  // Insert fresh attributes and categories in parallel
  const attrRows = products.flatMap((p) =>
    p.attributes.flatMap((attr) =>
      attr.options.map((value) => ({
        product_id: p.id,
        attribute_name: attr.name,
        attribute_value: value,
      }))
    )
  );
  const catRows = products.flatMap((p) =>
    p.categories.map((cat) => ({
      product_id: p.id,
      category_id: cat.id,
      category_name: cat.name,
      category_slug: cat.slug,
    }))
  );

  const inserts = [];
  if (attrRows.length) inserts.push(admin.from("product_attributes").insert(attrRows));
  if (catRows.length) inserts.push(admin.from("product_categories").insert(catRows));
  if (inserts.length) await Promise.all(inserts);
}
