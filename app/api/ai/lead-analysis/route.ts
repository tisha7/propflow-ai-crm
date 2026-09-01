import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

type AIResponse = {
  score?: number;
  priority?: "cold" | "warm" | "hot";
  summary?: string;
  recommendation?: string;
};

type LeadRow = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  property_type: string | null;
  bedrooms: number | null;
  purchase_timeline: string | null;
  status: string | null;
  priority: string | null;
  lead_score: number | null;
  assigned_agent_id: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: string;
  organization_id: string;
  lead_id: string;
  type: string;
  subject: string | null;
  description: string | null;
  created_at: string;
};

type FollowUpRow = {
  id: string;
  organization_id: string;
  lead_id: string;
  assigned_to: string | null;
  due_at: string;
  type: string;
  notes: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
};

type PropertyMatchRow = {
  id: string;
  property_id: string;
  match_score: number | null;
  match_reason: string | null;
  created_at: string;
  updated_at: string;
};

type PropertyRow = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  property_type: string;
  status: string;
  price: number;
  currency: string;
  location: string;
  address: string | null;
  bedrooms: number;
  bathrooms: number;
  area: number;
  area_unit: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type RequestBody = {
  leadId?: string;
  analysisType?: AnalysisType;
  channel?: MessageChannel;
};

function clampScore(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(parsed),
    ),
  );
}

function normalizePriority(
  value: unknown,
): "cold" | "warm" | "hot" {
  const normalized =
    String(value ?? "")
      .trim()
      .toLowerCase();

  if (
    normalized === "hot" ||
    normalized === "warm" ||
    normalized === "cold"
  ) {
    return normalized;
  }

  return "cold";
}

function safeJsonParse(
  value: string,
): AIResponse {
  try {
    const parsed = JSON.parse(value);

    if (
      parsed === null ||
      typeof parsed !== "object"
    ) {
      return {};
    }

    return parsed as AIResponse;
  } catch {
    return {};
  }
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function buildLeadContext(
  lead: LeadRow,
) {
  return {
    id: lead.id,
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    budget_min: lead.budget_min,
    budget_max: lead.budget_max,
    preferred_location:
      lead.preferred_location,
    property_type: lead.property_type,
    bedrooms: lead.bedrooms,
    purchase_timeline:
      lead.purchase_timeline,
    status: lead.status,
    priority: lead.priority,
    lead_score: lead.lead_score,
    assigned_agent_id:
      lead.assigned_agent_id,
    last_contacted_at:
      lead.last_contacted_at,
    next_follow_up_at:
      lead.next_follow_up_at,
    notes: lead.notes,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
  };
}

function buildPropertyContext(
  property: PropertyRow,
) {
  return {
    id: property.id,
    title: property.title,
    description:
      property.description,
    property_type:
      property.property_type,
    status: property.status,
    price: property.price,
    currency: property.currency,
    location: property.location,
    address: property.address,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    area_unit: property.area_unit,
  };
}

async function callOpenAI(
  prompt: string,
  model: string,
  analysisType: AnalysisType,
) {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    );
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 20_000);

  let response: Response;

  try {
    response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        signal:
          controller.signal,
        body: JSON.stringify({
          model,
          temperature:
            analysisType ===
            "message_generation"
              ? 0.7
              : 0.2,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content:
                "You are a precise CRM sales intelligence assistant. Return valid JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      },
    );
  } catch (error) {
    if (
      error instanceof
        DOMException &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "AI request timed out.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "[AI Lead Analysis] OpenAI provider error:",
      response.status,
      errorText,
    );

    throw new Error(
      "AI provider request failed.",
    );
  }

  const data =
    await response.json();

  const content =
    data?.choices?.[0]?.message
      ?.content;

  if (
    typeof content !== "string" ||
    content.trim().length === 0
  ) {
    throw new Error(
      "AI returned an empty response.",
    );
  }

  return safeJsonParse(
    content,
  );
}

