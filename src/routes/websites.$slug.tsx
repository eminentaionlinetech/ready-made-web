import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, ExternalLink, Layers, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrowserFrame } from "@/components/browser-frame";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/catalog";
import { purchasesQuery, websiteQuery } from "@/lib/queries";
import { startCheckout } from "@/lib/checkout.functions";

export const Route = createFileRoute("/websites/$slug")({
  loader: async ({ context, params }) => {
    const website = await context.queryClient.ensureQueryData(websiteQuery(params.slug));
    if (!website) throw notFound();
    return website;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Website not found — Readymade" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} — ${loaderData.category} website | Readymade`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.tagline },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.tagline },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-5 py-32 text-center">
      <h1 className="text-3xl font-semibold">Website not found</h1>
      <p className="mt-2 text-muted-foreground">This listing may have been removed.</p>
      <Button asChild className="mt-6">
        <Link to="/">Browse websites</Link>
      </Button>
    </div>
  ),
  component: WebsiteDetail,
});

function WebsiteDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(websiteQuery(slug));
  const { user } = useAuth();
  const purchases = useQuery({ ...purchasesQuery(user?.id ?? ""), enabled: Boolean(user) });
  const [shown, setShown] = useState(0);
  if (!data) return null;
  const website = data;
  const gallery = website.screenshots.length ? website.screenshots : [website.image_url];
  const owned = purchases.data?.some((p) => p.website?.slug === website.slug) ?? false;
  const checkout = useServerFn(startCheckout);
  const [paying, setPaying] = useState(false);

  async function buy() {
    setPaying(true);
    try {
      const result = await checkout({ data: { slug: website.slug, origin: window.location.origin } });
      if (result.status === "owned") {
        await purchases.refetch();
        setPaying(false);
        return;
      }
      // Paystack's payment page can't open inside the editor preview frame, so use a new tab there.
      if (window.self !== window.top) {
        window.open(result.authorizationUrl, "_blank", "noopener");
        setPaying(false);
      } else {
        window.location.assign(result.authorizationUrl);
      }
    } catch (err) {
      setPaying(false);
      toast.error("Couldn't start checkout", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All websites
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <BrowserFrame className="shadow-lift" label={`${website.slug}.demo`}>
            <img
              src={gallery[shown] ?? website.image_url}
              alt={`${website.title} website preview`}
              className="aspect-[3/2] w-full object-cover object-top"
            />
          </BrowserFrame>
          {gallery.length > 1 ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {gallery.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setShown(i)}
                  aria-label={`Show screenshot ${i + 1}`}
                  aria-pressed={i === shown}
                  className={`w-28 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === shown ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="aspect-[3/2] w-full object-cover object-top" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <span className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {website.category}
          </span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">{website.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{website.tagline}</p>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-4xl font-semibold">
                {formatPrice(website.price_cents)}
              </span>
              <span className="text-sm text-muted-foreground">One-time payment</span>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              {owned ? (
                <Button asChild size="lg" className="w-full">
                  <Link to="/dashboard">
                    <Check /> You own this — open dashboard
                  </Link>
                </Button>
              ) : user ? (
                <Button
                  size="lg"
                  className="w-full bg-highlight text-highlight-foreground hover:bg-highlight/90"
                  disabled={paying}
                  onClick={buy}
                >
                  {paying ? <Loader2 className="animate-spin" /> : <ShoppingBag />}
                  {paying ? "Opening checkout…" : "Buy now"}
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-highlight text-highlight-foreground hover:bg-highlight/90"
                >
                  <Link to="/auth" search={{ redirect: `/websites/${website.slug}` }}>
                    <ShoppingBag /> Buy now
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="w-full">
                <a href={website.demo_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink /> View live demo
                </a>
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="size-4" /> {website.page_count} pages included
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-16 grid gap-10 border-t border-border pt-12 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="text-2xl font-semibold">About this website</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{website.description}</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold">What's included</h2>
          <ul className="mt-4 space-y-3">
            {website.features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-highlight-soft">
                  <Check className="size-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
