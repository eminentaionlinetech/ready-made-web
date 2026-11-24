// Browser-safe checkout rules shared by the server code and tests.

export const SHOP_CURRENCY = "NGN";
export const PROJECT_ID = "be9ba4bb-5232-44d0-bc63-37b0fc0a355c";
export const PUBLISHED_URL = `https://project--${PROJECT_ID}.lovable.app`;
// The app's other published hosts (its lovable.app subdomain, custom domains).
export const APP_HOSTS: string[] = [];

/** Where Paystack sends the buyer back. Only the app's own https hosts are accepted. */
export function returnOrigin(browserOrigin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(browserOrigin);
  } catch {
    return PUBLISHED_URL;
  }
  const { protocol, hostname, origin } = parsed;
  const publishedHost = new URL(PUBLISHED_URL).hostname;
  const appDomain = publishedHost.split(".").slice(1).join(".").replaceAll(".", "\\.");
  const previewHost = new RegExp(
    `^id-preview(-[a-z0-9]+)?--${PROJECT_ID}(\\.[a-z0-9-]+)?\\.${appDomain}$`,
  );
  const ownHost = previewHost.test(hostname) || hostname === publishedHost || APP_HOSTS.includes(hostname);
  return protocol === "https:" && ownHost ? origin : PUBLISHED_URL;
}

/** A Paystack reference: letters, digits and dashes only, unique per checkout attempt. */
export function checkoutReference(purchaseId: string, now = Date.now()): string {
  return `rm-${purchaseId.replace(/[^a-zA-Z0-9]/g, "")}-${now.toString(36)}`;
}

/** Only a successful transaction for the exact amount and currency counts as paid. */
export function isPaidTransaction(
  tx: { status?: unknown; amount?: unknown; currency?: unknown },
  expected: { amount_cents: number; currency: string },
): boolean {
  return (
    tx.status === "success" &&
    tx.amount === expected.amount_cents &&
    typeof tx.currency === "string" &&
    tx.currency.toUpperCase() === expected.currency.toUpperCase()
  );
}

/** Paystack sends the buyer to the thank-you page after paying; it adds ?reference=… itself. */
export function thankYouUrl(browserOrigin: string, slug: string): string {
  return `${returnOrigin(browserOrigin)}/thank-you?checkout=${encodeURIComponent(slug)}`;
}
