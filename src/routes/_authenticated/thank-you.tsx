import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Check, CircleAlert, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/download-button";
import { confirmCheckout } from "@/lib/checkout.functions";
import { purchasesQuery } from "@/lib/queries";

type ReturnSearch = { reference?: string; checkout?: string };
export const Route = createFileRoute("/_authenticated/thank-you")({
  validateSearch: (input: Record<string, unknown>): ReturnSearch => {
    const out: ReturnSearch = {};
    const ref = input["reference"] ?? input["trxref"];
    if (typeof ref === "string" && ref) out.reference = ref;
    if (typeof input["checkout"] === "string") out.checkout = input["checkout"];
    return out;
  },
  loaderDeps: ({ search }) => ({ reference: search.reference }),
  loader: async ({ deps, context }) => {
    if (!deps.reference) return { paid: false, purchaseId: null, slug: null, error: false };
    try {
      const result = await confirmCheckout({ data: { reference: deps.reference } });
      if (result.paid) await context.queryClient.invalidateQueries({ queryKey: purchasesQuery(context.user.id).queryKey });
      return { ...result, error: false };
    } catch {
      return { paid: false, purchaseId: null, slug: null, error: true };
    }
  },
  head: () => ({ meta: [
    { title: "Your purchase — Readymade" },
    { name: "description", content: "Your Readymade purchase confirmation and secure website download." },
    { property: "og:title", content: "Your purchase — Readymade" },
    { property: "og:description", content: "Your Readymade purchase confirmation and secure website download." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  pendingComponent: () => <div className="mx-auto max-w-lg px-5 py-20 text-center" role="status"><Loader2 className="mx-auto size-8 animate-spin motion-reduce:animate-none text-highlight" /><h1 className="mt-5 text-2xl font-semibold">Confirming your payment…</h1></div>,
  component: ThankYou,
});
function ThankYou() {
  const { paid, purchaseId, error } = Route.useLoaderData();
  const { reference } = Route.useSearch();
  const router = useRouter();
  const busy = Route.useMatch().status === "pending";
  return (
    <div className="mx-auto max-w-xl px-5 py-14 text-center sm:py-24">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-highlight-soft text-highlight">
        {paid ? <Check className="size-8" /> : <CircleAlert className="size-8" />}
      </div>
      <h1 className="mt-6 text-4xl font-semibold leading-tight">{paid ? "Thank you for your purchase!" : error ? "We couldn’t check your payment" : reference ? "Payment not confirmed yet" : "Your purchase confirmation"}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{paid ? "Payment received. Your website is now yours." : reference ? "If you’ve paid, please check again in a moment. Your purchase will appear in your dashboard once it’s confirmed." : "Open your dashboard to see your purchased websites."}</p>
      <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {paid && purchaseId ? <DownloadButton purchaseId={purchaseId} title="your website" /> : reference ? <Button variant="outline" disabled={busy} onClick={() => void router.invalidate()}><RefreshCw /> Check again</Button> : null}
        <Button asChild><Link to="/dashboard" search={{}}>Your dashboard <ArrowRight /></Link></Button>
      </div>
      <Button asChild variant="ghost" className="mt-5"><Link to="/">Continue browsing</Link></Button>
    </div>
  );
}
