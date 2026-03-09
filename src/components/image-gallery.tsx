"use client";

import Image from "next/image";
import { useState } from "react";
import type { WCImage } from "@/lib/types";

export function ImageGallery({ images }: { images: WCImage[] }) {
  const [selected, setSelected] = useState(0);

  if (!images.length) return null;

  return (
    <div className="space-y-4">
      <div className="aspect-square relative rounded-lg overflow-hidden">
        <Image
          src={images[selected].src}
          alt={images[selected].alt || "Product image"}
          fill
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={`relative w-16 h-16 rounded-md overflow-hidden shrink-0 border-2 transition-colors ${
                i === selected ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              <Image src={img.src} alt={img.alt || ""} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
