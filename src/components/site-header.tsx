import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import logoMark from "@/assets/readymade-mark.png.asset.json";
import { useAuth } from "@/lib/auth";
import { avatarUrlQuery, isAdminQuery, profileQuery } from "@/lib/queries";

export function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function SiteHeader() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const profile = useQuery({ ...profileQuery(user?.id ?? ""), enabled: Boolean(user) });
  const avatar = useQuery(avatarUrlQuery(profile.data?.avatar_url));
  const isAdmin = useQuery({ ...isAdminQuery(user?.id ?? ""), enabled: Boolean(user) });

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoMark.url} alt="" className="size-8" width={32} height={32} />
          <span className="font-display text-lg font-semibold tracking-tight">Readymade</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/" activeOptions={{ exact: true, includeSearch: false }}>
              Browse
            </Link>
          </Button>
          {loading ? (
            <div className="size-8" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-8">
                  {avatar.data ? <AvatarImage src={avatar.data} alt="" /> : null}
                  <AvatarFallback className="bg-highlight-soft text-xs font-medium">
                    {initials(profile.data?.display_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Account menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="truncate text-sm font-medium">
                    {profile.data?.display_name || "Your account"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard" })}>
                  <LayoutDashboard /> Dashboard
                </DropdownMenuItem>
                {isAdmin.data ? (
                  <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })}>
                    <ShieldCheck /> Manage listings
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onSelect={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="ml-1">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <img src={logoMark.url} alt="" className="size-6" width={24} height={24} />
          <span className="font-display font-semibold text-foreground">Readymade</span> — websites
          ready to launch.
        </span>
        <span>© {new Date().getFullYear()} Readymade</span>
      </div>
    </footer>
  );
}
