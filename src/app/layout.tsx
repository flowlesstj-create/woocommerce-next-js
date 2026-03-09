import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { CartProvider } from "@/components/cart-provider";
import { storeConfig } from "../../store.config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: storeConfig.name,
  description: storeConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <Header />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
