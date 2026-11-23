// Rules for listings the shop owner adds on the admin page.

export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_BYTES = 50 * 1024 * 1024;

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** "₦129,000" or "129000.50" → kobo. Returns null when it isn't a valid amount. */
export function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const kobo = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(kobo) ? kobo : null;
}

export function koboToNairaInput(kobo: number): string {
  return kobo % 100 === 0 ? String(kobo / 100) : (kobo / 100).toFixed(2);
}

export function parseFeatures(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function taglineFrom(description: string): string {
  const first = description.trim().split(/(?<=[.!?])\s/)[0] ?? "";
  return first.length > 120 ? `${first.slice(0, 117).trimEnd()}…` : first;
}

export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const cleanBase = slugify(base) || "file";
  return ext ? `${cleanBase}.${ext}` : cleanBase;
}

export function isZipFile(file: { name: string; type: string }): boolean {
  return /\.zip$/i.test(file.name) || /zip/.test(file.type);
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export type ListingDraft = {
  title: string;
  slug: string;
  category: string;
  price: string;
  demoUrl: string;
  description: string;
  screenshotCount: number;
  hasZip: boolean;
};

export type ListingErrors = Partial<Record<keyof ListingDraft, string>>;

export function validateListing(d: ListingDraft): ListingErrors {
  const errors: ListingErrors = {};
  if (!d.title.trim()) errors.title = "Add a title";
  if (!slugify(d.slug)) errors.slug = "Add a web address";
  if (!d.category.trim()) errors.category = "Add a category";
  const kobo = nairaToKobo(d.price);
  if (kobo === null || kobo <= 0) errors.price = "Enter a price in naira, e.g. 129000";
  if (!isHttpUrl(d.demoUrl.trim())) errors.demoUrl = "Enter a full link starting with https://";
  if (!d.description.trim()) errors.description = "Add a description";
  if (d.screenshotCount < 1) errors.screenshotCount = "Add at least one screenshot";
  if (!d.hasZip) errors.hasZip = "Upload the website's zip file";
  return errors;
}
