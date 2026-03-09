"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductVariation, WCAttribute } from "@/lib/types";

interface Props {
  productId: number;
  attributes: WCAttribute[];
  onVariationChange: (variation: ProductVariation | null) => void;
}

export function VariationPicker({ productId, attributes, onVariationChange }: Props) {
  const [variations, setVariations] = useState<ProductVariation[] | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  // Lazy load variations from cached API
  useEffect(() => {
    fetch(`/api/products/${productId}/variations`)
      .then((res) => res.json())
      .then((data) => setVariations(data));
  }, [productId]);

  // Find matching variation when selection changes
  useEffect(() => {
    if (!variations) return;

    const attrCount = attributes.length;
    const selectedCount = Object.keys(selected).length;

    if (selectedCount < attrCount) {
      onVariationChange(null);
      return;
    }

    const match = variations.find((v) =>
      v.attributes.every((attr) => selected[attr.name] === attr.option)
    );

    onVariationChange(match || null);
  }, [selected, variations, attributes, onVariationChange]);

  // Check if a specific option is available (any variation with that option is in stock)
  const isOptionAvailable = (attrName: string, optionValue: string): boolean => {
    if (!variations) return true;
    return variations.some(
      (v) =>
        v.attributes.some((a) => a.name === attrName && a.option === optionValue) &&
        v.stock_status === "instock"
    );
  };

  if (!variations) {
    return (
      <div className="space-y-4">
        {attributes.map((attr) => (
          <div key={attr.name}>
            <Skeleton className="h-4 w-20 mb-2" />
            <div className="flex gap-2">
              {attr.options.map((opt) => (
                <Skeleton key={opt} className="h-10 w-16" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {attributes.map((attr) => (
        <div key={attr.name}>
          <Label className="mb-2 block">
            {attr.name}
            {selected[attr.name] && (
              <span className="text-muted-foreground ml-2">: {selected[attr.name]}</span>
            )}
          </Label>
          <div className="flex flex-wrap gap-2">
            {attr.options.map((option) => {
              const available = isOptionAvailable(attr.name, option);
              const isSelected = selected[attr.name] === option;

              return (
                <button
                  key={option}
                  type="button"
                  disabled={!available}
                  className={`px-4 py-2 border rounded-md text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : available
                        ? "hover:border-primary"
                        : "opacity-40 line-through cursor-not-allowed"
                  }`}
                  onClick={() =>
                    setSelected((prev) => ({
                      ...prev,
                      [attr.name]: isSelected ? "" : option,
                    }))
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
