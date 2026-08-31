"use client";

import {
  CalendarDays,
  ChevronDown,
  GripVertical,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "property_matched"
  | "site_visit"
  | "negotiation"
  | "won"
  | "lost";

type LeadPriority =
  | "cold"
  | "warm"
  | "hot";

type Lead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  lead_score: number | null;
  preferred_location: string | null;
  property_type: string | null;
  budget_max: number | null;
  assigned_agent_id: string | null;
  next_follow_up_at: string | null;
  updated_at: string;
};

type Agent = {
  id: string;
  full_name: string;
};

type ColumnDefinition = {
  id: LeadStatus;
  label: string;
  description: string;
};

const COLUMNS: ColumnDefinition[] = [
  {
    id: "new",
    label: "New",
    description: "Newly captured leads",
  },
  {
    id: "contacted",
    label: "Contacted",
    description: "Initial contact completed",
  },
  {
    id: "qualified",
    label: "Qualified",
    description: "Buying requirements confirmed",
  },
  {
    id: "property_matched",
    label: "Property Matched",
    description: "Suitable properties identified",
  },
  {
    id: "site_visit",
    label: "Site Visit",
    description: "Viewing or appointment stage",
  },
  {
    id: "negotiation",
    label: "Negotiation",
    description: "Commercial discussion",
  },
  {
    id: "won",
    label: "Won",
    description: "Successfully closed",
  },
  {
    id: "lost",
    label: "Lost",
    description: "Opportunity lost",
  },
];

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "No follow-up";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "No follow-up";
  }

  return date.toLocaleDateString();
}

function formatStatus(
  status: LeadStatus,
) {
  return (
    COLUMNS.find(
      (column) =>
        column.id === status,
    )?.label ?? status
  );
}

