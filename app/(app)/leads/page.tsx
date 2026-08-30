"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
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

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatBudget(lead: Lead) {
  if (lead.budget_min == null && lead.budget_max == null) {
    return "Not set";
  }

  const min =
    lead.budget_min != null
      ? Number(lead.budget_min).toLocaleString()
      : null;

  const max =
    lead.budget_max != null
      ? Number(lead.budget_max).toLocaleString()
      : null;

  if (min && max) return `${min} – ${max}`;
  if (min) return `From ${min}`;
  return `Up to ${max}`;
}

export default function LeadsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
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
  const [priority, setPriority] = useState("cold");
  const [notes, setNotes] = useState("");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("leads")
      .select(
        `
          id,
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
          created_at
        `,
      )
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLeads([]);
    } else {
      setLeads((data ?? []) as Lead[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadLeads]);

  function resetForm() {
    setFullName("");
    setEmail("");
    setPhone("");
    setSource("manual");
    setBudgetMin("");
    setBudgetMax("");
    setPreferredLocation("");
    setPropertyType("");
    setBedrooms("");
    setPurchaseTimeline("");
    setPriority("cold");
    setNotes("");
    setError("");
  }

  async function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = fullName.trim();

    if (!name) {
      setError("Full name is required.");
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      setError("Unable to resolve your organization.");
      setSaving(false);
      return;
    }

    const insertPayload = {
      organization_id: profile.organization_id,
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
      priority,
      notes: notes.trim() || null,
    };

    const { data, error: insertError } = await supabase
      .from("leads")
      .insert(insertPayload)
      .select(
        `
          id,
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
          created_at
        `,
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    if (data) {
      setLeads((current) => [data as Lead, ...current]);
    }

    resetForm();
    setModalOpen(false);
    setSaving(false);
  }

  const filteredLeads = leads.filter((lead) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      lead.full_name.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query) ||
      lead.preferred_location?.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" || lead.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Leads
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Manage prospects, qualification, priority, and pipeline movement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-ink-900 px-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="size-4" />
          Add lead
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="all">All statuses</option>

          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="all">All priorities</option>

          {PRIORITY_OPTIONS.map((priorityOption) => (
            <option key={priorityOption} value={priorityOption}>
              {formatLabel(priorityOption)}
            </option>
          ))}
        </select>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-400">
            Loading leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="text-sm font-medium text-ink-900">
              No leads found
            </h3>

            <p className="mt-1 text-sm text-ink-400">
              Create your first lead or change your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="border-b border-border bg-surface-sunken">
                <tr className="text-left text-xs font-medium text-ink-400">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Budget</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="text-sm hover:bg-surface-sunken/50"
                  >
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        className="text-left font-medium text-ink-900 hover:underline"
                      >
                        {lead.full_name}
                      </button>

                      <div className="mt-1 text-xs text-ink-400">
                        {lead.email || lead.phone || "No contact info"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {formatLabel(lead.source)}
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {formatBudget(lead)}
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {lead.preferred_location || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                        {formatLabel(lead.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                        {formatLabel(lead.priority)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {lead.lead_score ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-xs text-ink-400">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  Add lead
                </h2>

                <p className="mt-1 text-xs text-ink-400">
                  Create a new prospect inside your organization.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-sunken"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateLead}
              className="max-h-[75vh] space-y-5 overflow-y-auto p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  required
                  placeholder="John Smith"
                />

                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="john@example.com"
                />

                <Field
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+1 555 000 0000"
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
                  placeholder="250000"
                />

                <Field
                  label="Maximum budget"
                  type="number"
                  value={budgetMax}
                  onChange={setBudgetMax}
                  placeholder="500000"
                />

                <Field
                  label="Preferred location"
                  value={preferredLocation}
                  onChange={setPreferredLocation}
                  placeholder="Downtown"
                />

                <Field
                  label="Property type"
                  value={propertyType}
                  onChange={setPropertyType}
                  placeholder="Apartment"
                />

                <Field
                  label="Bedrooms"
                  type="number"
                  value={bedrooms}
                  onChange={setBedrooms}
                  placeholder="3"
                />

                <Field
                  label="Purchase timeline"
                  value={purchaseTimeline}
                  onChange={setPurchaseTimeline}
                  placeholder="Within 90 days"
                />

                <SelectField
                  label="Priority"
                  value={priority}
                  onChange={setPriority}
                  options={PRIORITY_OPTIONS}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lead-notes"
                  className="text-sm font-medium text-ink-800"
                >
                  Notes
                </label>

                <textarea
                  id="lead-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Add useful context about this lead..."
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
                  onClick={() => setModalOpen(false)}
                  className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
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
        placeholder={placeholder}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}