"use client";

import Link from "next/link";
import Image from "next/image";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/cart-store";
import { Minus, Plus, Trash2 } from "lucide-react";
import { storeConfig } from "../../store.config";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { items, updateQuantity, removeItem, total } = useCartStore();
  const sym = storeConfig.currencySymbol;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Cart</SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <p className="flex-1 flex items-center justify-center text-muted-foreground">
            Your cart is empty
          </p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3">
                  {item.product.images[0] && (
                    <Image
                      src={item.product.images[0].src}
                      alt={item.product.images[0].alt || item.product.name}
                      width={64}
                      height={64}
                      className="rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {sym}{item.product.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="py-4 space-y-4">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{sym}{total().toFixed(2)}</span>
              </div>
              <Button className="w-full" asChild onClick={() => onOpenChange(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
