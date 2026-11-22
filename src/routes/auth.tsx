import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderButtons } from "@/components/provider-buttons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { safeRedirect } from "@/lib/catalog";

type AuthSearch = { redirect?: string };
const REDIRECT_KEY = "readymade:after-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    const r = search["redirect"];
    return typeof r === "string" && r ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — Readymade" },
      { name: "description", content: "Sign in or create a Readymade account to buy websites and see your purchases." },
      { property: "og:title", content: "Sign in — Readymade" },
      { property: "og:description", content: "Sign in or create an account to buy websites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Remember where the buyer was headed, so it survives a Google/Lovable round-trip.
  useEffect(() => {
    if (search.redirect) sessionStorage.setItem(REDIRECT_KEY, safeRedirect(search.redirect));
  }, [search.redirect]);

  const goNext = () => {
    const target = safeRedirect(search.redirect ?? sessionStorage.getItem(REDIRECT_KEY));
    sessionStorage.removeItem(REDIRECT_KEY);
    navigate({ href: target, replace: true });
  };

  useEffect(() => {
    if (user) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) setSentTo(email);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentTo(email);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="mx-auto max-w-sm px-5 py-24 text-center">
        <h1 className="text-3xl font-semibold">Check your email</h1>
        <p className="mt-3 text-muted-foreground">
          We sent a link to <span className="font-medium text-foreground">{sentTo}</span>.{" "}
          {mode === "forgot" ? "Open it to choose a new password." : "Open it to confirm your account."}
        </p>
        <Button variant="outline" className="mt-8" onClick={() => { setSentTo(null); setMode("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  const heading =
    mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";

  return (
    <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold">{heading}</h1>
      <p className="mt-2 text-muted-foreground">
        {mode === "forgot"
          ? "Enter your email and we'll send you a reset link."
          : "Buy websites and find all your purchases in one place."}
      </p>

      {mode !== "forgot" ? (
        <>
          <div className="mt-8">
            <ProviderButtons onSignedIn={goNext} />
          </div>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : (
        <div className="mt-8" />
      )}

      <form onSubmit={onSubmit} className="grid gap-4">
        {mode === "signup" ? (
          <div className="grid gap-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        {mode !== "forgot" ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" ? (
                <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-foreground">
                  Forgot password?
                </button>
              ) : null}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        ) : null}
        <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button type="button" onClick={() => setMode("signup")} className="font-medium text-foreground underline underline-offset-4">
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("signin")} className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
