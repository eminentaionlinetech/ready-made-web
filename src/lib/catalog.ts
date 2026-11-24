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
  // Prices are stored in kobo (1/100 naira).
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
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

type Searchable = Pick<Website, "title" | "category"> &
  Partial<Pick<Website, "tagline" | "description" | "features">>;

/** Every word typed must appear somewhere in the listing (title, tagline, description, category or features). */
export function searchWebsites<T extends Searchable>(websites: T[], query: string | undefined): T[] {
  const words = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return websites;
  return websites.filter((w) => {
    const text = [w.title, w.tagline, w.description, w.category, ...(w.features ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** The shop grid: category first, then the search words. */
export function browseWebsites<T extends Searchable>(
  websites: T[],
  { category, q }: { category?: string | undefined; q?: string | undefined },
): T[] {
  return searchWebsites(filterByCategory(websites, category), q);
}
