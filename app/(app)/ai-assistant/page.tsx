"use client";

import {
  Brain,
  ChevronDown,
  Copy,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  full_name: string;
  status: string;
  priority: string;
  lead_score: number | null;
  email: string | null;
  phone: string | null;
};

type AnalysisType =
  | "lead_scoring"
  | "lead_summary"
  | "next_action"
  | "message_generation"
  | "property_match";

type MessageChannel =
  | "whatsapp"
  | "email"
  | "sms";

type Analysis = {
  id: string;
  lead_id: string | null;
  analysis_type: AnalysisType;
  score: number | null;
  priority:
    | "cold"
    | "warm"
    | "hot"
    | null;
  summary: string | null;
  recommendation: string | null;
  model: string | null;
  created_at: string;
};

type PropertyMatch = {
  property_id: string;
  title: string;
  score: number;
  reason: string;
};

type SalesCopilot = {
  executive_summary: string;
  priority_focus: string;
  next_action: string;
  recommended_property_id: string | null;
  recommended_property_title: string | null;
  property_reason: string;
  suggested_message: string;
  follow_up_plan: string;
  closing_tip: string;
  risk_or_objection: string;
  model?: string;
};

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

function getPriorityClasses(
  priority:
    | "cold"
    | "warm"
    | "hot"
    | null,
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

export default function AIAssistantPage() {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [
    selectedLeadId,
    setSelectedLeadId,
  ] = useState("");

  const [
    analyses,
    setAnalyses,
  ] = useState<Analysis[]>(
    [],
  );

  const [
    propertyMatches,
    setPropertyMatches,
  ] =
    useState<PropertyMatch[]>(
      [],
    );

  const [
    copilot,
    setCopilot,
  ] =
    useState<SalesCopilot | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    runningType,
    setRunningType,
  ] =
    useState<AnalysisType | null>(
      null,
    );

  const [
    copilotLoading,
    setCopilotLoading,
  ] = useState(false);

  const [
    messageChannel,
    setMessageChannel,
  ] =
    useState<MessageChannel>(
      "whatsapp",
    );

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    copiedCopilotMessage,
    setCopiedCopilotMessage,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const loadData =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        const [
          leadsResult,
          analysesResult,
        ] =
          await Promise.all([
            supabase
              .from("leads")
              .select(
                `
                  id,
                  full_name,
                  status,
                  priority,
                  lead_score,
                  email,
                  phone
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
                  model,
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
              .limit(200),
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
          analysesResult.error
        ) {
          setError(
            analysesResult.error.message,
          );
          setLoading(false);
          return;
        }

        const loadedLeads =
          (leadsResult.data ??
            []) as Lead[];

        setLeads(
          loadedLeads,
        );

        setAnalyses(
          (analysesResult.data ??
            []) as Analysis[],
        );

        if (
          !selectedLeadId &&
          loadedLeads.length >
            0
        ) {
          setSelectedLeadId(
            loadedLeads[0].id,
          );
        }

        setLoading(false);
      },
      [
        selectedLeadId,
        supabase,
      ],
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadData();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [loadData]);

  const selectedLead =
    leads.find(
      (lead) =>
        lead.id ===
        selectedLeadId,
    ) ?? null;

  const leadAnalyses =
    analyses.filter(
      (analysis) =>
        analysis.lead_id ===
        selectedLeadId,
    );

  const latestScore =
    leadAnalyses.find(
      (analysis) =>
        analysis.analysis_type ===
        "lead_scoring",
    ) ?? null;

  const latestNextAction =
    leadAnalyses.find(
      (analysis) =>
        analysis.analysis_type ===
        "next_action",
    ) ?? null;

  const latestMessage =
    leadAnalyses.find(
      (analysis) =>
        analysis.analysis_type ===
        "message_generation",
    ) ?? null;

  const latestPropertyMatch =
    leadAnalyses.find(
      (analysis) =>
        analysis.analysis_type ===
        "property_match",
    ) ?? null;

  const allMessages =
    leadAnalyses.filter(
      (analysis) =>
        analysis.analysis_type ===
        "message_generation",
    );

  async function runAnalysis(
    analysisType: AnalysisType,
  ) {
    if (!selectedLeadId) {
      setError(
        "Please select a lead first.",
      );
      return;
    }

    setError("");
    setSuccess("");
    setCopied(false);
    setRunningType(
      analysisType,
    );

    try {
      const body: {
        leadId: string;
        analysisType: AnalysisType;
        channel?: MessageChannel;
      } = {
        leadId:
          selectedLeadId,
        analysisType,
      };

      if (
        analysisType ===
        "message_generation"
      ) {
        body.channel =
          messageChannel;
      }

      const response =
        await fetch(
          "/api/ai/lead-analysis",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              body,
            ),
          },
        );

      const result =
        (await response.json()) as {
          error?: string;
          propertyMatches?: PropertyMatch[];
        };

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "AI analysis failed.",
        );
      }

      if (
        analysisType ===
        "property_match"
      ) {
        setPropertyMatches(
          result.propertyMatches ??
            [],
        );

        setSuccess(
          "AI property matching completed successfully.",
        );
      } else if (
        analysisType ===
        "lead_scoring"
      ) {
        setSuccess(
          "Lead scoring completed successfully.",
        );
      } else if (
        analysisType ===
        "lead_summary"
      ) {
        setSuccess(
          "Lead summary generated successfully.",
        );
      } else if (
        analysisType ===
        "next_action"
      ) {
        setSuccess(
          "Next action generated successfully.",
        );
      } else {
        setSuccess(
          `${formatLabel(
            messageChannel,
          )} message generated successfully.`,
        );
      }

      await loadData();
    } catch (
      analysisError
    ) {
      setError(
        analysisError instanceof
          Error
          ? analysisError.message
          : "AI analysis failed.",
      );
    } finally {
      setRunningType(
        null,
      );
    }
  }

  async function runCopilot() {
    if (!selectedLeadId) {
      setError(
        "Please select a lead first.",
      );
      return;
    }

    setCopilotLoading(
      true,
    );

    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/ai/sales-copilot",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              leadId:
                selectedLeadId,
            }),
          },
        );

      const result =
        (await response.json()) as {
          error?: string;
          copilot?: SalesCopilot;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Sales Copilot failed.",
        );
      }

      if (!result.copilot) {
        throw new Error(
          "Sales Copilot returned no result.",
        );
      }

      setCopilot(
        result.copilot,
      );

      setSuccess(
        "AI Sales Copilot completed successfully.",
      );
    } catch (
      copilotError
    ) {
      setError(
        copilotError instanceof
          Error
          ? copilotError.message
          : "Sales Copilot failed.",
      );
    } finally {
      setCopilotLoading(
        false,
      );
    }
  }

  function handleLeadChange(
    value: string,
  ) {
    setSelectedLeadId(
      value,
    );

    setPropertyMatches(
      [],
    );

    setCopilot(
      null,
    );

    setError("");
    setSuccess("");
    setCopied(false);
    setCopiedCopilotMessage(
      false,
    );
  }

  async function copyMessage() {
    if (
      !latestMessage?.recommendation
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        latestMessage.recommendation,
      );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        1800,
      );
    } catch {
      setError(
        "Unable to copy the generated message.",
      );
    }
  }

  async function copyCopilotMessage() {
    if (
      !copilot?.suggested_message
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        copilot.suggested_message,
      );

      setCopiedCopilotMessage(
        true,
      );

      window.setTimeout(
        () => {
          setCopiedCopilotMessage(
            false,
          );
        },
        1800,
      );
    } catch {
      setError(
        "Unable to copy the Copilot message.",
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            AI Assistant
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Loading CRM intelligence...
          </p>
        </div>

        <div className="h-32 animate-pulse rounded-xl border border-border bg-surface" />

        <div className="h-72 animate-pulse rounded-xl border border-border bg-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-surface-sunken text-ink-700">
              <Brain className="size-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              AI Assistant
            </h1>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-400">
            Analyze leads, match properties, generate next actions, create
            personalized messages, and use the Sales Copilot.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData()
          }
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken"
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

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-2">
            <label
              htmlFor="ai-lead"
              className="text-sm font-medium text-ink-800"
            >
              Select lead
            </label>

            <div className="relative">
              <select
                id="ai-lead"
                value={
                  selectedLeadId
                }
                onChange={(
                  event,
                ) =>
                  handleLeadChange(
                    event.target
                      .value,
                  )
                }
                className="h-11 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none focus:ring-2"
              >
                <option value="">
                  Select a lead
                </option>

                {leads.map(
                  (lead) => (
                    <option
                      key={
                        lead.id
                      }
                      value={
                        lead.id
                      }
                    >
                      {lead.full_name}
                    </option>
                  ),
                )}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            </div>
          </div>

          {selectedLead ? (
            <div className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">
                {
                  selectedLead.full_name
                }
              </p>

              <p className="mt-1 text-xs text-ink-400">
                {formatLabel(
                  selectedLead.status,
                )}{" "}
                •{" "}
                {formatLabel(
                  selectedLead.priority,
                )}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <AIActionButton
            onClick={() =>
              void runAnalysis(
                "lead_scoring",
              )
            }
            disabled={
              runningType !==
                null ||
              copilotLoading ||
              !selectedLeadId
            }
            loading={
              runningType ===
              "lead_scoring"
            }
            icon={
              <Target className="size-4" />
            }
            label="Score"
          />

          <AIActionButton
            onClick={() =>
              void runAnalysis(
                "lead_summary",
              )
            }
            disabled={
              runningType !==
                null ||
              copilotLoading ||
              !selectedLeadId
            }
            loading={
              runningType ===
              "lead_summary"
            }
            icon={
              <Sparkles className="size-4" />
            }
            label="Summary"
          />

          <AIActionButton
            onClick={() =>
              void runAnalysis(
                "next_action",
              )
            }
            disabled={
              runningType !==
                null ||
              copilotLoading ||
              !selectedLeadId
            }
            loading={
              runningType ===
              "next_action"
            }
            icon={
              <Lightbulb className="size-4" />
            }
            label="Next action"
          />

          <AIActionButton
            onClick={() =>
              void runAnalysis(
                "property_match",
              )
            }
            disabled={
              runningType !==
                null ||
              copilotLoading ||
              !selectedLeadId
            }
            loading={
              runningType ===
              "property_match"
            }
            icon={
              <MapPin className="size-4" />
            }
            label="Property Match"
          />

          <AIActionButton
            onClick={() =>
              void runAnalysis(
                "message_generation",
              )
            }
            disabled={
              runningType !==
                null ||
              copilotLoading ||
              !selectedLeadId
            }
            loading={
              runningType ===
              "message_generation"
            }
            icon={
              <Send className="size-4" />
            }
            label="Message"
          />

          <button
            type="button"
            onClick={() =>
              void runCopilot()
            }
            disabled={
              copilotLoading ||
              runningType !==
                null ||
              !selectedLeadId
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copilotLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Brain className="size-4" />
            )}

            {copilotLoading
              ? "Thinking..."
              : "Sales Copilot"}
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <MiniCard
          label="Lead"
          value={
            selectedLead?.full_name ??
            "—"
          }
          icon={
            <UserRound className="size-4" />
          }
        />

        <MiniCard
          label="AI Score"
          value={
            selectedLead?.lead_score !=
            null
              ? String(
                  selectedLead.lead_score,
                )
              : latestScore?.score !=
                  null
                ? String(
                    latestScore.score,
                  )
                : "—"
          }
          icon={
            <Target className="size-4" />
          }
        />

        <MiniCard
          label="Priority"
          value={
            selectedLead
              ? formatLabel(
                  selectedLead.priority,
                )
              : "—"
          }
          icon={
            <Sparkles className="size-4" />
          }
        />

        <MiniCard
          label="Property Matches"
          value={
            propertyMatches.length
          }
          icon={
            <MapPin className="size-4" />
          }
        />
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                AI Sales Copilot
              </h2>
            </div>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-400">
              One view of what the agent should do next, which property to
              lead with, what to say, how to follow up, and what may block the
              deal.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void runCopilot()
            }
            disabled={
              copilotLoading ||
              runningType !==
                null ||
              !selectedLeadId
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {copilotLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}

            {copilotLoading
              ? "Analyzing..."
              : "Run Copilot"}
          </button>
        </div>

        {!copilot ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-sunken text-ink-600">
              <Brain className="size-6" />
            </div>

            <p className="mt-4 text-sm font-medium text-ink-900">
              Sales Copilot is ready
            </p>

            <p className="mt-1 max-w-md text-xs leading-5 text-ink-400">
              Select a lead and run Copilot to get a complete sales action
              plan.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <CopilotCard
                title="Executive summary"
                icon={
                  <Brain className="size-4" />
                }
                content={
                  copilot.executive_summary
                }
              />

              <CopilotCard
                title="Priority focus"
                icon={
                  <Target className="size-4" />
                }
                content={
                  copilot.priority_focus
                }
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-sunken p-5">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-ink-700" />

                <h3 className="text-sm font-semibold text-ink-900">
                  Do this next
                </h3>
              </div>

              <p className="mt-3 text-sm font-medium leading-7 text-ink-900">
                {
                  copilot.next_action
                }
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <CopilotCard
                title="Recommended property"
                icon={
                  <MapPin className="size-4" />
                }
                content={
                  copilot
                    .recommended_property_title ??
                  "No specific property recommended"
                }
              />

              <CopilotCard
                title="Why this property"
                icon={
                  <Target className="size-4" />
                }
                content={
                  copilot.property_reason
                }
              />
            </div>

            <div className="rounded-xl border border-border bg-background">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-ink-600" />

                  <h3 className="text-sm font-semibold text-ink-900">
                    Suggested message
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void copyCopilotMessage()
                  }
                  disabled={
                    !copilot.suggested_message
                  }
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-ink-700 disabled:opacity-50"
                >
                  <Copy className="size-3.5" />

                  {copiedCopilotMessage
                    ? "Copied"
                    : "Copy"}
                </button>
              </div>

              <div className="whitespace-pre-wrap p-5 text-sm leading-7 text-ink-800">
                {
                  copilot.suggested_message
                }
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <CopilotCard
                title="Follow-up plan"
                icon={
                  <RefreshCw className="size-4" />
                }
                content={
                  copilot.follow_up_plan
                }
              />

              <CopilotCard
                title="Closing tip"
                icon={
                  <CheckIcon className="size-4" />
                }
                content={
                  copilot.closing_tip
                }
              />

              <CopilotCard
                title="Risk / objection"
                icon={
                  <Target className="size-4" />
                }
                content={
                  copilot.risk_or_objection
                }
              />
            </div>

            {copilot.model ? (
              <p className="text-right text-[11px] text-ink-400">
                Model:{" "}
                {copilot.model}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-ink-600" />

            <h2 className="text-sm font-semibold text-ink-900">
              AI Property Match
            </h2>
          </div>

          <p className="mt-1 text-xs text-ink-400">
            AI evaluates available properties against the lead&apos;s
            requirements.
          </p>
        </div>

        {propertyMatches.length ===
        0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-5 py-8 text-center">
            <MapPin className="size-8 text-ink-300" />

            <p className="mt-3 text-sm font-medium text-ink-900">
              No property matches generated
            </p>

            <p className="mt-1 max-w-md text-xs text-ink-400">
              Select a lead and click Property Match.
            </p>

            {latestPropertyMatch ? (
              <div className="mt-5 max-w-2xl rounded-lg bg-surface-sunken p-4 text-left">
                <p className="text-xs font-medium text-ink-400">
                  Latest AI result
                </p>

                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {
                    latestPropertyMatch.summary
                  }
                </p>

                <p className="mt-3 text-sm leading-6 text-ink-800">
                  {
                    latestPropertyMatch.recommendation
                  }
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="p-5">
            {latestPropertyMatch ? (
              <div className="mb-5 rounded-xl bg-surface-sunken p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  AI recommendation
                </p>

                <p className="mt-2 text-sm leading-7 text-ink-800">
                  {
                    latestPropertyMatch.recommendation
                  }
                </p>
              </div>
            ) : null}

            <div className="space-y-3">
              {propertyMatches.map(
                (
                  match,
                  index,
                ) => (
                  <div
                    key={`${match.property_id}-${index}`}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-700">
                            {index +
                              1}
                          </span>

                          <h3 className="truncate text-sm font-semibold text-ink-900">
                            {
                              match.title
                            }
                          </h3>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-ink-600">
                          {
                            match.reason
                          }
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          match.score >=
                          80
                            ? "border-green-200 bg-green-50 text-green-700"
                            : match.score >=
                                60
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {
                          match.score
                        }
                        /100
                      </span>
                    </div>

                    <div className="mt-3">
                      <Link
                        href={`/properties/${match.property_id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-ink-700"
                      >
                        View property
                      </Link>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">
              Lead Scoring
            </h2>
          </div>

          {!latestScore ? (
            <EmptyState
              icon={
                <Target className="size-5" />
              }
              title="No AI score yet"
              description="Generate a score for this lead."
            />
          ) : (
            <div className="space-y-4 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-ink-400">
                    Score
                  </p>

                  <p className="mt-1 text-4xl font-semibold text-ink-900">
                    {latestScore.score ??
                      "—"}
                    <span className="ml-1 text-lg text-ink-400">
                      /100
                    </span>
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${getPriorityClasses(
                    latestScore.priority,
                  )}`}
                >
                  {formatLabel(
                    latestScore.priority ??
                      "unknown",
                  )}
                </span>
              </div>

              {latestScore.summary ? (
                <p className="text-sm leading-6 text-ink-700">
                  {
                    latestScore.summary
                  }
                </p>
              ) : null}

              {latestScore.recommendation ? (
                <div className="rounded-lg bg-surface-sunken p-4">
                  <p className="text-xs font-medium text-ink-400">
                    Recommendation
                  </p>

                  <p className="mt-2 text-sm leading-6 text-ink-800">
                    {
                      latestScore.recommendation
                    }
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">
              AI Next Action
            </h2>
          </div>

          {!latestNextAction ? (
            <EmptyState
              icon={
                <Lightbulb className="size-5" />
              }
              title="No next action yet"
              description="Generate an AI next action."
            />
          ) : (
            <div className="p-5">
              <div className="rounded-lg bg-surface-sunken p-4">
                <p className="text-sm leading-7 text-ink-800">
                  {
                    latestNextAction.recommendation
                  }
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Send className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                AI Message Generator
              </h2>
            </div>

            <p className="mt-1 text-xs text-ink-400">
              Generate a personalized sales message.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ChannelButton
              active={
                messageChannel ===
                "whatsapp"
              }
              onClick={() =>
                setMessageChannel(
                  "whatsapp",
                )
              }
              icon={
                <MessageCircle className="size-4" />
              }
              label="WhatsApp"
            />

            <ChannelButton
              active={
                messageChannel ===
                "email"
              }
              onClick={() =>
                setMessageChannel(
                  "email",
                )
              }
              icon={
                <Mail className="size-4" />
              }
              label="Email"
            />

            <ChannelButton
              active={
                messageChannel ===
                "sms"
              }
              onClick={() =>
                setMessageChannel(
                  "sms",
                )
              }
              icon={
                <MessageCircle className="size-4" />
              }
              label="SMS"
            />
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-xl border border-border bg-background">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-ink-900">
                {formatLabel(
                  messageChannel,
                )}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void runAnalysis(
                      "message_generation",
                    )
                  }
                  disabled={
                    runningType !==
                      null ||
                    copilotLoading ||
                    !selectedLeadId
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {runningType ===
                  "message_generation" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}

                  Generate
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void copyMessage()
                  }
                  disabled={
                    !latestMessage?.recommendation
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 disabled:opacity-50"
                >
                  <Copy className="size-4" />

                  {copied
                    ? "Copied"
                    : "Copy"}
                </button>
              </div>
            </div>

            <div className="min-h-36 whitespace-pre-wrap p-5 text-sm leading-7 text-ink-800">
              {latestMessage?.recommendation ??
                "Your personalized AI message will appear here."}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-ink-600" />

            <h2 className="text-sm font-semibold text-ink-900">
              Message History
            </h2>
          </div>
        </div>

        {allMessages.length ===
        0 ? (
          <div className="p-8 text-center text-sm text-ink-400">
            No generated messages yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allMessages
              .slice(
                0,
                8,
              )
              .map(
                (message) => (
                  <div
                    key={
                      message.id
                    }
                    className="px-5 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-ink-900">
                        Generated message
                      </p>

                      <span className="text-[11px] text-ink-400">
                        {new Date(
                          message.created_at,
                        ).toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-600">
                      {
                        message.recommendation
                      }
                    </p>
                  </div>
                ),
              )}
          </div>
        )}
      </section>

      {selectedLead ? (
        <div className="flex justify-end">
          <Link
            href={`/leads/${selectedLead.id}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken"
          >
            Open lead detail
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function CopilotCard({
  title,
  icon,
  content,
}: {
  title: string;
  icon: React.ReactNode;
  content: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
          {icon}
        </div>

        <h3 className="text-xs font-semibold text-ink-900">
          {title}
        </h3>
      </div>

      <p className="mt-3 text-sm leading-6 text-ink-700">
        {content ||
          "No information available."}
      </p>
    </div>
  );
}

function CheckIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <span className={className}>
      ✓
    </span>
  );
}

function AIActionButton({
  onClick,
  disabled,
  loading,
  icon,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-800 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        icon
      )}

      {loading
        ? "Working..."
        : label}
    </button>
  );
}

function ChannelButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={
        active
          ? "inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-3 text-xs font-medium text-white"
          : "inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-ink-700 hover:bg-surface-sunken"
      }
    >
      {icon}
      {label}
    </button>
  );
}

function MiniCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-ink-400">
          {label}
        </span>

        <div className="flex size-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
          {icon}
        </div>
      </div>

      <p className="mt-2 truncate text-sm font-semibold text-ink-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-surface-sunken text-ink-500">
        {icon}
      </div>

      <p className="mt-3 text-sm font-medium text-ink-900">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-xs leading-5 text-ink-400">
        {description}
      </p>
    </div>
  );
}