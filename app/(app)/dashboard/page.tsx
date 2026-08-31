"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Flame,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
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
  source: string;
  status: LeadStatus;
  priority: LeadPriority;
  lead_score: number | null;
  assigned_agent_id: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
};

type Deal = {
  id: string;
  lead_id: string;
  agent_id: string | null;
  property_id: string | null;
  deal_value: number | null;
  currency: string;
  status:
    | "open"
    | "won"
    | "lost";
  created_at: string;
  closed_at: string | null;
};

type FollowUp = {
  id: string;
  lead_id: string;
  assigned_to: string | null;
  due_at: string;
  type: string;
  notes: string | null;
  status: string;
  completed_at: string | null;
};

type Appointment = {
  id: string;
  lead_id: string;
  property_id: string | null;
  agent_id: string | null;
  scheduled_at: string;
  type: string;
  status: string;
  notes: string | null;
};

type Property = {
  id: string;
  title: string;
  status: string;
  price: number;
  currency: string;
  location: string;
  property_type: string;
};

type Agent = {
  id: string;
  full_name: string;
};

type ActivityRecord = {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: string;
  description: string | null;
  created_at: string;
};

type AIAnalysis = {
  id: string;
  lead_id: string | null;
  analysis_type: string;
  score: number | null;
  priority: LeadPriority | null;
  summary: string | null;
  recommendation: string | null;
  created_at: string;
};

const STATUS_CONFIG: Array<{
  id: LeadStatus;
  label: string;
}> = [
  {
    id: "new",
    label: "New",
  },
  {
    id: "contacted",
    label: "Contacted",
  },
  {
    id: "qualified",
    label: "Qualified",
  },
  {
    id: "property_matched",
    label: "Property Matched",
  },
  {
    id: "site_visit",
    label: "Site Visit",
  },
  {
    id: "negotiation",
    label: "Negotiation",
  },
  {
    id: "won",
    label: "Won",
  },
  {
    id: "lost",
    label: "Lost",
  },
];

function formatMoney(
  value: number,
  currency = "USD",
) {
  return `${currency} ${Math.round(
    value,
  ).toLocaleString()}`;
}

function formatCompactMoney(
  value: number,
  currency = "USD",
) {
  if (value >= 1_000_000) {
    return `${currency} ${(value / 1_000_000).toFixed(
      1,
    )}M`;
  }

  if (value >= 1_000) {
    return `${currency} ${(value / 1_000).toFixed(
      1,
    )}K`;
  }

  return formatMoney(
    value,
    currency,
  );
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

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    },
  );
}

