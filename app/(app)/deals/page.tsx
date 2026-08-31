"use client";

import {
  Check,
  ChevronDown,
  DollarSign,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type DealStatus =
  | "open"
  | "won"
  | "lost";

type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "property_matched"
  | "site_visit"
  | "negotiation"
  | "won"
  | "lost";

type Lead = {
  id: string;
  full_name: string;
};

type Property = {
  id: string;
  title: string;
};

type Agent = {
  id: string;
  full_name: string;
};

type Deal = {
  id: string;
  organization_id: string;
  lead_id: string;
  agent_id: string | null;
  property_id: string | null;
  deal_value: number | null;
  currency: string;
  status: DealStatus;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  lead: Lead | null;
  property: Property | null;
  agent: Agent | null;
};

type DealQueryRow = Omit<
  Deal,
  "lead" | "property" | "agent"
> & {
  lead:
    | Lead
    | Lead[]
    | null;
  property:
    | Property
    | Property[]
    | null;
  agent:
    | Agent
    | Agent[]
    | null;
};

const STATUS_OPTIONS: DealStatus[] = [
  "open",
  "won",
  "lost",
];

const CURRENCY_OPTIONS = [
  "USD",
  "GBP",
  "CAD",
  "AUD",
  "AED",
];

function formatLabel(
  value: string,
) {
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

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleString();
}

function statusClasses(
  status: DealStatus,
) {
  if (
    status ===
    "won"
  ) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (
    status ===
    "lost"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
) {
  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value ??
    null;
}

function toDateTimeLocal(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  const hours =
    String(
      date.getHours(),
    ).padStart(
      2,
      "0",
    );

  const minutes =
    String(
      date.getMinutes(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function leadStatusForDeal(
  status: DealStatus,
): LeadStatus {
  if (
    status ===
    "won"
  ) {
    return "won";
  }

  if (
    status ===
    "lost"
  ) {
    return "lost";
  }

  return "negotiation";
}

export default function DealsPage() {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [deals, setDeals] =
    useState<Deal[]>([]);

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [
    properties,
    setProperties,
  ] = useState<Property[]>([]);

  const [agents, setAgents] =
    useState<Agent[]>([]);

  const [
    organizationId,
    setOrganizationId,
  ] = useState<string | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(
    null,
  );

  const [
    statusUpdatingId,
    setStatusUpdatingId,
  ] = useState<string | null>(
    null,
  );

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editingDeal,
    setEditingDeal,
  ] = useState<Deal | null>(
    null,
  );

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    DealStatus | "all"
  >("all");

  const [error, setError] =
    useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [leadId, setLeadId] =
    useState("");

  const [
    propertyId,
    setPropertyId,
  ] = useState("");

  const [agentId, setAgentId] =
    useState("");

  const [
    dealValue,
    setDealValue,
  ] = useState("");

  const [currency, setCurrency] =
    useState("USD");

  const [status, setStatus] =
    useState<DealStatus>("open");

  const [closedAt, setClosedAt] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const resetForm =
    useCallback(() => {
      setLeadId("");
      setPropertyId("");
      setAgentId("");
      setDealValue("");
      setCurrency("USD");
      setStatus("open");
      setClosedAt("");
      setNotes("");
      setEditingDeal(
        null,
      );
    }, []);

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setError("");

      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setError(
          "Authentication required.",
        );
        setLoading(false);
        return;
      }

      const {
        data: profile,
        error:
          profileError,
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
          profileError?.message ??
            "Unable to resolve your organization.",
        );
        setLoading(false);
        return;
      }

      setOrganizationId(
        profile.organization_id,
      );

      const [
        dealsResult,
        leadsResult,
        propertiesResult,
        agentsResult,
      ] =
        await Promise.all([
          supabase
            .from("deals")
            .select(
              `
                id,
                organization_id,
                lead_id,
                agent_id,
                property_id,
                deal_value,
                currency,
                status,
                closed_at,
                notes,
                created_at,
                lead:leads (
                  id,
                  full_name
                ),
                property:properties (
                  id,
                  title
                ),
                agent:profiles (
                  id,
                  full_name
                )
              `,
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            ),

          supabase
            .from("leads")
            .select(
              "id, full_name",
            )
            .order(
              "full_name",
              {
                ascending:
                  true,
              },
            ),

          supabase
            .from("properties")
            .select(
              "id, title",
            )
            .order(
              "title",
              {
                ascending:
                  true,
              },
            ),

          supabase
            .from("profiles")
            .select(
              "id, full_name",
            )
            .order(
              "full_name",
              {
                ascending:
                  true,
              },
            ),
        ]);

      if (
        dealsResult.error
      ) {
        setError(
          dealsResult.error.message,
        );
        setLoading(false);
        return;
      }

      if (
        leadsResult.error
      ) {
        setError(
          leadsResult.error.message,
        );
        setLoading(false);
        return;
      }

      if (
        propertiesResult.error
      ) {
        setError(
          propertiesResult.error.message,
        );
        setLoading(false);
        return;
      }

      if (
        agentsResult.error
      ) {
        setError(
          agentsResult.error.message,
        );
        setLoading(false);
        return;
      }

      const rows =
        (dealsResult.data ??
          []) as DealQueryRow[];

      const normalizedDeals =
        rows.map(
          (row) => ({
            id: row.id,
            organization_id:
              row.organization_id,
            lead_id:
              row.lead_id,
            agent_id:
              row.agent_id,
            property_id:
              row.property_id,
            deal_value:
              row.deal_value,
            currency:
              row.currency,
            status:
              row.status,
            closed_at:
              row.closed_at,
            notes:
              row.notes,
            created_at:
              row.created_at,
            lead:
              firstRelation(
                row.lead,
              ),
            property:
              firstRelation(
                row.property,
              ),
            agent:
              firstRelation(
                row.agent,
              ),
          }),
        );

      setDeals(
        normalizedDeals,
      );

      setLeads(
        (leadsResult.data ??
          []) as Lead[],
      );

      setProperties(
        (propertiesResult.data ??
          []) as Property[],
      );

      setAgents(
        (agentsResult.data ??
          []) as Agent[],
      );

      setLoading(false);
    }, [supabase]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadData();
        },
        0,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [loadData]);

  const filteredDeals =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return deals.filter(
        (deal) => {
          const matchesStatus =
            statusFilter ===
              "all" ||
            deal.status ===
              statusFilter;

          if (
            !matchesStatus
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const text = [
            deal.lead
              ?.full_name,
            deal.property
              ?.title,
            deal.agent
              ?.full_name,
            deal.currency,
            deal.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(
            query,
          );
        },
      );
    }, [
      deals,
      search,
      statusFilter,
    ]);

  const summary =
    useMemo(() => {
      const byCurrency =
        new Map<
          string,
          {
            open: number;
            won: number;
            lost: number;
          }
        >();

      for (
        const deal of deals
      ) {
        const existing =
          byCurrency.get(
            deal.currency,
          ) ?? {
            open: 0,
            won: 0,
            lost: 0,
          };

        const value =
          Number(
            deal.deal_value ??
              0,
          );

        if (
          deal.status ===
          "open"
        ) {
          existing.open +=
            value;
        }

        if (
          deal.status ===
          "won"
        ) {
          existing.won +=
            value;
        }

        if (
          deal.status ===
          "lost"
        ) {
          existing.lost +=
            value;
        }

        byCurrency.set(
          deal.currency,
          existing,
        );
      }

      const usd =
        byCurrency.get(
          "USD",
        ) ?? {
          open: 0,
          won: 0,
          lost: 0,
        };

      return {
        total: deals.length,
        openCount: deals.filter(
          (deal) =>
            deal.status ===
            "open",
        ).length,
        wonCount: deals.filter(
          (deal) =>
            deal.status ===
            "won",
        ).length,
        lostCount: deals.filter(
          (deal) =>
            deal.status ===
            "lost",
        ).length,
        byCurrency,
        usd,
      };
    }, [deals]);

  const pipelineDisplay =
    deals.some(
      (deal) =>
        deal.currency !==
        "USD",
    )
      ? `USD ${Number(
          summary.usd.open,
        ).toLocaleString()}`
      : formatMoney(
          summary.usd.open,
          "USD",
        );

  const wonDisplay =
    deals.some(
      (deal) =>
        deal.currency !==
        "USD",
    )
      ? `USD ${Number(
          summary.usd.won,
        ).toLocaleString()}`
      : formatMoney(
          summary.usd.won,
          "USD",
        );

  function openCreateModal() {
    resetForm();
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(
    deal: Deal,
  ) {
    setEditingDeal(deal);

    setLeadId(
      deal.lead_id,
    );

    setPropertyId(
      deal.property_id ??
        "",
    );

    setAgentId(
      deal.agent_id ??
        "",
    );

    setDealValue(
      deal.deal_value !=
        null
        ? String(
            deal.deal_value,
          )
        : "",
    );

    setCurrency(
      deal.currency ||
        "USD",
    );

    setStatus(
      deal.status,
    );

    setClosedAt(
      deal.closed_at
        ? toDateTimeLocal(
            deal.closed_at,
          )
        : "",
    );

    setNotes(
      deal.notes ?? "",
    );

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  async function syncLeadStatus(
    targetLeadId: string,
    dealStatus: DealStatus,
  ) {
    const nextLeadStatus =
      leadStatusForDeal(
        dealStatus,
      );

    const {
      error:
        syncError,
    } =
      await supabase
        .from("leads")
        .update({
          status:
            nextLeadStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          targetLeadId,
        );

    if (
      syncError
    ) {
      throw new Error(
        `Deal was saved, but lead status sync failed: ${syncError.message}`,
      );
    }
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!organizationId) {
      setError(
        "Organization context is not available.",
      );
      return;
    }

    if (!leadId) {
      setError(
        "Please select a lead.",
      );
      return;
    }

    if (
      dealValue &&
      Number.isNaN(
        Number(dealValue),
      )
    ) {
      setError(
        "Deal value must be a valid number.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      organization_id:
        organizationId,
      lead_id:
        leadId,
      property_id:
        propertyId || null,
      agent_id:
        agentId || null,
      deal_value:
        dealValue
          ? Number(
              dealValue,
            )
          : null,
      currency,
      status,
      closed_at:
        status ===
        "open"
          ? null
          : closedAt
            ? new Date(
                closedAt,
              ).toISOString()
            : new Date().toISOString(),
      notes:
        notes.trim() ||
        null,
    };

    try {
      if (editingDeal) {
        const {
          error:
            updateError,
        } =
          await supabase
            .from("deals")
            .update({
              lead_id:
                payload.lead_id,
              property_id:
                payload.property_id,
              agent_id:
                payload.agent_id,
              deal_value:
                payload.deal_value,
              currency:
                payload.currency,
              status:
                payload.status,
              closed_at:
                payload.closed_at,
              notes:
                payload.notes,
            })
            .eq(
              "id",
              editingDeal.id,
            );

        if (
          updateError
        ) {
          throw new Error(
            updateError.message,
          );
        }

        await syncLeadStatus(
          payload.lead_id,
          payload.status,
        );

        setSuccess(
          "Deal and lead status updated successfully.",
        );
      } else {
        const {
          data: createdDeal,
          error:
            insertError,
        } =
          await supabase
            .from("deals")
            .insert(
              payload,
            )
            .select(
              "id, lead_id, status",
            )
            .single();

        if (
          insertError
        ) {
          throw new Error(
            insertError.message,
          );
        }

        await syncLeadStatus(
          createdDeal.lead_id,
          createdDeal.status,
        );

        setSuccess(
          "Deal created and lead moved to the correct stage.",
        );
      }

      setSaving(false);
      setModalOpen(false);
      resetForm();

      await loadData();
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save deal.",
      );

      setSaving(false);
    }
  }

  async function handleDelete(
    deal: Deal,
  ) {
    const confirmed =
      window.confirm(
        `Delete the deal for ${deal.lead?.full_name ?? "this lead"}?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      deal.id,
    );

    setError("");
    setSuccess("");

    const {
      error:
        deleteError,
    } =
      await supabase
        .from("deals")
        .delete()
        .eq(
          "id",
          deal.id,
        );

    if (
      deleteError
    ) {
      setError(
        deleteError.message,
      );

      setDeletingId(null);
      return;
    }

    /*
     * Deleting a deal should not automatically mark the lead as lost.
     * Restore the lead to negotiation if the lead currently reflects
     * this deal lifecycle stage.
     */
    if (
      deal.lead_id
    ) {
      await supabase
        .from("leads")
        .update({
          status:
            "negotiation",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          deal.lead_id,
        )
        .in(
          "status",
          [
            "won",
            "lost",
            "negotiation",
          ],
        );
    }

    setDeletingId(
      null,
    );

    setSuccess(
      "Deal deleted successfully.",
    );

    await loadData();
  }

  async function updateStatus(
    deal: Deal,
    nextStatus: DealStatus,
  ) {
    setStatusUpdatingId(
      deal.id,
    );

    setError("");
    setSuccess("");

    try {
      const closedAtValue =
        nextStatus ===
        "open"
          ? null
          : new Date().toISOString();

      const {
        error:
          updateError,
      } =
        await supabase
          .from("deals")
          .update({
            status:
              nextStatus,
            closed_at:
              closedAtValue,
          })
          .eq(
            "id",
            deal.id,
          );

      if (
        updateError
      ) {
        throw new Error(
          updateError.message,
        );
      }

      await syncLeadStatus(
        deal.lead_id,
        nextStatus,
      );

      setSuccess(
        nextStatus ===
          "won"
          ? "Deal won and lead marked Won."
          : nextStatus ===
              "lost"
            ? "Deal lost and lead marked Lost."
            : "Deal reopened and lead moved back to Negotiation.",
      );

      await loadData();
    } catch (
      statusError
    ) {
      setError(
        statusError instanceof
          Error
          ? statusError.message
          : "Unable to update deal status.",
      );
    } finally {
      setStatusUpdatingId(
        null,
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Deals
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Loading deal pipeline...
          </p>
        </div>

        <div className="h-28 animate-pulse rounded-xl border border-border bg-surface" />

        <div className="h-80 animate-pulse rounded-xl border border-border bg-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Deals
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Manage open opportunities, closed wins, and lost deals.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-700"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={
              openCreateModal
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white"
          >
            <Plus className="size-4" />
            New deal
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total deals"
          value={
            summary.total
          }
          icon={
            <Target className="size-4" />
          }
        />

        <StatCard
          label="Open pipeline"
          value={
            pipelineDisplay
          }
          icon={
            <DollarSign className="size-4" />
          }
        />

        <StatCard
          label="Won revenue"
          value={
            wonDisplay
          }
          icon={
            <Trophy className="size-4" />
          }
        />

        <StatCard
          label="Won deals"
          value={
            summary.wonCount
          }
          icon={
            <Check className="size-4" />
          }
        />
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

            <input
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search leads, properties, agents..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2"
            />
          </div>

          <div className="relative w-full lg:w-52">
            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target.value as
                    | DealStatus
                    | "all",
                )
              }
              className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm"
            >
              <option value="all">
                All statuses
              </option>

              {STATUS_OPTIONS.map(
                (
                  item,
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {formatLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          </div>
        </div>

        {filteredDeals.length ===
        0 ? (
          <div className="p-12 text-center">
            <DollarSign className="mx-auto size-8 text-ink-300" />

            <p className="mt-3 text-sm font-medium text-ink-900">
              No deals found
            </p>

            <p className="mt-1 text-xs text-ink-400">
              Create a deal from a qualified or negotiation lead.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="border-b border-border text-xs text-ink-400">
                  <th className="px-5 py-3 font-medium">
                    Lead
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Property
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Agent
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Value
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Status
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Closed
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredDeals.map(
                  (
                    deal,
                  ) => (
                    <tr
                      key={
                        deal.id
                      }
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-5 py-4">
                        {deal.lead ? (
                          <Link
                            href={`/leads/${deal.lead.id}`}
                            className="text-sm font-medium text-ink-900 hover:underline"
                          >
                            {
                              deal
                                .lead
                                .full_name
                            }
                          </Link>
                        ) : (
                          <span className="text-sm text-ink-400">
                            Unknown lead
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-ink-700">
                          {deal
                            .property
                            ?.title ??
                            "No property"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-ink-700">
                          {deal
                            .agent
                            ?.full_name ??
                            "Unassigned"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-ink-900">
                          {formatMoney(
                            deal.deal_value,
                            deal.currency,
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                            deal.status,
                          )}`}
                        >
                          {formatLabel(
                            deal.status,
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs text-ink-400">
                          {formatDate(
                            deal.closed_at,
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {deal.status ===
                          "open" ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void updateStatus(
                                    deal,
                                    "won",
                                  )
                                }
                                disabled={
                                  statusUpdatingId ===
                                  deal.id
                                }
                                className="inline-flex size-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700 disabled:opacity-50"
                                title="Mark won"
                              >
                                {statusUpdatingId ===
                                deal.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Check className="size-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void updateStatus(
                                    deal,
                                    "lost",
                                  )
                                }
                                disabled={
                                  statusUpdatingId ===
                                  deal.id
                                }
                                className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 disabled:opacity-50"
                                title="Mark lost"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void updateStatus(
                                  deal,
                                  "open",
                                )
                              }
                              disabled={
                                statusUpdatingId ===
                                deal.id
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-ink-700 disabled:opacity-50"
                              title="Reopen"
                            >
                              {statusUpdatingId ===
                              deal.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="size-3.5" />
                              )}
                              Reopen
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                deal,
                              )
                            }
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-ink-600"
                            title="Edit"
                          >
                            <Edit3 className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleDelete(
                                deal,
                              )
                            }
                            disabled={
                              deletingId ===
                              deal.id
                            }
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId ===
                            deal.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  {editingDeal
                    ? "Edit deal"
                    : "Create deal"}
                </h2>

                <p className="mt-1 text-xs text-ink-400">
                  Saving a deal also moves the linked lead to the matching
                  sales stage.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false,
                  )
                }
                className="flex size-8 items-center justify-center rounded-lg text-ink-500"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={
                handleSave
              }
              className="max-h-[80vh] space-y-5 overflow-y-auto p-5"
            >
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
                      item,
                    ) =>
                      item.id,
                  ),
                ]}
                optionLabels={{
                  "": "Select lead",
                  ...Object.fromEntries(
                    leads.map(
                      (
                        item,
                      ) => [
                        item.id,
                        item.full_name,
                      ],
                    ),
                  ),
                }}
                required
              />

              <SelectField
                label="Property"
                value={
                  propertyId
                }
                onChange={
                  setPropertyId
                }
                options={[
                  "",
                  ...properties.map(
                    (
                      item,
                    ) =>
                      item.id,
                  ),
                ]}
                optionLabels={{
                  "": "No property",
                  ...Object.fromEntries(
                    properties.map(
                      (
                        item,
                      ) => [
                        item.id,
                        item.title,
                      ],
                    ),
                  ),
                }}
              />

              <SelectField
                label="Agent"
                value={
                  agentId
                }
                onChange={
                  setAgentId
                }
                options={[
                  "",
                  ...agents.map(
                    (
                      item,
                    ) =>
                      item.id,
                  ),
                ]}
                optionLabels={{
                  "": "Unassigned",
                  ...Object.fromEntries(
                    agents.map(
                      (
                        item,
                      ) => [
                        item.id,
                        item.full_name,
                      ],
                    ),
                  ),
                }}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Deal value"
                  value={
                    dealValue
                  }
                  onChange={
                    setDealValue
                  }
                  type="number"
                  min="0"
                  step="0.01"
                />

                <SelectField
                  label="Currency"
                  value={
                    currency
                  }
                  onChange={
                    setCurrency
                  }
                  options={
                    CURRENCY_OPTIONS
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
                      value as DealStatus,
                    )
                  }
                  options={
                    STATUS_OPTIONS
                  }
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink-800">
                    Closed at
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      closedAt
                    }
                    onChange={(
                      event,
                    ) =>
                      setClosedAt(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      status ===
                      "open"
                    }
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-800">
                  Notes
                </label>

                <textarea
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
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>

              <div className="rounded-lg bg-surface-sunken px-4 py-3 text-xs leading-5 text-ink-500">
                Open → lead becomes Negotiation.
                Won → lead becomes Won.
                Lost → lead becomes Lost.
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setModalOpen(
                      false,
                    )
                  }
                  disabled={
                    saving
                  }
                  className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingDeal
                      ? "Save changes"
                      : "Create deal"}
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
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  type?: string;
  min?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
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
          required={
            required
          }
          className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none focus:ring-2"
        >
          {options.map(
            (
              option,
            ) => (
              <option
                key={
                  option
                }
                value={
                  option
                }
              >
                {optionLabels?.[
                  option
                ] ??
                  (option
                    ? formatLabel(
                        option,
                      )
                    : "")}
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
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink-400">
          {label}
        </span>

        <div className="flex size-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">
        {value}
      </p>
    </div>
  );
}