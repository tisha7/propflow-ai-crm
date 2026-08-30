"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  property_type: string | null;
  bedrooms: number | null;
  purchase_timeline: string | null;
  status: string;
  priority: string;
  lead_score: number | null;
  assigned_agent_id: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
};

type Activity = {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_name?: string;
};

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "qualified",
  "property_matched",
  "site_visit",
  "negotiation",
  "won",
  "lost",
] as const;

const PRIORITY_OPTIONS = ["cold", "warm", "hot"] as const;

const SOURCE_OPTIONS = [
  "facebook",
  "website",
  "google_ads",
  "referral",
  "property_portal",
  "manual",
  "other",
] as const;

const ACTIVITY_OPTIONS = [
  "call",
  "email",
  "whatsapp",
  "note",
  "property_sent",
  "status_changed",
  "site_visit",
] as const;

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

function formatBudget(
  budgetMin: number | null,
  budgetMax: number | null,
) {
  if (budgetMin == null && budgetMax == null) {
    return "Not set";
  }

  const min =
    budgetMin != null ? Number(budgetMin).toLocaleString() : null;

  const max =
    budgetMax != null ? Number(budgetMax).toLocaleString() : null;

  if (min && max) return `${min} – ${max}`;
  if (min) return `From ${min}`;
  return `Up to ${max}`;
}

