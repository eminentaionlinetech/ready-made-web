import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWebsite, listWebsites } from "./websites.functions";

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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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
