"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  Search,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string;
  role: string;
};

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function Topbar({
  onOpenMobileNav,
}: {
  onOpenMobileNav: () => void;
}) {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setLoadingProfile(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (!error && data && active) {
        setProfile({
          full_name: data.full_name,
          role: data.role,
        });
      }

      if (active) {
        setLoadingProfile(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setMenuOpen(false);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  const displayName = profile?.full_name || "PropFlow User";
  const displayRole = profile?.role
    ? formatRole(profile.role)
    : loadingProfile
      ? "Loading..."
      : "";

  return (
    <header
      className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/75 lg:px-6"
      style={{ height: "var(--header-height)" }}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex size-8 items-center justify-center rounded-[var(--radius-control)] text-ink-600 hover:bg-surface-sunken lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-[18px]" />
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-[15px] -translate-y-1/2 text-ink-400" />

        <Input
          placeholder="Search leads, properties, deals…"
          className="h-8 pl-8 text-[12.5px]"
          aria-label="Global search"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <Button size="sm" className="hidden sm:inline-flex">
          <Plus className="size-[15px]" />
          Quick add
        </Button>

        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-[var(--radius-control)] text-ink-600 hover:bg-surface-sunken"
          aria-label="Notifications"
        >
          <Bell className="size-[17px]" />
        </button>

        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-[var(--radius-control)] py-1 pl-1 pr-2 hover:bg-surface-sunken"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Avatar name={displayName} size="sm" />

            <div className="hidden leading-tight md:block">
              <p className="text-[12.5px] font-medium text-ink-900">
                {displayName}
              </p>

              <p className="text-[11px] text-ink-400">
                {displayRole}
              </p>
            </div>

            <ChevronDown className="hidden size-3.5 text-ink-400 md:block" />
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
              role="menu"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-medium text-ink-900">
                  {displayName}
                </p>

                <p className="mt-0.5 text-xs text-ink-400">
                  {displayRole}
                </p>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-surface-sunken"
                  role="menuitem"
                >
                  <User className="size-4" />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
                  role="menuitem"
                >
                  <LogOut className="size-4" />
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}