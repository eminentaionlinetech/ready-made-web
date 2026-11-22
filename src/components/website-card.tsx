import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { formatPrice, type Website } from "@/lib/catalog";
import { BrowserFrame } from "./browser-frame";

export function WebsiteCard({ website }: { website: Website }) {
  return (
    <Link
      to="/websites/$slug"
      params={{ slug: website.slug }}
      className="group flex flex-col gap-4 rounded-2xl p-2 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <BrowserFrame className="shadow-card transition-shadow duration-300 group-hover:shadow-lift">
        <div className="aspect-[3/2] overflow-hidden">
          <img
            src={website.image_url}
            alt={`${website.title} website preview`}
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      </BrowserFrame>
      <div className="flex items-start justify-between gap-4 px-1 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{website.title}</h3>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{website.tagline}</p>
          <span className="mt-3 inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {website.category}
          </span>
        </div>
        <span className="font-display text-lg font-semibold">{formatPrice(website.price_cents)}</span>
      </div>
    </Link>
  );
}
