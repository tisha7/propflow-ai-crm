"use client";

import {
  CalendarDays,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Appointment = {
  id: string;
  organization_id: string;
  lead_id: string;
  property_id: string | null;
  agent_id: string | null;
  scheduled_at: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
};

type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

type AppointmentType =
  | "property_viewing"
  | "consultation"
  | "negotiation"
  | "follow_up";

type Lead = {
  id: string;
  full_name: string;
};

type Property = {
  id: string;
  title: string;
  location: string;
};

type Agent = {
  id: string;
  full_name: string;
  role: string;
};

const TYPE_OPTIONS: AppointmentType[] = [
  "property_viewing",
  "consultation",
  "negotiation",
  "follow_up",
];

const STATUS_OPTIONS: AppointmentStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
];

function formatLabel(value: string) {
  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getStatusClasses(status: AppointmentStatus) {
  if (status === "completed") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (status === "cancelled") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "rescheduled") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "no_show") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return "bg-blue-50 text-blue-700 border-blue-200";
}

export default function AppointmentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [leadId, setLeadId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [type, setType] =
    useState<AppointmentType>("property_viewing");
  const [status, setStatus] =
    useState<AppointmentStatus>("scheduled");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      appointmentsResult,
      leadsResult,
      propertiesResult,
      agentsResult,
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          `
            id,
            organization_id,
            lead_id,
            property_id,
            agent_id,
            scheduled_at,
            type,
            status,
            notes,
            created_at
          `,
        )
        .order("scheduled_at", {
          ascending: true,
        }),

      supabase
        .from("leads")
        .select("id, full_name")
        .order("full_name", {
          ascending: true,
        }),

      supabase
        .from("properties")
        .select("id, title, location")
        .order("title", {
          ascending: true,
        }),

      supabase
        .from("profiles")
        .select("id, full_name, role")
        .order("full_name", {
          ascending: true,
        }),
    ]);

    if (appointmentsResult.error) {
      setError(appointmentsResult.error.message);
      setAppointments([]);
    } else {
      setAppointments(
        (appointmentsResult.data ?? []) as Appointment[],
      );
    }

    setLeads((leadsResult.data ?? []) as Lead[]);
    setProperties((propertiesResult.data ?? []) as Property[]);
    setAgents((agentsResult.data ?? []) as Agent[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setLeadId("");
    setPropertyId("");
    setAgentId("");
    setScheduledAt("");
    setType("property_viewing");
    setStatus("scheduled");
    setNotes("");
    setError("");
  }

  function openCreateModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(appointment: Appointment) {
    setEditingId(appointment.id);
    setLeadId(appointment.lead_id);
    setPropertyId(appointment.property_id ?? "");
    setAgentId(appointment.agent_id ?? "");
    setScheduledAt(
      toDateTimeLocal(appointment.scheduled_at),
    );
    setType(appointment.type);
    setStatus(appointment.status);
    setNotes(appointment.notes ?? "");
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!leadId) {
      setError("Please select a lead.");
      return;
    }

    if (!scheduledAt) {
      setError("Please select the appointment date and time.");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      setError("Unable to resolve your organization.");
      setSaving(false);
      return;
    }

    const payload = {
      organization_id: profile.organization_id,
      lead_id: leadId,
      property_id: propertyId || null,
      agent_id: agentId || null,
      scheduled_at: new Date(scheduledAt).toISOString(),
      type,
      status,
      notes: notes.trim() || null,
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", editingId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("appointments")
        .insert(payload);

      if (insertError) {
        setError(insertError.message);
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

    const { error: deleteError } = await supabase
      .from("appointments")
      .delete()
      .eq("id", deleteId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setDeleteId(null);
    setDeleting(false);

    await loadData();
  }

  const filteredAppointments = appointments.filter(
    (appointment) => {
      const lead = leads.find(
        (item) => item.id === appointment.lead_id,
      );

      const property = properties.find(
        (item) => item.id === appointment.property_id,
      );

      const agent = agents.find(
        (item) => item.id === appointment.agent_id,
      );

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        lead?.full_name.toLowerCase().includes(query) ||
        property?.title.toLowerCase().includes(query) ||
        property?.location.toLowerCase().includes(query) ||
        agent?.full_name.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    },
  );

  const scheduledCount = appointments.filter(
    (item) => item.status === "scheduled",
  ).length;

  const completedCount = appointments.filter(
    (item) => item.status === "completed",
  ).length;

  const cancelledCount = appointments.filter(
    (item) => item.status === "cancelled",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Appointments
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Schedule property viewings, consultations,
            negotiations, and follow-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="size-4" />
          Schedule appointment
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Scheduled"
          value={scheduledCount}
        />

        <StatCard
          label="Completed"
          value={completedCount}
        />

        <StatCard
          label="Cancelled"
          value={cancelledCount}
        />
      </div>

      {error && !modalOpen ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 md:flex-row">
        <div className="relative flex-1">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search lead, property or agent..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="all">All statuses</option>

          {STATUS_OPTIONS.map((option) => (
            <option
              key={option}
              value={option}
            >
              {formatLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-400">
            Loading appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDays className="mx-auto size-8 text-ink-300" />

            <h3 className="mt-3 text-sm font-medium text-ink-900">
              No appointments found
            </h3>

            <p className="mt-1 text-sm text-ink-400">
              Schedule your first appointment to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="border-b border-border bg-surface-sunken">
                <tr className="text-left text-xs font-medium text-ink-400">
                  <th className="px-4 py-3">
                    Lead
                  </th>

                  <th className="px-4 py-3">
                    Property
                  </th>

                  <th className="px-4 py-3">
                    Date & Time
                  </th>

                  <th className="px-4 py-3">
                    Type
                  </th>

                  <th className="px-4 py-3">
                    Agent
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredAppointments.map(
                  (appointment) => {
                    const lead =
                      leads.find(
                        (item) =>
                          item.id ===
                          appointment.lead_id,
                      );

                    const property =
                      properties.find(
                        (item) =>
                          item.id ===
                          appointment.property_id,
                      );

                    const agent =
                      agents.find(
                        (item) =>
                          item.id ===
                          appointment.agent_id,
                      );

                    return (
                      <tr
                        key={appointment.id}
                        className="text-sm hover:bg-surface-sunken/50"
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-ink-900">
                            {lead?.full_name ??
                              "Unknown lead"}
                          </div>

                          <div className="mt-1 text-xs text-ink-400">
                            Lead
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {property ? (
                            <>
                              <div className="font-medium text-ink-800">
                                {property.title}
                              </div>

                              <div className="mt-1 text-xs text-ink-400">
                                {property.location}
                              </div>
                            </>
                          ) : (
                            <span className="text-ink-400">
                              No property
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-ink-800">
                            <Clock className="size-4 text-ink-400" />

                            {formatDateTime(
                              appointment.scheduled_at,
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-ink-600">
                          {formatLabel(
                            appointment.type,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-ink-600">
                            <UserRound className="size-4 text-ink-400" />

                            {agent?.full_name ??
                              "Unassigned"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              appointment.status,
                            )}`}
                          >
                            {formatLabel(
                              appointment.status,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  appointment,
                                )
                              }
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-ink-600 hover:bg-surface-sunken"
                              aria-label="Edit appointment"
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteId(
                                  appointment.id,
                                )
                              }
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              aria-label="Delete appointment"
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
                    ? "Edit appointment"
                    : "Schedule appointment"}
                </h2>

                <p className="mt-1 text-xs text-ink-400">
                  Add the lead, optional property,
                  agent, date, and appointment details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    resetForm();
                    setModalOpen(false);
                  }
                }}
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-sunken"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[80vh] space-y-5 overflow-y-auto p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Lead"
                  value={leadId}
                  onChange={setLeadId}
                  options={[
                    "",
                    ...leads.map(
                      (lead) =>
                        lead.id,
                    ),
                  ]}
                  optionLabels={{
                    "": "Select lead",
                    ...Object.fromEntries(
                      leads.map(
                        (lead) => [
                          lead.id,
                          lead.full_name,
                        ],
                      ),
                    ),
                  }}
                  required
                />

                <SelectField
                  label="Property"
                  value={propertyId}
                  onChange={setPropertyId}
                  options={[
                    "",
                    ...properties.map(
                      (property) =>
                        property.id,
                    ),
                  ]}
                  optionLabels={{
                    "": "No property",
                    ...Object.fromEntries(
                      properties.map(
                        (property) => [
                          property.id,
                          `${property.title} — ${property.location}`,
                        ],
                      ),
                    ),
                  }}
                />

                <SelectField
                  label="Agent"
                  value={agentId}
                  onChange={setAgentId}
                  options={[
                    "",
                    ...agents.map(
                      (agent) =>
                        agent.id,
                    ),
                  ]}
                  optionLabels={{
                    "": "Unassigned",
                    ...Object.fromEntries(
                      agents.map(
                        (agent) => [
                          agent.id,
                          `${agent.full_name} (${formatLabel(
                            agent.role,
                          )})`,
                        ],
                      ),
                    ),
                  }}
                />

                <SelectField
                  label="Appointment type"
                  value={type}
                  onChange={
                    (value) =>
                      setType(
                        value as AppointmentType,
                      )
                  }
                  options={TYPE_OPTIONS}
                />

                <div className="space-y-2">
                  <label
                    htmlFor="scheduled-at"
                    className="text-sm font-medium text-ink-800"
                  >
                    Date & time
                  </label>

                  <input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) =>
                      setScheduledAt(
                        event.target.value,
                      )
                    }
                    required
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2"
                  />
                </div>

                <SelectField
                  label="Status"
                  value={status}
                  onChange={
                    (value) =>
                      setStatus(
                        value as AppointmentStatus,
                      )
                  }
                  options={
                    STATUS_OPTIONS
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="appointment-notes"
                  className="text-sm font-medium text-ink-800"
                >
                  Notes
                </label>

                <textarea
                  id="appointment-notes"
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                  rows={5}
                  placeholder="Add appointment notes..."
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
                      setModalOpen(false);
                    }
                  }}
                  disabled={saving}
                  className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingId ? (
                    <Save className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Schedule appointment"}
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
              Delete appointment?
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-500">
              This appointment will be permanently
              removed.
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
                  setDeleteId(null);
                  setError("");
                }}
                disabled={deleting}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDelete()
                }
                disabled={deleting}
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
  onChange: (value: string) => void;
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