function getActivityIcon(type: string) {
  if (type === "call") {
    return <Phone className="size-4" />;
  }

  if (type === "email") {
    return <Mail className="size-4" />;
  }

  if (type === "whatsapp") {
    return <MessageCircle className="size-4" />;
  }

  if (type === "site_visit") {
    return <UserPlus className="size-4" />;
  }

  return <MessageCircle className="size-4" />;
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);
  const leadId = params.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);

  const [editing, setEditing] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("manual");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [purchaseTimeline, setPurchaseTimeline] = useState("");
  const [status, setStatus] = useState("new");
  const [priority, setPriority] = useState("cold");
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [notes, setNotes] = useState("");

  const [activityType, setActivityType] = useState("note");
  const [activityDescription, setActivityDescription] = useState("");

  const populateForm = useCallback((value: Lead) => {
    setFullName(value.full_name);
    setEmail(value.email ?? "");
    setPhone(value.phone ?? "");
    setSource(value.source);
    setBudgetMin(
      value.budget_min != null ? String(value.budget_min) : "",
    );
    setBudgetMax(
      value.budget_max != null ? String(value.budget_max) : "",
    );
    setPreferredLocation(value.preferred_location ?? "");
    setPropertyType(value.property_type ?? "");
    setBedrooms(
      value.bedrooms != null ? String(value.bedrooms) : "",
    );
    setPurchaseTimeline(value.purchase_timeline ?? "");
    setStatus(value.status);
    setPriority(value.priority);
    setAssignedAgentId(value.assigned_agent_id ?? "");
    setNotes(value.notes ?? "");
  }, []);

  const loadLeadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      { data: leadData, error: leadError },
      { data: profilesData, error: profilesError },
      { data: activitiesData, error: activitiesError },
    ] = await Promise.all([
      supabase
        .from("leads")
        .select(
          `
            id,
            organization_id,
            full_name,
            email,
            phone,
            source,
            budget_min,
            budget_max,
            preferred_location,
            property_type,
            bedrooms,
            purchase_timeline,
            status,
            priority,
            lead_score,
            assigned_agent_id,
            last_contacted_at,
            next_follow_up_at,
            notes,
            created_at,
            updated_at
          `,
        )
        .eq("id", leadId)
        .single(),

      supabase
        .from("profiles")
        .select("id, full_name, role")
        .order("full_name", { ascending: true }),

      supabase
        .from("activities")
        .select(
          `
            id,
            lead_id,
            user_id,
            type,
            description,
            metadata,
            created_at
          `,
        )
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
    ]);

    if (leadError) {
      setLead(null);
      setActivities([]);
      setAgents([]);
      setError(leadError.message);
      setLoading(false);
      return;
    }

    if (profilesError) {
      setAgents([]);
    } else {
      setAgents((profilesData ?? []) as Profile[]);
    }

    if (activitiesError) {
      setActivities([]);
    } else {
      const activityRows = (activitiesData ?? []) as Activity[];

      const actorIds = Array.from(
        new Set(
          activityRows
            .map((activity) => activity.user_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      let actorMap = new Map<string, string>();

      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", actorIds);

        actorMap = new Map(
          (actors ?? []).map((actor) => [
            actor.id as string,
            actor.full_name as string,
          ]),
        );
      }

      setActivities(
        activityRows.map((activity) => ({
          ...activity,
          actor_name: activity.user_id
            ? actorMap.get(activity.user_id) ?? "Team member"
            : "System",
        })),
      );
    }

    const loadedLead = leadData as Lead;

    setLead(loadedLead);
    populateForm(loadedLead);
    setLoading(false);
  }, [leadId, populateForm, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadLeadData]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = fullName.trim();

    if (!name) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);
    setError("");

    const previousStatus = lead?.status ?? status;
    const previousPriority = lead?.priority ?? priority;
    const previousAssignedAgentId = lead?.assigned_agent_id ?? null;

    const { data, error: updateError } = await supabase
      .from("leads")
      .update({
        full_name: name,
        email: email.trim() || null,
        phone: phone.trim() || null,
        source,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        preferred_location: preferredLocation.trim() || null,
        property_type: propertyType.trim() || null,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        purchase_timeline: purchaseTimeline.trim() || null,
        status,
        priority,
        assigned_agent_id: assignedAgentId || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select(
        `
          id,
          organization_id,
          full_name,
          email,
          phone,
          source,
          budget_min,
          budget_max,
          preferred_location,
          property_type,
          bedrooms,
          purchase_timeline,
          status,
          priority,
          lead_score,
          assigned_agent_id,
          last_contacted_at,
          next_follow_up_at,
          notes,
          created_at,
          updated_at
        `,
      )
      .single();

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const updatedLead = data as Lead;

    setLead(updatedLead);
    populateForm(updatedLead);
    setEditing(false);

    const activityInserts: Array<{
      organization_id: string;
      lead_id: string;
      user_id: string | null;
      type: string;
      description: string;
      metadata: Record<string, unknown>;
    }> = [];

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (status !== previousStatus) {
      activityInserts.push({
        organization_id: updatedLead.organization_id,
        lead_id: leadId,
        user_id: user?.id ?? null,
        type: "status_changed",
        description: `Status changed from ${formatLabel(previousStatus)} to ${formatLabel(status)}.`,
        metadata: {
          previous_status: previousStatus,
          new_status: status,
        },
      });
    }

    if (priority !== previousPriority) {
      activityInserts.push({
        organization_id: updatedLead.organization_id,
        lead_id: leadId,
        user_id: user?.id ?? null,
        type: "note",
        description: `Priority changed from ${formatLabel(previousPriority)} to ${formatLabel(priority)}.`,
        metadata: {
          previous_priority: previousPriority,
          new_priority: priority,
        },
      });
    }

    if (assignedAgentId !== previousAssignedAgentId) {
      const newAgent = agents.find(
        (agent) => agent.id === assignedAgentId,
      );

      activityInserts.push({
        organization_id: updatedLead.organization_id,
        lead_id: leadId,
        user_id: user?.id ?? null,
        type: "note",
        description: newAgent
          ? `Lead assigned to ${newAgent.full_name}.`
          : "Lead assignment removed.",
        metadata: {
          previous_assigned_agent_id:
            previousAssignedAgentId,
          new_assigned_agent_id: assignedAgentId || null,
        },
      });
    }

    if (activityInserts.length > 0) {
      const { error: activityError } = await supabase
        .from("activities")
        .insert(activityInserts);

      if (!activityError) {
        await loadLeadData();
      }
    }

    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setDeleteModalOpen(false);
    setDeleting(false);
    router.replace("/leads");
    router.refresh();
  }

  async function handleAddActivity(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const description = activityDescription.trim();

    if (!description) {
      setError("Activity description is required.");
      return;
    }

    if (!lead) {
      setError("Lead information is unavailable.");
      return;
    }

    setAddingActivity(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: activityError } = await supabase
      .from("activities")
      .insert({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        user_id: user?.id ?? null,
        type: activityType,
        description,
        metadata: {
          source: "lead_detail",
        },
      });

    if (activityError) {
      setError(activityError.message);
      setAddingActivity(false);
      return;
    }

    if (
      activityType === "call" ||
      activityType === "email" ||
      activityType === "whatsapp"
    ) {
      const now = new Date().toISOString();

      const { data: updatedLead, error: contactUpdateError } =
        await supabase
          .from("leads")
          .update({
            last_contacted_at: now,
            updated_at: now,
          })
          .eq("id", lead.id)
          .select(
            `
              id,
              organization_id,
              full_name,
              email,
              phone,
              source,
              budget_min,
              budget_max,
              preferred_location,
              property_type,
              bedrooms,
              purchase_timeline,
              status,
              priority,
              lead_score,
              assigned_agent_id,
              last_contacted_at,
              next_follow_up_at,
              notes,
              created_at,
              updated_at
            `,
          )
          .single();

      if (!contactUpdateError && updatedLead) {
        const nextLead = updatedLead as Lead;
        setLead(nextLead);
        populateForm(nextLead);
      }
    }

    setActivityDescription("");
    setActivityType("note");
    setActivityModalOpen(false);
    setAddingActivity(false);

    await loadLeadData();
  }

  function cancelEditing() {
    if (!lead) return;

    populateForm(lead);
    setError("");
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-400">
        Loading lead...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/leads")}
          className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="size-4" />
          Back to leads
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error || "Lead not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/leads")}
            className="mb-3 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="size-4" />
            Back to leads
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {lead.full_name}
            </h1>

            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
              {formatLabel(lead.status)}
            </span>

            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
              {formatLabel(lead.priority)}
            </span>
          </div>

          <p className="mt-1 text-sm text-ink-400">
            Lead details, qualification, status, ownership, and activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setEditing(true);
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white hover:opacity-90"
          >
            <Pencil className="size-4" />
            Edit lead
          </button>

          <button
            type="button"
            onClick={() => setActivityModalOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken"
          >
            <Plus className="size-4" />
            Add activity
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-border bg-surface p-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Full name"
              value={fullName}
              onChange={setFullName}
              required
            />

            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
            />

            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
            />

            <SelectField
              label="Source"
              value={source}
              onChange={setSource}
              options={SOURCE_OPTIONS}
            />

            <Field
              label="Minimum budget"
              type="number"
              value={budgetMin}
              onChange={setBudgetMin}
            />

            <Field
              label="Maximum budget"
              type="number"
              value={budgetMax}
              onChange={setBudgetMax}
            />

            <Field
              label="Preferred location"
              value={preferredLocation}
              onChange={setPreferredLocation}
            />

            <Field
              label="Property type"
              value={propertyType}
              onChange={setPropertyType}
            />

            <Field
              label="Bedrooms"
              type="number"
              value={bedrooms}
              onChange={setBedrooms}
            />

            <Field
              label="Purchase timeline"
              value={purchaseTimeline}
              onChange={setPurchaseTimeline}
            />

            <SelectField
              label="Status"
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />

            <SelectField
              label="Priority"
              value={priority}
              onChange={setPriority}
              options={PRIORITY_OPTIONS}
            />

            <SelectField
              label="Assigned agent"
              value={assignedAgentId}
              onChange={setAssignedAgentId}
              options={["", ...agents.map((agent) => agent.id)]}
              optionLabels={{
                "": "Unassigned",
                ...Object.fromEntries(
                  agents.map((agent) => [
                    agent.id,
                    `${agent.full_name} (${formatLabel(agent.role)})`,
                  ]),
                ),
              }}
            />
          </div>

          <div className="mt-5 space-y-2">
            <label
              htmlFor="lead-detail-notes"
              className="text-sm font-medium text-ink-800"
            >
              Notes
            </label>

            <textarea
              id="lead-detail-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={6}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2"
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
            >
              <X className="size-4" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="size-4" />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <InfoCard title="Contact">
            <InfoRow
              label="Email"
              value={lead.email || "—"}
            />
            <InfoRow
              label="Phone"
              value={lead.phone || "—"}
            />
            <InfoRow
              label="Preferred location"
              value={lead.preferred_location || "—"}
            />
          </InfoCard>

          <InfoCard title="Qualification">
            <InfoRow
              label="Source"
              value={formatLabel(lead.source)}
            />
            <InfoRow
              label="Budget"
              value={formatBudget(
                lead.budget_min,
                lead.budget_max,
              )}
            />
            <InfoRow
              label="Property type"
              value={lead.property_type || "—"}
            />
            <InfoRow
              label="Bedrooms"
              value={
                lead.bedrooms != null
                  ? String(lead.bedrooms)
                  : "—"
              }
            />
            <InfoRow
              label="Purchase timeline"
              value={lead.purchase_timeline || "—"}
            />
          </InfoCard>

          <InfoCard title="Pipeline">
            <InfoRow
              label="Status"
              value={formatLabel(lead.status)}
            />
            <InfoRow
              label="Priority"
              value={formatLabel(lead.priority)}
            />
            <InfoRow
              label="Lead score"
              value={
                lead.lead_score != null
                  ? String(lead.lead_score)
                  : "—"
              }
            />
            <InfoRow
              label="Assigned agent"
              value={
                agents.find(
                  (agent) => agent.id === lead.assigned_agent_id,
                )?.full_name || "Unassigned"
              }
            />
          </InfoCard>

          <div className="lg:col-span-3">
            <InfoCard title="Notes">
              <p className="whitespace-pre-wrap text-sm leading-6 text-ink-600">
                {lead.notes || "No notes added yet."}
              </p>
            </InfoCard>
          </div>

          <div className="lg:col-span-3">
            <InfoCard
              title="Activity timeline"
              action={
                <button
                  type="button"
                  onClick={() => setActivityModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700 hover:text-ink-900"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              }
            >
              {activities.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm font-medium text-ink-800">
                    No activities yet
                  </p>

                  <p className="mt-1 text-xs text-ink-400">
                    Record calls, emails, WhatsApp conversations, notes,
                    and site visits here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-3 rounded-lg border border-border p-4"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-600">
                        {getActivityIcon(activity.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <span className="text-sm font-medium text-ink-900">
                              {formatLabel(activity.type)}
                            </span>

                            <span className="ml-2 text-xs text-ink-400">
                              by {activity.actor_name || "Team member"}
                            </span>
                          </div>

                          <span className="text-xs text-ink-400">
                            {formatDate(activity.created_at)}
                          </span>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-600">
                          {activity.description ||
                            "No description provided."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>
          </div>

          <div className="lg:col-span-3">
            <InfoCard title="Timeline">
              <InfoRow
                label="Created"
                value={formatDate(lead.created_at)}
              />
              <InfoRow
                label="Last updated"
                value={formatDate(lead.updated_at)}
              />
              <InfoRow
                label="Last contacted"
                value={formatDate(lead.last_contacted_at)}
              />
              <InfoRow
                label="Next follow-up"
                value={formatDate(lead.next_follow_up_at)}
              />
            </InfoCard>
          </div>
        </div>
      )}

      {activityModalOpen ? (
        <Modal
          title="Add activity"
          description="Record an interaction or note for this lead."
          onClose={() => {
            if (!addingActivity) {
              setActivityModalOpen(false);
              setError("");
            }
          }}
        >
          <form
            onSubmit={handleAddActivity}
            className="space-y-5"
          >
            <SelectField
              label="Activity type"
              value={activityType}
              onChange={setActivityType}
              options={ACTIVITY_OPTIONS}
            />

            <div className="space-y-2">
              <label
                htmlFor="activity-description"
                className="text-sm font-medium text-ink-800"
              >
                Description
              </label>

              <textarea
                id="activity-description"
                value={activityDescription}
                onChange={(event) =>
                  setActivityDescription(event.target.value)
                }
                rows={5}
                placeholder="Describe what happened..."
                required
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
                onClick={() => setActivityModalOpen(false)}
                disabled={addingActivity}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={addingActivity}
                className="h-9 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingActivity ? "Saving..." : "Add activity"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteModalOpen ? (
        <Modal
          title="Delete lead"
          description={`Are you sure you want to delete ${lead.full_name}? This action cannot be undone.`}
          onClose={() => {
            if (!deleting) {
              setDeleteModalOpen(false);
              setError("");
            }
          }}
        >
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="size-4" />
              {deleting ? "Deleting..." : "Delete lead"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  optionLabels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  optionLabels?: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabels?.[option] ?? formatLabel(option)}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-900">
          {title}
        </h2>

        {action}
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-ink-400">{label}</span>

      <span className="max-w-[65%] text-right text-sm font-medium text-ink-800">
        {value}
      </span>
    </div>
  );
}

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="pr-4">
            <h2 className="text-base font-semibold text-ink-900">
              {title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-ink-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-sunken"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}