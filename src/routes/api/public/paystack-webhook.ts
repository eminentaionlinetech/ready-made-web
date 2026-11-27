import { createFileRoute } from "@tanstack/react-router";
import { isValidPaystackSignature } from "@/lib/paystack-signature";

// Paystack calls this after a payment. The signature is checked first; then the
// reference is re-verified with Paystack before anything is marked paid.
export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env["PAYSTACK_SECRET_KEY"];
        if (!secretKey) {
          console.error("PAYSTACK_SECRET_KEY is not set");
          return new Response("not configured", { status: 500 });
        }
        const raw = await request.text();
        const ok = await isValidPaystackSignature(raw, request.headers.get("x-paystack-signature"), secretKey);
        if (!ok) return new Response("invalid signature", { status: 401 });

        let body: { event?: unknown; data?: { reference?: unknown } } | null = null;
        try {
          body = JSON.parse(raw);
        } catch {
          return new Response("ok", { status: 200 });
        }
        const reference = body?.data?.reference;
        if (
          body?.event === "charge.success" &&
          typeof reference === "string" &&
          reference.length <= 100 &&
          /^[A-Za-z0-9.=-]+$/.test(reference)
        ) {
          try {
            const { confirmPayment } = await import("@/lib/paystack.server");
            await confirmPayment(reference);
          } catch (err) {
            console.error("Paystack webhook failed", err);
            return new Response("retry", { status: 500 });
          }
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
