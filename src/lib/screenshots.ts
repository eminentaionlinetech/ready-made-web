import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const SCREENSHOT_BUCKET = "website-screenshots";
const LINK_SECONDS = 60 * 60 * 24;

/** Uploaded screenshots are stored as private file paths; bundled samples are site paths or full links. */
export function isStoredPath(value: string): boolean {
  return value.length > 0 && !value.startsWith("/") && !/^[a-z]+:/i.test(value);
}

type StorageClient = Pick<SupabaseClient<Database>, "storage">;

export async function screenshotLinks(client: StorageClient, values: string[]) {
  const paths = Array.from(new Set(values.filter(isStoredPath)));
  const links = new Map<string, string>();
  if (paths.length === 0) return links;
  const { data } = await client.storage.from(SCREENSHOT_BUCKET).createSignedUrls(paths, LINK_SECONDS);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) links.set(item.path, item.signedUrl);
  }
  return links;
}

/** Swap stored screenshot paths for viewable links. */
export async function withScreenshotLinks<T extends { image_url: string; screenshots?: string[] }>(
  client: StorageClient,
  rows: T[],
): Promise<T[]> {
  const links = await screenshotLinks(
    client,
    rows.flatMap((r) => [r.image_url, ...(r.screenshots ?? [])]),
  );
  if (links.size === 0) return rows;
  const view = (v: string) => links.get(v) ?? v;
  return rows.map((r) => ({
    ...r,
    image_url: view(r.image_url),
    ...(r.screenshots ? { screenshots: r.screenshots.map(view) } : {}),
  }));
}
