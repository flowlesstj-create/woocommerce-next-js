import Link from "next/link";
import { storeConfig } from "../../store.config";

export function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold mb-4">{storeConfig.name}</h3>
            <p className="text-sm text-muted-foreground">
              {storeConfig.description}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/product" className="hover:underline">All Products</Link></li>
              <li><Link href="/product?sort=newest" className="hover:underline">New Arrivals</Link></li>
              <li><Link href="/product?on_sale=true" className="hover:underline">Sale</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">Help</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/contact" className="hover:underline">Contact</Link></li>
              <li><Link href="/shipping" className="hover:underline">Shipping Info</Link></li>
              <li><Link href="/returns" className="hover:underline">Returns</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:underline">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {storeConfig.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
