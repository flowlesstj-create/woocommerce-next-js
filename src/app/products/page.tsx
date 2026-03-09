import { queryProducts, getFilterOptions } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { ProductFilters } from "@/components/product-filters";
import type { ProductFilter } from "@/lib/types";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
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
        {products.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No products found matching your filters.
          </p>
        )}
      </div>
    </div>
  );
}
