"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Edit3,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Target,
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
import {
  useParams,
  useRouter,
} from "next/navigation";

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

type LeadSource =
  | "facebook"
  | "website"
  | "google_ads"
  | "referral"
  | "property_portal"
  | "manual"
  | "other";

type ActivityType =
  | "call"
  | "email"
  | "whatsapp"
  | "note"
  | "property_sent"
  | "status_changed"
  | "site_visit";

type FollowUpStatus =
  | "pending"
  | "completed"
  | "cancelled";

type AppointmentType =
  | "property_viewing"
  | "consultation"
  | "negotiation"
  | "follow_up";

type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

type MessageChannel =
  | "whatsapp"
  | "email"
  | "sms";

type Lead = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  property_type: string | null;
  bedrooms: number | null;
  purchase_timeline: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  lead_score: number | null;
  assigned_agent_id: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Agent = {
  id: string;
  full_name: string;
  role: string;
};

type ActivityItem = {
  id: string;
  organization_id: string;
  lead_id: string;
  user_id: string | null;
  type: ActivityType;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Property = {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  status: string;
  price: number;
  currency: string;
  location: string;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  area_unit: string | null;
  image_url: string | null;
};

type Match = {
  id: string;
  lead_id: string;
  property_id: string;
  match_score: number | null;
  match_reason: string | null;
  created_at: string;
  property: Property;
};

type FollowUp = {
  id: string;
  lead_id: string;
  assigned_to: string | null;
  due_at: string;
  type: string;
  notes: string | null;
  status: FollowUpStatus;
  completed_at: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  lead_id: string;
  property_id: string | null;
  agent_id: string | null;
  scheduled_at: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
};

type AIAnalysis = {
  id: string;
  lead_id: string | null;
  analysis_type:
    | "lead_scoring"
    | "lead_summary"
    | "next_action"
    | "message_generation"
    | "property_match";
  score: number | null;
  priority: LeadPriority | null;
  summary: string | null;
  recommendation: string | null;
  model: string | null;
  created_at: string;
};

const STATUS_OPTIONS: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "property_matched",
  "site_visit",
  "negotiation",
  "won",
  "lost",
];

const PRIORITY_OPTIONS: LeadPriority[] = [
  "cold",
  "warm",
  "hot",
];

const SOURCE_OPTIONS: LeadSource[] = [
  "facebook",
  "website",
  "google_ads",
  "referral",
  "property_portal",
  "manual",
  "other",
];

const ACTIVITY_OPTIONS: ActivityType[] = [
  "call",
  "email",
  "whatsapp",
  "note",
  "property_sent",
  "status_changed",
  "site_visit",
];

