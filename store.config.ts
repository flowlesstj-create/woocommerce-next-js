export const storeConfig = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
  description: process.env.NEXT_PUBLIC_STORE_DESCRIPTION || "Fast, modern shopping",
  currency: process.env.NEXT_PUBLIC_CURRENCY || "GBP",
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "£",
  locale: process.env.NEXT_PUBLIC_LOCALE || "en-GB",
  hideOutOfStock: process.env.NEXT_PUBLIC_HIDE_OUT_OF_STOCK === "true",
  syncIntervalMinutes: 5,
};
