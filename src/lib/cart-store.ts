import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./types";

export interface CartItem {
  product: Product;
  quantity: number;
  variationId?: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variationId?: number) => void;
  removeItem: (productId: number, variationId?: number) => void;
  updateQuantity: (productId: number, quantity: number, variationId?: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, variationId) => {
        set((state) => {
          // For variable products, match on variationId too
          const existing = state.items.find(
            (i) => i.product.id === product.id && i.variationId === variationId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id && i.variationId === variationId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity, variationId }] };
        });
      },

      removeItem: (productId, variationId) => {
        set((state) => ({
          items: state.items.filter(
            (i) =>
              i.product.id !== productId ||
              (variationId !== undefined && i.variationId !== variationId)
          ),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        ),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "wc-cart" }
  )
);
