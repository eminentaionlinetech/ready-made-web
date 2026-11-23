<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Catalog reads go through public server functions in `src/lib/websites.functions.ts` (publishable key, anon SELECT policy) so pages render with data on first load.
- Purchases are only inserted by trusted server code (service role, e.g. a payment webhook); buyers can only read their own rows.
- Profile photos live in the private `avatars` bucket under `<userId>/`; display them via short-lived signed links.
- `websites.file_path` is not granted to anon/authenticated (column-level SELECT grants); always select explicit columns, never `*`. Site files live in the private `website-files` bucket, readable only via `public.owns_website_file()` (paid purchase).
- Paystack checkout: `startCheckout`/`confirmCheckout` in `src/lib/checkout.functions.ts`; only `confirmPayment()` in `src/lib/paystack.server.ts` marks a purchase paid, after re-verifying the reference with Paystack (amount + currency). The webhook at `/api/public/paystack-webhook` treats its body as a hint only. Purchases start `pending`; buyer-facing reads filter `status = 'paid'`.
- Admin access uses `public.user_roles` + `public.has_role()`; admins come only from the service-role-only `public.admin_invites` email list, granted once the email is verified. Listing writes go through the browser client and are enforced by admin-only RLS on `websites` and storage.
- Uploaded screenshots live in the private `website-screenshots` bucket (public buckets are blocked in this workspace); `websites.image_url`/`screenshots` store paths, swapped for signed links via `src/lib/screenshots.ts` on every read.
