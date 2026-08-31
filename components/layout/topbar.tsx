"use client";

import {
  Bell,
  CalendarDays,
  ChevronDown,
  FilePlus2,
  Home,
  LogOut,
  Menu,
  Plus,
  Search,
  User,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string;
  role: string;
};

type SearchLead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  preferred_location: string | null;
};

type SearchProperty = {
  id: string;
  title: string;
  location: string;
  address: string | null;
  property_type: string;
};

type SearchDeal = {
  id: string;
  lead_id: string;
  deal_value: number | null;
  currency: string;
  status: string;
};

type SearchAppointment = {
  id: string;
  lead_id: string;
  scheduled_at: string;
  type: string;
  status: string;
};

type SearchResults = {
  leads: SearchLead[];
  properties: SearchProperty[];
  deals: SearchDeal[];
  appointments: SearchAppointment[];
};

function emptySearchResults(): SearchResults {
  return {
    leads: [],
    properties: [],
    deals: [],
    appointments: [],
  };
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatMoney(
  value: number | null,
  currency: string,
) {
  if (value == null) {
    return "—";
  }

  return `${currency} ${Number(
    value,
  ).toLocaleString()}`;
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

export function Topbar({
  onOpenMobileNav,
}: {
  onOpenMobileNav: () => void;
}) {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [profile, setProfile] =
    useState<Profile | null>(
      null,
    );

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [quickAddOpen, setQuickAddOpen] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<SearchResults>(
      emptySearchResults(),
    );

  const [searching, setSearching] =
    useState(false);

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [signingOut, setSigningOut] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setLoadingProfile(false);
        }

        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .select(
            "full_name, role",
          )
          .eq(
            "id",
            user.id,
          )
          .single();

      if (
        !error &&
        data &&
        active
      ) {
        setProfile({
          full_name:
            data.full_name,
          role:
            data.role,
        });
      }

      if (active) {
        setLoadingProfile(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    const query =
      search.trim();

    // Important:
    // Do not synchronously update state here.
    // This avoids react-hooks/set-state-in-effect.
    if (query.length < 2) {
      return;
    }

    let active = true;

    const timer =
      window.setTimeout(
        async () => {
          if (!active) {
            return;
          }

          setSearching(true);

          const pattern =
            `%${query}%`;

          const [
            leadsResult,
            propertiesResult,
            dealsResult,
            appointmentsResult,
          ] =
            await Promise.all([
              supabase
                .from("leads")
                .select(
                  `
                    id,
                    full_name,
                    email,
                    phone,
                    preferred_location
                  `,
                )
                .or(
                  `full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},preferred_location.ilike.${pattern}`,
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                )
                .limit(5),

              supabase
                .from("properties")
                .select(
                  `
                    id,
                    title,
                    location,
                    address,
                    property_type
                  `,
                )
                .or(
                  `title.ilike.${pattern},location.ilike.${pattern},address.ilike.${pattern},property_type.ilike.${pattern}`,
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                )
                .limit(5),

              supabase
                .from("deals")
                .select(
                  `
                    id,
                    lead_id,
                    deal_value,
                    currency,
                    status
                  `,
                )
                .or(
                  `currency.ilike.${pattern},status.ilike.${pattern}`,
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                )
                .limit(5),

              supabase
                .from("appointments")
                .select(
                  `
                    id,
                    lead_id,
                    scheduled_at,
                    type,
                    status
                  `,
                )
                .or(
                  `type.ilike.${pattern},status.ilike.${pattern}`,
                )
                .order(
                  "scheduled_at",
                  {
                    ascending:
                      true,
                  },
                )
                .limit(5),
            ]);

          if (!active) {
            return;
          }

          setSearchResults({
            leads:
              (leadsResult.data ??
                []) as SearchLead[],
            properties:
              (propertiesResult.data ??
                []) as SearchProperty[],
            deals:
              (dealsResult.data ??
                []) as SearchDeal[],
            appointments:
              (appointmentsResult.data ??
                []) as SearchAppointment[],
          });

          setSearching(false);
        },
        250,
      );

    return () => {
      active = false;
      window.clearTimeout(
        timer,
      );
    };
  }, [
    search,
    supabase,
  ]);

  function clearSearch() {
    setSearch("");
    setSearchOpen(false);
  }

  function goToSearchResult(
    path: string,
  ) {
    clearSearch();
    router.push(path);
  }

  function handleProfile() {
    setMenuOpen(false);
    setQuickAddOpen(false);
    setSearchOpen(false);

    router.push("/settings");
  }

  function handleQuickAdd(
    path: string,
  ) {
    setQuickAddOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);

    router.push(path);
  }

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setMenuOpen(false);
    setQuickAddOpen(false);
    setSearchOpen(false);

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      setSigningOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  const displayName =
    profile?.full_name ||
    "PropFlow User";

  const displayRole =
    profile?.role
      ? formatRole(
          profile.role,
        )
      : loadingProfile
        ? "Loading..."
        : "";

  const totalSearchResults =
    searchResults.leads.length +
    searchResults.properties.length +
    searchResults.deals.length +
    searchResults.appointments.length;

  return (
    <header
      className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/75 lg:px-6"
      style={{
        height:
          "var(--header-height)",
      }}
    >
      <button
        type="button"
        onClick={
          onOpenMobileNav
        }
        className="flex size-8 items-center justify-center rounded-[var(--radius-control)] text-ink-600 hover:bg-surface-sunken lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-[18px]" />
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-[15px] -translate-y-1/2 text-ink-400" />

        <Input
          value={search}
          onChange={(event) => {
            setSearch(
              event.target.value,
            );
            setSearchOpen(true);
            setQuickAddOpen(false);
            setMenuOpen(false);
          }}
          onFocus={() => {
            setSearchOpen(true);
            setQuickAddOpen(false);
            setMenuOpen(false);
          }}
          onKeyDown={(event) => {
            if (
              event.key ===
              "Escape"
            ) {
              setSearchOpen(false);
            }
          }}
          placeholder="Search leads, properties, deals…"
          className="h-8 pl-8 pr-3 text-[12.5px]"
          aria-label="Global search"
          aria-expanded={
            searchOpen
          }
        />

        {searchOpen ? (
          <div
            className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface shadow-lg"
            role="dialog"
            aria-label="Search results"
          >
            {search.trim().length <
            2 ? (
              <div className="px-4 py-6 text-center">
                <Search className="mx-auto size-5 text-ink-300" />

                <p className="mt-2 text-xs font-medium text-ink-700">
                  Search your CRM
                </p>

                <p className="mt-1 text-[11px] text-ink-400">
                  Type at least 2 characters to search.
                </p>
              </div>
            ) : searching ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto size-5 animate-spin rounded-full border-2 border-ink-200 border-t-ink-800" />

                <p className="mt-3 text-xs text-ink-400">
                  Searching...
                </p>
              </div>
            ) : totalSearchResults ===
              0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="mx-auto size-5 text-ink-300" />

                <p className="mt-2 text-xs font-medium text-ink-700">
                  No results found
                </p>

                <p className="mt-1 text-[11px] text-ink-400">
                  Try a different name, location, property, or status.
                </p>
              </div>
            ) : (
              <div className="p-1">
                {searchResults.leads.length >
                0 ? (
                  <SearchGroup title="Leads">
                    {searchResults.leads.map(
                      (lead) => (
                        <SearchResultButton
                          key={`lead-${lead.id}`}
                          onClick={() =>
                            goToSearchResult(
                              `/leads/${lead.id}`,
                            )
                          }
                          icon={
                            <UserPlus className="size-4" />
                          }
                          title={
                            lead.full_name
                          }
                          description={
                            lead.preferred_location ??
                            lead.email ??
                            lead.phone ??
                            "Lead"
                          }
                          badge="Lead"
                        />
                      ),
                    )}
                  </SearchGroup>
                ) : null}

                {searchResults.properties.length >
                0 ? (
                  <SearchGroup title="Properties">
                    {searchResults.properties.map(
                      (
                        property,
                      ) => (
                        <SearchResultButton
                          key={`property-${property.id}`}
                          onClick={() =>
                            goToSearchResult(
                              `/properties/${property.id}`,
                            )
                          }
                          icon={
                            <Home className="size-4" />
                          }
                          title={
                            property.title
                          }
                          description={`${property.location} • ${property.property_type}`}
                          badge="Property"
                        />
                      ),
                    )}
                  </SearchGroup>
                ) : null}

                {searchResults.deals.length >
                0 ? (
                  <SearchGroup title="Deals">
                    {searchResults.deals.map(
                      (deal) => (
                        <SearchResultButton
                          key={`deal-${deal.id}`}
                          onClick={() =>
                            goToSearchResult(
                              "/deals",
                            )
                          }
                          icon={
                            <FilePlus2 className="size-4" />
                          }
                          title={`Deal ${deal.id.slice(
                            0,
                            8,
                          )}`}
                          description={`${formatMoney(
                            deal.deal_value,
                            deal.currency,
                          )} • ${formatLabel(
                            deal.status,
                          )}`}
                          badge="Deal"
                        />
                      ),
                    )}
                  </SearchGroup>
                ) : null}

                {searchResults.appointments.length >
                0 ? (
                  <SearchGroup title="Appointments">
                    {searchResults.appointments.map(
                      (
                        appointment,
                      ) => (
                        <SearchResultButton
                          key={`appointment-${appointment.id}`}
                          onClick={() =>
                            goToSearchResult(
                              "/appointments",
                            )
                          }
                          icon={
                            <CalendarDays className="size-4" />
                          }
                          title={formatLabel(
                            appointment.type,
                          )}
                          description={`${formatDateTime(
                            appointment.scheduled_at,
                          )} • ${formatLabel(
                            appointment.status,
                          )}`}
                          badge="Appointment"
                        />
                      ),
                    )}
                  </SearchGroup>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <div className="relative">
          <Button
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => {
              setQuickAddOpen(
                (open) =>
                  !open,
              );

              setMenuOpen(false);
              setSearchOpen(false);
            }}
            aria-expanded={
              quickAddOpen
            }
            aria-haspopup="menu"
          >
            <Plus className="size-[15px]" />
            Quick add
          </Button>

          {quickAddOpen ? (
            <div
              className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
              role="menu"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  Quick add
                </p>

                <p className="mt-0.5 text-xs text-ink-400">
                  Jump directly to a CRM workflow.
                </p>
              </div>

              <div className="p-1">
                <QuickAddItem
                  icon={
                    <UserPlus className="size-4" />
                  }
                  title="New lead"
                  description="Create a sales lead"
                  onClick={() =>
                    handleQuickAdd(
                      "/leads",
                    )
                  }
                />

                <QuickAddItem
                  icon={
                    <Home className="size-4" />
                  }
                  title="New property"
                  description="Add a property to inventory"
                  onClick={() =>
                    handleQuickAdd(
                      "/properties",
                    )
                  }
                />

                <QuickAddItem
                  icon={
                    <CalendarDays className="size-4" />
                  }
                  title="Appointment"
                  description="Schedule a client meeting"
                  onClick={() =>
                    handleQuickAdd(
                      "/appointments",
                    )
                  }
                />

                <QuickAddItem
                  icon={
                    <FilePlus2 className="size-4" />
                  }
                  title="Deal"
                  description="Open the deal workspace"
                  onClick={() =>
                    handleQuickAdd(
                      "/deals",
                    )
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

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
            onClick={() => {
              setMenuOpen(
                (open) =>
                  !open,
              );

              setQuickAddOpen(false);
              setSearchOpen(false);
            }}
            className="flex items-center gap-2 rounded-[var(--radius-control)] py-1 pl-1 pr-2 hover:bg-surface-sunken"
            aria-expanded={
              menuOpen
            }
            aria-haspopup="menu"
          >
            <Avatar
              name={
                displayName
              }
              size="sm"
            />

            <div className="hidden leading-tight md:block">
              <p className="text-[12.5px] font-medium text-ink-900">
                {
                  displayName
                }
              </p>

              <p className="text-[11px] text-ink-400">
                {
                  displayRole
                }
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
                  {
                    displayName
                  }
                </p>

                <p className="mt-0.5 text-xs text-ink-400">
                  {
                    displayRole
                  }
                </p>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={
                    handleProfile
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-surface-sunken"
                  role="menuitem"
                >
                  <User className="size-4" />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={
                    handleSignOut
                  }
                  disabled={
                    signingOut
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
                  role="menuitem"
                >
                  <LogOut className="size-4" />

                  {signingOut
                    ? "Signing out..."
                    : "Sign out"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function SearchGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
        {title}
      </p>

      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}

function SearchResultButton({
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-sunken"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-ink-600">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-800">
          {title}
        </span>

        <span className="mt-0.5 block truncate text-[11px] text-ink-400">
          {description}
        </span>
      </span>

      <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-medium text-ink-500">
        {badge}
      </span>
    </button>
  );
}

function QuickAddItem({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-sunken"
      role="menuitem"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-ink-600">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-800">
          {title}
        </span>

        <span className="mt-0.5 block text-[11px] leading-4 text-ink-400">
          {description}
        </span>
      </span>
    </button>
  );
}