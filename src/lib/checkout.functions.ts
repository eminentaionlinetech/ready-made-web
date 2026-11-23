import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutReference, returnOrigin, SHOP_CURRENCY } from "./checkout";

export type StartCheckoutResult =
  | { status: "redirect"; authorizationUrl: string }
  | { status: "owned" };

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(120), origin: z.string().max(300) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StartCheckoutResult> => {
    const { supabase, userId, claims } = context;
    const email = typeof claims.email === "string" ? claims.email : "";
    if (!email) throw new Error("Your account needs an email address to pay.");

    // The price always comes from our own catalog, never from the browser.
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, slug, price_cents")
      .eq("slug", data.slug)
      .maybeSingle();
    if (websiteError) throw new Error(websiteError.message);
    if (!website) throw new Error("Website not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paystack } = await import("./paystack.server");

    const findPurchase = () =>
      supabaseAdmin
        .from("purchases")
        .select("id, status, amount_cents, paystack_authorization_url")
        .eq("user_id", userId)
        .eq("website_id", website.id)
        .maybeSingle();

    let { data: purchase } = await findPurchase();
    if (purchase?.status === "paid") return { status: "owned" };
    // Coming back to an unpaid checkout: reuse it so the buyer can't be charged twice.
    if (purchase?.paystack_authorization_url) {
      return { status: "redirect", authorizationUrl: purchase.paystack_authorization_url };
    }

    if (!purchase) {
      const { error } = await supabaseAdmin.from("purchases").insert({
        user_id: userId,
        website_id: website.id,
        amount_cents: website.price_cents,
        currency: SHOP_CURRENCY,
        status: "pending",
      });
      if (error && error.code !== "23505") throw new Error(error.message);
      ({ data: purchase } = await findPurchase());
    } else {
      await supabaseAdmin
        .from("purchases")
        .update({ amount_cents: website.price_cents, currency: SHOP_CURRENCY })
        .eq("id", purchase.id);
      purchase = { ...purchase, amount_cents: website.price_cents };
    }
    if (!purchase) throw new Error("Could not start checkout");

    const reference = checkoutReference(purchase.id);
    const tx = await paystack("transaction/initialize", {
      method: "POST",
      body: {
        email,
        amount: purchase.amount_cents,
        currency: SHOP_CURRENCY,
        reference,
        callback_url: `${returnOrigin(data.origin)}/dashboard?checkout=${encodeURIComponent(website.slug)}`,
        metadata: { purchase_id: purchase.id, website_slug: website.slug },
      },
    });

    const { error: saveError } = await supabaseAdmin
      .from("purchases")
      .update({
        paystack_reference: tx.reference ?? reference,
        paystack_access_code: tx.access_code,
        paystack_authorization_url: tx.authorization_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);
    if (saveError) throw new Error(saveError.message);

    return { status: "redirect", authorizationUrl: tx.authorization_url };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reference: z.string().min(1).max(100).regex(/^[A-Za-z0-9.=-]+$/) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ paid: boolean }> => {
    // Row rules only return the buyer's own purchases, so others' references are ignored.
    const { data: own } = await context.supabase
      .from("purchases")
      .select("id")
      .eq("paystack_reference", data.reference)
      .maybeSingle();
    if (!own) return { paid: false };
    const { confirmPayment } = await import("./paystack.server");
    return confirmPayment(data.reference);
  });
