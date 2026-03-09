import { supabase } from "./supabase";
import { storeConfig } from "../../store.config";
import type { Product, ProductFilter, WCAttribute } from "./types";

export async function queryProducts(filters: ProductFilter = {}): Promise<{
  products: Product[];
  total: number;
}> {
  const page = filters.page || 1;
  const perPage = filters.per_page || 24;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("products").select("*", { count: "exact" });

  // Only show published products on the storefront
  query = query.eq("status", "publish");

  // Full text search
  if (filters.search) {
    query = query.textSearch("fts", filters.search, { type: "websearch" });
  }

  // Stock status
  if (filters.stock_status) {
    query = query.eq("stock_status", filters.stock_status);
  }

  // Price range
  if (filters.min_price !== undefined) {
    query = query.gte("price", filters.min_price);
  }
  if (filters.max_price !== undefined) {
    query = query.lte("price", filters.max_price);
  }

  // On sale
  if (filters.attributes?.on_sale) {
    query = query.eq("on_sale", true);
  }

  // Category filter (requires subquery via product_categories)
  if (filters.category) {
    const { data: catProducts } = await supabase
      .from("product_categories")
      .select("product_id")
      .eq("category_slug", filters.category);
    const ids = catProducts?.map((r) => r.product_id) || [];
    query = query.in("id", ids.length ? ids : [-1]);
  }

  // Attribute filters (e.g. { "Color": ["Blue", "Red"], "Size": ["M"] })
  if (filters.attributes) {
    for (const [attrName, values] of Object.entries(filters.attributes)) {
      if (attrName === "on_sale") continue;
      const { data: attrProducts } = await supabase
        .from("product_attributes")
        .select("product_id")
        .eq("attribute_name", attrName)
        .in("attribute_value", values);
      const ids = attrProducts?.map((r) => r.product_id) || [];
      query = query.in("id", ids.length ? ids : [-1]);
    }
  }

  // Hide out of stock products if configured
  if (storeConfig.hideOutOfStock) {
    query = query.neq("stock_status", "outofstock");
  }

  // Sorting
  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("wc_updated_at", { ascending: false });
      break;
  }

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return { products: (data as Product[]) || [], total: count || 0 };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Product;
}

export async function getFilterOptions(): Promise<{
  categories: { slug: string; name: string; count: number }[];
  attributes: Record<string, { value: string; count: number }[]>;
  priceRange: { min: number; max: number };
}> {
  // Categories with counts
  const { data: cats } = await supabase
    .from("product_categories")
    .select("category_slug, category_name");

  const catCounts = new Map<string, { name: string; count: number }>();
  for (const row of cats || []) {
    const existing = catCounts.get(row.category_slug);
    if (existing) {
      existing.count++;
    } else {
      catCounts.set(row.category_slug, { name: row.category_name, count: 1 });
    }
  }
  const categories = Array.from(catCounts.entries()).map(([slug, { name, count }]) => ({
    slug,
    name,
    count,
  }));

  // Attributes with counts
  const { data: attrs } = await supabase
    .from("product_attributes")
    .select("attribute_name, attribute_value");

  const attrMap = new Map<string, Map<string, number>>();
  for (const row of attrs || []) {
    if (!attrMap.has(row.attribute_name)) {
      attrMap.set(row.attribute_name, new Map());
    }
    const valueMap = attrMap.get(row.attribute_name)!;
    valueMap.set(row.attribute_value, (valueMap.get(row.attribute_value) || 0) + 1);
  }
  const attributes: Record<string, { value: string; count: number }[]> = {};
  for (const [name, valueMap] of attrMap) {
    attributes[name] = Array.from(valueMap.entries()).map(([value, count]) => ({
      value,
      count,
    }));
  }

  // Price range
  const { data: priceData } = await supabase
    .from("products")
    .select("price")
    .order("price", { ascending: true })
    .limit(1);
  const { data: priceDataMax } = await supabase
    .from("products")
    .select("price")
    .order("price", { ascending: false })
    .limit(1);

  const priceRange = {
    min: priceData?.[0]?.price || 0,
    max: priceDataMax?.[0]?.price || 1000,
  };

  return { categories, attributes, priceRange };
}

export async function getProductSeo(productId: number) {
  const { data } = await supabase
    .from("product_seo")
    .select("*")
    .eq("product_id", productId)
    .single();
  return data;
}

export async function getProductAttributes(productId: number): Promise<WCAttribute[]> {
  const { data } = await supabase
    .from("product_attributes")
    .select("attribute_name, attribute_value")
    .eq("product_id", productId);

  if (!data) return [];

  // Group by attribute name into WCAttribute format
  const attrMap = new Map<string, string[]>();
  for (const row of data) {
    if (!attrMap.has(row.attribute_name)) {
      attrMap.set(row.attribute_name, []);
    }
    attrMap.get(row.attribute_name)!.push(row.attribute_value);
  }

  return Array.from(attrMap.entries()).map(([name, options], i) => ({
    id: i,
    name,
    options,
  }));
}
