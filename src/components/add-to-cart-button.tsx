"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { VariationPicker } from "./variation-picker";
import { formatPrice } from "@/lib/format";
import type { Product, ProductVariation, WCAttribute } from "@/lib/types";

interface Props {
  product: Product;
  attributes?: WCAttribute[];
}

export function AddToCartButton({ product, attributes }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);

  const handleVariationChange = useCallback((variation: ProductVariation | null) => {
    setSelectedVariation(variation);
  }, []);

  const isVariable = product.type === "variable";
  const canAdd = isVariable
    ? selectedVariation && selectedVariation.stock_status === "instock"
    : product.stock_status === "instock";

  const displayPrice = isVariable && selectedVariation
    ? selectedVariation.price
    : product.price;

  const handleAdd = () => {
    addItem(product, 1, selectedVariation?.id);
  };

  return (
    <div className="space-y-4">
      {isVariable && attributes && (
        <VariationPicker
          productId={product.id}
          attributes={attributes}
          onVariationChange={handleVariationChange}
        />
      )}

      {isVariable && selectedVariation && (
        <p className="text-2xl font-bold">{formatPrice(selectedVariation.price)}</p>
      )}

      <Button
        size="lg"
        onClick={handleAdd}
        disabled={!canAdd}
      >
        {!isVariable && product.stock_status !== "instock"
          ? "Out of Stock"
          : isVariable && !selectedVariation
            ? "Select Options"
            : isVariable && selectedVariation?.stock_status !== "instock"
              ? "Out of Stock"
              : "Add to Cart"}
      </Button>
    </div>
  );
}
