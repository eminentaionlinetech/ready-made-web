import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isPaidTransaction } from "./checkout";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/paystack";

export class PaystackError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function paystack(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["PAYSTACK_CONNECTION_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Paystack is not configured");
  const response = await fetch(`${GATEWAY_URL}/${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status) {
    console.error(`Paystack ${path} failed [${response.status}]`, payload);
    throw new PaystackError(
      response.status,
      payload?.code,
      `Paystack ${path} failed [${response.status}]: ${payload?.message ?? "no response body"}`,
    );
  }
  return payload.data;
}

/**
 * The single place that decides a purchase is paid: look the reference up with
 * Paystack and compare amount and currency with what we asked for.
 */
export async function confirmPayment(reference: string): Promise<{ paid: boolean }> {
  const { data: purchase, error } = await supabaseAdmin
    .from("purchases")
    .select("id, status, amount_cents, currency")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!purchase) return { paid: false };
  if (purchase.status === "paid") return { paid: true };

  let tx: { id?: number; status?: string; amount?: number; currency?: string; paid_at?: string };
  try {
    tx = await paystack(`transaction/verify/${encodeURIComponent(reference)}`);
  } catch (err) {
    if (err instanceof PaystackError && err.status === 400) return { paid: false };
    throw err;
  }
  if (!isPaidTransaction(tx, purchase)) return { paid: false };

  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("purchases")
    .update({
      status: "paid",
      paid_at: tx.paid_at ?? now,
      paystack_transaction_id: typeof tx.id === "number" ? tx.id : null,
      updated_at: now,
    })
    .eq("id", purchase.id)
    .eq("status", "pending");
  if (updateError) throw new Error(updateError.message);
  return { paid: true };
}
