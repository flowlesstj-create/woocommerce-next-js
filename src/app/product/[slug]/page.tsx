import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getProductAttributes, getProductSeo } from "@/lib/products";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ImageGallery } from "@/components/image-gallery";
import { formatPrice } from "@/lib/format";
import { storeConfig } from "../../../../store.config";
import type { Product } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const seo = await getProductSeo(product.id);
  const plainDesc = product.short_description.replace(/<[^>]*>/g, "").slice(0, 160);
  const title = seo?.meta_title || `${product.name} | ${storeConfig.name}`;
  const description = seo?.meta_description || plainDesc;
  const url = `${storeConfig.url}/product/${product.slug}`;

  return {
    title,
    description,
    keywords: seo?.focus_keyword || undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: seo?.og_title || product.name,
      description: seo?.og_description || description,
      url,
      siteName: storeConfig.name,
      type: "website",
      images: product.images.map((img, i) => ({
        url: img.src,
        alt: seo?.image_alt_texts?.[i] || img.alt || product.name,
      })),
    },
    twitter: {
      card: "summary_large_image",
      title: seo?.og_title || product.name,
      description: seo?.og_description || description,
    },
    other: {
      "product:price:amount": String(product.price),
      "product:price:currency": storeConfig.currency,
      "product:availability": product.stock_status === "instock" ? "in stock" : "out of stock",
    },
  };
}

function ProductJsonLd({ product, seo }: { product: Product; seo: any }) {
  const url = `${storeConfig.url}/product/${product.slug}`;
  const description = (product.short_description || product.description || "").replace(/<[^>]*>/g, "").slice(0, 5000);

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    url,
    sku: String(product.id),
    image: product.images.map((img, i) => img.src),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: storeConfig.currency,
      price: product.on_sale && product.sale_price ? product.sale_price : product.price,
      availability: product.stock_status === "instock"
        ? "https://schema.org/InStock"
        : product.stock_status === "onbackorder"
          ? "https://schema.org/BackOrder"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: storeConfig.name,
        url: storeConfig.url,
      },
    },
    brand: {
      "@type": "Brand",
      name: storeConfig.name,
    },
  };

  // Add sale price as priceSpecification
  if (product.on_sale && product.regular_price && product.sale_price) {
    schema.offers.priceSpecification = [
      {
        "@type": "UnitPriceSpecification",
        price: product.sale_price,
        priceCurrency: storeConfig.currency,
        priceType: "https://schema.org/SalePrice",
      },
      {
        "@type": "UnitPriceSpecification",
        price: product.regular_price,
        priceCurrency: storeConfig.currency,
        priceType: "https://schema.org/ListPrice",
      },
    ];
  }

  // Add category
  if (product.categories?.length) {
    schema.category = product.categories.map((c) => c.name).join(" > ");
  }

  // Breadcrumb
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: storeConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: `${storeConfig.url}/product`,
      },
      ...(product.categories?.[0]
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: product.categories[0].name,
              item: `${storeConfig.url}/product?category=${product.categories[0].slug}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: product.name,
              item: url,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 3,
              name: product.name,
              item: url,
            },
          ]),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
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

      {/* Breadcrumb nav */}
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
        <ol className="flex items-center gap-1.5">
          <li><a href="/" className="hover:text-foreground">Home</a></li>
          <li>/</li>
          <li><a href="/product" className="hover:text-foreground">Products</a></li>
          {product.categories?.[0] && (
            <>
              <li>/</li>
              <li>
                <a href={`/product?category=${product.categories[0].slug}`} className="hover:text-foreground">
                  {product.categories[0].name}
                </a>
              </li>
            </>
          )}
          <li>/</li>
          <li className="text-foreground font-medium">{product.name}</li>
        </ol>
      </nav>

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

          {/* Stock status */}
          {product.stock_status === "instock" ? (
            <p className="text-sm text-green-600 font-medium">In Stock</p>
          ) : product.stock_status === "onbackorder" ? (
            <p className="text-sm text-amber-600 font-medium">Available on Backorder</p>
          ) : (
            <p className="text-sm text-red-600 font-medium">Out of Stock</p>
          )}

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
