import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getProductAttributes, getProductSeo } from "@/lib/products";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ImageGallery } from "@/components/image-gallery";
import { formatPrice } from "@/lib/format";
import { storeConfig } from "../../../../store.config";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const seo = await getProductSeo(product.id);

  // Strip HTML tags from description for fallback
  const plainDesc = product.short_description.replace(/<[^>]*>/g, "").slice(0, 160);

  const title = seo?.meta_title || `${product.name} | ${storeConfig.name}`;
  const description = seo?.meta_description || plainDesc;

  return {
    title,
    description,
    keywords: seo?.focus_keyword || undefined,
    openGraph: {
      title: seo?.og_title || product.name,
      description: seo?.og_description || description,
      type: "website",
      images: product.images[0] ? [{ url: product.images[0].src, alt: seo?.image_alt_texts?.[0] || product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: seo?.og_title || product.name,
      description: seo?.og_description || description,
    },
  };
}

function ProductJsonLd({ product, seo }: { product: any; seo: any }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: (product.short_description || product.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
    image: product.images.map((img: any, i: number) => ({
      "@type": "ImageObject",
      url: img.src,
      name: seo?.image_alt_texts?.[i] || img.alt || product.name,
    })),
    sku: String(product.id),
    offers: {
      "@type": "Offer",
      url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/product/${product.slug}`,
      priceCurrency: storeConfig.currency,
      price: product.price,
      ...(product.on_sale && product.regular_price && {
        priceSpecification: {
          "@type": "PriceSpecification",
          price: product.regular_price,
          priceCurrency: storeConfig.currency,
        },
      }),
      availability: product.stock_status === "instock"
        ? "https://schema.org/InStock"
        : product.stock_status === "onbackorder"
          ? "https://schema.org/BackOrder"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.categories?.length && {
      category: product.categories.map((c: any) => c.name).join(" > "),
    }),
    brand: {
      "@type": "Brand",
      name: storeConfig.name,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [attributes, seo] = await Promise.all([
    product.type === "variable" ? getProductAttributes(product.id) : Promise.resolve([]),
    getProductSeo(product.id),
  ]);

  const isVariable = product.type === "variable";

  // Merge AI-generated alt texts into images
  const imagesWithAlt = product.images.map((img: any, i: number) => ({
    ...img,
    alt: seo?.image_alt_texts?.[i] || img.alt || product.name,
  }));

  return (
    <>
      <ProductJsonLd product={product} seo={seo} />
      <div className="grid md:grid-cols-2 gap-8">
        <ImageGallery images={imagesWithAlt} />
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
    </>
  );
}
