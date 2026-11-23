import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWebsite, listWebsites } from "./websites.functions";
import { screenshotLinks } from "./screenshots";

export const websitesQuery = () =>
  queryOptions({ queryKey: ["websites"], queryFn: () => listWebsites() });

export const websiteQuery = (slug: string) =>
  queryOptions({ queryKey: ["website", slug], queryFn: () => getWebsite({ data: { slug } }) });

// Signed-in reads below run in the browser with the buyer's session; row rules keep them private.
export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["me", "profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const purchasesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["me", "purchases", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select(
          "id, amount_cents, status, created_at, website:websites(slug, title, tagline, image_url, demo_url, category)",
        )
        .eq("user_id", userId)
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const links = await screenshotLinks(
        supabase,
        rows.flatMap((p) => (p.website ? [p.website.image_url] : [])),
      );
      return rows.map((p) =>
        p.website
          ? { ...p, website: { ...p.website, image_url: links.get(p.website.image_url) ?? p.website.image_url } }
          : p,
      );
    },
  });

/** Whether this account is the shop admin (checked against the protected role list). */
export const isAdminQuery = (userId: string) =>
  queryOptions({
    queryKey: ["me", "is-admin", userId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (error) return false;
      return data === true;
    },
  });

export type AdminListing = Awaited<ReturnType<typeof fetchAdminListings>>[number];

async function fetchAdminListings() {
  const [rows, files] = await Promise.all([
    supabase
      .from("websites")
      .select(
        "id, slug, title, tagline, description, category, price_cents, demo_url, image_url, screenshots, features, page_count, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.rpc("admin_website_files"),
  ]);
  if (rows.error) throw rows.error;
  if (files.error) throw files.error;
  const fileById = new Map((files.data ?? []).map((f) => [f.website_id, f.file_path]));
  const listings = rows.data ?? [];
  const links = await screenshotLinks(
    supabase,
    listings.flatMap((l) => [l.image_url, ...l.screenshots]),
  );
  return listings.map((l) => ({
    ...l,
    file_path: fileById.get(l.id) ?? null,
    previews: Object.fromEntries(
      [l.image_url, ...l.screenshots].map((v) => [v, links.get(v) ?? v] as const),
    ) as Record<string, string>,
  }));
}

export const adminListingsQuery = () =>
  queryOptions({ queryKey: ["me", "admin", "listings"], queryFn: fetchAdminListings });

/** Uploaded photos live in private storage, so turn the stored path into a short-lived link. */
export const avatarUrlQuery = (value: string | null | undefined) =>
  queryOptions({
    queryKey: ["me", "avatar", value ?? ""],
    enabled: Boolean(value),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!value) return null;
      if (/^https?:\/\//.test(value)) return value;
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(value, 3600);
      if (error) return null;
      return data.signedUrl;
    },
  });