function formatDateTime(
  value: string,
) {
  const date =
    new Date(value);

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

function formatStatus(
  status: LeadStatus,
) {
  return (
    STATUS_CONFIG.find(
      (item) =>
        item.id ===
        status,
    )?.label ?? status
  );
}

function priorityClasses(
  priority: LeadPriority,
) {
  if (
    priority ===
    "hot"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    priority ===
    "warm"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function activityLabel(
  type: string,
) {
  return type
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function isPendingFollowUp(
  followUp: FollowUp,
) {
  return (
    followUp.status ===
    "pending"
  );
}

export default function DashboardPage() {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    leads,
    setLeads,
  ] = useState<Lead[]>([]);

  const [
    deals,
    setDeals,
  ] = useState<Deal[]>([]);

  const [
    followUps,
    setFollowUps,
  ] =
    useState<FollowUp[]>([]);

  const [
    appointments,
    setAppointments,
  ] =
    useState<Appointment[]>(
      [],
    );

  const [
    properties,
    setProperties,
  ] =
    useState<Property[]>([]);

  const [
    agents,
    setAgents,
  ] = useState<Agent[]>([]);

  const [
    activities,
    setActivities,
  ] =
    useState<ActivityRecord[]>(
      [],
    );

  const [
    aiAnalyses,
    setAIAnalyses,
  ] =
    useState<AIAnalysis[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    dashboardNow,
    setDashboardNow,
  ] = useState(
    () => Date.now(),
  );

  const loadDashboard =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        const [
          leadsResult,
          dealsResult,
          followUpsResult,
          appointmentsResult,
          propertiesResult,
          agentsResult,
          activitiesResult,
          aiResult,
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
                  source,
                  status,
                  priority,
                  lead_score,
                  assigned_agent_id,
                  next_follow_up_at,
                  created_at,
                  updated_at
                `,
              )
              .order(
                "updated_at",
                {
                  ascending:
                    false,
                },
              ),

            supabase
              .from("deals")
              .select(
                `
                  id,
                  lead_id,
                  agent_id,
                  property_id,
                  deal_value,
                  currency,
                  status,
                  created_at,
                  closed_at
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
              .from("follow_ups")
              .select(
                `
                  id,
                  lead_id,
                  assigned_to,
                  due_at,
                  type,
                  notes,
                  status,
                  completed_at
                `,
              )
              .order(
                "due_at",
                {
                  ascending:
                    true,
                },
              ),

            supabase
              .from("appointments")
              .select(
                `
                  id,
                  lead_id,
                  property_id,
                  agent_id,
                  scheduled_at,
                  type,
                  status,
                  notes
                `,
              )
              .order(
                "scheduled_at",
                {
                  ascending:
                    true,
                },
              ),

            supabase
              .from("properties")
              .select(
                `
                  id,
                  title,
                  status,
                  price,
                  currency,
                  location,
                  property_type
                `,
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

            supabase
              .from("activities")
              .select(
                `
                  id,
                  lead_id,
                  user_id,
                  type,
                  description,
                  created_at
                `,
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(
                30,
              ),

            supabase
              .from(
                "ai_analyses",
              )
              .select(
                `
                  id,
                  lead_id,
                  analysis_type,
                  score,
                  priority,
                  summary,
                  recommendation,
                  created_at
                `,
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(
                100,
              ),
          ]);

        const results = [
          leadsResult,
          dealsResult,
          followUpsResult,
          appointmentsResult,
          propertiesResult,
          agentsResult,
          activitiesResult,
          aiResult,
        ];

        const firstError =
          results.find(
            (
              result,
            ) =>
              result.error,
          );

        if (
          firstError?.error
        ) {
          setError(
            firstError.error
              .message,
          );
          setLoading(false);
          return;
        }

        setLeads(
          (leadsResult.data ??
            []) as Lead[],
        );

        setDeals(
          (dealsResult.data ??
            []) as Deal[],
        );

        setFollowUps(
          (followUpsResult.data ??
            []) as FollowUp[],
        );

        setAppointments(
          (appointmentsResult.data ??
            []) as Appointment[],
        );

        setProperties(
          (propertiesResult.data ??
            []) as Property[],
        );

        setAgents(
          (agentsResult.data ??
            []) as Agent[],
        );

        setActivities(
          (activitiesResult.data ??
            []) as ActivityRecord[],
        );

        setAIAnalyses(
          (aiResult.data ??
            []) as AIAnalysis[],
        );

        setDashboardNow(
          Date.now(),
        );

        setLoading(false);
      },
      [supabase],
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadDashboard();
        },
        0,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [loadDashboard]);

  const metrics =
    useMemo(() => {
      const hotLeads =
        leads.filter(
          (lead) =>
            lead.priority ===
            "hot",
        ).length;

      const pendingFollowUps =
        followUps.filter(
          isPendingFollowUp,
        );

      const overdueFollowUps =
        pendingFollowUps.filter(
          (item) => {
            const due =
              new Date(
                item.due_at,
              ).getTime();

            return (
              !Number.isNaN(
                due,
              ) &&
              due <
                dashboardNow
            );
          },
        ).length;

      const upcomingAppointments =
        appointments.filter(
          (item) => {
            const scheduled =
              new Date(
                item.scheduled_at,
              ).getTime();

            return (
              !Number.isNaN(
                scheduled,
              ) &&
              scheduled >=
                dashboardNow
            );
          },
        );

      const openDeals =
        deals.filter(
          (deal) =>
            deal.status ===
            "open",
        );

      const wonDeals =
        deals.filter(
          (deal) =>
            deal.status ===
            "won",
        );

      const lostDeals =
        deals.filter(
          (deal) =>
            deal.status ===
            "lost",
        );

      const pipelineValue =
        openDeals
          .filter(
            (deal) =>
              deal.currency ===
              "USD",
          )
          .reduce(
            (
              total,
              deal,
            ) =>
              total +
              Number(
                deal.deal_value ??
                  0,
              ),
            0,
          );

      const closedRevenue =
        wonDeals
          .filter(
            (deal) =>
              deal.currency ===
              "USD",
          )
          .reduce(
            (
              total,
              deal,
            ) =>
              total +
              Number(
                deal.deal_value ??
                  0,
              ),
            0,
          );

      const closedDeals =
        wonDeals.length +
        lostDeals.length;

      const winRate =
        closedDeals >
        0
          ? (wonDeals.length /
              closedDeals) *
            100
          : 0;

      const scores =
        leads
          .map(
            (lead) =>
              lead.lead_score,
          )
          .filter(
            (
              score,
            ): score is number =>
              score !== null,
          );

      const averageScore =
        scores.length > 0
          ? scores.reduce(
              (
                total,
                score,
              ) =>
                total +
                score,
              0,
            ) /
            scores.length
          : 0;

      return {
        totalLeads:
          leads.length,
        hotLeads,
        pendingFollowUps:
          pendingFollowUps.length,
        overdueFollowUps,
        upcomingAppointments,
        pipelineValue,
        closedRevenue,
        openDeals:
          openDeals.length,
        wonDeals:
          wonDeals.length,
        lostDeals:
          lostDeals.length,
        winRate,
        averageScore,
      };
    }, [
      appointments,
      dashboardNow,
      deals,
      followUps,
      leads,
    ]);

  const statusCounts =
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

  const maxStatusCount =
    Math.max(
      1,
      ...Object.values(
        statusCounts,
      ),
    );

  const hotLeads =
    useMemo(
      () =>
        [...leads]
          .filter(
            (lead) =>
              lead.priority ===
                "hot" &&
              lead.status !==
                "won" &&
              lead.status !==
                "lost",
          )
          .sort(
            (
              a,
              b,
            ) =>
              (b.lead_score ??
                0) -
              (a.lead_score ??
                0),
          )
          .slice(
            0,
            5,
          ),
      [leads],
    );

  const pendingFollowUps =
    useMemo(
      () =>
        [...followUps]
          .filter(
            isPendingFollowUp,
          )
          .sort(
            (
              a,
              b,
            ) =>
              new Date(
                a.due_at,
              ).getTime() -
              new Date(
                b.due_at,
              ).getTime(),
          )
          .slice(
            0,
            5,
          ),
      [followUps],
    );

  const upcomingAppointments =
    useMemo(
      () =>
        [...appointments]
          .filter(
            (item) => {
              const value =
                new Date(
                  item.scheduled_at,
                ).getTime();

              return (
                !Number.isNaN(
                  value,
                ) &&
                value >=
                  dashboardNow
              );
            },
          )
          .sort(
            (
              a,
              b,
            ) =>
              new Date(
                a.scheduled_at,
              ).getTime() -
              new Date(
                b.scheduled_at,
              ).getTime(),
          )
          .slice(
            0,
            5,
          ),
      [
        appointments,
        dashboardNow,
      ],
    );

  const recentActivities =
    useMemo(
      () =>
        activities
          .slice(
            0,
            8,
          ),
      [activities],
    );

  const recentWins =
    useMemo(
      () =>
        [...deals]
          .filter(
            (deal) =>
              deal.status ===
                "won" &&
              deal.closed_at,
          )
          .sort(
            (
              a,
              b,
            ) =>
              new Date(
                b.closed_at!,
              ).getTime() -
              new Date(
                a.closed_at!,
              ).getTime(),
          )
          .slice(
            0,
            5,
          ),
      [deals],
    );

  const leadMap =
    useMemo(
      () =>
        new Map(
          leads.map(
            (lead) => [
              lead.id,
              lead,
            ],
          ),
        ),
      [leads],
    );

  const propertyMap =
    useMemo(
      () =>
        new Map(
          properties.map(
            (property) => [
              property.id,
              property,
            ],
          ),
        ),
      [properties],
    );

  const agentMap =
    useMemo(
      () =>
        new Map(
          agents.map(
            (agent) => [
              agent.id,
              agent,
            ],
          ),
        ),
      [agents],
    );

  const latestAIInsight =
    useMemo(() => {
      const candidates =
        aiAnalyses.filter(
          (item) =>
            item.analysis_type ===
            "lead_scoring",
        );

      const sorted =
        [...candidates].sort(
          (
            a,
            b,
          ) =>
            new Date(
              b.created_at,
            ).getTime() -
            new Date(
              a.created_at,
            ).getTime(),
        );

      return (
        sorted[0] ??
        null
      );
    }, [aiAnalyses]);

  const qualifiedCount =
    statusCounts.qualified +
    statusCounts.property_matched +
    statusCounts.site_visit +
    statusCounts.negotiation +
    statusCounts.won;

  const qualificationRate =
    metrics.totalLeads >
    0
      ? (qualifiedCount /
          metrics.totalLeads) *
        100
      : 0;

  const topSource =
    useMemo(() => {
      const sourceMap =
        new Map<
          string,
          number
        >();

      for (
        const lead of leads
      ) {
        sourceMap.set(
          lead.source,
          (sourceMap.get(
            lead.source,
          ) ?? 0) + 1,
        );
      }

      return (
        Array.from(
          sourceMap.entries(),
        ).sort(
          (
            a,
            b,
          ) =>
            b[1] - a[1],
        )[0] ??
        null
      );
    }, [leads]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Loading your sales workspace...
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from(
            {
              length: 5,
            },
          ).map(
            (
              _,
              index,
            ) => (
              <div
                key={
                  index
                }
                className="h-32 animate-pulse rounded-xl border border-border bg-surface"
              />
            ),
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="h-96 animate-pulse rounded-xl border border-border bg-surface xl:col-span-2" />

          <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Dashboard
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-400">
            Your real-time overview of leads, pipeline, revenue, follow-ups,
            appointments, and AI intelligence.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadDashboard()
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardMetric
          label="Total Leads"
          value={
            metrics.totalLeads
          }
          detail={`${metrics.hotLeads} hot leads`}
          icon={
            <Users className="size-4" />
          }
        />

        <DashboardMetric
          label="Hot Leads"
          value={
            metrics.hotLeads
          }
          detail={
            metrics.averageScore
              ? `${metrics.averageScore.toFixed(
                  0,
                )} avg AI score`
              : "Awaiting scoring"
          }
          icon={
            <Flame className="size-4" />
          }
        />

        <DashboardMetric
          label="Follow-ups Due"
          value={
            metrics.pendingFollowUps
          }
          detail={
            metrics.overdueFollowUps >
            0
              ? `${metrics.overdueFollowUps} overdue`
              : "No overdue items"
          }
          icon={
            <Clock3 className="size-4" />
          }
        />

        <DashboardMetric
          label="Pipeline Value"
          value={formatCompactMoney(
            metrics.pipelineValue,
          )}
          detail={`${metrics.openDeals} open deals`}
          icon={
            <TrendingUp className="size-4" />
          }
        />

        <DashboardMetric
          label="Closed Revenue"
          value={formatCompactMoney(
            metrics.closedRevenue,
          )}
          detail={`${metrics.wonDeals} won deals`}
          icon={
            <Trophy className="size-4" />
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">
                Sales Funnel
              </h2>

              <p className="mt-1 text-xs text-ink-400">
                Current distribution across the sales lifecycle.
              </p>
            </div>

            <Link
              href="/pipeline"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:underline"
            >
              View pipeline
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-4 p-5">
            {STATUS_CONFIG.map(
              (
                item,
                index,
              ) => {
                const count =
                  statusCounts[
                    item.id
                  ];

                return (
                  <div
                    key={
                      item.id
                    }
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-surface-sunken text-[10px] font-semibold text-ink-600">
                          {index +
                            1}
                        </span>

                        <span className="text-xs font-medium text-ink-700">
                          {
                            item.label
                          }
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-ink-900">
                        {
                          count
                        }
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                      <div
                        className="h-full rounded-full bg-ink-900"
                        style={{
                          width: `${Math.max(
                            3,
                            (count /
                              maxStatusCount) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}

            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              <MiniStat
                label="Qualification rate"
                value={`${qualificationRate.toFixed(
                  1,
                )}%`}
              />

              <MiniStat
                label="Win rate"
                value={`${metrics.winRate.toFixed(
                  1,
                )}%`}
              />

              <MiniStat
                label="Upcoming appointments"
                value={
                  metrics.upcomingAppointments.length
                }
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                AI Insight
              </h2>
            </div>

            <p className="mt-1 text-xs text-ink-400">
              Latest intelligence from your CRM.
            </p>
          </div>

          <div className="p-5">
            {latestAIInsight ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-surface-sunken p-4">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-ink-600" />

                    <span className="text-xs font-semibold text-ink-800">
                      Latest lead intelligence
                    </span>
                  </div>

                  {latestAIInsight.score !=
                  null ? (
                    <p className="mt-3 text-3xl font-semibold text-ink-900">
                      {
                        latestAIInsight.score
                      }

                      <span className="ml-1 text-base text-ink-400">
                        /100
                      </span>
                    </p>
                  ) : null}

                  {latestAIInsight.summary ? (
                    <p className="mt-3 text-xs leading-6 text-ink-600">
                      {
                        latestAIInsight.summary
                      }
                    </p>
                  ) : null}
                </div>

                {latestAIInsight.recommendation ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
                      Recommendation
                    </p>

                    <p className="mt-2 text-sm leading-6 text-ink-700">
                      {
                        latestAIInsight.recommendation
                      }
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center text-center">
                <Brain className="size-8 text-ink-300" />

                <p className="mt-3 text-sm font-medium text-ink-900">
                  No AI insight yet
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-400">
                  Run AI scoring or analysis from the AI Assistant.
                </p>

                <Link
                  href="/ai-assistant"
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-xs font-medium text-ink-700"
                >
                  Open AI Assistant
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface">
          <SectionHeader
            icon={
              <Flame className="size-4" />
            }
            title="Hot Leads"
            subtitle="Highest-priority opportunities"
            href="/leads"
            linkText="View all"
          />

          {hotLeads.length ===
          0 ? (
            <EmptyBlock
              title="No hot leads"
              description="Hot opportunities will appear here."
            />
          ) : (
            <div className="divide-y divide-border">
              {hotLeads.map(
                (lead) => (
                  <Link
                    key={
                      lead.id
                    }
                    href={`/leads/${lead.id}`}
                    className="block px-5 py-4 hover:bg-surface-sunken"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {
                            lead.full_name
                          }
                        </p>

                        <p className="mt-1 truncate text-xs text-ink-400">
                          {lead.source}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${priorityClasses(
                          lead.priority,
                        )}`}
                      >
                        {lead.lead_score ??
                          "—"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-ink-400">
                        {
                          formatStatus(
                            lead.status,
                          )
                        }
                      </span>

                      <span className="text-[11px] font-medium text-ink-600">
                        Open lead
                      </span>
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <SectionHeader
            icon={
              <Clock3 className="size-4" />
            }
            title="Follow-ups Due"
            subtitle="Next scheduled sales actions"
            href="/follow-ups"
            linkText="View all"
          />

          {pendingFollowUps.length ===
          0 ? (
            <EmptyBlock
              title="No pending follow-ups"
              description="Your follow-up queue is clear."
            />
          ) : (
            <div className="divide-y divide-border">
              {pendingFollowUps.map(
                (item) => {
                  const lead =
                    leadMap.get(
                      item.lead_id,
                    );

                  const overdue =
                    new Date(
                      item.due_at,
                    ).getTime() <
                    dashboardNow;

                  return (
                    <Link
                      key={
                        item.id
                      }
                      href={
                        lead
                          ? `/leads/${lead.id}`
                          : "/follow-ups"
                      }
                      className="block px-5 py-4 hover:bg-surface-sunken"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {
                              lead?.full_name ??
                              "Lead"
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-ink-400">
                            {
                              activityLabel(
                                item.type,
                              )
                            }
                          </p>
                        </div>

                        <span
                          className={
                            overdue
                              ? "shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700"
                              : "shrink-0 rounded-full border border-border bg-surface-sunken px-2 py-1 text-[10px] font-medium text-ink-600"
                          }
                        >
                          {overdue
                            ? "Overdue"
                            : formatDate(
                                item.due_at,
                              )}
                        </span>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <SectionHeader
            icon={
              <CalendarDays className="size-4" />
            }
            title="Appointments"
            subtitle="Upcoming client meetings"
            href="/appointments"
            linkText="View all"
          />

          {upcomingAppointments.length ===
          0 ? (
            <EmptyBlock
              title="No upcoming appointments"
              description="Scheduled appointments will appear here."
            />
          ) : (
            <div className="divide-y divide-border">
              {upcomingAppointments.map(
                (item) => {
                  const lead =
                    leadMap.get(
                      item.lead_id,
                    );

                  const property =
                    item.property_id
                      ? propertyMap.get(
                          item.property_id,
                        )
                      : null;

                  return (
                    <div
                      key={
                        item.id
                      }
                      className="px-5 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
                          <CalendarDays className="size-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {
                              lead?.full_name ??
                              "Lead"
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-ink-400">
                            {
                              property?.title ??
                              activityLabel(
                                item.type,
                              )
                            }
                          </p>

                          <p className="mt-2 text-[11px] font-medium text-ink-600">
                            {formatDateTime(
                              item.scheduled_at,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface">
          <SectionHeader
            icon={
              <Activity className="size-4" />
            }
            title="Recent Activity"
            subtitle="Latest CRM actions"
            href="/leads"
            linkText="Open leads"
          />

          {recentActivities.length ===
          0 ? (
            <EmptyBlock
              title="No recent activity"
              description="Lead activity will appear here."
            />
          ) : (
            <div className="divide-y divide-border">
              {recentActivities.map(
                (activity) => {
                  const lead =
                    leadMap.get(
                      activity.lead_id,
                    );

                  return (
                    <div
                      key={
                        activity.id
                      }
                      className="flex items-start gap-3 px-5 py-4"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-600">
                        <Activity className="size-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900">
                          {
                            activityLabel(
                              activity.type,
                            )
                          }
                        </p>

                        <p className="mt-1 text-xs text-ink-500">
                          {activity.description ??
                            `Activity recorded for ${
                              lead?.full_name ??
                              "lead"
                            }.`}
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-400">
                          <span>
                            {
                              lead?.full_name ??
                              "Lead"
                            }
                          </span>

                          <span>
                            •
                          </span>

                          <span>
                            {formatDateTime(
                              activity.created_at,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <SectionHeader
            icon={
              <Trophy className="size-4" />
            }
            title="Recent Wins"
            subtitle="Latest closed-won opportunities"
            href="/deals"
            linkText="View deals"
          />

          {recentWins.length ===
          0 ? (
            <EmptyBlock
              title="No won deals yet"
              description="Closed-won opportunities will appear here."
            />
          ) : (
            <div className="divide-y divide-border">
              {recentWins.map(
                (deal) => {
                  const lead =
                    leadMap.get(
                      deal.lead_id,
                    );

                  const property =
                    deal.property_id
                      ? propertyMap.get(
                          deal.property_id,
                        )
                      : null;

                  const agent =
                    deal.agent_id
                      ? agentMap.get(
                          deal.agent_id,
                        )
                      : null;

                  return (
                    <div
                      key={
                        deal.id
                      }
                      className="px-5 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
                            <Trophy className="size-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-900">
                              {
                                lead?.full_name ??
                                "Lead"
                              }
                            </p>

                            <p className="mt-1 truncate text-xs text-ink-400">
                              {
                                property?.title ??
                                "No property"
                              }

                              {agent
                                ? ` • ${agent.full_name}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 text-sm font-semibold text-ink-900">
                          {formatMoney(
                            Number(
                              deal.deal_value ??
                                0,
                            ),
                            deal.currency,
                          )}
                        </span>
                      </div>

                      {deal.closed_at ? (
                        <p className="mt-2 pl-11 text-[10px] text-ink-400">
                          Closed{" "}
                          {formatDate(
                            deal.closed_at,
                          )}
                        </p>
                      ) : null}
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickInsight
          title="Top lead source"
          value={
            topSource
              ? topSource[0]
              : "—"
          }
          detail={
            topSource
              ? `${topSource[1]} leads`
              : "No lead source data"
          }
          icon={
            <Users className="size-4" />
          }
        />

        <QuickInsight
          title="Open deals"
          value={
            metrics.openDeals
          }
          detail={`${formatCompactMoney(
            metrics.pipelineValue,
          )} pipeline`}
          icon={
            <TrendingUp className="size-4" />
          }
        />

        <QuickInsight
          title="Won / Lost"
          value={`${metrics.wonDeals} / ${metrics.lostDeals}`}
          detail={`${metrics.winRate.toFixed(
            1,
          )}% win rate`}
          icon={
            <Target className="size-4" />
          }
        />

        <QuickInsight
          title="AI score average"
          value={
            metrics.averageScore
              ? `${metrics.averageScore.toFixed(
                  0,
                )}/100`
              : "—"
          }
          detail={`${aiAnalyses.length} recent AI analyses`}
          icon={
            <Brain className="size-4" />
          }
        />
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                Sales overview
              </h2>
            </div>

            <p className="mt-1 text-xs text-ink-400">
              Use Analytics for deeper revenue, source, funnel, and agent
              performance analysis.
            </p>
          </div>

          <Link
            href="/analytics"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-xs font-semibold text-white"
          >
            Open Analytics
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <OverviewItem
            label="Pipeline"
            value={formatCompactMoney(
              metrics.pipelineValue,
            )}
            icon={
              <TrendingUp className="size-4" />
            }
          />

          <OverviewItem
            label="Revenue"
            value={formatCompactMoney(
              metrics.closedRevenue,
            )}
            icon={
              <DollarSign className="size-4" />
            }
          />

          <OverviewItem
            label="Appointments"
            value={
              metrics.upcomingAppointments.length
            }
            icon={
              <CalendarDays className="size-4" />
            }
          />

          <OverviewItem
            label="Overdue"
            value={
              metrics.overdueFollowUps
            }
            icon={
              <XCircle className="size-4" />
            }
          />
        </div>
      </section>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
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

      <p className="mt-1 text-xs text-ink-400">
        {detail}
      </p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  href,
  linkText,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-ink-600">
            {icon}
          </span>

          <h2 className="text-sm font-semibold text-ink-900">
            {title}
          </h2>
        </div>

        <p className="mt-1 text-xs text-ink-400">
          {subtitle}
        </p>
      </div>

      <Link
        href={href}
        className="shrink-0 text-xs font-medium text-ink-600 hover:underline"
      >
        {linkText}
      </Link>
    </div>
  );
}

function EmptyBlock({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
      <CheckCircle2 className="size-7 text-ink-300" />

      <p className="mt-3 text-sm font-medium text-ink-900">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-xs leading-5 text-ink-400">
        {description}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-[11px] text-ink-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-ink-900">
        {value}
      </p>
    </div>
  );
}

function QuickInsight({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink-400">
          {title}
        </span>

        <div className="flex size-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 truncate text-sm font-semibold text-ink-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-ink-400">
        {detail}
      </p>
    </div>
  );
}

function OverviewItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-ink-400">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-ink-900">
          {value}
        </p>
      </div>
    </div>
  );
}