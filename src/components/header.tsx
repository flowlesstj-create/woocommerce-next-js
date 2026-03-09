"use client";

import Link from "next/link";
import { ShoppingCart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart-store";
import { CartSheet } from "./cart-sheet";
import { useState } from "react";
import { storeConfig } from "../../store.config";

export function Header() {
  const itemCount = useCartStore((s) => s.itemCount());
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          {storeConfig.name}
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/product" className="text-sm hover:underline">
            Products
          </Link>
          <Link href="/product?search=" className="text-sm hover:underline">
            <Search className="h-4 w-4" />
          </Link>
          <Button variant="outline" size="icon" className="relative" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                {itemCount}
              </Badge>
            )}
          </Button>
        </nav>
      </div>
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
