import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Map a stored asset image path to a renderable URL. New-format internal
 * paths (`uploads/assets/<uuid>.<ext>`) route through the authenticated serve
 * route; legacy public URLs (`/uploads/assets/...`) and data URLs fall back
 * to the raw value unchanged (R3).
 */
export function assetImageUrl(imagePath?: string | null): string | undefined {
  if (!imagePath) return undefined;
  return imagePath.startsWith("uploads/assets/")
    ? `/api/assets/images/${imagePath.split("/").pop()}`
    : imagePath;
}

