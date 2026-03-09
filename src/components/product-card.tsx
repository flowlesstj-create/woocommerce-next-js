import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {product.images[0] && (
          <div className="aspect-square relative">
            <Image
              src={product.images[0].src}
              alt={product.images[0].alt || product.name}
              fill
              className="object-cover"
            />
            {product.on_sale && (
              <Badge className="absolute top-2 right-2" variant="destructive">
                Sale
              </Badge>
            )}
          </div>
        )}
        <CardContent className="p-4">
          <h3 className="font-medium">{product.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold">{formatPrice(product.price)}</span>
            {product.on_sale && product.regular_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.regular_price)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
