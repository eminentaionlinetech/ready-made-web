import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { WebsiteCard } from "@/components/website-card";
import { categoriesFrom, browseWebsites } from "@/lib/catalog";
import { websitesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

type HomeSearch = { category?: string; q?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const category = search["category"];
    const out: HomeSearch = {};
    if (typeof category === "string" && category) out.category = category;
    if (typeof search["q"] === "string" && search["q"]) out.q = search["q"];
    return out;
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(websitesQuery()),
  head: () => ({
    meta: [
      { title: "Readymade — Pre-built websites ready to launch" },
      {
        name: "description",
        content:
          "Browse pre-built websites for SaaS, portfolios, restaurants, agencies, shops and blogs. Preview the live demo and buy in minutes.",
      },
      { property: "og:title", content: "Readymade — Pre-built websites ready to launch" },
      {
        property: "og:description",
        content: "Browse pre-built websites, preview the live demo and buy in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { category, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { data: websites } = useSuspenseQuery(websitesQuery());
  const categories = categoriesFrom(websites);
  const visible = browseWebsites(websites, { category, q });

  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="pb-8 pt-8 sm:pb-12 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-highlight-soft px-3 py-1 text-xs font-medium">
          <span className="size-1.5 rounded-full bg-highlight" />
          {websites.length} websites ready to launch
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-7xl">
          Your next website, <span className="text-highlight">already built.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Hand-crafted, fully responsive websites you can preview live, buy once and launch the same
          day.
        </p>
      </section>

      <section aria-label="Websites for sale">
        <div className="border-b border-border pb-5">
          <div className="relative mb-4 max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search websites"
              placeholder="Search websites…"
              value={q ?? ""}
              className="h-11 pl-10 pr-11 text-base"
              onChange={(event) => {
                const value = event.target.value;
                void navigate({ search: (prev) => { const { q: _q, ...rest } = prev; return { ...rest, ...(value ? { q: value } : {}) }; }, replace: true, resetScroll: false });
              }}
            />
            {q ? (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-9" aria-label="Clear search" onClick={() => void navigate({ search: (prev) => { const { q: _q, ...rest } = prev; return rest; }, replace: true, resetScroll: false })}>
                <X />
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Categories">
            {["All", ...categories].map((c) => {
              const active = c === "All" ? !category : category?.toLowerCase() === c.toLowerCase();
              return (
                <Button asChild key={c} variant={active ? "default" : "outline"} className="h-11 shrink-0 rounded-full px-4">
                  <Link to="/" search={(prev) => { const { category: _category, ...rest } = prev; return { ...rest, ...(c === "All" ? {} : { category: c }) }; }} resetScroll={false} aria-current={active ? "true" : undefined}>{c}</Link>
                </Button>
              );
            })}
          </div>
        </div>
        <p className="pt-5 text-sm text-muted-foreground" role="status" aria-live="polite">
          {visible.length} {visible.length === 1 ? "website" : "websites"}{q ? ` matching “${q}”` : ""}
        </p>

        {visible.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No websites found</h2>
            <Button asChild variant="outline" className="mt-5">
              <Link to="/" search={{}} resetScroll={false}>Clear filters</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-10 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((w) => (
              <WebsiteCard key={w.id} website={w} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
