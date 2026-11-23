import { createFileRoute } from "@tanstack/react-router";

// Paystack calls this after a payment. The body is only a hint: the reference is
// re-checked with Paystack before anything is marked paid.
export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as
          | { event?: unknown; data?: { reference?: unknown } }
          | null;
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
