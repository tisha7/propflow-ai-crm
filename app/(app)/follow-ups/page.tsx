"use client";

import {
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type FollowUpStatus =
  | "pending"
  | "completed"
  | "cancelled";

type FollowUp = {
  id: string;
  organization_id: string;
  lead_id: string;
  assigned_to: string | null;
  due_at: string;
  type: string;
  notes: string | null;
  status: FollowUpStatus;
  completed_at: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

type Agent = {
  id: string;
  full_name: string;
  role: string;
};

const STATUS_OPTIONS: FollowUpStatus[] = [
  "pending",
  "completed",
  "cancelled",
];

const TYPE_OPTIONS = [
  "general",
  "call",
  "email",
  "whatsapp",
  "property_follow_up",
  "site_visit_follow_up",
  "negotiation_follow_up",
];

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");
  const hours = String(
    date.getHours(),
  ).padStart(2, "0");
  const minutes = String(
    date.getMinutes(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getStatusClasses(
  status: FollowUpStatus,
) {
  if (status === "completed") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function isOverdue(
  followUp: FollowUp,
) {
  return (
    followUp.status === "pending" &&
    new Date(
      followUp.due_at,
    ).getTime() <
      Date.now()
  );
}

export default function FollowUpsPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [followUps, setFollowUps] =
    useState<FollowUp[]>([]);

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [agents, setAgents] =
    useState<Agent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [deleteId, setDeleteId] =
    useState<string | null>(null);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [leadId, setLeadId] =
    useState("");

  const [assignedTo, setAssignedTo] =
    useState("");

  const [dueAt, setDueAt] =
    useState("");

  const [type, setType] =
    useState("general");

  const [notes, setNotes] =
    useState("");

  const [status, setStatus] =
    useState<FollowUpStatus>(
      "pending",
    );

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const loadData = useCallback(
    async () => {
      setLoading(true);
      setError("");

      const [
        followUpsResult,
        leadsResult,
        agentsResult,
      ] = await Promise.all([
        supabase
          .from("follow_ups")
          .select(
            `
              id,
              organization_id,
              lead_id,
              assigned_to,
              due_at,
              type,
              notes,
              status,
              completed_at,
              created_at
            `,
          )
          .order("due_at", {
            ascending: true,
          }),

        supabase
          .from("leads")
          .select(
            "id, full_name, phone, email",
          )
          .order("full_name", {
            ascending: true,
          }),

        supabase
          .from("profiles")
          .select(
            "id, full_name, role",
          )
          .order("full_name", {
            ascending: true,
          }),
      ]);

      if (followUpsResult.error) {
        setFollowUps([]);
        setError(
          followUpsResult.error.message,
        );
      } else {
        setFollowUps(
          (followUpsResult.data ??
            []) as FollowUp[],
        );
      }

      setLeads(
        (leadsResult.data ??
          []) as Lead[],
      );

      setAgents(
        (agentsResult.data ??
          []) as Agent[],
      );

      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadData();
      }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setLeadId("");
    setAssignedTo("");
    setDueAt("");
    setType("general");
    setNotes("");
    setStatus("pending");
    setError("");
  }

  function openCreateModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(
    followUp: FollowUp,
  ) {
    setEditingId(
      followUp.id,
    );

    setLeadId(
      followUp.lead_id,
    );

    setAssignedTo(
      followUp.assigned_to ??
        "",
    );

    setDueAt(
      toDateTimeLocal(
        followUp.due_at,
      ),
    );

    setType(
      followUp.type,
    );

    setNotes(
      followUp.notes ?? "",
    );

    setStatus(
      followUp.status,
    );

    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!leadId) {
      setError(
        "Please select a lead.",
      );
      return;
    }

    if (!dueAt) {
      setError(
        "Please select a due date and time.",
      );
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setError(
        "Your session has expired. Please sign in again.",
      );
      setSaving(false);
      return;
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "organization_id",
        )
        .eq(
          "id",
          user.id,
        )
        .single();

    if (
      profileError ||
      !profile?.organization_id
    ) {
      setError(
        "Unable to resolve your organization.",
      );
      setSaving(false);
      return;
    }

    const shouldComplete =
      status === "completed";

    const payload = {
      organization_id:
        profile.organization_id,
      lead_id: leadId,
      assigned_to:
        assignedTo || null,
      due_at:
        new Date(
          dueAt,
        ).toISOString(),
      type:
        type.trim() ||
        "general",
      notes:
        notes.trim() ||
        null,
      status,
      completed_at:
        shouldComplete
          ? new Date().toISOString()
          : null,
    };

    if (editingId) {
      const {
        error: updateError,
      } =
        await supabase
          .from("follow_ups")
          .update(payload)
          .eq(
            "id",
            editingId,
          );

      if (updateError) {
        setError(
          updateError.message,
        );
        setSaving(false);
        return;
      }
    } else {
      const {
        error: insertError,
      } =
        await supabase
          .from("follow_ups")
          .insert(payload);

      if (insertError) {
        setError(
          insertError.message,
        );
        setSaving(false);
        return;
      }
    }

    await loadData();

    resetForm();
    setModalOpen(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) {
      return;
    }

    setDeleting(true);
    setError("");

    const {
      error: deleteError,
    } =
      await supabase
        .from("follow_ups")
        .delete()
        .eq(
          "id",
          deleteId,
        );

    if (deleteError) {
      setError(
        deleteError.message,
      );
      setDeleting(false);
      return;
    }

    setDeleteId(null);
    setDeleting(false);

    await loadData();
  }

  async function updateStatus(
    followUp: FollowUp,
    nextStatus: FollowUpStatus,
  ) {
    setUpdatingId(
      followUp.id,
    );

    setError("");

    const shouldComplete =
      nextStatus ===
      "completed";

    const {
      error: updateError,
    } =
      await supabase
        .from("follow_ups")
        .update({
          status:
            nextStatus,
          completed_at:
            shouldComplete
              ? new Date().toISOString()
              : null,
        })
        .eq(
          "id",
          followUp.id,
        );

    if (updateError) {
      setError(
        updateError.message,
      );
      setUpdatingId(null);
      return;
    }

    setUpdatingId(null);

    await loadData();
  }

  const filteredFollowUps =
    followUps.filter(
      (followUp) => {
        const lead =
          leads.find(
            (item) =>
              item.id ===
              followUp.lead_id,
          );

        const agent =
          agents.find(
            (item) =>
              item.id ===
              followUp.assigned_to,
          );

        const query =
          search
            .trim()
            .toLowerCase();

        const matchesSearch =
          !query ||
          lead?.full_name
            .toLowerCase()
            .includes(query) ||
          lead?.phone
            ?.toLowerCase()
            .includes(query) ||
          lead?.email
            ?.toLowerCase()
            .includes(query) ||
          agent?.full_name
            .toLowerCase()
            .includes(query) ||
          followUp.type
            .toLowerCase()
            .includes(query) ||
          followUp.notes
            ?.toLowerCase()
            .includes(query);

        const matchesStatus =
          statusFilter ===
            "all" ||
          followUp.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      },
    );

  const pendingCount =
    followUps.filter(
      (item) =>
        item.status ===
        "pending",
    ).length;

  const completedCount =
    followUps.filter(
      (item) =>
        item.status ===
        "completed",
    ).length;

  const overdueCount =
    followUps.filter(
      (item) =>
        isOverdue(item),
    ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Follow-ups
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Track upcoming calls, messages, meetings,
            and other lead follow-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openCreateModal
          }
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="size-4" />
          Add follow-up
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending"
          value={pendingCount}
        />

        <StatCard
          label="Overdue"
          value={overdueCount}
        />

        <StatCard
          label="Completed"
          value={completedCount}
        />
      </div>

      {error &&
      !modalOpen &&
      !deleteId ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 md:flex-row">
        <div className="relative flex-1">
          <CalendarClock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search lead, agent, type or notes..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2"
          />
        </div>

        <select
          value={
            statusFilter
          }
          onChange={(event) =>
            setStatusFilter(
              event.target.value,
            )
          }
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="all">
            All statuses
          </option>

          {STATUS_OPTIONS.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {formatLabel(
                  option,
                )}
              </option>
            ),
          )}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-400">
            Loading follow-ups...
          </div>
        ) : filteredFollowUps.length ===
          0 ? (
          <div className="p-10 text-center">
            <Clock className="mx-auto size-8 text-ink-300" />

            <h3 className="mt-3 text-sm font-medium text-ink-900">
              No follow-ups found
            </h3>

            <p className="mt-1 text-sm text-ink-400">
              Add a follow-up to start tracking your next
              actions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="border-b border-border bg-surface-sunken">
                <tr className="text-left text-xs font-medium text-ink-400">
                  <th className="px-4 py-3">
                    Lead
                  </th>

                  <th className="px-4 py-3">
                    Due
                  </th>

                  <th className="px-4 py-3">
                    Type
                  </th>

                  <th className="px-4 py-3">
                    Assigned to
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3">
                    Notes
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredFollowUps.map(
                  (followUp) => {
                    const lead =
                      leads.find(
                        (item) =>
                          item.id ===
                          followUp.lead_id,
                      );

                    const agent =
                      agents.find(
                        (item) =>
                          item.id ===
                          followUp.assigned_to,
                      );

                    const overdue =
                      isOverdue(
                        followUp,
                      );

                    return (
                      <tr
                        key={
                          followUp.id
                        }
                        className="text-sm hover:bg-surface-sunken/50"
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-ink-900">
                            {lead?.full_name ??
                              "Unknown lead"}
                          </div>

                          <div className="mt-1 text-xs text-ink-400">
                            {lead?.phone ||
                              lead?.email ||
                              "No contact details"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div
                            className={
                              overdue
                                ? "font-medium text-red-600"
                                : "font-medium text-ink-800"
                            }
                          >
                            {formatDateTime(
                              followUp.due_at,
                            )}
                          </div>

                          {overdue ? (
                            <div className="mt-1 text-xs text-red-500">
                              Overdue
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 text-ink-600">
                          {formatLabel(
                            followUp.type,
                          )}
                        </td>

                        <td className="px-4 py-4 text-ink-600">
                          {agent?.full_name ??
                            "Unassigned"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              followUp.status,
                            )}`}
                          >
                            {formatLabel(
                              followUp.status,
                            )}
                          </span>
                        </td>

                        <td className="max-w-[260px] px-4 py-4">
                          <p className="truncate text-xs text-ink-500">
                            {followUp.notes ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {followUp.status ===
                              "pending" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void updateStatus(
                                    followUp,
                                    "completed",
                                  )
                                }
                                disabled={
                                  updatingId ===
                                  followUp.id
                                }
                                className="inline-flex size-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                                aria-label="Complete follow-up"
                              >
                                <Check className="size-4" />
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  followUp,
                                )
                              }
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-ink-600 hover:bg-surface-sunken"
                              aria-label="Edit follow-up"
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteId(
                                  followUp.id,
                                )
                              }
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              aria-label="Delete follow-up"
                            >
                              <Trash2 className="size-4" />
                            </button>
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
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  {editingId
                    ? "Edit follow-up"
                    : "Add follow-up"}
                </h2>

                <p className="mt-1 text-xs text-ink-400">
                  Schedule the next action for a lead.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    resetForm();
                    setModalOpen(
                      false,
                    );
                  }
                }}
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-sunken"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="max-h-[80vh] space-y-5 overflow-y-auto p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Lead"
                  value={
                    leadId
                  }
                  onChange={
                    setLeadId
                  }
                  options={[
                    "",
                    ...leads.map(
                      (
                        lead,
                      ) =>
                        lead.id,
                    ),
                  ]}
                  optionLabels={{
                    "": "Select lead",
                    ...Object.fromEntries(
                      leads.map(
                        (
                          lead,
                        ) => [
                          lead.id,
                          lead.full_name,
                        ],
                      ),
                    ),
                  }}
                  required
                />

                <SelectField
                  label="Assigned to"
                  value={
                    assignedTo
                  }
                  onChange={
                    setAssignedTo
                  }
                  options={[
                    "",
                    ...agents.map(
                      (
                        agent,
                      ) =>
                        agent.id,
                    ),
                  ]}
                  optionLabels={{
                    "": "Unassigned",
                    ...Object.fromEntries(
                      agents.map(
                        (
                          agent,
                        ) => [
                          agent.id,
                          `${agent.full_name} (${formatLabel(
                            agent.role,
                          )})`,
                        ],
                      ),
                    ),
                  }}
                />

                <div className="space-y-2">
                  <label
                    htmlFor="follow-up-due"
                    className="text-sm font-medium text-ink-800"
                  >
                    Due date & time
                  </label>

                  <input
                    id="follow-up-due"
                    type="datetime-local"
                    value={
                      dueAt
                    }
                    onChange={(event) =>
                      setDueAt(
                        event.target.value,
                      )
                    }
                    required
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2"
                  />
                </div>

                <SelectField
                  label="Type"
                  value={
                    type
                  }
                  onChange={
                    setType
                  }
                  options={
                    TYPE_OPTIONS
                  }
                />

                <SelectField
                  label="Status"
                  value={
                    status
                  }
                  onChange={(
                    value,
                  ) =>
                    setStatus(
                      value as FollowUpStatus,
                    )
                  }
                  options={
                    STATUS_OPTIONS
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="follow-up-notes"
                  className="text-sm font-medium text-ink-800"
                >
                  Notes
                </label>

                <textarea
                  id="follow-up-notes"
                  value={
                    notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setNotes(
                      event.target
                        .value,
                    )
                  }
                  rows={5}
                  placeholder="What needs to be done?"
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2"
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      resetForm();
                      setModalOpen(
                        false,
                      );
                    }
                  }}
                  disabled={saving}
                  className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingId ? (
                    <Pencil className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Add follow-up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="text-base font-semibold text-ink-900">
              Delete follow-up?
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-500">
              This follow-up will be permanently removed.
            </p>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteId(
                    null,
                  );
                  setError("");
                }}
                disabled={
                  deleting
                }
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDelete()
                }
                disabled={
                  deleting
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 className="size-4" />
                {deleting
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  optionLabels,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  options: readonly string[];
  optionLabels?: Record<
    string,
    string
  >;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          required={required}
          className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none focus:ring-2"
        >
          {options.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {optionLabels?.[
                  option
                ] ??
                  formatLabel(
                    option,
                  )}
              </option>
            ),
          )}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
      </div>
    </div>
  );
}

function StatCard({
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

      <p className="mt-2 text-2xl font-semibold text-ink-900">
        {value}
      </p>
    </div>
  );
}