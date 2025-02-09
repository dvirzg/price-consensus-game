import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function calculatePriceAdjustments(
  items: { id: number; currentPrice: number }[],
  updatedItemId: number,
  newPrice: number
): { id: number; price: number }[] {
  const updatedItem = items.find((item) => item.id === updatedItemId);
  if (!updatedItem) return [];

  const priceDiff = newPrice - updatedItem.currentPrice;
  const otherItems = items.filter((item) => item.id !== updatedItemId);
  const priceReducePerItem = priceDiff / otherItems.length;

  return otherItems.map((item) => ({
    id: item.id,
    price: item.currentPrice - priceReducePerItem,
  }));
}
