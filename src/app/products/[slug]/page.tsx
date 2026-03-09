import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { getProductAttributes } from "@/lib/products";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ImageGallery } from "@/components/image-gallery";
import { formatPrice } from "@/lib/format";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Get attributes from Supabase for the variation picker
  const attributes = product.type === "variable"
    ? await getProductAttributes(product.id)
    : [];

  const isVariable = product.type === "variable";

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <ImageGallery images={product.images} />
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">
            {isVariable ? `From ${formatPrice(product.price)}` : formatPrice(product.price)}
          </span>
          {product.on_sale && product.regular_price && !isVariable && (
            <span className="text-lg text-muted-foreground line-through">
              {formatPrice(product.regular_price)}
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
