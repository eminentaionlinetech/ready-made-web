import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { WebsiteCard } from "@/components/website-card";
import { categoriesFrom, filterByCategory } from "@/lib/catalog";
import { websitesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type HomeSearch = { category?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const category = search["category"];
    return typeof category === "string" && category.length > 0 ? { category } : {};
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

const chipClass =
  "rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Home() {
  const { category } = Route.useSearch();
  const { data: websites } = useSuspenseQuery(websitesQuery());
  const categories = categoriesFrom(websites);
  const visible = filterByCategory(websites, category);

  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="pb-12 pt-16 sm:pt-24">
        <p className="inline-flex items-center gap-2 rounded-full bg-highlight-soft px-3 py-1 text-xs font-medium">
          <span className="size-1.5 rounded-full bg-highlight" />
          {websites.length} websites ready to launch
        </p>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.02] sm:text-7xl">
          Your next website, <span className="text-highlight">already built.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Hand-crafted, fully responsive websites you can preview live, buy once and launch the same
          day.
        </p>
      </section>

      <section aria-label="Websites for sale">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-6">
          <Link
            to="/"
            search={{}}
            resetScroll={false}
            className={cn(
              chipClass,
              !category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent",
            )}
          >
            All
          </Link>
          {categories.map((c) => {
            const active = category?.toLowerCase() === c.toLowerCase();
            return (
              <Link
                key={c}
                to="/"
                search={{ category: c }}
                resetScroll={false}
                className={cn(
                  chipClass,
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                {c}
              </Link>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            No websites in this category yet.{" "}
            <Link to="/" search={{}} className="text-foreground underline underline-offset-4">
              See all websites
            </Link>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-10 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((w) => (
              <WebsiteCard key={w.id} website={w} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
