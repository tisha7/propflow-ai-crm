"use client";

import {
  Check,
  ChevronDown,
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type TeamRole =
  | "admin"
  | "manager"
  | "agent";

type Member = {
  id: string;
  full_name: string;
  role: TeamRole;
  organization_id: string;
  created_at: string;
};

const ROLE_OPTIONS: TeamRole[] = [
  "admin",
  "manager",
  "agent",
];

function formatRole(role: TeamRole) {
  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  );
}

function roleClasses(role: TeamRole) {
  if (role === "admin") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (role === "manager") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-border bg-surface-sunken text-ink-600";
}

export default function TeamPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [currentRole, setCurrentRole] =
    useState<TeamRole | null>(null);

  const [organizationId, setOrganizationId] =
    useState<string | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState<TeamRole | "all">("all");

  const [changingRoleId, setChangingRoleId] =
    useState<string | null>(null);

  const [inviteOpen, setInviteOpen] =
    useState(false);

  const [inviteName, setInviteName] =
    useState("");

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [inviteRole, setInviteRole] =
    useState<TeamRole>("agent");

  const [inviting, setInviting] =
    useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Your session has expired. Please sign in again.",
      );
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const {
      data: myProfile,
      error: myProfileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, organization_id, role",
      )
      .eq("id", user.id)
      .single();

    if (
      myProfileError ||
      !myProfile
    ) {
      setError(
        myProfileError?.message ??
          "Unable to load your profile.",
      );
      setLoading(false);
      return;
    }

    setOrganizationId(
      myProfile.organization_id,
    );

    setCurrentRole(
      myProfile.role as TeamRole,
    );

    const {
      data,
      error: membersError,
    } = await supabase
      .from("profiles")
      .select(
        "id, full_name, role, organization_id, created_at",
      )
      .eq(
        "organization_id",
        myProfile.organization_id,
      )
      .order("full_name", {
        ascending: true,
      });

    if (membersError) {
      setError(membersError.message);
      setMembers([]);
      setLoading(false);
      return;
    }

    setMembers(
      (data ?? []) as Member[],
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTeam();
    }, 0);

    return () =>
      window.clearTimeout(timer);
  }, [loadTeam]);

  const isAdmin =
    currentRole === "admin";

  const filteredMembers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return members.filter((member) => {
      const matchesRole =
        roleFilter === "all" ||
        member.role === roleFilter;

      const matchesSearch =
        !query ||
        member.full_name
          .toLowerCase()
          .includes(query) ||
        member.role
          .toLowerCase()
          .includes(query);

      return (
        matchesRole &&
        matchesSearch
      );
    });
  }, [
    members,
    roleFilter,
    search,
  ]);

  const counts = useMemo(
    () => ({
      all: members.length,
      admin: members.filter(
        (item) =>
          item.role === "admin",
      ).length,
      manager: members.filter(
        (item) =>
          item.role === "manager",
      ).length,
      agent: members.filter(
        (item) =>
          item.role === "agent",
      ).length,
    }),
    [members],
  );

  async function changeRole(
    member: Member,
    newRole: TeamRole,
  ) {
    if (
      !isAdmin ||
      member.id === currentUserId ||
      member.role === newRole
    ) {
      return;
    }

    setChangingRoleId(member.id);
    setError("");
    setSuccess("");

    const {
      error: roleError,
    } = await supabase.rpc(
      "admin_change_member_role",
      {
        target_user_id: member.id,
        new_role: newRole,
      },
    );

    if (roleError) {
      setError(roleError.message);
      setChangingRoleId(null);
      return;
    }

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id
          ? {
              ...item,
              role: newRole,
            }
          : item,
      ),
    );

    setSuccess(
      `${member.full_name}'s role was changed to ${formatRole(
        newRole,
      )}.`,
    );

    setChangingRoleId(null);
  }

  function openInviteModal() {
    setError("");
    setSuccess("");
    setInviteName("");
    setInviteEmail("");
    setInviteRole("agent");
    setInviteOpen(true);
  }

  function closeInviteModal() {
    if (inviting) {
      return;
    }

    setInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("agent");
    setError("");
  }

  async function sendInvitation() {
    const email =
      inviteEmail
        .trim()
        .toLowerCase();

    const fullName =
      inviteName.trim();

    if (!email) {
      setError(
        "Email address is required.",
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      setError(
        "Please enter a valid email address.",
      );
      return;
    }

    setInviting(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/team/invite",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
              fullName:
                fullName || null,
              role: inviteRole,
            }),
          },
        );

      const data =
        (await response.json()) as {
          error?: string;
          message?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to send invitation.",
        );
      }

      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("agent");

      setSuccess(
        data.message ??
          `Invitation sent to ${email}.`,
      );
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Unable to send invitation.",
      );
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Team
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Loading team members...
          </p>
        </div>

        <div className="h-32 animate-pulse rounded-xl border border-border bg-surface" />

        <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />
      </div>
    );
  }

  if (
    currentRole &&
    !["admin", "manager", "agent"].includes(
      currentRole,
    )
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Your account has an unsupported role configuration.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-surface-sunken text-ink-700">
              <Users className="size-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              Team
            </h1>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-400">
            Manage the people working in your organization and control their CRM roles.
          </p>
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={openInviteModal}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            <UserPlus className="size-4" />
            Invite member
          </button>
        ) : null}
      </div>

      {/* Non-admin notice */}
      {!isAdmin ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink-500" />

            <div>
              <p className="text-sm font-medium text-ink-800">
                Team management is Admin-only
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-400">
                You can view your organization team, but only an Admin can change member roles or invite new members.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Error */}
      {error && !inviteOpen ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Success */}
      {success ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="size-4" />
          {success}
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TeamStat
          label="All members"
          value={counts.all}
        />

        <TeamStat
          label="Admins"
          value={counts.admin}
        />

        <TeamStat
          label="Managers"
          value={counts.manager}
        />

        <TeamStat
          label="Agents"
          value={counts.agent}
        />
      </div>

      {/* Members */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search team members..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2"
            />
          </div>

          <div className="relative w-full lg:w-48">
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value as
                    | TeamRole
                    | "all",
                )
              }
              className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none"
            >
              <option value="all">
                All roles ({counts.all})
              </option>

              <option value="admin">
                Admin ({counts.admin})
              </option>

              <option value="manager">
                Manager ({counts.manager})
              </option>

              <option value="agent">
                Agent ({counts.agent})
              </option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          </div>
        </div>

        {filteredMembers.length ===
        0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto size-8 text-ink-300" />

            <p className="mt-3 text-sm font-medium text-ink-900">
              No team members found
            </p>

            <p className="mt-1 text-xs text-ink-400">
              Try another name or role.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-border bg-surface-sunken">
                <tr className="text-left text-xs font-medium text-ink-400">
                  <th className="px-5 py-3">
                    Member
                  </th>

                  <th className="px-5 py-3">
                    Role
                  </th>

                  <th className="px-5 py-3">
                    Joined
                  </th>

                  <th className="px-5 py-3 text-right">
                    Access
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredMembers.map(
                  (member) => {
                    const isCurrentUser =
                      member.id ===
                      currentUserId;

                    const roleChanging =
                      changingRoleId ===
                      member.id;

                    return (
                      <tr
                        key={member.id}
                        className="text-sm"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-700">
                              {member.full_name
                                .trim()
                                .split(/\s+/)
                                .map(
                                  (part) =>
                                    part.charAt(
                                      0,
                                    ),
                                )
                                .join("")
                                .slice(
                                  0,
                                  2,
                                )
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-900">
                                {
                                  member.full_name
                                }

                                {isCurrentUser ? (
                                  <span className="ml-2 rounded-full border border-border bg-surface-sunken px-2 py-0.5 text-[9px] font-medium text-ink-500">
                                    You
                                  </span>
                                ) : null}
                              </p>

                              <p className="mt-0.5 text-xs text-ink-400">
                                Member
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleClasses(
                              member.role,
                            )}`}
                          >
                            {formatRole(
                              member.role,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-ink-400">
                          {new Date(
                            member.created_at,
                          ).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            {isAdmin &&
                            !isCurrentUser ? (
                              <div className="relative">
                                <select
                                  value={
                                    member.role
                                  }
                                  disabled={
                                    roleChanging
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    void changeRole(
                                      member,
                                      event
                                        .target
                                        .value as TeamRole,
                                    )
                                  }
                                  className="h-8 min-w-32 appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-xs font-medium text-ink-700 outline-none disabled:opacity-60"
                                >
                                  {ROLE_OPTIONS.map(
                                    (role) => (
                                      <option
                                        key={
                                          role
                                        }
                                        value={
                                          role
                                        }
                                      >
                                        {formatRole(
                                          role,
                                        )}
                                      </option>
                                    ),
                                  )}
                                </select>

                                {roleChanging ? (
                                  <Loader2 className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-ink-400" />
                                ) : (
                                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-ink-400">
                                {isCurrentUser
                                  ? "Your account"
                                  : "View only"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Role explanation */}
      <section className="grid gap-4 md:grid-cols-3">
        <RoleCard
          role="Admin"
          description="Organization-wide control, team management, settings, and full CRM visibility."
        />

        <RoleCard
          role="Manager"
          description="Team supervision, pipeline oversight, follow-ups, appointments, and sales operations."
        />

        <RoleCard
          role="Agent"
          description="Focused on assigned leads and the sales work connected to those opportunities."
        />
      </section>

      {/* Organization diagnostic */}
      {organizationId ? (
        <p className="text-[10px] text-ink-300">
          Organization: {organizationId}
        </p>
      ) : null}

      {/* Invite modal */}
      {inviteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeInviteModal();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  Invite team member
                </h2>

                <p className="mt-1 text-xs leading-5 text-ink-400">
                  Send a secure invitation to join your PropFlow organization.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeInviteModal
                }
                disabled={
                  inviting
                }
                className="flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-sunken hover:text-ink-700 disabled:opacity-50"
                aria-label="Close invite modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <label
                  htmlFor="invite-name"
                  className="text-sm font-medium text-ink-800"
                >
                  Full name
                </label>

                <input
                  id="invite-name"
                  value={inviteName}
                  onChange={(event) =>
                    setInviteName(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Michael Carter"
                  autoComplete="name"
                  disabled={inviting}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="invite-email"
                  className="text-sm font-medium text-ink-800"
                >
                  Work email
                </label>

                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) =>
                    setInviteEmail(
                      event.target
                        .value,
                    )
                  }
                  placeholder="michael@realty.com"
                  autoComplete="email"
                  disabled={inviting}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="invite-role"
                  className="text-sm font-medium text-ink-800"
                >
                  Role
                </label>

                <div className="relative">
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(
                      event,
                    ) =>
                      setInviteRole(
                        event.target
                          .value as TeamRole,
                      )
                    }
                    disabled={
                      inviting
                    }
                    className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none disabled:opacity-60"
                  >
                    <option value="agent">
                      Agent
                    </option>

                    <option value="manager">
                      Manager
                    </option>

                    <option value="admin">
                      Admin
                    </option>
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                <p className="text-[11px] leading-5 text-ink-500">
                  The invitation will be sent to the email above. The member will be added to your organization after accepting the invitation.
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={
                  closeInviteModal
                }
                disabled={
                  inviting
                }
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void sendInvitation()
                }
                disabled={
                  inviting ||
                  !inviteEmail.trim()
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {inviting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    Send invitation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TeamStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs font-medium text-ink-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
        {value}
      </p>
    </div>
  );
}

function RoleCard({
  role,
  description,
}: {
  role: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm font-semibold text-ink-900">
        {role}
      </p>

      <p className="mt-2 text-xs leading-5 text-ink-400">
        {description}
      </p>
    </div>
  );
}