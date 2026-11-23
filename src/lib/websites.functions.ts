import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Website } from "./catalog";
import { withScreenshotLinks } from "./screenshots";

const COLUMNS =
  "id, slug, title, tagline, description, category, price_cents, demo_url, image_url, screenshots, features, page_count";

// Public catalog reads: publishable key + "anyone can browse" policy, no session.
function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Catalog is not configured");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const listWebsites = createServerFn({ method: "GET" }).handler(
  async (): Promise<Website[]> => {
    const client = publicClient();
    const { data, error } = await client
      .from("websites")
      .select(COLUMNS)
      .order("created_at", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return withScreenshotLinks(client, data ?? []);
  },
);

export const getWebsite = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input.slug).slice(0, 120) }))
  .handler(async ({ data }): Promise<Website | null> => {
    const client = publicClient();
    const { data: row, error } = await client
      .from("websites")
      .select(COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const [withLinks] = await withScreenshotLinks(client, [row]);
    return withLinks ?? row;
  });
