import Link from "next/link";
import { queryProducts } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { storeConfig } from "../../store.config";

export default async function HomePage() {
  const { products } = await queryProducts({ per_page: 8, sort: "newest" });

  return (
    <div className="space-y-12">
      <section className="text-center py-16 space-y-4">
        <h1 className="text-5xl font-bold">Welcome to {storeConfig.name}</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          {storeConfig.description}
        </p>
        <Link href="/product">
          <Button size="lg">Shop Now</Button>
        </Link>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Latest Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