function normalizeAnalysis(
  analysis: AIResponse,
): AIResponse {
  return {
    score:
      typeof analysis.score ===
      "number"
        ? clampScore(
            analysis.score,
          )
        : undefined,
    priority:
      analysis.priority
        ? normalizePriority(
            analysis.priority,
          )
        : undefined,
    summary:
      typeof analysis.summary ===
      "string"
        ? analysis.summary.trim()
        : undefined,
    recommendation:
      typeof analysis.recommendation ===
      "string"
        ? analysis.recommendation.trim()
        : undefined,
  };
}

function buildPrompt(
  analysisType: AnalysisType,
  lead: LeadRow,
  activities: ActivityRow[],
  followUps: FollowUpRow[],
  matches: PropertyMatchRow[],
  properties: PropertyRow[],
  channel?: MessageChannel,
) {
  const leadContext =
    JSON.stringify(
      buildLeadContext(lead),
      null,
      2,
    );

  const activityContext =
    JSON.stringify(
      activities,
      null,
      2,
    );

  const followUpContext =
    JSON.stringify(
      followUps,
      null,
      2,
    );

  const matchContext =
    JSON.stringify(
      matches,
      null,
      2,
    );

  const propertyContext =
    JSON.stringify(
      properties.map(
        buildPropertyContext,
      ),
      null,
      2,
    );

  if (
    analysisType ===
    "lead_scoring"
  ) {
    return `
You are analyzing a real-estate CRM lead.

Return JSON only with this structure:
{
  "score": number,
  "priority": "cold" | "warm" | "hot",
  "summary": string,
  "recommendation": string
}

Scoring requirements:
- score must be between 0 and 100
- higher intent, realistic budget, suitable property need, recent engagement, and shorter purchase timeline should increase the score
- stale engagement, unclear need, unrealistic budget, or long timeline should reduce the score
- never invent facts not present in the data
- priority should correspond meaningfully to the score

Lead:
${leadContext}

Activities:
${activityContext}

Follow-ups:
${followUpContext}

Matched properties:
${matchContext}

Properties:
${propertyContext}
`;
  }

  if (
    analysisType ===
    "lead_summary"
  ) {
    return `
Summarize this real-estate CRM lead for a sales agent.

Return JSON only:
{
  "summary": string,
  "recommendation": string
}

Do not invent facts.
Keep the summary concise but useful.
Identify important intent signals, risks, and the current sales situation.

Lead:
${leadContext}

Activities:
${activityContext}

Follow-ups:
${followUpContext}

Matched properties:
${matchContext}

Properties:
${propertyContext}
`;
  }

  if (
    analysisType ===
    "next_action"
  ) {
    return `
Determine the best next action for a real-estate sales agent handling this lead.

Return JSON only:
{
  "summary": string,
  "recommendation": string
}

The recommendation should be actionable and specific.
Use existing activity, follow-up, and property-match information.
Do not invent facts.

Lead:
${leadContext}

Activities:
${activityContext}

Follow-ups:
${followUpContext}

Matched properties:
${matchContext}

Properties:
${propertyContext}
`;
  }

  if (
    analysisType ===
    "message_generation"
  ) {
    return `
Generate a professional follow-up message for a real-estate CRM lead.

Channel:
${channel ?? "whatsapp"}

Return JSON only:
{
  "recommendation": string
}

Rules:
- Use only facts from the provided CRM data.
- Do not invent property prices, features, locations, appointment times, or commitments.
- Keep the tone professional and natural.
- For WhatsApp/SMS keep it concise.
- For email it can be slightly more detailed.
- Do not reveal internal scoring or internal CRM fields.

Lead:
${leadContext}

Activities:
${activityContext}

Follow-ups:
${followUpContext}

Matched properties:
${matchContext}

Properties:
${propertyContext}
`;
  }

  return `
Analyze which properties are the strongest matches for this real-estate lead.

Return JSON only:
{
  "summary": string,
  "recommendation": string
}

Use only the supplied CRM data.
Do not invent property details.
Explain the important matching factors such as budget, location, property type, bedrooms, and timeline.

Lead:
${leadContext}

Properties:
${propertyContext}
`;
}

function getModel(
  analysisType: AnalysisType,
) {
  if (
    analysisType ===
    "message_generation"
  ) {
    return (
      process.env.OPENAI_MESSAGE_MODEL ??
      process.env.OPENAI_MODEL ??
      "gpt-4o-mini"
    );
  }

  return (
    process.env.OPENAI_MODEL ??
    "gpt-4o-mini"
  );
}

