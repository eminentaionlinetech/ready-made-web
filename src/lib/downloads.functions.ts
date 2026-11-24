import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canDownload, DOWNLOAD_LINK_SECONDS, downloadFileName, WEBSITE_FILES_BUCKET } from "./downloads";

/** Gives the signed-in buyer a 10-minute link to the zip of a website they paid for. */
export const getDownloadLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Read as the buyer: row rules only return their own purchases.
    const { data: purchase, error } = await supabase
      .from("purchases")
      .select("id, status, website_id, website:websites(slug)")
      .eq("id", data.purchaseId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("Couldn't check your purchase. Please try again.");
    if (!purchase || !canDownload(purchase)) throw new Error("You haven't bought this website.");

    // The file location is hidden from buyers, so look it up only after the purchase checks out.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: site } = await supabaseAdmin
      .from("websites")
      .select("file_path")
      .eq("id", purchase.website_id)
      .maybeSingle();
    if (!site?.file_path) throw new Error("The files for this website aren't ready yet. Please check back soon.");

    // Signed as the buyer, so storage rules check the paid purchase a second time.
    const { data: link, error: linkError } = await supabase.storage
      .from(WEBSITE_FILES_BUCKET)
      .createSignedUrl(site.file_path, DOWNLOAD_LINK_SECONDS, {
        download: downloadFileName(purchase.website?.slug),
      });
    if (linkError || !link?.signedUrl) throw new Error("Couldn't prepare your download. Please try again.");

    return { url: link.signedUrl, expiresInSeconds: DOWNLOAD_LINK_SECONDS };
  });
