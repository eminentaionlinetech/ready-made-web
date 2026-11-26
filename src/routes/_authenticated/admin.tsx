import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { FileArchive, ImagePlus, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { categoriesFrom, formatPrice } from "@/lib/catalog";
import {
  isZipFile,
  koboToNairaInput,
  MAX_SCREENSHOT_BYTES,
  MAX_ZIP_BYTES,
  nairaToKobo,
  parseFeatures,
  safeFileName,
  slugify,
  taglineFrom,
  validateListing,
  type ListingErrors,
} from "@/lib/listing";
import { adminListingsQuery, isAdminQuery, type AdminListing } from "@/lib/queries";
import { isStoredPath, SCREENSHOT_BUCKET } from "@/lib/screenshots";

const FILES_BUCKET = "website-files";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    // Access is decided by the protected role list; listing changes are also blocked server-side.
    const isAdmin = await context.queryClient.fetchQuery(isAdminQuery(context.user.id));
    if (!isAdmin) throw redirect({ to: "/dashboard", search: {} });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(adminListingsQuery()),
  head: () => ({
    meta: [
      { title: "Manage listings — Readymade admin" },
      { name: "description", content: "Add and edit the websites listed in the Readymade shop." },
      { property: "og:title", content: "Manage listings — Readymade admin" },
      { property: "og:description", content: "Add and edit the websites listed in the Readymade shop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: listings } = useSuspenseQuery(adminListingsQuery());
  const [editing, setEditing] = useState<AdminListing | "new" | null>(null);
  const [removing, setRemoving] = useState<AdminListing | null>(null);
  const categories = useMemo(() => categoriesFrom(listings), [listings]);
  const refresh = useRefreshListings();

  async function remove(listing: AdminListing) {
    const { error } = await supabase.from("websites").delete().eq("id", listing.id);
    if (error) {
      toast.error("Couldn't remove listing", {
        description:
          error.code === "23503"
            ? "Someone has bought or started buying this website, so it has to stay."
            : error.message,
      });
      return;
    }
    const shots = Array.from(new Set([listing.image_url, ...listing.screenshots].filter(isStoredPath)));
    await Promise.all([
      shots.length ? supabase.storage.from(SCREENSHOT_BUCKET).remove(shots) : null,
      listing.file_path ? supabase.storage.from(FILES_BUCKET).remove([listing.file_path]) : null,
    ]);
    await refresh(listing.slug);
    toast.success(`${listing.title} removed`);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-highlight-soft px-2.5 py-0.5 text-xs font-medium">
            Admin only
          </span>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Listings</h1>
          <p className="mt-2 text-muted-foreground">
            {listings.length} websites in the shop. Only you can see this page.
          </p>
        </div>
        <Button size="lg" onClick={() => setEditing("new")}>
          <Plus /> New listing
        </Button>
      </div>

      {listings.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <h2 className="text-lg font-semibold">No listings yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add your first website to start selling.</p>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {listings.map((l) => (
            <li key={l.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
              <img
                src={l.previews[l.image_url] ?? l.image_url}
                alt=""
                className="aspect-[3/2] w-full rounded-lg border border-border object-cover object-top sm:w-36"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{l.title}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {l.category}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatPrice(l.price_cents)} · {l.screenshots.length || 1} screenshot
                  {(l.screenshots.length || 1) === 1 ? "" : "s"} ·{" "}
                  {l.file_path ? (
                    <span>zip uploaded</span>
                  ) : (
                    <span className="text-destructive">no zip file yet</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/websites/$slug" params={{ slug: l.slug }}>
                    View
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(l)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${l.title}`}
                  onClick={() => setRemoving(l)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editing === "new" ? "New listing" : "Edit listing"}</SheetTitle>
            <SheetDescription>
              Everything here shows on the shop page, except the zip file — only paying buyers get that.
            </SheetDescription>
          </SheetHeader>
          {editing !== null ? (
            <ListingForm
              key={editing === "new" ? "new" : editing.id}
              listing={editing === "new" ? null : editing}
              categories={categories}
              takenSlugs={listings
                .filter((l) => editing === "new" || l.id !== editing.id)
                .map((l) => l.slug)}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from the shop and its screenshots and zip file will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) void remove(removing);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function useRefreshListings() {
  const queryClient = useQueryClient();
  return async (slug?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "admin", "listings"] }),
      queryClient.invalidateQueries({ queryKey: ["websites"] }),
      slug ? queryClient.invalidateQueries({ queryKey: ["website", slug] }) : Promise.resolve(),
    ]);
  };
}

type Shot = { key: string; stored: string | null; file: File | null; preview: string };

function ListingForm({
  listing,
  categories,
  takenSlugs,
  onDone,
}: {
  listing: AdminListing | null;
  categories: string[];
  takenSlugs: string[];
  onDone: () => void;
}) {
  const refresh = useRefreshListings();
  const [title, setTitle] = useState(listing?.title ?? "");
  const [slug, setSlug] = useState(listing?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(listing));
  const [category, setCategory] = useState(listing?.category ?? "");
  const [price, setPrice] = useState(listing ? koboToNairaInput(listing.price_cents) : "");
  const [demoUrl, setDemoUrl] = useState(listing?.demo_url ?? "");
  const [tagline, setTagline] = useState(listing?.tagline ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [features, setFeatures] = useState((listing?.features ?? []).join("\n"));
  const [pages, setPages] = useState(String(listing?.page_count ?? 1));
  const [shots, setShots] = useState<Shot[]>(() => {
    if (!listing) return [];
    const values = listing.screenshots.length ? listing.screenshots : [listing.image_url];
    return values.map((v) => ({ key: v, stored: v, file: null, preview: listing.previews[v] ?? v }));
  });
  const [zip, setZip] = useState<File | null>(null);
  const [errors, setErrors] = useState<ListingErrors>({});
  const [saving, setSaving] = useState(false);
  const shotInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  // Free the in-browser previews of newly picked images when the form closes.
  const shotsRef = useRef(shots);
  shotsRef.current = shots;
  useEffect(
    () => () => {
      for (const s of shotsRef.current) if (s.file) URL.revokeObjectURL(s.preview);
    },
    [],
  );

  function addShots(files: FileList | null) {
    if (!files) return;
    const next: Shot[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} isn't an image`);
        continue;
      }
      if (file.size > MAX_SCREENSHOT_BYTES) {
        toast.error(`${file.name} is over 10 MB`);
        continue;
      }
      next.push({ key: `${file.name}-${file.size}-${Math.random()}`, stored: null, file, preview: URL.createObjectURL(file) });
    }
    setShots((s) => [...s, ...next].slice(0, 12));
  }

  function pickZip(file: File | undefined) {
    if (!file) return;
    if (!isZipFile(file)) {
      toast.error("Please choose a .zip file");
      return;
    }
    if (file.size > MAX_ZIP_BYTES) {
      toast.error("The zip file must be under 50 MB");
      return;
    }
    setZip(file);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const finalSlug = slugify(slug || title);
    const found = validateListing({
      title,
      slug: finalSlug,
      category,
      price,
      demoUrl,
      description,
      screenshotCount: shots.length,
      hasZip: Boolean(zip || listing?.file_path),
    });
    if (finalSlug && takenSlugs.includes(finalSlug)) found.slug = "Another listing already uses this web address";
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    const id = listing?.id ?? crypto.randomUUID();
    const uploadedShots: string[] = [];
    let uploadedZip: string | null = null;
    try {
      const stamp = Date.now();
      const paths: string[] = [];
      for (const [i, s] of shots.entries()) {
        if (s.stored) {
          paths.push(s.stored);
          continue;
        }
        if (!s.file) continue;
        const path = `${id}/${stamp}-${i}-${safeFileName(s.file.name)}`;
        const { error } = await supabase.storage
          .from(SCREENSHOT_BUCKET)
          .upload(path, s.file, { contentType: s.file.type });
        if (error) throw new Error(`Screenshot upload failed: ${error.message}`);
        uploadedShots.push(path);
        paths.push(path);
      }

      let filePath = listing?.file_path ?? null;
      if (zip) {
        const path = `${id}/${stamp}-${safeFileName(zip.name)}`;
        const { error } = await supabase.storage
          .from(FILES_BUCKET)
          .upload(path, zip, { contentType: "application/zip" });
        if (error) throw new Error(`Zip upload failed: ${error.message}`);
        uploadedZip = path;
        filePath = path;
      }

      const row = {
        title: title.trim(),
        slug: finalSlug,
        category: category.trim(),
        price_cents: nairaToKobo(price) ?? 0,
        demo_url: demoUrl.trim(),
        tagline: tagline.trim() || taglineFrom(description),
        description: description.trim(),
        features: parseFeatures(features),
        page_count: Math.max(1, Math.min(200, Number.parseInt(pages, 10) || 1)),
        image_url: paths[0] ?? "",
        screenshots: paths,
        file_path: filePath,
      };
      const { error } = listing
        ? await supabase.from("websites").update(row).eq("id", id)
        : await supabase.from("websites").insert({ id, ...row });
      if (error) {
        throw new Error(
          error.code === "23505" ? "Another listing already uses this web address" : error.message,
        );
      }

      // Tidy up files this listing no longer uses.
      if (listing) {
        const before = [listing.image_url, ...listing.screenshots].filter(isStoredPath);
        const dropped = Array.from(new Set(before.filter((p) => !paths.includes(p))));
        if (dropped.length) await supabase.storage.from(SCREENSHOT_BUCKET).remove(dropped);
        if (uploadedZip && listing.file_path) await supabase.storage.from(FILES_BUCKET).remove([listing.file_path]);
      }

      await refresh(finalSlug);
      if (listing && listing.slug !== finalSlug) await refresh(listing.slug);
      toast.success(listing ? "Listing updated" : "Listing published", { description: row.title });
      onDone();
    } catch (err) {
      if (uploadedShots.length) await supabase.storage.from(SCREENSHOT_BUCKET).remove(uploadedShots);
      if (uploadedZip) await supabase.storage.from(FILES_BUCKET).remove([uploadedZip]);
      toast.error("Couldn't save listing", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 pb-8 pt-2" noValidate>
      <Field id="title" label="Title" error={errors.title}>
        <Input
          id="title"
          value={title}
          maxLength={80}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="Website title"
        />
      </Field>

      <Field id="slug" label="Web address" error={errors.slug} hint={`/websites/${slugify(slug || title) || "…"}`}>
        <Input
          id="slug"
          value={slug}
          maxLength={80}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          onBlur={() => setSlug(slugify(slug))}
          placeholder="website-address"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="category" label="Category" error={errors.category}>
          <Input
            id="category"
            list="category-options"
            value={category}
            maxLength={40}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="SaaS"
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field id="price" label="Price (₦)" error={errors.price}>
          <Input
            id="price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price in naira"
          />
        </Field>
      </div>

      <Field id="demo" label="Live demo link" error={errors.demoUrl}>
        <Input
          id="demo"
          type="url"
          value={demoUrl}
          onChange={(e) => setDemoUrl(e.target.value)}
          placeholder="Live demo URL"
        />
      </Field>

      <Field id="tagline" label="Short tagline" hint="Optional — shown under the title on cards.">
        <Input
          id="tagline"
          value={tagline}
          maxLength={120}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="One line about the website"
        />
      </Field>

      <Field id="description" label="Description" error={errors.description}>
        <Textarea
          id="description"
          rows={5}
          value={description}
          maxLength={4000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
        <Field id="features" label="What's included" hint="Optional — one item per line.">
          <Textarea id="features" rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} />
        </Field>
        <Field id="pages" label="Pages">
          <Input id="pages" type="number" min={1} max={200} value={pages} onChange={(e) => setPages(e.target.value)} />
        </Field>
      </div>

      <Field id="screenshots" label="Screenshots" error={errors.screenshotCount} hint="The first one is the cover image.">
        <div className="grid grid-cols-3 gap-3">
          {shots.map((s, i) => (
            <div key={s.key} className="group relative overflow-hidden rounded-lg border border-border">
              <img src={s.preview} alt={`Screenshot ${i + 1}`} className="aspect-[3/2] w-full object-cover object-top" />
              {i === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={`Make screenshot ${i + 1} the cover`}
                  onClick={() => setShots((all) => [s, ...all.filter((x) => x.key !== s.key)])}
                  className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-background/90 shadow-card"
                >
                  <Star className="size-3" />
                </button>
              )}
              <button
                type="button"
                aria-label={`Remove screenshot ${i + 1}`}
                onClick={() => {
                  if (s.file) URL.revokeObjectURL(s.preview);
                  setShots((all) => all.filter((x) => x.key !== s.key));
                }}
                className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-background/90 shadow-card"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => shotInput.current?.click()}
            className="grid aspect-[3/2] place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-accent"
          >
            <span className="flex flex-col items-center gap-1">
              <ImagePlus className="size-5" /> Add
            </span>
          </button>
        </div>
        <input
          id="screenshots"
          ref={shotInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addShots(e.target.files);
            e.target.value = "";
          }}
        />
      </Field>

      <Field id="zip" label="Website files (.zip)" error={errors.hasZip} hint="Only buyers who paid can download this.">
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <FileArchive className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 truncate text-sm">
            {zip
              ? `${zip.name} (${(zip.size / (1024 * 1024)).toFixed(1)} MB)`
              : listing?.file_path
                ? `Current: ${listing.file_path.split("/").pop()}`
                : "No file chosen"}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => zipInput.current?.click()}>
            {zip || listing?.file_path ? "Replace" : "Choose zip"}
          </Button>
        </div>
        <input
          id="zip"
          ref={zipInput}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(e) => {
            pickZip(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <Button type="submit" size="lg" className="flex-1" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {saving ? "Saving…" : listing ? "Save changes" : "Publish listing"}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
