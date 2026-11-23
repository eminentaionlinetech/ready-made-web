import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Camera, ExternalLink, Package } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initials } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/catalog";
import { avatarUrlQuery, profileQuery, purchasesQuery } from "@/lib/queries";
import { confirmCheckout } from "@/lib/checkout.functions";

// Paystack sends buyers back here with ?reference=… (and trxref) after paying.
type DashboardSearch = { reference?: string; checkout?: string };

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    const ref = search["reference"] ?? search["trxref"];
    const out: DashboardSearch = {};
    if (typeof ref === "string" && ref) out.reference = ref;
    if (typeof search["checkout"] === "string") out.checkout = search["checkout"];
    return out;
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(profileQuery(context.user.id)),
      context.queryClient.ensureQueryData(purchasesQuery(context.user.id)),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Your dashboard — Readymade" },
      { name: "description", content: "Your purchased websites and account details." },
      { property: "og:title", content: "Your dashboard — Readymade" },
      { property: "og:description", content: "Your purchased websites and account details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useSuspenseQuery(profileQuery(user.id));
  const { data: purchases } = useSuspenseQuery(purchasesQuery(user.id));
  const total = purchases.reduce((sum, p) => sum + p.amount_cents, 0);
  const firstName = (profile?.display_name || "").split(" ")[0];
  const confirming = usePaymentReturn(user.id);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12">
      <h1 className="text-4xl font-semibold sm:text-5xl">
        {firstName ? `Hi, ${firstName}` : "Your dashboard"}
      </h1>
      <p className="mt-2 text-muted-foreground">Your websites and account, all in one place.</p>
      {confirming ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="size-2 animate-pulse rounded-full bg-highlight" /> Confirming your payment…
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="flex items-end justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-semibold">Your websites</h2>
            <span className="text-sm text-muted-foreground">
              {purchases.length} owned · {formatPrice(total)} spent
            </span>
          </div>

          {purchases.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-highlight-soft">
                <Package className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">No websites yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Websites you buy will show up here.
              </p>
              <Button asChild className="mt-6">
                <Link to="/">Browse websites</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {purchases.map((p) => (
                <li key={p.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                  {p.website ? (
                    <img
                      src={p.website.image_url}
                      alt=""
                      className="aspect-[3/2] w-full rounded-lg border border-border object-cover object-top sm:w-36"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{p.website?.title ?? "Website"}</div>
                    <div className="truncate text-sm text-muted-foreground">{p.website?.tagline}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Bought {format(new Date(p.created_at), "d MMM yyyy")} ·{" "}
                      {formatPrice(p.amount_cents)}
                    </div>
                  </div>
                  {p.website ? (
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/websites/$slug" params={{ slug: p.website.slug }}>
                          Details
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <a href={p.website.demo_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink /> Demo
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <ProfileCard
          userId={user.id}
          email={user.email ?? ""}
          displayName={profile?.display_name ?? ""}
          avatarPath={profile?.avatar_url ?? null}
        />
      </div>
    </div>
  );
}

function ProfileCard({
  userId,
  email,
  displayName,
  avatarPath,
}: {
  userId: string;
  email: string;
  displayName: string;
  avatarPath: string | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(displayName);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatar = useQuery(avatarUrlQuery(avatarPath));

  useEffect(() => setName(displayName), [displayName]);

  const save = useMutation({
    mutationFn: async (patch: { display_name?: string; avatar_url?: string }) => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "profile", userId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  async function onPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photos must be under 5 MB");
      return;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    save.mutate({ avatar_url: path }, { onSuccess: () => toast.success("Photo updated") });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ display_name: name.trim() }, { onSuccess: () => toast.success("Profile saved") });
  }

  return (
    <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="text-lg font-semibold">Your profile</h2>
      <div className="mt-5 flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-16">
            {avatar.data ? <AvatarImage src={avatar.data} alt="Your photo" /> : null}
            <AvatarFallback className="bg-highlight-soft text-lg font-medium">
              {initials(displayName, email)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-border bg-background shadow-card hover:bg-accent"
            aria-label="Change photo"
          >
            <Camera className="size-3.5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPhoto(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium">{displayName || "Add your name"}</div>
          <div className="truncate text-sm text-muted-foreground">{email}</div>
        </div>
      </div>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <Label htmlFor="display-name">Name</Label>
        <Input
          id="display-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        <Button type="submit" disabled={save.isPending || name.trim() === displayName}>
          Save
        </Button>
      </form>
    </aside>
  );
}

function usePaymentReturn(userId: string) {
  const { reference } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useServerFn(confirmCheckout);
  const [confirming, setConfirming] = useState(Boolean(reference));
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!reference || handled.current === reference) return;
    handled.current = reference;
    setConfirming(true);
    confirm({ data: { reference } })
      .then(async ({ paid }) => {
        if (paid) {
          await queryClient.invalidateQueries({ queryKey: ["me", "purchases", userId] });
          toast.success("Payment received", { description: "Your new website is ready below." });
        } else {
          toast("Payment not completed", {
            description: "We haven't received this payment yet. If you paid, it will appear here shortly.",
          });
        }
      })
      .catch(() => toast.error("Couldn't check your payment", { description: "Please refresh in a moment." }))
      .finally(() => {
        setConfirming(false);
        navigate({ to: "/dashboard", search: {}, replace: true });
      });
  }, [reference, confirm, navigate, queryClient, userId]);

  return confirming;
}
