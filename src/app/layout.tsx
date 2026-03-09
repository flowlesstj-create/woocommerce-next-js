import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { CartProvider } from "@/components/cart-provider";
import { Footer } from "@/components/footer";
import { storeConfig } from "../../store.config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: storeConfig.name,
    template: `%s | ${storeConfig.name}`,
  },
  description: storeConfig.description,
  metadataBase: new URL(storeConfig.url),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: storeConfig.locale,
    siteName: storeConfig.name,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={storeConfig.locale.split("-")[0]}>
      <body className={inter.className}>
        <CartProvider>
          <Header />
          <main className="container mx-auto px-4 py-8">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
