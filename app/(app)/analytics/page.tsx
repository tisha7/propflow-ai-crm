"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  MapPin,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type DateRange =
  | "7d"
  | "30d"
  | "90d"
  | "12m"
  | "all";

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

type LeadSource =
  | "facebook"
  | "website"
  | "google_ads"
  | "referral"
  | "property_portal"
  | "manual"
  | "other";

type Lead = {
  id: string;
  full_name?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  lead_score: number | null;
  assigned_agent_id: string | null;
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
  status: string;
  due_at: string;
  completed_at: string | null;
};

type Appointment = {
  id: string;
  lead_id: string;
  property_id: string | null;
  scheduled_at: string;
  status: string;
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

type AIAnalysis = {
  id: string;
  lead_id: string | null;
  analysis_type: string;
  score: number | null;
  created_at: string;
};

type ActivityRecord = {
  id: string;
  lead_id: string;
  type: string;
  created_at: string;
};

type MonthlyPoint = {
  key: string;
  label: string;
  leads: number;
  won: number;
  lost: number;
  revenue: number;
};

type SourcePerformance = {
  id: LeadSource;
  label: string;
  leads: number;
  qualified: number;
  won: number;
  conversion: number;
};

type AgentPerformance = {
  id: string;
  name: string;
  leads: number;
  openDeals: number;
  wonDeals: number;
  revenue: number;
  winRate: number;
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

const SOURCE_CONFIG: Array<{
  id: LeadSource;
  label: string;
}> = [
  {
    id: "facebook",
    label: "Facebook",
  },
  {
    id: "website",
    label: "Website",
  },
  {
    id: "google_ads",
    label: "Google Ads",
  },
  {
    id: "referral",
    label: "Referral",
  },
  {
    id: "property_portal",
    label: "Property Portal",
  },
  {
    id: "manual",
    label: "Manual",
  },
  {
    id: "other",
    label: "Other",
  },
];

const DATE_RANGE_LABELS: Record<
  DateRange,
  string
> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  all: "All time",
};

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

function formatPercent(
  value: number,
) {
  return `${value.toFixed(1)}%`;
}

function average(
  values: number[],
) {
  if (
    values.length === 0
  ) {
    return 0;
  }

  return (
    values.reduce(
      (
        total,
        value,
      ) =>
        total + value,
      0,
    ) / values.length
  );
}

function getStartDate(
  range: DateRange,
  now: Date,
) {
  if (
    range === "all"
  ) {
    return null;
  }

  const start =
    new Date(now);

  if (range === "7d") {
    start.setDate(
      start.getDate() -
        7,
    );
  }

  if (range === "30d") {
    start.setDate(
      start.getDate() -
        30,
    );
  }

  if (range === "90d") {
    start.setDate(
      start.getDate() -
        90,
    );
  }

  if (range === "12m") {
    start.setMonth(
      start.getMonth() -
        12,
    );
  }

  return start;
}

function dateInRange(
  value: string,
  startTime: number | null,
  endTime: number,
) {
  const timestamp =
    new Date(value).getTime();

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return false;
  }

  if (
    startTime !== null &&
    timestamp < startTime
  ) {
    return false;
  }

  return (
    timestamp <=
    endTime
  );
}

