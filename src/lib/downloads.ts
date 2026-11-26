/** Download links for bought website files stop working after this long. */
export const DOWNLOAD_LINK_SECONDS = 10 * 60;

export const WEBSITE_FILES_BUCKET = "website-files";

/** Only finished payments unlock the website files. */
export function canDownload(purchase: { status: string } | null | undefined): boolean {
  return purchase?.status === "paid";
}

/** Friendly name for the saved file, e.g. "test-website.zip". */
export function downloadFileName(slug: string | null | undefined): string {
  const base = (slug ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "website"}.zip`;
}
