"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface FilterOptions {
  categories: { slug: string; name: string; count: number }[];
  attributes: Record<string, { value: string; count: number }[]>;
  priceRange: { min: number; max: number };
}

export function ProductFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/product?${params.toString()}`);
  };

  const currentCategory = searchParams.get("category");
  const currentStock = searchParams.get("stock_status");
  const currentSearch = searchParams.get("search");

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Label>Search</Label>
        <Input
          placeholder="Search products..."
          defaultValue={currentSearch || ""}
          onChange={(e) => {
            // Debounce would be nice here
            if (e.target.value.length > 2 || e.target.value.length === 0) {
              updateFilter("search", e.target.value || null);
            }
          }}
        />
      </div>

      <Separator />

      {/* Categories */}
      <div>
        <Label className="mb-2 block">Categories</Label>
        <div className="space-y-1">
          <button
            className={`text-sm block w-full text-left px-2 py-1 rounded ${!currentCategory ? "bg-accent" : "hover:bg-accent/50"}`}
            onClick={() => updateFilter("category", null)}
          >
            All
          </button>
          {options.categories.map((cat) => (
            <button
              key={cat.slug}
              className={`text-sm block w-full text-left px-2 py-1 rounded ${currentCategory === cat.slug ? "bg-accent" : "hover:bg-accent/50"}`}
              onClick={() => updateFilter("category", cat.slug)}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Stock status */}
      <div>
        <Label className="mb-2 block">Availability</Label>
        <div className="space-y-1">
          <button
            className={`text-sm block w-full text-left px-2 py-1 rounded ${!currentStock ? "bg-accent" : "hover:bg-accent/50"}`}
            onClick={() => updateFilter("stock_status", null)}
          >
            All
          </button>
          <button
            className={`text-sm block w-full text-left px-2 py-1 rounded ${currentStock === "instock" ? "bg-accent" : "hover:bg-accent/50"}`}
            onClick={() => updateFilter("stock_status", "instock")}
          >
            In Stock
          </button>
        </div>
      </div>

      <Separator />

      {/* Dynamic attributes (Color, Size, etc.) */}
      {Object.entries(options.attributes).map(([attrName, values]) => (
        <div key={attrName}>
          <Label className="mb-2 block">{attrName}</Label>
          <div className="space-y-1">
            {values.map((v) => (
              <button
                key={v.value}
                className={`text-sm block w-full text-left px-2 py-1 rounded ${searchParams.get(`attr_${attrName}`) === v.value ? "bg-accent" : "hover:bg-accent/50"}`}
                onClick={() => updateFilter(`attr_${attrName}`, searchParams.get(`attr_${attrName}`) === v.value ? null : v.value)}
              >
                {v.value} ({v.count})
              </button>
            ))}
          </div>
          <Separator className="mt-4" />
        </div>
      ))}

      {/* Sort */}
      <div>
        <Label className="mb-2 block">Sort by</Label>
        <div className="space-y-1">
          {[
            { value: "newest", label: "Newest" },
            { value: "price_asc", label: "Price: Low to High" },
            { value: "price_desc", label: "Price: High to Low" },
            { value: "name", label: "Name" },
          ].map((option) => (
            <button
              key={option.value}
              className={`text-sm block w-full text-left px-2 py-1 rounded ${(searchParams.get("sort") || "newest") === option.value ? "bg-accent" : "hover:bg-accent/50"}`}
              onClick={() => updateFilter("sort", option.value === "newest" ? null : option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <Button variant="outline" className="w-full" onClick={() => router.push("/product")}>
        Clear Filters
      </Button>
    </div>
  );
}