function monthKey(
  date: Date,
) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(
    2,
    "0",
  )}`;
}

function monthLabel(
  date: Date,
) {
  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      year: "numeric",
    },
  );
}

function stageIndex(
  status: LeadStatus,
) {
  const order: LeadStatus[] =
    [
      "new",
      "contacted",
      "qualified",
      "property_matched",
      "site_visit",
      "negotiation",
      "won",
      "lost",
    ];

  return order.indexOf(
    status,
  );
}

function isPositiveClosedStatus(
  status: LeadStatus,
) {
  return (
    status ===
    "won"
  );
}

export default function AnalyticsPage() {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [deals, setDeals] =
    useState<Deal[]>([]);

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
    aiAnalyses,
    setAIAnalyses,
  ] =
    useState<AIAnalysis[]>(
      [],
    );

  const [
    activities,
    setActivities,
  ] =
    useState<ActivityRecord[]>(
      [],
    );

  const [
    dateRange,
    setDateRange,
  ] =
    useState<DateRange>(
      "30d",
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
    analyticsNow,
    setAnalyticsNow,
  ] = useState(
    () => Date.now(),
  );

  const loadAnalytics =
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
          aiResult,
          activitiesResult,
        ] =
          await Promise.all([
            supabase
              .from("leads")
              .select(
                `
                  id,
                  full_name,
                  source,
                  status,
                  priority,
                  lead_score,
                  assigned_agent_id,
                  created_at,
                  updated_at
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
                  status,
                  due_at,
                  completed_at
                `,
              ),

            supabase
              .from("appointments")
              .select(
                `
                  id,
                  lead_id,
                  property_id,
                  scheduled_at,
                  status
                `,
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
              .from(
                "ai_analyses",
              )
              .select(
                `
                  id,
                  lead_id,
                  analysis_type,
                  score,
                  created_at
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
              .from(
                "activities",
              )
              .select(
                `
                  id,
                  lead_id,
                  type,
                  created_at
                `,
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              ),
          ]);

        const results = [
          leadsResult,
          dealsResult,
          followUpsResult,
          appointmentsResult,
          propertiesResult,
          agentsResult,
          aiResult,
          activitiesResult,
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

        setAIAnalyses(
          (aiResult.data ??
            []) as AIAnalysis[],
        );

        setActivities(
          (activitiesResult.data ??
            []) as ActivityRecord[],
        );

        setAnalyticsNow(
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
          void loadAnalytics();
        },
        0,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [loadAnalytics]);

  const rangeData =
    useMemo(() => {
      const now =
        new Date(
          analyticsNow,
        );

      const start =
        getStartDate(
          dateRange,
          now,
        );

      const startTime =
        start
          ? start.getTime()
          : null;

      return {
        now,
        start,
        startTime,
      };
    }, [
      analyticsNow,
      dateRange,
    ]);

  const filteredLeads =
    useMemo(
      () =>
        leads.filter(
          (lead) =>
            dateInRange(
              lead.created_at,
              rangeData.startTime,
              analyticsNow,
            ),
        ),
      [
        analyticsNow,
        leads,
        rangeData.startTime,
      ],
    );

  const filteredDeals =
    useMemo(
      () =>
        deals.filter((deal) => {
          const date =
            deal.closed_at ??
            deal.created_at;

          return dateInRange(
            date,
            rangeData.startTime,
            analyticsNow,
          );
        }),
      [
        analyticsNow,
        deals,
        rangeData.startTime,
      ],
    );

  const filteredFollowUps =
    useMemo(
      () =>
        followUps.filter(
          (item) =>
            dateInRange(
              item.due_at,
              rangeData.startTime,
              analyticsNow,
            ),
        ),
      [
        analyticsNow,
        followUps,
        rangeData.startTime,
      ],
    );

  const filteredAppointments =
    useMemo(
      () =>
        appointments.filter(
          (item) =>
            dateInRange(
              item.scheduled_at,
              rangeData.startTime,
              analyticsNow,
            ),
        ),
      [
        analyticsNow,
        appointments,
        rangeData.startTime,
      ],
    );

  const filteredAI =
    useMemo(
      () =>
        aiAnalyses.filter(
          (item) =>
            dateInRange(
              item.created_at,
              rangeData.startTime,
              analyticsNow,
            ),
        ),
      [
        aiAnalyses,
        analyticsNow,
        rangeData.startTime,
      ],
    );

  const filteredActivities =
    useMemo(
      () =>
        activities.filter(
          (item) =>
            dateInRange(
              item.created_at,
              rangeData.startTime,
              analyticsNow,
            ),
        ),
      [
        activities,
        analyticsNow,
        rangeData.startTime,
      ],
    );

  const metrics =
    useMemo(() => {
      const wonDeals =
        filteredDeals.filter(
          (deal) =>
            deal.status ===
            "won",
        );

      const openDeals =
        filteredDeals.filter(
          (deal) =>
            deal.status ===
            "open",
        );

      const lostDeals =
        filteredDeals.filter(
          (deal) =>
            deal.status ===
            "lost",
        );

      const wonRevenue =
        wonDeals
          .filter(
            (deal) =>
              deal.currency ===
              "USD",
          )
          .reduce(
            (
              sum,
              deal,
            ) =>
              sum +
              Number(
                deal.deal_value ??
                  0,
              ),
            0,
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
              sum,
              deal,
            ) =>
              sum +
              Number(
                deal.deal_value ??
                  0,
              ),
            0,
          );

      const lostValue =
        lostDeals
          .filter(
            (deal) =>
              deal.currency ===
              "USD",
          )
          .reduce(
            (
              sum,
              deal,
            ) =>
              sum +
              Number(
                deal.deal_value ??
                  0,
              ),
            0,
          );

      const closedCount =
        wonDeals.length +
        lostDeals.length;

      const winRate =
        closedCount >
        0
          ? (wonDeals.length /
              closedCount) *
            100
          : 0;

      const scored =
        filteredLeads
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

      const hotLeads =
        filteredLeads.filter(
          (lead) =>
            lead.priority ===
            "hot",
        ).length;

      const overdueFollowUps =
        filteredFollowUps.filter(
          (item) => {
            if (
              item.status !==
              "pending"
            ) {
              return false;
            }

            const due =
              new Date(
                item.due_at,
              ).getTime();

            return (
              !Number.isNaN(
                due,
              ) &&
              due <
                analyticsNow
            );
          },
        ).length;

      const completedFollowUps =
        filteredFollowUps.filter(
          (item) =>
            item.status ===
            "completed",
        ).length;

      const followUpCompletionRate =
        filteredFollowUps.length >
        0
          ? (completedFollowUps /
              filteredFollowUps.length) *
            100
          : 0;

      const upcomingAppointments =
        filteredAppointments.filter(
          (item) => {
            const time =
              new Date(
                item.scheduled_at,
              ).getTime();

            return (
              !Number.isNaN(
                time,
              ) &&
              time >=
                analyticsNow
            );
          },
        ).length;

      const completedAppointments =
        filteredAppointments.filter(
          (item) =>
            item.status ===
              "completed" ||
            item.status ===
              "completed",
        ).length;

      const appointmentCompletionRate =
        filteredAppointments.length >
        0
          ? (completedAppointments /
              filteredAppointments.length) *
            100
          : 0;

      const availableProperties =
        properties.filter(
          (property) =>
            property.status ===
            "available",
        ).length;

      const reservedProperties =
        properties.filter(
          (property) =>
            property.status ===
            "reserved",
        ).length;

      const soldProperties =
        properties.filter(
          (property) =>
            property.status ===
            "sold",
        ).length;

      return {
        totalLeads:
          filteredLeads.length,
        wonDeals:
          wonDeals.length,
        openDeals:
          openDeals.length,
        lostDeals:
          lostDeals.length,
        wonRevenue,
        pipelineValue,
        lostValue,
        winRate,
        averageDealSize:
          wonDeals.length >
          0
            ? wonRevenue /
              wonDeals.length
            : 0,
        averageLeadScore:
          average(
            scored,
          ),
        hotLeads,
        pendingFollowUps:
          filteredFollowUps.filter(
            (item) =>
              item.status ===
              "pending",
          ).length,
        overdueFollowUps,
        followUpCompletionRate,
        upcomingAppointments,
        completedAppointments,
        appointmentCompletionRate,
        availableProperties,
        reservedProperties,
        soldProperties,
        activities:
          filteredActivities.length,
      };
    }, [
      analyticsNow,
      filteredActivities,
      filteredAppointments,
      filteredDeals,
      filteredFollowUps,
      filteredLeads,
      properties,
    ]);

  const funnel =
    useMemo(() => {
      const total =
        filteredLeads.length;

      return STATUS_CONFIG.map(
        (item) => {
          const count =
            filteredLeads.filter(
              (lead) =>
                lead.status ===
                item.id,
            ).length;

          const conversion =
            total > 0
              ? (count /
                  total) *
                100
              : 0;

          return {
            ...item,
            count,
            conversion,
          };
        },
      );
    }, [filteredLeads]);

  const maxFunnelCount =
    Math.max(
      1,
      ...funnel.map(
        (item) =>
          item.count,
      ),
    );

  const sourcePerformance =
    useMemo<
      SourcePerformance[]
    >(() => {
      return SOURCE_CONFIG.map(
        (source) => {
          const sourceLeads =
            filteredLeads.filter(
              (lead) =>
                lead.source ===
                source.id,
            );

          const qualified =
            sourceLeads.filter(
              (lead) =>
                stageIndex(
                  lead.status,
                ) >=
                stageIndex(
                  "qualified",
                ),
            ).length;

          const won =
            sourceLeads.filter(
              (lead) =>
                isPositiveClosedStatus(
                  lead.status,
                ),
            ).length;

          return {
            id: source.id,
            label:
              source.label,
            leads:
              sourceLeads.length,
            qualified,
            won,
            conversion:
              sourceLeads.length >
              0
                ? (won /
                    sourceLeads.length) *
                  100
                : 0,
          };
        },
      )
        .filter(
          (item) =>
            item.leads >
            0,
        )
        .sort(
          (
            a,
            b,
          ) =>
            b.leads -
            a.leads,
        );
    }, [filteredLeads]);

  const maxSourceLeads =
    Math.max(
      1,
      ...sourcePerformance.map(
        (item) =>
          item.leads,
      ),
    );

  const agentPerformance =
    useMemo<
      AgentPerformance[]
    >(() => {
      return agents
        .map(
          (agent) => {
            const agentLeads =
              filteredLeads.filter(
                (lead) =>
                  lead.assigned_agent_id ===
                  agent.id,
              );

            const agentDeals =
              filteredDeals.filter(
                (deal) =>
                  deal.agent_id ===
                  agent.id,
              );

            const won =
              agentDeals.filter(
                (deal) =>
                  deal.status ===
                  "won",
              );

            const lost =
              agentDeals.filter(
                (deal) =>
                  deal.status ===
                  "lost",
              );

            const revenue =
              won
                .filter(
                  (deal) =>
                    deal.currency ===
                    "USD",
                )
                .reduce(
                  (
                    sum,
                    deal,
                  ) =>
                    sum +
                    Number(
                      deal.deal_value ??
                        0,
                    ),
                  0,
                );

            const closed =
              won.length +
              lost.length;

            return {
              id: agent.id,
              name:
                agent.full_name,
              leads:
                agentLeads.length,
              openDeals:
                agentDeals.filter(
                  (deal) =>
                    deal.status ===
                    "open",
                ).length,
              wonDeals:
                won.length,
              revenue,
              winRate:
                closed >
                0
                  ? (won.length /
                      closed) *
                    100
                  : 0,
            };
          },
        )
        .filter(
          (agent) =>
            agent.leads >
              0 ||
            agent.openDeals >
              0 ||
            agent.wonDeals >
              0,
        )
        .sort(
          (
            a,
            b,
          ) =>
            b.revenue -
            a.revenue,
        );
    }, [
      agents,
      filteredDeals,
      filteredLeads,
    ]);

  const monthlyTrend =
    useMemo<MonthlyPoint[]>(
      () => {
        const months: MonthlyPoint[] =
          [];

        const end =
          new Date(
            analyticsNow,
          );

        const count =
          dateRange ===
          "7d"
            ? 7
            : dateRange ===
                "30d"
              ? 6
              : dateRange ===
                  "90d"
                ? 6
                : 12;

        if (
          dateRange ===
          "7d"
        ) {
          for (
            let offset =
              6;
            offset >=
            0;
            offset -= 1
          ) {
            const date =
              new Date(
                end,
              );

            date.setDate(
              date.getDate() -
                offset,
            );

            const key =
              `${date.getFullYear()}-${String(
                date.getMonth() + 1,
              ).padStart(
                2,
                "0",
              )}-${String(
                date.getDate(),
              ).padStart(
                2,
                "0",
              )}`;

            const leadsCount =
              filteredLeads.filter(
                (lead) => {
                  const value =
                    new Date(
                      lead.created_at,
                    );

                  const leadKey =
                    `${value.getFullYear()}-${String(
                      value.getMonth() + 1,
                    ).padStart(
                      2,
                      "0",
                    )}-${String(
                      value.getDate(),
                    ).padStart(
                      2,
                      "0",
                    )}`;

                  return (
                    leadKey ===
                    key
                  );
                },
              ).length;

            months.push({
              key,
              label:
                date.toLocaleDateString(
                  undefined,
                  {
                    weekday:
                      "short",
                  },
                ),
              leads:
                leadsCount,
              won:
                filteredDeals.filter(
                  (deal) => {
                    if (
                      deal.status !==
                        "won" ||
                      !deal.closed_at
                    ) {
                      return false;
                    }

                    const value =
                      new Date(
                        deal.closed_at,
                      );

                    return (
                      `${value.getFullYear()}-${String(
                        value.getMonth() + 1,
                      ).padStart(
                        2,
                        "0",
                      )}-${String(
                        value.getDate(),
                      ).padStart(
                        2,
                        "0",
                      )}` ===
                      key
                    );
                  },
                ).length,
              lost:
                filteredDeals.filter(
                  (deal) => {
                    if (
                      deal.status !==
                        "lost" ||
                      !deal.closed_at
                    ) {
                      return false;
                    }

                    const value =
                      new Date(
                        deal.closed_at,
                      );

                    return (
                      `${value.getFullYear()}-${String(
                        value.getMonth() + 1,
                      ).padStart(
                        2,
                        "0",
                      )}-${String(
                        value.getDate(),
                      ).padStart(
                        2,
                        "0",
                      )}` ===
                      key
                    );
                  },
                ).length,
              revenue:
                filteredDeals
                  .filter(
                    (deal) => {
                      if (
                        deal.status !==
                          "won" ||
                        !deal.closed_at ||
                        deal.currency !==
                          "USD"
                      ) {
                        return false;
                      }

                      const value =
                        new Date(
                          deal.closed_at,
                        );

                      return (
                        `${value.getFullYear()}-${String(
                          value.getMonth() + 1,
                        ).padStart(
                          2,
                          "0",
                        )}-${String(
                          value.getDate(),
                        ).padStart(
                          2,
                          "0",
                        )}` ===
                        key
                      );
                    },
                  )
                  .reduce(
                    (
                      sum,
                      deal,
                    ) =>
                      sum +
                      Number(
                        deal.deal_value ??
                          0,
                      ),
                    0,
                  ),
            });
          }

          return months;
        }

        for (
          let offset =
            count - 1;
          offset >=
          0;
          offset -= 1
        ) {
          const date =
            new Date(
              end.getFullYear(),
              end.getMonth() -
                offset,
              1,
            );

          const key =
            monthKey(
              date,
            );

          const leadsCount =
            filteredLeads.filter(
              (lead) =>
                monthKey(
                  new Date(
                    lead.created_at,
                  ),
                ) === key,
            ).length;

          const wonDeals =
            filteredDeals.filter(
              (deal) =>
                deal.status ===
                  "won" &&
                deal.closed_at &&
                deal.currency ===
                  "USD" &&
                monthKey(
                  new Date(
                    deal.closed_at,
                  ),
                ) === key,
            );

          const lostDeals =
            filteredDeals.filter(
              (deal) =>
                deal.status ===
                  "lost" &&
                deal.closed_at &&
                monthKey(
                  new Date(
                    deal.closed_at,
                  ),
                ) === key,
            );

          months.push({
            key,
            label:
              monthLabel(
                date,
              ),
            leads:
              leadsCount,
            won:
              wonDeals.length,
            lost:
              lostDeals.length,
            revenue:
              wonDeals.reduce(
                (
                  sum,
                  deal,
                ) =>
                  sum +
                  Number(
                    deal.deal_value ??
                      0,
                  ),
                0,
              ),
          });
        }

        return months;
      },
      [
        analyticsNow,
        dateRange,
        filteredDeals,
        filteredLeads,
      ],
    );

  const maxMonthlyRevenue =
    Math.max(
      1,
      ...monthlyTrend.map(
        (item) =>
          item.revenue,
      ),
    );

  const maxMonthlyLeads =
    Math.max(
      1,
      ...monthlyTrend.map(
        (item) =>
          item.leads,
      ),
    );

  const aiMetrics =
    useMemo(() => {
      const scoring =
        filteredAI.filter(
          (item) =>
            item.analysis_type ===
            "lead_scoring",
        );

      const propertyMatches =
        filteredAI.filter(
          (item) =>
            item.analysis_type ===
            "property_match",
        );

      const summaries =
        filteredAI.filter(
          (item) =>
            item.analysis_type ===
            "lead_summary",
        );

      const actions =
        filteredAI.filter(
          (item) =>
            item.analysis_type ===
            "next_action",
        );

      const messageGeneration =
        filteredAI.filter(
          (item) =>
            item.analysis_type ===
            "message_generation",
        );

      const scores =
        scoring
          .map(
            (item) =>
              item.score,
          )
          .filter(
            (
              score,
            ): score is number =>
              score !=
              null,
          );

      return {
        total:
          filteredAI.length,
        scoring:
          scoring.length,
        propertyMatches:
          propertyMatches.length,
        summaries:
          summaries.length,
        actions:
          actions.length,
        messages:
          messageGeneration.length,
        averageScore:
          average(
            scores,
          ),
      };
    }, [filteredAI]);

  const topProperties =
    useMemo(() => {
      const counts =
        new Map<
          string,
          {
            property: Property;
            matches: number;
            appointments: number;
            wonDeals: number;
          }
        >();

      for (
        const property of properties
      ) {
        counts.set(
          property.id,
          {
            property,
            matches: 0,
            appointments: 0,
            wonDeals: 0,
          },
        );
      }

      for (
        const appointment of filteredAppointments
      ) {
        if (
          appointment.property_id &&
          counts.has(
            appointment.property_id,
          )
        ) {
          counts.get(
            appointment.property_id,
          )!.appointments +=
            1;
        }
      }

      for (
        const deal of filteredDeals
      ) {
        if (
          deal.property_id &&
          deal.status ===
            "won" &&
          counts.has(
            deal.property_id,
          )
        ) {
          counts.get(
            deal.property_id,
          )!.wonDeals +=
            1;
        }
      }

      return Array.from(
        counts.values(),
      )
        .map(
          (item) => ({
            ...item,
            activity:
              item.matches +
              item.appointments +
              item.wonDeals,
          }),
        )
        .filter(
          (item) =>
            item.activity >
            0,
        )
        .sort(
          (
            a,
            b,
          ) =>
            b.activity -
            a.activity,
        )
        .slice(
          0,
          5,
        );
    }, [
      filteredAppointments,
      filteredDeals,
      properties,
    ]);

  const recentWins =
    useMemo(
      () =>
        [...filteredDeals]
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
      [filteredDeals],
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

  const primarySource =
    sourcePerformance[0];

  const topAgent =
    agentPerformance[0];

  const latestRevenuePoint =
    monthlyTrend[
      monthlyTrend.length -
        1
    ];

  const previousRevenuePoint =
    monthlyTrend[
      Math.max(
        0,
        monthlyTrend.length -
          2,
      )
    ];

  const revenueChange =
    previousRevenuePoint &&
    previousRevenuePoint.revenue >
      0
      ? ((latestRevenuePoint.revenue -
          previousRevenuePoint.revenue) /
          previousRevenuePoint.revenue) *
        100
      : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Analytics
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Loading sales intelligence...
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from(
            {
              length: 8,
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

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border border-border bg-surface" />
          <div className="h-80 animate-pulse rounded-xl border border-border bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-surface-sunken text-ink-700">
              <BarChart3 className="size-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              Analytics
            </h1>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-400">
            Understand lead acquisition, sales conversion, agent performance,
            revenue, operations, properties, and AI activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <select
              value={
                dateRange
              }
              onChange={(
                event,
              ) =>
                setDateRange(
                  event.target
                    .value as DateRange,
                )
              }
              className="h-9 appearance-none rounded-lg border border-border bg-surface px-3 pr-9 text-sm font-medium text-ink-700"
            >
              {Object.entries(
                DATE_RANGE_LABELS,
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {label}
                  </option>
                ),
              )}
            </select>

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
              ▾
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadAnalytics()
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-700"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Closed revenue"
          value={formatCompactMoney(
            metrics.wonRevenue,
          )}
          detail={`${metrics.wonDeals} won deals`}
          icon={
            <Trophy className="size-4" />
          }
          trend={
            revenueChange
          }
        />

        <MetricCard
          label="Pipeline value"
          value={formatCompactMoney(
            metrics.pipelineValue,
          )}
          detail={`${metrics.openDeals} open deals`}
          icon={
            <TrendingUp className="size-4" />
          }
        />

        <MetricCard
          label="Total leads"
          value={
            metrics.totalLeads
          }
          detail={`${metrics.hotLeads} hot leads`}
          icon={
            <Users className="size-4" />
          }
        />

        <MetricCard
          label="Win rate"
          value={formatPercent(
            metrics.winRate,
          )}
          detail={`${metrics.wonDeals} won / ${metrics.lostDeals} lost`}
          icon={
            <Target className="size-4" />
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Average deal"
          value={formatCompactMoney(
            metrics.averageDealSize,
          )}
          detail="USD won-deal average"
          icon={
            <DollarSign className="size-4" />
          }
        />

        <MetricCard
          label="Average AI score"
          value={
            metrics.averageLeadScore
              ? `${metrics.averageLeadScore.toFixed(
                  0,
                )}/100`
              : "—"
          }
          detail={`${aiMetrics.scoring} scoring analyses`}
          icon={
            <Brain className="size-4" />
          }
        />

        <MetricCard
          label="Follow-ups due"
          value={
            metrics.pendingFollowUps
          }
          detail={
            metrics.overdueFollowUps >
            0
              ? `${metrics.overdueFollowUps} overdue`
              : "None overdue"
          }
          icon={
            <Clock3 className="size-4" />
          }
        />

        <MetricCard
          label="Appointments"
          value={
            filteredAppointments.length
          }
          detail={`${metrics.upcomingAppointments} upcoming`}
          icon={
            <CalendarDays className="size-4" />
          }
        />
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">
              Revenue & lead trend
            </h2>

            <p className="mt-1 text-xs text-ink-400">
              {DATE_RANGE_LABELS[
                dateRange
              ]} performance.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-ink-400">
            <span>
              Leads
            </span>

            <span>
              Won revenue
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="grid h-72 grid-cols-6 items-end gap-3 sm:grid-cols-7 md:grid-cols-12">
            {monthlyTrend.map(
              (
                point,
              ) => {
                const leadHeight =
                  point.leads >
                  0
                    ? Math.max(
                        8,
                        (point.leads /
                          maxMonthlyLeads) *
                          100,
                      )
                    : 3;

                const revenueHeight =
                  point.revenue >
                  0
                    ? Math.max(
                        8,
                        (point.revenue /
                          maxMonthlyRevenue) *
                          100,
                      )
                    : 3;

                return (
                  <div
                    key={
                      point.key
                    }
                    className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                  >
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <div
                        className="w-2/5 rounded-t-sm bg-ink-900/30"
                        style={{
                          height: `${leadHeight}%`,
                        }}
                        title={`${point.leads} leads`}
                      />

                      <div
                        className="w-2/5 rounded-t-sm bg-ink-900"
                        style={{
                          height: `${revenueHeight}%`,
                        }}
                        title={`${formatMoney(
                          point.revenue,
                        )} revenue`}
                      />
                    </div>

                    <div className="max-w-full truncate text-[10px] text-ink-400">
                      {
                        point.label
                      }
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <TrendStat
              label="Latest revenue"
              value={formatCompactMoney(
                latestRevenuePoint
                  ?.revenue ??
                  0,
              )}
            />

            <TrendStat
              label="Latest leads"
              value={
                latestRevenuePoint
                  ?.leads ??
                0
              }
            />

            <TrendStat
              label="Latest wins"
              value={
                latestRevenuePoint
                  ?.won ??
                0
              }
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">
              Sales funnel
            </h2>

            <p className="mt-1 text-xs text-ink-400">
              How leads are distributed through the sales lifecycle.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {funnel.map(
              (
                item,
                index,
              ) => (
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

                    <div className="text-right">
                      <span className="text-xs font-semibold text-ink-900">
                        {
                          item.count
                        }
                      </span>

                      <span className="ml-2 text-[10px] text-ink-400">
                        {formatPercent(
                          item.conversion,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full bg-ink-900"
                      style={{
                        width: `${Math.max(
                          3,
                          (item.count /
                            maxFunnelCount) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">
              Lead source performance
            </h2>

            <p className="mt-1 text-xs text-ink-400">
              Compare acquisition volume, qualification, and wins.
            </p>
          </div>

          <div className="p-5">
            {sourcePerformance.length ===
            0 ? (
              <EmptyAnalytics
                title="No source data"
                description="Lead source performance will appear here."
              />
            ) : (
              <div className="space-y-4">
                {sourcePerformance.map(
                  (
                    item,
                  ) => (
                    <div
                      key={
                        item.id
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-ink-700">
                          {
                            item.label
                          }
                        </span>

                        <div className="text-right text-[10px]">
                          <span className="font-semibold text-ink-900">
                            {
                              item.leads
                            }
                          </span>

                          <span className="ml-2 text-ink-400">
                            {item.won} won
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
                        <div
                          className="h-full rounded-full bg-ink-800"
                          style={{
                            width: `${Math.max(
                              4,
                              (item.leads /
                                maxSourceLeads) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-1 text-[10px] text-ink-400">
                        {
                          item.qualified
                        }{" "}
                        qualified •{" "}
                        {formatPercent(
                          item.conversion,
                        )}{" "}
                        lead-to-win
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-ink-600" />

            <h2 className="text-sm font-semibold text-ink-900">
              Agent performance
            </h2>
          </div>

          <p className="mt-1 text-xs text-ink-400">
            Compare lead ownership, open opportunities, wins, and revenue.
          </p>
        </div>

        {agentPerformance.length ===
        0 ? (
          <EmptyAnalytics
            title="No agent activity"
            description="Agent performance will appear when leads or deals are assigned."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-border text-[11px] text-ink-400">
                  <th className="px-5 py-3 font-medium">
                    Agent
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Leads
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Open deals
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Won
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Win rate
                  </th>

                  <th className="px-5 py-3 font-medium text-right">
                    Revenue
                  </th>
                </tr>
              </thead>

              <tbody>
                {agentPerformance.map(
                  (
                    agent,
                  ) => (
                    <tr
                      key={
                        agent.id
                      }
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-ink-900">
                          {
                            agent.name
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-ink-700">
                        {
                          agent.leads
                        }
                      </td>

                      <td className="px-5 py-4 text-sm text-ink-700">
                        {
                          agent.openDeals
                        }
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-ink-900">
                        {
                          agent.wonDeals
                        }
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full border border-border bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-700">
                          {formatPercent(
                            agent.winRate,
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-ink-900">
                        {formatMoney(
                          agent.revenue,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                AI performance
              </h2>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <HealthRow
              label="Total AI analyses"
              value={
                aiMetrics.total
              }
              icon={
                <Brain className="size-4" />
              }
            />

            <HealthRow
              label="Lead scoring"
              value={
                aiMetrics.scoring
              }
              icon={
                <Target className="size-4" />
              }
            />

            <HealthRow
              label="Property matching"
              value={
                aiMetrics.propertyMatches
              }
              icon={
                <MapPin className="size-4" />
              }
            />

            <HealthRow
              label="Next actions"
              value={
                aiMetrics.actions
              }
              icon={
                <Activity className="size-4" />
              }
            />

            <HealthRow
              label="Messages generated"
              value={
                aiMetrics.messages
              }
              icon={
                <TrendingUp className="size-4" />
              }
            />

            <HealthRow
              label="Average lead score"
              value={
                aiMetrics.averageScore
                  ? `${aiMetrics.averageScore.toFixed(
                      0,
                    )}/100`
                  : "—"
              }
              icon={
                <Target className="size-4" />
              }
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                Operations health
              </h2>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <HealthRow
              label="Pending follow-ups"
              value={
                metrics.pendingFollowUps
              }
              icon={
                <Clock3 className="size-4" />
              }
            />

            <HealthRow
              label="Overdue follow-ups"
              value={
                metrics.overdueFollowUps
              }
              icon={
                <Clock3 className="size-4" />
              }
            />

            <HealthRow
              label="Follow-up completion"
              value={formatPercent(
                metrics.followUpCompletionRate,
              )}
              icon={
                <CheckCircle2 className="size-4" />
              }
            />

            <HealthRow
              label="Upcoming appointments"
              value={
                metrics.upcomingAppointments
              }
              icon={
                <CalendarDays className="size-4" />
              }
            />

            <HealthRow
              label="Appointment completion"
              value={formatPercent(
                metrics.appointmentCompletionRate,
              )}
              icon={
                <CheckCircle2 className="size-4" />
              }
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                Inventory health
              </h2>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <HealthRow
              label="Available"
              value={
                metrics.availableProperties
              }
              icon={
                <CheckCircle2 className="size-4" />
              }
            />

            <HealthRow
              label="Reserved"
              value={
                metrics.reservedProperties
              }
              icon={
                <Clock3 className="size-4" />
              }
            />

            <HealthRow
              label="Sold"
              value={
                metrics.soldProperties
              }
              icon={
                <Trophy className="size-4" />
              }
            />

            <HealthRow
              label="Total inventory"
              value={
                properties.length
              }
              icon={
                <MapPin className="size-4" />
              }
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">
              Top property activity
            </h2>

            <p className="mt-1 text-xs text-ink-400">
              Properties currently connected to appointments and wins.
            </p>
          </div>

          {topProperties.length ===
          0 ? (
            <EmptyAnalytics
              title="No property activity"
              description="Property activity will appear here."
            />
          ) : (
            <div className="divide-y divide-border">
              {topProperties.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={
                      item.property
                        .id
                    }
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-600">
                      {index +
                        1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {
                          item.property
                            .title
                        }
                      </p>

                      <p className="mt-1 truncate text-xs text-ink-400">
                        {
                          item.property
                            .location
                        }{" "}
                        •{" "}
                        {
                          item.property
                            .property_type
                        }
                      </p>
                    </div>

                    <div className="text-right text-[10px] text-ink-400">
                      <p>
                        {
                          item.appointments
                        }{" "}
                        visits
                      </p>

                      <p>
                        {
                          item.wonDeals
                        }{" "}
                        won
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                Recent wins
              </h2>
            </div>

            <p className="mt-1 text-xs text-ink-400">
              Latest closed-won opportunities in the selected period.
            </p>
          </div>

          {recentWins.length ===
          0 ? (
            <EmptyAnalytics
              title="No won deals"
              description="Closed-won opportunities will appear here."
            />
          ) : (
            <div className="divide-y divide-border">
              {recentWins.map(
                (
                  deal,
                ) => {
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
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {
                              lead
                                ?.full_name ??
                              "Unknown lead"
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-ink-400">
                            {
                              property
                                ?.title ??
                              "No property"
                            }
                            {agent
                              ? ` • ${agent.full_name}`
                              : ""}
                          </p>
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
                        <p className="mt-2 text-[10px] text-ink-400">
                          Closed{" "}
                          {new Date(
                            deal.closed_at,
                          ).toLocaleDateString()}
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

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink-900">
            Business insights
          </h2>

          <p className="mt-1 text-xs text-ink-400">
            Decision-support signals generated from current CRM data.
          </p>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            title={
              primarySource
                ? `${primarySource.label} is the largest source`
                : "Lead acquisition"
            }
            text={
              primarySource
                ? `${primarySource.leads} leads currently come from ${primarySource.label}.`
                : "Lead source data will appear when acquisition records are available."
            }
          />

          <InsightCard
            title={
              topAgent
                ? `${topAgent.name} leads revenue`
                : "Agent performance"
            }
            text={
              topAgent
                ? `${formatMoney(
                    topAgent.revenue,
                  )} in won revenue with ${topAgent.wonDeals} won deal${
                    topAgent.wonDeals ===
                    1
                      ? ""
                      : "s"
                  }.`
                : "Assign leads and deals to agents to compare team performance."
            }
          />

          <InsightCard
            title={
              metrics.overdueFollowUps >
              0
                ? "Follow-up risk"
                : "Follow-up health"
            }
            text={
              metrics.overdueFollowUps >
              0
                ? `${metrics.overdueFollowUps} follow-up${
                    metrics.overdueFollowUps ===
                    1
                      ? ""
                      : "s"
                  } are overdue.`
                : "There are no overdue pending follow-ups in this period."
            }
          />

          <InsightCard
            title={
              metrics.hotLeads >
              0
                ? "High-intent leads"
                : "Lead quality"
            }
            text={
              metrics.hotLeads >
              0
                ? `${metrics.hotLeads} hot leads need focused sales attention.`
                : "No hot leads are currently present in the selected period."
            }
          />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniInsight
          label="Activities"
          value={
            metrics.activities
          }
          icon={
            <Activity className="size-4" />
          }
        />

        <MiniInsight
          label="Lost value"
          value={formatCompactMoney(
            metrics.lostValue,
          )}
          icon={
            <XCircle className="size-4" />
          }
        />

        <MiniInsight
          label="Available inventory"
          value={
            metrics.availableProperties
          }
          icon={
            <MapPin className="size-4" />
          }
        />

        <MiniInsight
          label="Selected period"
          value={
            DATE_RANGE_LABELS[
              dateRange
            ]
          }
          icon={
            <CalendarDays className="size-4" />
          }
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  trend?: number;
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

      <div className="mt-3 flex items-end gap-2">
        <p className="text-2xl font-semibold tracking-tight text-ink-900">
          {value}
        </p>

        {trend !==
          undefined &&
        Number.isFinite(
          trend,
        ) &&
        trend !== 0 ? (
          <span className="mb-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-ink-600">
            {trend > 0 ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {Math.abs(
              trend,
            ).toFixed(1)}
            %
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-ink-400">
        {detail}
      </p>
    </div>
  );
}

function TrendStat({
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

function HealthRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-500">
          {icon}
        </div>

        <span className="truncate text-xs font-medium text-ink-600">
          {label}
        </span>
      </div>

      <span className="shrink-0 text-sm font-semibold text-ink-900">
        {value}
      </span>
    </div>
  );
}

function InsightCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-semibold text-ink-900">
        {title}
      </p>

      <p className="mt-2 text-xs leading-6 text-ink-500">
        {text}
      </p>
    </div>
  );
}

function MiniInsight({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] text-ink-400">
          {label}
        </p>

        <p className="truncate text-sm font-semibold text-ink-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyAnalytics({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
      <BarChart3 className="size-7 text-ink-300" />

      <p className="mt-3 text-sm font-medium text-ink-900">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-xs leading-5 text-ink-400">
        {description}
      </p>
    </div>
  );
}