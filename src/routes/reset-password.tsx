import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Readymade" },
      { name: "description", content: "Set a new password for your Readymade account." },
      { property: "og:title", content: "Choose a new password — Readymade" },
      { property: "og:description", content: "Set a new password for your Readymade account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-24">
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-muted-foreground">Pick something you haven't used before.</p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <Button type="submit" size="lg" disabled={busy}>Save password</Button>
      </form>
    </div>
  );
}