const APPOINTMENT_TYPES: AppointmentType[] = [
  "property_viewing",
  "consultation",
  "negotiation",
  "follow_up",
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

function getPriorityClasses(
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

function getStatusClasses(
  status: LeadStatus,
) {
  if (
    status ===
      "won" ||
    status ===
      "qualified"
  ) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (
    status ===
    "lost"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    status ===
      "site_visit" ||
    status ===
      "negotiation"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getActivityIcon(
  type: ActivityType,
) {
  if (
    type ===
    "call"
  ) {
    return (
      <Phone className="size-4" />
    );
  }

  if (
    type ===
    "email"
  ) {
    return (
      <Mail className="size-4" />
    );
  }

  if (
    type ===
    "whatsapp"
  ) {
    return (
      <MessageCircle className="size-4" />
    );
  }

  if (
    type ===
    "site_visit"
  ) {
    return (
      <CalendarDays className="size-4" />
    );
  }

  if (
    type ===
    "property_sent"
  ) {
    return (
      <MapPin className="size-4" />
    );
  }

  return (
    <Activity className="size-4" />
  );
}

function getMatchScoreClasses(
  score: number | null,
) {
  if (score == null) {
    return "border-border bg-surface-sunken text-ink-700";
  }

  if (score >= 80) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (score >= 60) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function toDateTimeLocal(
  value: string | null,
) {
  if (!value) {
    return "";
  }

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

export default function LeadDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const router =
    useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const leadId =
    params.id;

  const [lead, setLead] =
    useState<Lead | null>(
      null,
    );

  const [agents, setAgents] =
    useState<Agent[]>([]);

  const [
    activities,
    setActivities,
  ] = useState<
    ActivityItem[]
  >([]);

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [
    followUps,
    setFollowUps,
  ] = useState<FollowUp[]>([]);

  const [
    appointments,
    setAppointments,
  ] = useState<
    Appointment[]
  >([]);

  const [
    aiAnalyses,
    setAIAnalyses,
  ] = useState<AIAnalysis[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [
    loadingMatched,
    setLoadingMatched,
  ] = useState(false);

  const [
    refreshingMatches,
    setRefreshingMatches,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [editing, setEditing] =
    useState(false);

  const [
    deleteModalOpen,
    setDeleteModalOpen,
  ] = useState(false);

  const [
    activityModalOpen,
    setActivityModalOpen,
  ] = useState(false);

  const [
    followUpModalOpen,
    setFollowUpModalOpen,
  ] = useState(false);

  const [
    appointmentModalOpen,
    setAppointmentModalOpen,
  ] = useState(false);

  const [
    titleError,
    setTitleError,
  ] = useState("");

  const [
    currentTime,
    setCurrentTime,
  ] = useState<number | null>(
    null,
  );

  const [
    messageChannel,
    setMessageChannel,
  ] =
    useState<MessageChannel>(
      "whatsapp",
    );

  const [
    generatingMessage,
    setGeneratingMessage,
  ] = useState(false);

  const [
    generatedMessage,
    setGeneratedMessage,
  ] = useState("");

  const [
    copiedMessage,
    setCopiedMessage,
  ] = useState(false);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [source, setSource] =
    useState<LeadSource>(
      "manual",
    );

  const [budgetMin, setBudgetMin] =
    useState("");

  const [budgetMax, setBudgetMax] =
    useState("");

  const [
    preferredLocation,
    setPreferredLocation,
  ] = useState("");

  const [
    propertyType,
    setPropertyType,
  ] = useState("");

  const [
    bedrooms,
    setBedrooms,
  ] = useState("");

  const [
    purchaseTimeline,
    setPurchaseTimeline,
  ] = useState("");

  const [status, setStatus] =
    useState<LeadStatus>("new");

  const [
    priority,
    setPriority,
  ] = useState<LeadPriority>(
    "cold",
  );

  const [
    assignedAgentId,
    setAssignedAgentId,
  ] = useState("");

  const [
    nextFollowUpAt,
    setNextFollowUpAt,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [
    activityType,
    setActivityType,
  ] = useState<ActivityType>(
    "note",
  );

  const [
    activityDescription,
    setActivityDescription,
  ] = useState("");

  const [
    followUpAssignedTo,
    setFollowUpAssignedTo,
  ] = useState("");

  const [
    followUpDueAt,
    setFollowUpDueAt,
  ] = useState("");

  const [
    followUpType,
    setFollowUpType,
  ] = useState("general");

  const [
    followUpNotes,
    setFollowUpNotes,
  ] = useState("");

  const [
    appointmentPropertyId,
    setAppointmentPropertyId,
  ] = useState("");

  const [
    appointmentAgentId,
    setAppointmentAgentId,
  ] = useState("");

  const [
    appointmentScheduledAt,
    setAppointmentScheduledAt,
  ] = useState("");

  const [
    appointmentType,
    setAppointmentType,
  ] =
    useState<AppointmentType>(
      "property_viewing",
    );

  const [
    appointmentNotes,
    setAppointmentNotes,
  ] = useState("");

  const populateLeadForm =
    useCallback(
      (value: Lead) => {
        setFullName(
          value.full_name,
        );

        setEmail(
          value.email ?? "",
        );

        setPhone(
          value.phone ?? "",
        );

        setSource(
          value.source,
        );

        setBudgetMin(
          value.budget_min !=
            null
            ? String(
                value.budget_min,
              )
            : "",
        );

        setBudgetMax(
          value.budget_max !=
            null
            ? String(
                value.budget_max,
              )
            : "",
        );

        setPreferredLocation(
          value.preferred_location ??
            "",
        );

        setPropertyType(
          value.property_type ??
            "",
        );

        setBedrooms(
          value.bedrooms !=
            null
            ? String(
                value.bedrooms,
              )
            : "",
        );

        setPurchaseTimeline(
          value.purchase_timeline ??
            "",
        );

        setStatus(
          value.status,
        );

        setPriority(
          value.priority,
        );

        setAssignedAgentId(
          value.assigned_agent_id ??
            "",
        );

        setNextFollowUpAt(
          toDateTimeLocal(
            value.next_follow_up_at,
          ),
        );

        setNotes(
          value.notes ?? "",
        );
      },
      [],
    );

  const loadLead =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        const leadResult =
          await supabase
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
            .eq(
              "id",
              leadId,
            )
            .single();

        if (
          leadResult.error
        ) {
          setLead(null);

          setError(
            leadResult.error.message,
          );

          setLoading(false);

          return;
        }

        const loadedLead =
          leadResult.data as Lead;

        setLead(
          loadedLead,
        );

        populateLeadForm(
          loadedLead,
        );

        const [
          agentsResult,
          activitiesResult,
          matchesResult,
          followUpsResult,
          appointmentsResult,
          aiResult,
        ] =
          await Promise.all([
            supabase
              .from("profiles")
              .select(
                "id, full_name, role",
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
                  organization_id,
                  lead_id,
                  user_id,
                  type,
                  description,
                  metadata,
                  created_at
                `,
              )
              .eq(
                "lead_id",
                leadId,
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              ),

            supabase
              .from("lead_properties")
              .select(
                `
                  id,
                  lead_id,
                  property_id,
                  match_score,
                  match_reason,
                  created_at,
                  property:properties (
                    id,
                    title,
                    description,
                    property_type,
                    status,
                    price,
                    currency,
                    location,
                    address,
                    bedrooms,
                    bathrooms,
                    area,
                    area_unit,
                    image_url
                  )
                `,
              )
              .eq(
                "lead_id",
                leadId,
              )
              .order(
                "match_score",
                {
                  ascending:
                    false,
                  nullsFirst:
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
                  completed_at,
                  created_at
                `,
              )
              .eq(
                "lead_id",
                leadId,
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
              .eq(
                "lead_id",
                leadId,
              )
              .order(
                "scheduled_at",
                {
                  ascending:
                    true,
                },
              ),

            supabase
              .from("ai_analyses")
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
              .eq(
                "lead_id",
                leadId,
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              ),
          ]);

        setAgents(
          (agentsResult.data ??
            []) as Agent[],
        );

        setActivities(
          (activitiesResult.data ??
            []) as ActivityItem[],
        );

        const rawMatches =
          (matchesResult.data ??
            []) as Array<
            Omit<
              Match,
              "property"
            > & {
              property:
                | Property
                | Property[]
                | null;
            }
          >;

        setMatches(
          rawMatches
            .map(
              (item) => {
                const property =
                  Array.isArray(
                    item.property,
                  )
                    ? item
                        .property[0]
                    : item.property;

                if (
                  !property
                ) {
                  return null;
                }

                return {
                  ...item,
                  property,
                };
              },
            )
            .filter(
              (
                item,
              ): item is Match =>
                item !== null,
            ),
        );

        setFollowUps(
          (followUpsResult.data ??
            []) as FollowUp[],
        );

        setAppointments(
          (appointmentsResult.data ??
            []) as Appointment[],
        );

        const loadedAnalyses =
          (aiResult.data ??
            []) as AIAnalysis[];

        setAIAnalyses(
          loadedAnalyses,
        );

        setCurrentTime(
          Date.now(),
        );

        const latestMessage =
          loadedAnalyses.find(
            (analysis) =>
              analysis.analysis_type ===
              "message_generation",
          );

        setGeneratedMessage(
          latestMessage?.recommendation ??
            "",
        );

        setLoading(false);
      },
      [
        leadId,
        populateLeadForm,
        supabase,
      ],
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadLead();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [loadLead]);

  const latestScore =
    useMemo(
      () =>
        aiAnalyses.find(
          (item) =>
            item.analysis_type ===
            "lead_scoring",
        ) ?? null,
      [aiAnalyses],
    );

  const latestSummary =
    useMemo(
      () =>
        aiAnalyses.find(
          (item) =>
            item.analysis_type ===
            "lead_summary",
        ) ?? null,
      [aiAnalyses],
    );

  const latestNextAction =
    useMemo(
      () =>
        aiAnalyses.find(
          (item) =>
            item.analysis_type ===
            "next_action",
        ) ?? null,
      [aiAnalyses],
    );

  const pendingFollowUps =
    useMemo(
      () =>
        followUps.filter(
          (item) =>
            item.status ===
            "pending",
        ),
      [followUps],
    );

  const upcomingAppointments =
    useMemo(
      () => {
        if (
          currentTime ===
          null
        ) {
          return [];
        }

        return appointments
          .filter(
            (item) =>
              (
                item.status ===
                  "scheduled" ||
                item.status ===
                  "rescheduled"
              ) &&
              new Date(
                item.scheduled_at,
              ).getTime() >=
                currentTime,
          )
          .slice(
            0,
            5,
          );
      },
      [
        appointments,
        currentTime,
      ],
    );

  const matchCount =
    matches.length;

  async function addActivitySilently(
    type: ActivityType,
    description: string,
  ) {
    if (!lead) {
      return;
    }

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    await supabase
      .from("activities")
      .insert({
        organization_id:
          lead.organization_id,
        lead_id:
          lead.id,
        user_id:
          user?.id ??
          null,
        type,
        description,
        metadata:
          null,
      });
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !fullName.trim()
    ) {
      setTitleError(
        "Lead name is required.",
      );

      return;
    }

    if (
      budgetMin &&
      budgetMax &&
      Number(budgetMin) >
        Number(budgetMax)
    ) {
      setTitleError(
        "Minimum budget cannot exceed maximum budget.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    setTitleError("");

    const {
      data,
      error:
        updateError,
    } =
      await supabase
        .from("leads")
        .update({
          full_name:
            fullName.trim(),
          email:
            email.trim() ||
            null,
          phone:
            phone.trim() ||
            null,
          source,
          budget_min:
            budgetMin
              ? Number(
                  budgetMin,
                )
              : null,
          budget_max:
            budgetMax
              ? Number(
                  budgetMax,
                )
              : null,
          preferred_location:
            preferredLocation.trim() ||
            null,
          property_type:
            propertyType.trim() ||
            null,
          bedrooms:
            bedrooms
              ? Number(
                  bedrooms,
                )
              : null,
          purchase_timeline:
            purchaseTimeline.trim() ||
            null,
          status,
          priority,
          assigned_agent_id:
            assignedAgentId ||
            null,
          next_follow_up_at:
            nextFollowUpAt
              ? new Date(
                  nextFollowUpAt,
                ).toISOString()
              : null,
          notes:
            notes.trim() ||
            null,
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

    if (
      updateError
    ) {
      setError(
        updateError.message,
      );

      setSaving(false);

      return;
    }

    const updatedLead =
      data as Lead;

    setLead(
      updatedLead,
    );

    populateLeadForm(
      updatedLead,
    );

    setEditing(false);
    setSaving(false);

    setSuccess(
      "Lead updated successfully.",
    );

    await loadLead();
  }

  async function handleAddActivity(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !lead ||
      !activityDescription.trim()
    ) {
      setError(
        "Activity description is required.",
      );

      return;
    }

    setSaving(true);
    setError("");

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    const {
      error:
        insertError,
    } =
      await supabase
        .from("activities")
        .insert({
          organization_id:
            lead.organization_id,
          lead_id:
            lead.id,
          user_id:
            user?.id ??
            null,
          type:
            activityType,
          description:
            activityDescription.trim(),
          metadata:
            null,
        });

    if (
      insertError
    ) {
      setError(
        insertError.message,
      );

      setSaving(false);

      return;
    }

    setActivityType(
      "note",
    );

    setActivityDescription(
      "",
    );

    setActivityModalOpen(
      false,
    );

    setSaving(false);

    setSuccess(
      "Activity added successfully.",
    );

    await loadLead();
  }

  async function handleAddFollowUp(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!lead) {
      return;
    }

    if (!followUpDueAt) {
      setError(
        "Please select a follow-up date and time.",
      );

      return;
    }

    setSaving(true);
    setError("");

    const dueAt =
      new Date(
        followUpDueAt,
      ).toISOString();

    const {
      error:
        insertError,
    } =
      await supabase
        .from("follow_ups")
        .insert({
          organization_id:
            lead.organization_id,
          lead_id:
            lead.id,
          assigned_to:
            followUpAssignedTo ||
            null,
          due_at:
            dueAt,
          type:
            followUpType.trim() ||
            "general",
          notes:
            followUpNotes.trim() ||
            null,
          status:
            "pending",
          completed_at:
            null,
        });

    if (
      insertError
    ) {
      setError(
        insertError.message,
      );

      setSaving(false);

      return;
    }

    await supabase
      .from("leads")
      .update({
        next_follow_up_at:
          dueAt,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        lead.id,
      );

    setFollowUpAssignedTo(
      assignedAgentId,
    );

    setFollowUpDueAt("");
    setFollowUpType(
      "general",
    );
    setFollowUpNotes("");

    setFollowUpModalOpen(
      false,
    );

    setSaving(false);

    setSuccess(
      "Follow-up scheduled successfully.",
    );

    await loadLead();
  }

  async function handleAddAppointment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!lead) {
      return;
    }

    if (
      !appointmentScheduledAt
    ) {
      setError(
        "Please select an appointment date and time.",
      );

      return;
    }

    setSaving(true);
    setError("");

    const scheduledAt =
      new Date(
        appointmentScheduledAt,
      ).toISOString();

    const {
      error:
        insertError,
    } =
      await supabase
        .from("appointments")
        .insert({
          organization_id:
            lead.organization_id,
          lead_id:
            lead.id,
          property_id:
            appointmentPropertyId ||
            null,
          agent_id:
            appointmentAgentId ||
            assignedAgentId ||
            null,
          scheduled_at:
            scheduledAt,
          type:
            appointmentType,
          status:
            "scheduled",
          notes:
            appointmentNotes.trim() ||
            null,
        });

    if (
      insertError
    ) {
      setError(
        insertError.message,
      );

      setSaving(false);

      return;
    }

    await addActivitySilently(
      "site_visit",
      `Appointment scheduled for ${formatDate(
        scheduledAt,
      )}.`,
    );

    setAppointmentPropertyId(
      "",
    );

    setAppointmentAgentId(
      assignedAgentId,
    );

    setAppointmentScheduledAt(
      "",
    );

    setAppointmentType(
      "property_viewing",
    );

    setAppointmentNotes(
      "",
    );

    setAppointmentModalOpen(
      false,
    );

    setSaving(false);

    setSuccess(
      "Appointment scheduled successfully.",
    );

    await loadLead();
  }

  async function handleCompleteFollowUp(
    followUpId: string,
  ) {
    const {
      error:
        updateError,
    } =
      await supabase
        .from("follow_ups")
        .update({
          status:
            "completed",
          completed_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          followUpId,
        );

    if (
      updateError
    ) {
      setError(
        updateError.message,
      );

      return;
    }

    setSuccess(
      "Follow-up completed.",
    );

    await loadLead();
  }

  async function handleDeleteFollowUp(
    followUpId: string,
  ) {
    const {
      error:
        deleteError,
    } =
      await supabase
        .from("follow_ups")
        .delete()
        .eq(
          "id",
          followUpId,
        );

    if (
      deleteError
    ) {
      setError(
        deleteError.message,
      );

      return;
    }

    setSuccess(
      "Follow-up deleted.",
    );

    await loadLead();
  }

  async function handleDeleteAppointment(
    appointmentId: string,
  ) {
    const {
      error:
        deleteError,
    } =
      await supabase
        .from("appointments")
        .delete()
        .eq(
          "id",
          appointmentId,
        );

    if (
      deleteError
    ) {
      setError(
        deleteError.message,
      );

      return;
    }

    setSuccess(
      "Appointment deleted.",
    );

    await loadLead();
  }

  async function handleAIAnalysis(
    analysisType:
      | "lead_scoring"
      | "lead_summary"
      | "next_action",
  ) {
    if (!lead) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/ai/lead-analysis",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              leadId:
                lead.id,
              analysisType,
            }),
          },
        );

      const result =
        (await response.json()) as {
          error?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "AI analysis failed.",
        );
      }

      setSuccess(
        analysisType ===
          "lead_scoring"
          ? "AI lead scoring completed."
          : analysisType ===
              "lead_summary"
            ? "AI lead summary generated."
            : "AI next action generated.",
      );

      await loadLead();
    } catch (
      analysisError
    ) {
      setError(
        analysisError instanceof
          Error
          ? analysisError.message
          : "AI analysis failed.",
      );
    }
  }

  async function handleGenerateMessage() {
    if (!lead) {
      return;
    }

    setGeneratingMessage(
      true,
    );

    setError("");
    setSuccess("");
    setCopiedMessage(
      false,
    );

    try {
      const response =
        await fetch(
          "/api/ai/lead-analysis",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              leadId:
                lead.id,
              analysisType:
                "message_generation",
              channel:
                messageChannel,
            }),
          },
        );

      const result =
        (await response.json()) as {
          error?: string;
          analysis?: {
            recommendation?: string | null;
          };
        };

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Message generation failed.",
        );
      }

      const message =
        result.analysis
          ?.recommendation ??
        "";

      if (!message) {
        throw new Error(
          "AI did not return a message.",
        );
      }

      setGeneratedMessage(
        message,
      );

      setSuccess(
        `${formatLabel(
          messageChannel,
        )} message generated successfully.`,
      );

      await loadLead();
    } catch (
      messageError
    ) {
      setError(
        messageError instanceof
          Error
          ? messageError.message
          : "Message generation failed.",
      );
    } finally {
      setGeneratingMessage(
        false,
      );
    }
  }

  async function handleCopyMessage() {
    if (
      !generatedMessage
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        generatedMessage,
      );

      setCopiedMessage(
        true,
      );

      window.setTimeout(
        () => {
          setCopiedMessage(
            false,
          );
        },
        1800,
      );
    } catch {
      setError(
        "Unable to copy the message.",
      );
    }
  }

  async function handleDeleteLead() {
    setDeleting(true);
    setError("");

    const {
      error:
        deleteError,
    } =
      await supabase
        .from("leads")
        .delete()
        .eq(
          "id",
          leadId,
        );

    if (
      deleteError
    ) {
      setError(
        deleteError.message,
      );

      setDeleting(false);

      return;
    }

    setDeleteModalOpen(
      false,
    );

    setDeleting(false);

    router.replace(
      "/leads",
    );

    router.refresh();
  }

  function calculateMatchScore(
    currentLead: Lead,
    property: Property,
  ) {
    let score = 0;

    const reasons: string[] =
      [];

    if (
      currentLead.budget_min !=
        null ||
      currentLead.budget_max !=
        null
    ) {
      const min =
        currentLead.budget_min ??
        0;

      const max =
        currentLead.budget_max ??
        Number.POSITIVE_INFINITY;

      if (
        property.price >=
          min &&
        property.price <=
          max
      ) {
        score += 30;

        reasons.push(
          "Budget matches",
        );
      }
    }

    if (
      currentLead.preferred_location &&
      property.location
        .toLowerCase()
        .includes(
          currentLead.preferred_location.toLowerCase(),
        )
    ) {
      score += 25;

      reasons.push(
        "Location matches",
      );
    }

    if (
      currentLead.property_type &&
      property.property_type
        .toLowerCase()
        .includes(
          currentLead.property_type.toLowerCase(),
        )
    ) {
      score += 20;

      reasons.push(
        "Property type matches",
      );
    }

    if (
      currentLead.bedrooms !=
        null &&
      property.bedrooms !=
        null &&
      property.bedrooms >=
        currentLead.bedrooms
    ) {
      score += 15;

      reasons.push(
        "Bedroom requirement matches",
      );
    }

    if (
      property.status ===
      "available"
    ) {
      score += 10;

      reasons.push(
        "Property is available",
      );
    }

    return {
      score: Math.min(
        100,
        score,
      ),
      reason:
        reasons.length
          ? reasons.join(
              " • ",
            )
          : "General property match",
    };
  }

  async function handleRefreshMatches() {
    if (!lead) {
      return;
    }

    setRefreshingMatches(
      true,
    );

    setLoadingMatched(
      true,
    );

    setError("");
    setSuccess("");

    const {
      data: propertyData,
      error:
        propertyError,
    } =
      await supabase
        .from("properties")
        .select(
          `
            id,
            title,
            description,
            property_type,
            status,
            price,
            currency,
            location,
            address,
            bedrooms,
            bathrooms,
            area,
            area_unit,
            image_url
          `,
        )
        .eq(
          "status",
          "available",
        )
        .limit(100);

    if (
      propertyError
    ) {
      setError(
        propertyError.message,
      );

      setRefreshingMatches(
        false,
      );

      setLoadingMatched(
        false,
      );

      return;
    }

    const properties =
      (propertyData ??
        []) as Property[];

    const ranked =
      properties
        .map(
          (property) => ({
            property,
            ...calculateMatchScore(
              lead,
              property,
            ),
          }),
        )
        .filter(
          (item) =>
            item.score > 0,
        )
        .sort(
          (a, b) =>
            b.score -
            a.score,
        )
        .slice(
          0,
          12,
        );

    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "lead_properties",
        )
        .delete()
        .eq(
          "lead_id",
          lead.id,
        );

    if (
      deleteError
    ) {
      setError(
        deleteError.message,
      );

      setRefreshingMatches(
        false,
      );

      setLoadingMatched(
        false,
      );

      return;
    }

    if (
      ranked.length >
      0
    ) {
      const rows =
        ranked.map(
          (item) => ({
            lead_id:
              lead.id,
            property_id:
              item.property.id,
            match_score:
              item.score,
            match_reason:
              item.reason,
          }),
        );

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "lead_properties",
          )
          .insert(rows);

      if (
        insertError
      ) {
        setError(
          insertError.message,
        );

        setRefreshingMatches(
          false,
        );

        setLoadingMatched(
          false,
        );

        return;
      }
    }

    await addActivitySilently(
      "property_sent",
      `${ranked.length} property matches refreshed.`,
    );

    if (
      ranked.length >
        0 &&
      lead.status ===
        "qualified"
    ) {
      await supabase
        .from("leads")
        .update({
          status:
            "property_matched",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          lead.id,
        );
    }

    setSuccess(
      ranked.length >
        0
        ? `${ranked.length} property matches refreshed.`
        : "No matching available properties found.",
    );

    setRefreshingMatches(
      false,
    );

    setLoadingMatched(
      false,
    );

    await loadLead();
  }

  async function handleUnmatch(
    matchId: string,
  ) {
    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "lead_properties",
        )
        .delete()
        .eq(
          "id",
          matchId,
        );

    if (
      deleteError
    ) {
      setError(
        deleteError.message,
      );

      return;
    }

    setSuccess(
      "Property removed from matched properties.",
    );

    await loadLead();
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
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="size-4" />
          Back to leads
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error ||
            "Lead not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/leads"
            className="mb-3 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="size-4" />
            Back to leads
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {lead.full_name}
            </h1>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                lead.status,
              )}`}
            >
              {formatLabel(
                lead.status,
              )}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClasses(
                lead.priority,
              )}`}
            >
              {formatLabel(
                lead.priority,
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setEditing(true)
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white"
          >
            <Edit3 className="size-4" />
            Edit lead
          </button>

          <button
            type="button"
            onClick={() =>
              setDeleteModalOpen(
                true,
              )
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700"
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

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      {editing ? (
        <form
          onSubmit={
            handleSave
          }
          className="rounded-xl border border-border bg-surface p-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Full name"
              value={
                fullName
              }
              onChange={
                setFullName
              }
              required
            />

            <Field
              label="Email"
              value={
                email
              }
              onChange={
                setEmail
              }
              type="email"
            />

            <Field
              label="Phone"
              value={
                phone
              }
              onChange={
                setPhone
              }
            />

            <SelectField
              label="Source"
              value={
                source
              }
              onChange={(
                value,
              ) =>
                setSource(
                  value as LeadSource,
                )
              }
              options={
                SOURCE_OPTIONS
              }
            />

            <Field
              label="Budget minimum"
              value={
                budgetMin
              }
              onChange={
                setBudgetMin
              }
              type="number"
            />

            <Field
              label="Budget maximum"
              value={
                budgetMax
              }
              onChange={
                setBudgetMax
              }
              type="number"
            />

            <Field
              label="Preferred location"
              value={
                preferredLocation
              }
              onChange={
                setPreferredLocation
              }
            />

            <Field
              label="Property type"
              value={
                propertyType
              }
              onChange={
                setPropertyType
              }
            />

            <Field
              label="Bedrooms"
              value={
                bedrooms
              }
              onChange={
                setBedrooms
              }
              type="number"
            />

            <Field
              label="Purchase timeline"
              value={
                purchaseTimeline
              }
              onChange={
                setPurchaseTimeline
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
                  value as LeadStatus,
                )
              }
              options={
                STATUS_OPTIONS
              }
            />

            <SelectField
              label="Priority"
              value={
                priority
              }
              onChange={(
                value,
              ) =>
                setPriority(
                  value as LeadPriority,
                )
              }
              options={
                PRIORITY_OPTIONS
              }
            />

            <SelectField
              label="Assigned agent"
              value={
                assignedAgentId
              }
              onChange={
                setAssignedAgentId
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
                      agent.full_name,
                    ],
                  ),
                ),
              }}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-800">
                Next follow-up
              </label>

              <input
                type="datetime-local"
                value={
                  nextFollowUpAt
                }
                onChange={(
                  event,
                ) =>
                  setNextFollowUpAt(
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
          </div>

          <div className="mt-5 space-y-2">
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
                  event.target.value,
                )
              }
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          {titleError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {titleError}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                populateLeadForm(
                  lead,
                );

                setEditing(
                  false,
                );
              }}
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
                <Save className="size-4" />
              )}

              {saving
                ? "Saving..."
                : "Save changes"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="AI Score"
          value={
            lead.lead_score !=
            null
              ? `${lead.lead_score}/100`
              : "—"
          }
          icon={
            <Target className="size-4" />
          }
        />

        <StatCard
          label="Matched Properties"
          value={
            matchCount
          }
          icon={
            <MapPin className="size-4" />
          }
        />

        <StatCard
          label="Pending Follow-ups"
          value={
            pendingFollowUps.length
          }
          icon={
            <Clock3 className="size-4" />
          }
        />

        <StatCard
          label="Upcoming Appointments"
          value={
            upcomingAppointments.length
          }
          icon={
            <CalendarDays className="size-4" />
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                AI Lead Intelligence
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void handleAIAnalysis(
                    "lead_scoring",
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-ink-700"
              >
                <Target className="size-3.5" />
                Score
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleAIAnalysis(
                    "lead_summary",
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-ink-700"
              >
                <Sparkles className="size-3.5" />
                Summary
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleAIAnalysis(
                    "next_action",
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-ink-700"
              >
                <Lightbulb className="size-3.5" />
                Next action
              </button>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <div className="rounded-xl bg-surface-sunken p-5 text-center">
                <p className="text-xs text-ink-400">
                  AI Score
                </p>

                <p className="mt-2 text-4xl font-semibold text-ink-900">
                  {lead.lead_score ??
                    latestScore?.score ??
                    "—"}
                </p>

                <p className="text-xs text-ink-400">
                  out of 100
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClasses(
                    lead.priority,
                  )}`}
                >
                  {formatLabel(
                    lead.priority,
                  )}
                </span>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs font-medium text-ink-400">
                    AI Summary
                  </p>

                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {latestSummary?.summary ??
                      "No AI summary generated yet."}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-sunken p-4">
                  <p className="text-xs font-medium text-ink-400">
                    Next Action
                  </p>

                  <p className="mt-2 text-sm leading-6 text-ink-800">
                    {latestNextAction?.recommendation ??
                      latestScore?.recommendation ??
                      "Generate AI Next Action."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">
              Contact & Qualification
            </h2>
          </div>

          <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
            <InfoRow
              label="Email"
              value={
                lead.email ||
                "—"
              }
            />

            <InfoRow
              label="Phone"
              value={
                lead.phone ||
                "—"
              }
            />

            <InfoRow
              label="Source"
              value={formatLabel(
                lead.source,
              )}
            />

            <InfoRow
              label="Preferred location"
              value={
                lead.preferred_location ||
                "—"
              }
            />

            <InfoRow
              label="Property type"
              value={
                lead.property_type ||
                "—"
              }
            />

            <InfoRow
              label="Bedrooms"
              value={
                lead.bedrooms !=
                null
                  ? String(
                      lead.bedrooms,
                    )
                  : "—"
              }
            />

            <InfoRow
              label="Budget"
              value={
                lead.budget_min !=
                    null ||
                lead.budget_max !=
                    null
                  ? `${lead.budget_min != null ? Number(lead.budget_min).toLocaleString() : "—"} – ${lead.budget_max != null ? Number(lead.budget_max).toLocaleString() : "—"}`
                  : "—"
              }
            />

            <InfoRow
              label="Purchase timeline"
              value={
                lead.purchase_timeline ||
                "—"
              }
            />

            <InfoRow
              label="Assigned agent"
              value={
                agents.find(
                  (
                    agent,
                  ) =>
                    agent.id ===
                    lead.assigned_agent_id,
                )?.full_name ??
                "Unassigned"
              }
            />

            <InfoRow
              label="Next follow-up"
              value={formatDate(
                lead.next_follow_up_at,
              )}
            />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Send className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                AI Message Generator
              </h2>
            </div>

            <p className="mt-1 text-xs text-ink-400">
              Generate a personalized message from this lead&apos;s CRM
              context.
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
              <div>
                <p className="text-xs font-medium text-ink-400">
                  Selected channel
                </p>

                <p className="mt-1 text-sm font-semibold text-ink-900">
                  {formatLabel(
                    messageChannel,
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void handleGenerateMessage()
                  }
                  disabled={
                    generatingMessage
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {generatingMessage ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}

                  {generatingMessage
                    ? "Generating..."
                    : "Generate message"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleCopyMessage()
                  }
                  disabled={
                    !generatedMessage
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 disabled:opacity-50"
                >
                  <Copy className="size-4" />

                  {copiedMessage
                    ? "Copied"
                    : "Copy"}
                </button>
              </div>
            </div>

            <div className="min-h-36 whitespace-pre-wrap p-5 text-sm leading-7 text-ink-800">
              {generatedMessage ||
                "Your personalized AI message will appear here."}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                Matched Properties
              </h2>
            </div>

            <p className="mt-1 text-xs text-ink-400">
              Properties ranked against this lead&apos;s requirements.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleRefreshMatches()
            }
            disabled={
              refreshingMatches
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 disabled:opacity-50"
          >
            {refreshingMatches ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}

            {refreshingMatches
              ? "Refreshing..."
              : "Refresh matches"}
          </button>
        </div>

        {loadingMatched ? (
          <div className="p-8 text-center text-sm text-ink-400">
            Refreshing property matches...
          </div>
        ) : matches.length ===
          0 ? (
          <div className="p-10 text-center">
            <MapPin className="mx-auto size-8 text-ink-300" />

            <p className="mt-3 text-sm font-medium text-ink-900">
              No matched properties yet
            </p>

            <p className="mt-1 text-xs text-ink-400">
              Click Refresh matches to calculate available properties.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {matches.map(
              (match) => (
                <div
                  key={
                    match.id
                  }
                  className="overflow-hidden rounded-xl border border-border bg-background"
                >
                  {match.property
                    .image_url ? (
                    <div className="aspect-[16/9] overflow-hidden bg-surface-sunken">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          match
                            .property
                            .image_url
                        }
                        alt={
                          match
                            .property
                            .title
                        }
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-surface-sunken text-sm text-ink-400">
                      No image
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink-900">
                          {
                            match
                              .property
                              .title
                          }
                        </h3>

                        <p className="mt-1 truncate text-xs text-ink-400">
                          {
                            match
                              .property
                              .location
                          }
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getMatchScoreClasses(
                          match.match_score,
                        )}`}
                      >
                        {match.match_score ??
                          "—"}
                        %
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <InfoRow
                        label="Price"
                        value={formatMoney(
                          match
                            .property
                            .price,
                          match
                            .property
                            .currency,
                        )}
                      />

                      <InfoRow
                        label="Bedrooms"
                        value={
                          match
                            .property
                            .bedrooms !=
                          null
                            ? String(
                                match
                                  .property
                                  .bedrooms,
                              )
                            : "—"
                        }
                      />

                      <InfoRow
                        label="Type"
                        value={
                          match
                            .property
                            .property_type
                        }
                      />

                      <InfoRow
                        label="Status"
                        value={formatLabel(
                          match
                            .property
                            .status,
                        )}
                      />
                    </div>

                    {match.match_reason ? (
                      <div className="mt-4 rounded-lg bg-surface-sunken p-3">
                        <p className="text-xs leading-5 text-ink-600">
                          {
                            match.match_reason
                          }
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/properties/${match.property.id}`}
                        className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-border text-xs font-medium text-ink-700"
                      >
                        View property
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          void handleUnmatch(
                            match.id,
                          )
                        }
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700"
                      >
                        Unmatch
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="size-4 text-ink-600" />

                <h2 className="text-sm font-semibold text-ink-900">
                  Follow-ups
                </h2>
              </div>

              <p className="mt-1 text-xs text-ink-400">
                Next actions scheduled for this lead.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setFollowUpModalOpen(
                  true,
                )
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-900 px-3 text-xs font-medium text-white"
            >
              <Plus className="size-3.5" />
              Add
            </button>
          </div>

          {followUps.length ===
          0 ? (
            <div className="p-8 text-center text-sm text-ink-400">
              No follow-ups yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {followUps
                .slice(
                  0,
                  6,
                )
                .map(
                  (
                    followUp,
                  ) => (
                    <div
                      key={
                        followUp.id
                      }
                      className="flex items-start justify-between gap-3 px-5 py-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {formatLabel(
                            followUp.type,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-ink-400">
                          {formatDate(
                            followUp.due_at,
                          )}
                        </p>

                        {followUp.notes ? (
                          <p className="mt-2 text-sm text-ink-600">
                            {
                              followUp.notes
                            }
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-600">
                          {formatLabel(
                            followUp.status,
                          )}
                        </span>

                        {followUp.status ===
                        "pending" ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleCompleteFollowUp(
                                followUp.id,
                              )
                            }
                            className="flex size-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700"
                          >
                            <Check className="size-4" />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteFollowUp(
                              followUp.id,
                            )
                          }
                          className="flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ),
                )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-ink-600" />

                <h2 className="text-sm font-semibold text-ink-900">
                  Appointments
                </h2>
              </div>

              <p className="mt-1 text-xs text-ink-400">
                Scheduled meetings and property viewings.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAppointmentModalOpen(
                  true,
                )
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-900 px-3 text-xs font-medium text-white"
            >
              <Plus className="size-3.5" />
              Add
            </button>
          </div>

          {appointments.length ===
          0 ? (
            <div className="p-8 text-center text-sm text-ink-400">
              No appointments yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {appointments
                .slice(
                  0,
                  6,
                )
                .map(
                  (
                    appointment,
                  ) => (
                    <div
                      key={
                        appointment.id
                      }
                      className="flex items-start justify-between gap-3 px-5 py-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {formatLabel(
                            appointment.type,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-ink-400">
                          {formatDate(
                            appointment.scheduled_at,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-ink-500">
                          {matches.find(
                            (
                              match,
                            ) =>
                              match
                                .property
                                .id ===
                              appointment.property_id,
                          )?.property
                            .title ??
                            "No property"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-600">
                          {formatLabel(
                            appointment.status,
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteAppointment(
                              appointment.id,
                            )
                          }
                          className="flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ),
                )}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-ink-600" />

              <h2 className="text-sm font-semibold text-ink-900">
                Activity timeline
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setActivityModalOpen(
                true,
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-900 px-3 text-xs font-medium text-white"
          >
            <Plus className="size-3.5" />
            Add activity
          </button>
        </div>

        {activities.length ===
        0 ? (
          <div className="p-8 text-center text-sm text-ink-400">
            No activities yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.map(
              (activity) => (
                <div
                  key={
                    activity.id
                  }
                  className="flex gap-3 px-5 py-4"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-600">
                    {getActivityIcon(
                      activity.type,
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                      <p className="text-sm font-medium text-ink-900">
                        {formatLabel(
                          activity.type,
                        )}
                      </p>

                      <span className="text-xs text-ink-400">
                        {formatDate(
                          activity.created_at,
                        )}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-ink-600">
                      {activity.description ||
                        "No description."}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {activityModalOpen ? (
        <Modal
          title="Add activity"
          description="Record an interaction with this lead."
          onClose={() =>
            setActivityModalOpen(
              false,
            )
          }
        >
          <form
            onSubmit={
              handleAddActivity
            }
            className="space-y-5"
          >
            <SelectField
              label="Activity type"
              value={
                activityType
              }
              onChange={(
                value,
              ) =>
                setActivityType(
                  value as ActivityType,
                )
              }
              options={
                ACTIVITY_OPTIONS
              }
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-800">
                Description
              </label>

              <textarea
                value={
                  activityDescription
                }
                onChange={(
                  event,
                ) =>
                  setActivityDescription(
                    event.target.value,
                  )
                }
                rows={5}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <ModalActions
              saving={
                saving
              }
              submitLabel="Add activity"
              onCancel={() =>
                setActivityModalOpen(
                  false,
                )
              }
            />
          </form>
        </Modal>
      ) : null}

      {followUpModalOpen ? (
        <Modal
          title="Schedule follow-up"
          description="Create the next action for this lead."
          onClose={() =>
            setFollowUpModalOpen(
              false,
            )
          }
        >
          <form
            onSubmit={
              handleAddFollowUp
            }
            className="space-y-5"
          >
            <SelectField
              label="Assigned to"
              value={
                followUpAssignedTo
              }
              onChange={
                setFollowUpAssignedTo
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
                      agent.full_name,
                    ],
                  ),
                ),
              }}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-800">
                Due date & time
              </label>

              <input
                type="datetime-local"
                value={
                  followUpDueAt
                }
                onChange={(
                  event,
                ) =>
                  setFollowUpDueAt(
                    event.target.value,
                  )
                }
                required
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>

            <Field
              label="Type"
              value={
                followUpType
              }
              onChange={
                setFollowUpType
              }
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-800">
                Notes
              </label>

              <textarea
                value={
                  followUpNotes
                }
                onChange={(
                  event,
                ) =>
                  setFollowUpNotes(
                    event.target.value,
                  )
                }
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <ModalActions
              saving={
                saving
              }
              submitLabel="Schedule follow-up"
              onCancel={() =>
                setFollowUpModalOpen(
                  false,
                )
              }
            />
          </form>
        </Modal>
      ) : null}

      {appointmentModalOpen ? (
        <Modal
          title="Schedule appointment"
          description="Create a meeting or property viewing."
          onClose={() =>
            setAppointmentModalOpen(
              false,
            )
          }
        >
          <form
            onSubmit={
              handleAddAppointment
            }
            className="space-y-5"
          >
            <SelectField
              label="Property"
              value={
                appointmentPropertyId
              }
              onChange={
                setAppointmentPropertyId
              }
              options={[
                "",
                ...matches.map(
                  (
                    match,
                  ) =>
                    match
                      .property
                      .id,
                ),
              ]}
              optionLabels={{
                "": "No property",
                ...Object.fromEntries(
                  matches.map(
                    (
                      match,
                    ) => [
                      match
                        .property
                        .id,
                      match
                        .property
                        .title,
                    ],
                  ),
                ),
              }}
            />

            <SelectField
              label="Agent"
              value={
                appointmentAgentId
              }
              onChange={
                setAppointmentAgentId
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
                "": "Use lead assignment",
                ...Object.fromEntries(
                  agents.map(
                    (
                      agent,
                    ) => [
                      agent.id,
                      agent.full_name,
                    ],
                  ),
                ),
              }}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-800">
                Date & time
              </label>

              <input
                type="datetime-local"
                value={
                  appointmentScheduledAt
                }
                onChange={(
                  event,
                ) =>
                  setAppointmentScheduledAt(
                    event.target.value,
                  )
                }
                required
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>

            <SelectField
              label="Appointment type"
              value={
                appointmentType
              }
              onChange={(
                value,
              ) =>
                setAppointmentType(
                  value as AppointmentType,
                )
              }
              options={
                APPOINTMENT_TYPES
              }
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-800">
                Notes
              </label>

              <textarea
                value={
                  appointmentNotes
                }
                onChange={(
                  event,
                ) =>
                  setAppointmentNotes(
                    event.target.value,
                  )
                }
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <ModalActions
              saving={
                saving
              }
              submitLabel="Schedule appointment"
              onCancel={() =>
                setAppointmentModalOpen(
                  false,
                )
              }
            />
          </form>
        </Modal>
      ) : null}

      {deleteModalOpen ? (
        <Modal
          title="Delete lead"
          description={`Are you sure you want to permanently delete ${lead.full_name}?`}
          onClose={() =>
            setDeleteModalOpen(
              false,
            )
          }
        >
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setDeleteModalOpen(
                  false,
                )
              }
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() =>
                void handleDeleteLead()
              }
              disabled={
                deleting
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}

              {deleting
                ? "Deleting..."
                : "Delete lead"}
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
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
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
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={
          placeholder
        }
        required={
          required
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
      <span className="text-xs text-ink-400">
        {label}
      </span>

      <span className="max-w-[70%] text-right text-sm font-medium text-ink-800">
        {value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
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
          : "inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-ink-700"
      }
    >
      {icon}
      {label}
    </button>
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
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink-900">
              {title}
            </h2>

            <p className="mt-1 text-xs text-ink-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex size-8 items-center justify-center rounded-lg text-ink-500"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  saving,
  submitLabel,
  onCancel,
}: {
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-border pt-4">
      <button
        type="button"
        onClick={
          onCancel
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
          <Save className="size-4" />
        )}

        {saving
          ? "Saving..."
          : submitLabel}
      </button>
    </div>
  );
}