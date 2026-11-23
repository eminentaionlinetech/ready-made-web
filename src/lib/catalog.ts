import type { Tables } from "@/integrations/supabase/types";

export type Website = Pick<
  Tables<"websites">,
  | "id"
  | "slug"
  | "title"
  | "tagline"
  | "description"
  | "category"
  | "price_cents"
  | "demo_url"
  | "image_url"
  | "screenshots"
  | "features"
  | "page_count"
>;

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function categoriesFrom(websites: Pick<Website, "category">[]): string[] {
  return Array.from(new Set(websites.map((w) => w.category))).sort((a, b) => a.localeCompare(b));
}

export function filterByCategory<T extends Pick<Website, "category">>(
  websites: T[],
  category: string | undefined,
): T[] {
  if (!category) return websites;
  const wanted = category.toLowerCase();
  return websites.filter((w) => w.category.toLowerCase() === wanted);
}

/** Only allow same-site paths after sign-in, so a link can't bounce buyers to another site. */
export function safeRedirect(path: unknown, fallback = "/dashboard"): string {
  if (typeof path !== "string") return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}
