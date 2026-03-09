"use client";

import { Label } from "@/components/ui/label";
import { storeConfig } from "../../store.config";
import type { ShippingOption } from "@/lib/shipping";

interface Props {
  options: ShippingOption[];
  selected: string | null;
  onSelect: (option: ShippingOption) => void;
}

export function ShippingSelector({ options, selected, onSelect }: Props) {
  const sym = storeConfig.currencySymbol;

  return (
    <div>
      <Label className="mb-2 block">Shipping</Label>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`w-full flex items-center justify-between p-3 border rounded-lg text-sm ${
              selected === option.id ? "border-primary bg-accent" : "hover:bg-accent/50"
            }`}
            onClick={() => onSelect(option)}
          >
            <span>{option.title}</span>
            <span className="font-medium">
              {option.cost === 0 ? "Free" : `${sym}${option.cost.toFixed(2)}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