function getPriorityClasses(
  priority: LeadPriority,
) {
  if (
    priority === "hot"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    priority === "warm"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getScoreClasses(
  score: number | null,
) {
  if (score == null) {
    return "border-border bg-surface-sunken text-ink-500";
  }

  if (score >= 80) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (score >= 60) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export default function PipelinePage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [agents, setAgents] =
    useState<Agent[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    updatingLeadId,
    setUpdatingLeadId,
  ] = useState<string | null>(
    null,
  );

  const [search, setSearch] =
    useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState<
    LeadPriority | "all"
  >("all");

  const [
    agentFilter,
    setAgentFilter,
  ] = useState("all");

  const [error, setError] =
    useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    draggingLeadId,
    setDraggingLeadId,
  ] = useState<string | null>(
    null,
  );

  const [
    dragOverColumn,
    setDragOverColumn,
  ] =
    useState<LeadStatus | null>(
      null,
    );

  const loadData =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        const [
          leadsResult,
          agentsResult,
        ] = await Promise.all([
          supabase
            .from("leads")
            .select(
              `
                id,
                full_name,
                email,
                phone,
                status,
                priority,
                lead_score,
                preferred_location,
                property_type,
                budget_max,
                assigned_agent_id,
                next_follow_up_at,
                updated_at
              `,
            )
            .order(
              "updated_at",
              {
                ascending: false,
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
                ascending: true,
              },
            ),
        ]);

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
          agentsResult.error
        ) {
          setError(
            agentsResult.error.message,
          );
          setLoading(false);
          return;
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

    return () =>
      window.clearTimeout(timer);
  }, [loadData]);

  const filteredLeads =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return leads.filter(
        (lead) => {
          if (
            priorityFilter !==
              "all" &&
            lead.priority !==
              priorityFilter
          ) {
            return false;
          }

          if (
            agentFilter !==
              "all" &&
            lead.assigned_agent_id !==
              agentFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const agent =
            agents.find(
              (item) =>
                item.id ===
                lead.assigned_agent_id,
            );

          const searchText = [
            lead.full_name,
            lead.email,
            lead.phone,
            lead.preferred_location,
            lead.property_type,
            agent?.full_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchText.includes(
            query,
          );
        },
      );
    }, [
      agents,
      agentFilter,
      leads,
      priorityFilter,
      search,
    ]);

  const groupedLeads =
    useMemo(() => {
      const groups: Record<
        LeadStatus,
        Lead[]
      > = {
        new: [],
        contacted: [],
        qualified: [],
        property_matched: [],
        site_visit: [],
        negotiation: [],
        won: [],
        lost: [],
      };

      for (
        const lead of filteredLeads
      ) {
        if (
          groups[lead.status]
        ) {
          groups[
            lead.status
          ].push(lead);
        }
      }

      return groups;
    }, [filteredLeads]);

  const counts =
    useMemo(() => {
      const result: Record<
        LeadStatus,
        number
      > = {
        new: 0,
        contacted: 0,
        qualified: 0,
        property_matched: 0,
        site_visit: 0,
        negotiation: 0,
        won: 0,
        lost: 0,
      };

      for (
        const lead of leads
      ) {
        result[
          lead.status
        ] += 1;
      }

      return result;
    }, [leads]);

  async function moveLead(
    leadId: string,
    nextStatus: LeadStatus,
  ) {
    const currentLead =
      leads.find(
        (lead) =>
          lead.id ===
          leadId,
      );

    if (
      !currentLead ||
      currentLead.status ===
        nextStatus
    ) {
      return;
    }

    setUpdatingLeadId(
      leadId,
    );

    setError("");
    setSuccess("");

    const {
      data: updatedLead,
      error: updateError,
    } =
      await supabase
        .from("leads")
        .update({
          status:
            nextStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          leadId,
        )
        .select(
          `
            id,
            full_name,
            email,
            phone,
            status,
            priority,
            lead_score,
            preferred_location,
            property_type,
            budget_max,
            assigned_agent_id,
            next_follow_up_at,
            updated_at
          `,
        )
        .single();

    if (
      updateError
    ) {
      setError(
        updateError.message,
      );
      setUpdatingLeadId(
        null,
      );
      return;
    }

    setLeads(
      (current) =>
        current.map(
          (lead) =>
            lead.id ===
            leadId
              ? (updatedLead as Lead)
              : lead,
        ),
    );

    setSuccess(
      `${currentLead.full_name} moved to ${formatStatus(
        nextStatus,
      )}.`,
    );

    setUpdatingLeadId(
      null,
    );
  }

  function handleDragStart(
    event: DragEvent<HTMLDivElement>,
    leadId: string,
  ) {
    setDraggingLeadId(
      leadId,
    );

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      leadId,
    );
  }

  function handleDragEnd() {
    setDraggingLeadId(
      null,
    );

    setDragOverColumn(
      null,
    );
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>,
    status: LeadStatus,
  ) {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";

    setDragOverColumn(
      status,
    );
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
    status: LeadStatus,
  ) {
    event.preventDefault();

    const leadId =
      event.dataTransfer.getData(
        "text/plain",
      );

    if (leadId) {
      void moveLead(
        leadId,
        status,
      );
    }

    setDraggingLeadId(
      null,
    );

    setDragOverColumn(
      null,
    );
  }

  function handleSelectChange(
    leadId: string,
    status: LeadStatus,
  ) {
    void moveLead(
      leadId,
      status,
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Pipeline
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Loading sales pipeline...
          </p>
        </div>

        <div className="h-20 animate-pulse rounded-xl border border-border bg-surface" />

        <div className="grid min-h-[600px] gap-4 xl:grid-cols-4 2xl:grid-cols-8">
          {COLUMNS.map(
            (column) => (
              <div
                key={
                  column.id
                }
                className="animate-pulse rounded-xl border border-border bg-surface"
              />
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Sales Pipeline
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Move leads through the real sales lifecycle.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData()
          }
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-700"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
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

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

            <input
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search leads, location, property type..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2"
            />
          </div>

          <div className="relative w-full xl:w-44">
            <select
              value={
                priorityFilter
              }
              onChange={(
                event,
              ) =>
                setPriorityFilter(
                  event.target
                    .value as
                    | LeadPriority
                    | "all",
                )
              }
              className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm"
            >
              <option value="all">
                All priorities
              </option>

              <option value="hot">
                Hot
              </option>

              <option value="warm">
                Warm
              </option>

              <option value="cold">
                Cold
              </option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          </div>

          <div className="relative w-full xl:w-56">
            <select
              value={
                agentFilter
              }
              onChange={(
                event,
              ) =>
                setAgentFilter(
                  event.target.value,
                )
              }
              className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm"
            >
              <option value="all">
                All agents
              </option>

              {agents.map(
                (agent) => (
                  <option
                    key={
                      agent.id
                    }
                    value={
                      agent.id
                    }
                  >
                    {
                      agent.full_name
                    }
                  </option>
                ),
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        {COLUMNS.map(
          (column) => (
            <div
              key={
                column.id
              }
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-ink-500">
                  {
                    column.label
                  }
                </span>

                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                  {
                    counts[
                      column.id
                    ]
                  }
                </span>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[1600px] grid-cols-8 gap-4">
          {COLUMNS.map(
            (column) => {
              const columnLeads =
                groupedLeads[
                  column.id
                ];

              const isOver =
                dragOverColumn ===
                column.id;

              return (
                <div
                  key={
                    column.id
                  }
                  onDragOver={(
                    event,
                  ) =>
                    handleDragOver(
                      event,
                      column.id,
                    )
                  }
                  onDrop={(
                    event,
                  ) =>
                    handleDrop(
                      event,
                      column.id,
                    )
                  }
                  onDragLeave={() =>
                    setDragOverColumn(
                      null,
                    )
                  }
                  className={`min-h-[620px] rounded-xl border transition ${
                    isOver
                      ? "border-ink-900 bg-surface-sunken"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="border-b border-border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-semibold text-ink-900">
                          {
                            column.label
                          }
                        </h2>

                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-ink-400">
                          {
                            column.description
                          }
                        </p>
                      </div>

                      <span className="rounded-full bg-surface-sunken px-2 py-1 text-[11px] font-semibold text-ink-700">
                        {
                          columnLeads.length
                        }
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    {columnLeads.length ===
                    0 ? (
                      <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center">
                        <Target className="mx-auto size-5 text-ink-300" />

                        <p className="mt-2 text-xs text-ink-400">
                          Drop a lead here
                        </p>
                      </div>
                    ) : (
                      columnLeads.map(
                        (
                          lead,
                        ) => {
                          const agent =
                            agents.find(
                              (
                                item,
                              ) =>
                                item.id ===
                                lead.assigned_agent_id,
                            );

                          const isUpdating =
                            updatingLeadId ===
                            lead.id;

                          return (
                            <div
                              key={
                                lead.id
                              }
                              draggable={
                                !isUpdating
                              }
                              onDragStart={(
                                event,
                              ) =>
                                handleDragStart(
                                  event,
                                  lead.id,
                                )
                              }
                              onDragEnd={
                                handleDragEnd
                              }
                              className={`rounded-xl border border-border bg-background p-4 shadow-sm transition ${
                                draggingLeadId ===
                                lead.id
                                  ? "opacity-50"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5 cursor-grab text-ink-300">
                                  <GripVertical className="size-4" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <Link
                                      href={`/leads/${lead.id}`}
                                      className="line-clamp-2 text-sm font-semibold text-ink-900 hover:underline"
                                    >
                                      {
                                        lead.full_name
                                      }
                                    </Link>

                                    {lead.lead_score !=
                                    null ? (
                                      <span
                                        className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getScoreClasses(
                                          lead.lead_score,
                                        )}`}
                                      >
                                        {
                                          lead.lead_score
                                        }
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span
                                      className={`rounded-full border px-2 py-1 text-[10px] font-medium ${getPriorityClasses(
                                        lead.priority,
                                      )}`}
                                    >
                                      {
                                        lead.priority
                                      }
                                    </span>

                                    {lead.property_type ? (
                                      <span className="rounded-full border border-border bg-surface-sunken px-2 py-1 text-[10px] text-ink-600">
                                        {
                                          lead.property_type
                                        }
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-3 space-y-2 text-[11px] text-ink-500">
                                    {lead.preferred_location ? (
                                      <div className="flex items-start gap-1.5">
                                        <MapPin className="mt-0.5 size-3.5 shrink-0" />

                                        <span className="line-clamp-2">
                                          {
                                            lead.preferred_location
                                          }
                                        </span>
                                      </div>
                                    ) : null}

                                    {lead.phone ? (
                                      <div className="flex items-center gap-1.5">
                                        <Phone className="size-3.5 shrink-0" />

                                        <span>
                                          {
                                            lead.phone
                                          }
                                        </span>
                                      </div>
                                    ) : null}

                                    <div className="flex items-center gap-1.5">
                                      <CalendarDays className="size-3.5 shrink-0" />

                                      <span>
                                        {formatDate(
                                          lead.next_follow_up_at,
                                        )}
                                      </span>
                                    </div>

                                    {agent ? (
                                      <div className="flex items-center gap-1.5">
                                        <UserRound className="size-3.5 shrink-0" />

                                        <span className="truncate">
                                          {
                                            agent.full_name
                                          }
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="mt-4">
                                    <div className="relative">
                                      <select
                                        value={
                                          lead.status
                                        }
                                        disabled={
                                          isUpdating
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          handleSelectChange(
                                            lead.id,
                                            event
                                              .target
                                              .value as LeadStatus,
                                          )
                                        }
                                        className="h-8 w-full appearance-none rounded-lg border border-border bg-surface px-2.5 pr-8 text-[11px] font-medium text-ink-700 disabled:opacity-50"
                                      >
                                        {COLUMNS.map(
                                          (
                                            option,
                                          ) => (
                                            <option
                                              key={
                                                option.id
                                              }
                                              value={
                                                option.id
                                              }
                                            >
                                              Move to{" "}
                                              {
                                                option.label
                                              }
                                            </option>
                                          ),
                                        )}
                                      </select>

                                      {isUpdating ? (
                                        <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-ink-500" />
                                      ) : (
                                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
                                      )}
                                    </div>
                                  </div>

                                  <Link
                                    href={`/leads/${lead.id}`}
                                    className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-[11px] font-medium text-ink-700 hover:bg-surface-sunken"
                                  >
                                    <Sparkles className="size-3.5" />
                                    Open lead intelligence
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}