async function getAuthorizedLead(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  leadId: string,
) {
  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      "Unable to verify authentication.",
    );
  }

  if (!userData.user) {
    throw new Error(
      "Authentication required.",
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "id, organization_id, role",
      )
      .eq(
        "id",
        userData.user.id,
      )
      .single();

  if (profileError || !profile) {
    throw new Error(
      "Unable to resolve user profile.",
    );
  }

  let leadQuery =
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
      .eq(
        "id",
        leadId,
      )
      .eq(
        "organization_id",
        profile.organization_id,
      );

  if (
    profile.role ===
    "agent"
  ) {
    leadQuery =
      leadQuery.eq(
        "assigned_agent_id",
        userData.user.id,
      );
  }

  const {
    data: lead,
    error: leadError,
  } = await leadQuery.maybeSingle();

  if (leadError) {
    throw new Error(
      "Unable to load lead.",
    );
  }

  if (!lead) {
    throw new Error(
      "Lead not found or access denied.",
    );
  }

  return {
    user: userData.user,
    profile,
    lead: lead as LeadRow,
  };
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as RequestBody;

    const leadId =
      typeof body.leadId ===
      "string"
        ? body.leadId.trim()
        : "";

    const analysisType =
      body.analysisType;

    const channel =
      body.channel;

    if (!leadId) {
      return NextResponse.json(
        {
          error:
            "leadId is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      analysisType !==
        "lead_scoring" &&
      analysisType !==
        "lead_summary" &&
      analysisType !==
        "next_action" &&
      analysisType !==
        "message_generation" &&
      analysisType !==
        "property_match"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid analysisType.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      analysisType ===
        "message_generation" &&
      channel !==
        "whatsapp" &&
      channel !==
        "email" &&
      channel !==
        "sms"
    ) {
      return NextResponse.json(
        {
          error:
            "channel must be whatsapp, email, or sms.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      await createClient();

    let authContext:
      Awaited<
        ReturnType<
          typeof getAuthorizedLead
        >
      >;

    try {
      authContext =
        await getAuthorizedLead(
          supabase,
          leadId,
        );
    } catch (error) {
      const message =
        getErrorMessage(error);

      if (
        message ===
        "Authentication required."
      ) {
        return NextResponse.json(
          {
            error:
              "Authentication required.",
          },
          {
            status: 401,
          },
        );
      }

      if (
        message ===
        "Lead not found or access denied."
      ) {
        return NextResponse.json(
          {
            error:
              "Lead not found or access denied.",
          },
          {
            status: 404,
          },
        );
      }

      console.error(
        "[AI Lead Analysis] Authorization/query error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load lead.",
        },
        {
          status: 500,
        },
      );
    }

    const {
      profile,
      lead,
    } = authContext;

    const organizationId =
      profile.organization_id;

    const [
      activitiesResult,
      matchesResult,
      followUpsResult,
    ] =
      await Promise.all([
        supabase
          .from("activities")
          .select(
            `
              id,
              organization_id,
              lead_id,
              type,
              subject,
              description,
              created_at
            `,
          )
          .eq(
            "organization_id",
            organizationId,
          )
          .eq(
            "lead_id",
            lead.id,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(50),

        supabase
          .from("lead_properties")
          .select(
            `
              id,
              property_id,
              match_score,
              match_reason,
              created_at,
              updated_at
            `,
          )
          .eq(
            "lead_id",
            lead.id,
          )
          .order(
            "match_score",
            {
              ascending: false,
            },
          )
          .limit(20),

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
          .eq(
            "organization_id",
            organizationId,
          )
          .eq(
            "lead_id",
            lead.id,
          )
          .order(
            "due_at",
            {
              ascending: false,
            },
          )
          .limit(20),
      ]);

    if (
      activitiesResult.error
    ) {
      console.error(
        "[AI Lead Analysis] Activities query failed:",
        activitiesResult.error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load lead activity.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      matchesResult.error
    ) {
      console.error(
        "[AI Lead Analysis] Match query failed:",
        matchesResult.error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load property matches.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      followUpsResult.error
    ) {
      console.error(
        "[AI Lead Analysis] Follow-up query failed:",
        followUpsResult.error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load follow-up data.",
        },
        {
          status: 500,
        },
      );
    }

    const activities =
      (activitiesResult.data ??
        []) as ActivityRow[];

    const matches =
      (matchesResult.data ??
        []) as PropertyMatchRow[];

    const followUps =
      (followUpsResult.data ??
        []) as FollowUpRow[];

    const propertyIds =
      Array.from(
        new Set(
          matches
            .map(
              (
                match,
              ) =>
                match.property_id,
            )
            .filter(Boolean),
        ),
      );

    let properties: PropertyRow[] =
      [];

    if (
      propertyIds.length > 0
    ) {
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
              organization_id,
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
              image_url,
              created_at,
              updated_at
            `,
          )
          .eq(
            "organization_id",
            organizationId,
          )
          .in(
            "id",
            propertyIds,
          );

      if (
        propertyError
      ) {
        console.error(
          "[AI Lead Analysis] Matched property query failed:",
          propertyError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to load property matches.",
          },
          {
            status: 500,
          },
        );
      }

      properties =
        (propertyData ??
          []) as PropertyRow[];
    }

    const prompt =
      buildPrompt(
        analysisType,
        lead,
        activities,
        followUps,
        matches,
        properties,
        channel,
      );

    const model =
      getModel(
        analysisType,
      );

    const aiAnalysis =
      normalizeAnalysis(
        await callOpenAI(
          prompt,
          model,
          analysisType,
        ),
      );

    if (
      analysisType ===
      "property_match"
    ) {
      const propertyMatchData =
        properties.map(
          (property) => {
            const existing =
              matches.find(
                (match) =>
                  match.property_id ===
                  property.id,
              );

            return {
              property_id:
                property.id,
              match_score:
                clampScore(
                  existing?.match_score ??
                    0,
                ),
              match_reason:
                existing
                  ?.match_reason ??
                null,
            };
          },
        );

      return NextResponse.json({
        success: true,
        analysisType,
        leadId: lead.id,
        organizationId,
        analysis: aiAnalysis,
        properties,
        matches:
          propertyMatchData,
      });
    }

    if (
      analysisType ===
      "lead_scoring"
    ) {
      const score =
        clampScore(
          aiAnalysis.score,
        );

      const priority =
        normalizePriority(
          aiAnalysis.priority,
        );

      const {
        error:
          saveError,
      } =
        await supabase
          .from("ai_analyses")
          .insert({
            organization_id:
              organizationId,
            lead_id:
              lead.id,
            analysis_type:
              analysisType,
            result:
              aiAnalysis,
          });

      if (
        saveError
      ) {
        console.error(
          "[AI Lead Analysis] Failed to save analysis:",
          saveError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to save AI analysis.",
          },
          {
            status: 500,
          },
        );
      }

      const {
        error:
          leadUpdateError,
      } =
        await supabase
          .from("leads")
          .update({
            lead_score: score,
            priority,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            lead.id,
          )
          .eq(
            "organization_id",
            organizationId,
          );

      if (
        leadUpdateError
      ) {
        console.error(
          "[AI Lead Analysis] Failed to update lead score:",
          leadUpdateError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to update lead scoring.",
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        success: true,
        analysisType,
        leadId: lead.id,
        organizationId,
        analysis: {
          ...aiAnalysis,
          score,
          priority,
        },
      });
    }

    const {
      error:
        saveError,
    } =
      await supabase
        .from("ai_analyses")
        .insert({
          organization_id:
            organizationId,
          lead_id:
            lead.id,
          analysis_type:
            analysisType,
          result:
            aiAnalysis,
        });

    if (
      saveError
    ) {
      console.error(
        "[AI Lead Analysis] Failed to save analysis:",
        saveError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to save AI analysis.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      analysisType,
      leadId: lead.id,
      organizationId,
      analysis: aiAnalysis,
      properties,
      matches,
      activities,
      followUps,
    });
  } catch (error) {
    console.error(
      "[AI Lead Analysis]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete AI analysis right now.",
      },
      {
        status: 500,
      },
    );
  }
}