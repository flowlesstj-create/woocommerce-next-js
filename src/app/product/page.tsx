import type { Metadata } from "next";
import { queryProducts, getFilterOptions } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { ProductFilters } from "@/components/product-filters";
import { Pagination } from "@/components/pagination";
import { storeConfig } from "../../../store.config";
import type { ProductFilter } from "@/lib/types";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const category = params.category;
  const search = params.search;
  const page = params.page ? parseInt(params.page) : 1;

  let title = `Products | ${storeConfig.name}`;
  let description = `Browse our full range of products. ${storeConfig.description}`;
  if (category) {
    const catName = category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    title = `${catName} | ${storeConfig.name}`;
    description = `Shop ${catName} at ${storeConfig.name}. ${storeConfig.description}`;
  }
  if (search) {
    title = `Search: ${search} | ${storeConfig.name}`;
    description = `Search results for "${search}" at ${storeConfig.name}.`;
  }

  const canonicalParams = new URLSearchParams();
  if (category) canonicalParams.set("category", category);
  if (search) canonicalParams.set("search", search);
  if (page > 1) canonicalParams.set("page", String(page));
  const qs = canonicalParams.toString();
  const canonical = `${storeConfig.url}/product${qs ? `?${qs}` : ""}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: storeConfig.name,
      type: "website",
    },
  };
}

function ProductListJsonLd({ products, total, page, category }: {
  products: { id: number; name: string; slug: string; price: number; images: any[] }[];
  total: number;
  page: number;
  category?: string;
}) {
  const listName = category
    ? category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "All Products";

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: total,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: (page - 1) * 24 + i + 1,
      url: `${storeConfig.url}/product/${p.slug}`,
      name: p.name,
    })),
  };

  const breadcrumb: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: storeConfig.url },
      { "@type": "ListItem", position: 2, name: "Products", item: `${storeConfig.url}/product` },
    ],
  };

  if (category) {
    breadcrumb.itemListElement.push({
      "@type": "ListItem",
      position: 3,
      name: listName,
      item: `${storeConfig.url}/product?category=${category}`,
    });
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;

  // Build filters from URL params
  const filters: ProductFilter = {
    search: params.search || undefined,
    category: params.category || undefined,
    stock_status: params.stock_status || undefined,
    sort: (params.sort as ProductFilter["sort"]) || undefined,
    page: params.page ? parseInt(params.page) : 1,
    per_page: 24,
  };

  // Extract attribute filters (attr_Color=Blue etc.)
  const attributes: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("attr_") && value) {
      attributes[key.replace("attr_", "")] = [value];
    }
  }
  if (Object.keys(attributes).length) {
    filters.attributes = attributes;
  }

  const [{ products, total }, filterOptions] = await Promise.all([
    queryProducts(filters),
    getFilterOptions(),
  ]);

  return (
    <>
      <ProductListJsonLd
        products={products}
        total={total}
        page={filters.page || 1}
        category={params.category}
      />
      <div className="flex gap-8">
        <aside className="w-64 shrink-0 hidden md:block">
          <ProductFilters options={filterOptions} />
        </aside>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">{total} products</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination total={total} perPage={24} currentPage={filters.page || 1} />
          {products.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No products found matching your filters.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
