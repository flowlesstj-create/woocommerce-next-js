import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { getProductAttributes } from "@/lib/products";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { storeConfig } from "../../../../store.config";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Get attributes from Supabase for the variation picker
  const attributes = product.type === "variable"
    ? await getProductAttributes(product.id)
    : [];

  const sym = storeConfig.currencySymbol;
  const isVariable = product.type === "variable";

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="aspect-square relative rounded-lg overflow-hidden">
        {product.images[0] && (
          <Image
            src={product.images[0].src}
            alt={product.images[0].alt || product.name}
            fill
            className="object-cover"
          />
        )}
        {product.on_sale && (
          <Badge className="absolute top-4 right-4" variant="destructive">
            Sale
          </Badge>
        )}
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">
            {isVariable ? `From ${sym}${product.price.toFixed(2)}` : `${sym}${product.price.toFixed(2)}`}
          </span>
          {product.on_sale && product.regular_price && !isVariable && (
            <span className="text-lg text-muted-foreground line-through">
              {sym}{product.regular_price.toFixed(2)}
            </span>
          )}
        </div>
        <div
          className="prose prose-sm"
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
        <AddToCartButton
          product={product}
          attributes={attributes.length ? attributes : undefined}
        />
      </div>
    </div>
  );
}
