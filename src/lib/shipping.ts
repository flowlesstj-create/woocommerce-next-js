import { getShippingZoneMethods } from "./woocommerce";
import type { WCShippingMethod } from "./types";

export interface ShippingOption {
  id: string;
  title: string;
  cost: number;
}

export async function getShippingOptions(): Promise<ShippingOption[]> {
  // Fetch methods from the default zone (0) and zone 1
  // Adjust zone IDs based on your WooCommerce setup
  const zones = [0, 1];
  const allMethods: WCShippingMethod[] = [];

  for (const zoneId of zones) {
    try {
      const methods = await getShippingZoneMethods(zoneId);
      allMethods.push(...methods);
    } catch {
      // Zone might not exist, skip
    }
  }

  return allMethods
    .filter((m) => m.settings.cost)
    .map((m) => ({
      id: m.method_id,
      title: m.method_title,
      cost: parseFloat(m.settings.cost?.value || "0"),
    }));
}
