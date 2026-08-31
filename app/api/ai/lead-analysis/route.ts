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

type ActivityRow = {
  id: string;
  type: string;
  description: string | null;
  created_at: string;
};

type MatchRow = {
  id: string;
  property_id: string;
  match_score: number | null;
  match_reason: string | null;
};

type PropertyRow = {
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

type FollowUpRow = {
  id: string;
  due_at: string;
  type: string;
  notes: string | null;
  status: string;
};

type RankedProperty = {
  property: PropertyRow;
  match_score: number;
  match_reason: string;
};

function clampScore(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(numeric),
    ),
  );
}

function normalizePriority(
  value: unknown,
  score: number,
) {
  const priority =
    String(value ?? "").toLowerCase();

  if (
    priority === "hot" ||
    priority === "warm" ||
    priority === "cold"
  ) {
    return priority;
  }

  if (score >= 75) {
    return "hot" as const;
  }

  if (score >= 45) {
    return "warm" as const;
  }

  return "cold" as const;
}

function calculatePropertyMatch(
  lead: LeadRow,
  property: PropertyRow,
): RankedProperty {
  let score = 0;

  const reasons: string[] = [];

  const normalizedLeadLocation =
    lead.preferred_location
      ?.trim()
      .toLowerCase();

  const normalizedPropertyLocation =
    property.location
      ?.trim()
      .toLowerCase();

  const normalizedLeadType =
    lead.property_type
      ?.trim()
      .toLowerCase();

  const normalizedPropertyType =
    property.property_type
      ?.trim()
      .toLowerCase();

  // Budget: 35 points.
  if (
    lead.budget_min != null ||
    lead.budget_max != null
  ) {
    const min =
      lead.budget_min ?? 0;

    const max =
      lead.budget_max ??
      Number.POSITIVE_INFINITY;

    if (
      property.price >= min &&
      property.price <= max
    ) {
      score += 35;

      reasons.push(
        "Within budget",
      );
    } else if (
      property.price <=
      max * 1.1
    ) {
      score += 18;

      reasons.push(
        "Slightly above budget",
      );
    }
  }

  // Location: 25 points.
  if (
    normalizedLeadLocation &&
    normalizedPropertyLocation
  ) {
    if (
      normalizedPropertyLocation.includes(
        normalizedLeadLocation,
      ) ||
      normalizedLeadLocation.includes(
        normalizedPropertyLocation,
      )
    ) {
      score += 25;

      reasons.push(
        "Location matches",
      );
    }
  }

  // Property type: 15 points.
  if (
    normalizedLeadType &&
    normalizedPropertyType
  ) {
    if (
      normalizedPropertyType.includes(
        normalizedLeadType,
      ) ||
      normalizedLeadType.includes(
        normalizedPropertyType,
      )
    ) {
      score += 15;

      reasons.push(
        "Property type matches",
      );
    }
  }

  // Bedrooms: 15 points.
  if (
    lead.bedrooms != null
  ) {
    if (
      property.bedrooms != null &&
      property.bedrooms >=
        lead.bedrooms
    ) {
      score += 15;

      reasons.push(
        "Bedroom requirement matches",
      );
    } else if (
      property.bedrooms != null &&
      property.bedrooms ===
        lead.bedrooms - 1
    ) {
      score += 7;

      reasons.push(
        "Close to bedroom requirement",
      );
    }
  }

  // Availability: 10 points.
  if (
    property.status
      .toLowerCase() ===
    "available"
  ) {
    score += 10;

    reasons.push(
      "Currently available",
    );
  }

  const matchScore =
    Math.min(
      100,
      score,
    );

  return {
    property,
    match_score:
      matchScore,
    match_reason:
      reasons.length > 0
        ? reasons.join(" • ")
        : "General match",
  };
}

function buildFallbackAnalysis(
  lead: LeadRow,
  activities: ActivityRow[],
  matchedProperties: RankedProperty[],
  followUps: FollowUpRow[],
  analysisType: AnalysisType,
) {
  let score = 35;

  const reasons: string[] =
    [];

  if (
    lead.budget_min != null ||
    lead.budget_max != null
  ) {
    score += 15;
    reasons.push(
      "Budget information is available.",
    );
  }

  if (
    lead.preferred_location
  ) {
    score += 10;
    reasons.push(
      "Preferred location is specified.",
    );
  }

  if (
    lead.property_type
  ) {
    score += 8;
    reasons.push(
      "Property type is specified.",
    );
  }

  if (
    lead.bedrooms != null
  ) {
    score += 5;
    reasons.push(
      "Bedroom requirement is specified.",
    );
  }

  if (
    lead.purchase_timeline
  ) {
    score += 10;
    reasons.push(
      "Purchase timeline is available.",
    );
  }

  if (
    matchedProperties.length >
    0
  ) {
    score += Math.min(
      12,
      matchedProperties.length *
        4,
    );

    reasons.push(
      `${matchedProperties.length} matching propert${
        matchedProperties.length ===
        1
          ? "y is"
          : "ies are"
      } available.`,
    );
  }

  if (
    activities.length >
    0
  ) {
    score += Math.min(
      8,
      activities.length *
        2,
    );

    reasons.push(
      "There is recent CRM activity.",
    );
  }

  if (
    followUps.length >
    0
  ) {
    score += 5;

    reasons.push(
      "A follow-up is already scheduled.",
    );
  }

  score = clampScore(score);

  const priority =
    normalizePriority(
      lead.priority,
      score,
    );

  const summary =
    `${lead.full_name} is currently in the ${lead.status} stage with a ${priority}-priority profile. ${reasons.join(
      " ",
    )}`;

  let recommendation =
    "Complete qualification and establish a clear next follow-up.";

  if (
    analysisType ===
    "next_action"
  ) {
    if (
      followUps.length >
      0
    ) {
      recommendation =
        "Complete the next scheduled follow-up, confirm any changes in budget or requirements, and update the lead record.";
    } else if (
      matchedProperties.length >
      0
    ) {
      const best =
        matchedProperties[0];

      recommendation =
        `Contact the lead and present ${best.property.title} first because it has the strongest current property match.`;
    } else if (
      activities.length ===
      0
    ) {
      recommendation =
        "Make the first contact, confirm the lead's requirements, and record the interaction in the activity timeline.";
    } else if (
      lead.status ===
      "negotiation"
    ) {
      recommendation =
        "Contact the lead to clarify objections, confirm commercial terms, and move the opportunity toward a decision.";
    } else if (
      lead.status ===
      "site_visit"
    ) {
      recommendation =
        "Follow up on the site visit, capture feedback, and determine whether the lead should move to negotiation.";
    } else if (
      priority ===
      "hot"
    ) {
      recommendation =
        "Contact the lead promptly and turn the current interest into a scheduled meeting, property viewing, or negotiation.";
    } else {
      recommendation =
        "Contact the lead, validate the remaining qualification details, and schedule the next concrete sales step.";
    }
  }

  if (
    analysisType ===
    "property_match"
  ) {
    if (
      matchedProperties.length >
      0
    ) {
      const best =
        matchedProperties[0];

      recommendation =
        `Top match: ${best.property.title}. Match score: ${best.match_score}/100. ${best.match_reason}. Recommend showing this property first and confirming the lead's feedback.`;
    } else {
      recommendation =
        "No strong property match was found from the currently available inventory. Broaden the property search criteria or update the lead requirements.";
    }
  }

  return {
    score:
      analysisType ===
      "property_match"
        ? matchedProperties[0]
            ?.match_score ??
          null
        : score,
    priority,
    summary,
    recommendation,
  };
}

function buildFallbackMessage(
  lead: LeadRow,
  matchedProperties: RankedProperty[],
  channel: MessageChannel,
) {
  const name =
    lead.full_name
      .split(" ")[0] ||
    lead.full_name;

  const bestProperty =
    matchedProperties[0]
      ?.property;

  const propertyText =
    bestProperty
      ? ` I found ${bestProperty.title} in ${bestProperty.location}${
          bestProperty.price
            ? ` around ${bestProperty.currency} ${Number(
                bestProperty.price,
              ).toLocaleString()}`
            : ""
        } that may fit your requirements.`
      : "";

  if (
    channel ===
    "whatsapp"
  ) {
    return `Hi ${name}, hope you're doing well. I'm following up on your property search.${propertyText} Let me know a convenient time to discuss the options and I'll be happy to help.`;
  }

  if (
    channel ===
    "sms"
  ) {
    return `Hi ${name}, following up on your property search.${propertyText} Reply here and I'll share the best options.`;
  }

  return `Subject: Property options for your requirements

Hi ${name},

I'm following up regarding your property search.${propertyText}

Please let me know a convenient time to discuss the available options.

Best regards`;
}

async function callAI(
  lead: LeadRow,
  activities: ActivityRow[],
  matchedProperties: RankedProperty[],
  followUps: FollowUpRow[],
  analysisType: AnalysisType,
  channel?: MessageChannel,
) {
  const apiKey =
    process.env.OPENAI_API_KEY;

  const model =
    process.env.OPENAI_MODEL;

  if (
    !apiKey ||
    !model
  ) {
    if (
      analysisType ===
        "message_generation" &&
      channel
    ) {
      return {
        score: null,
        priority:
          normalizePriority(
            lead.priority,
            Number(
              lead.lead_score ??
                0,
            ),
          ),
        summary:
          "Fallback message generated from CRM context.",
        recommendation:
          buildFallbackMessage(
            lead,
            matchedProperties,
            channel,
          ),
        model:
          "rule-based-fallback",
        rawResponse: {
          mode: "fallback",
          channel,
        },
      };
    }

    return {
      ...buildFallbackAnalysis(
        lead,
        activities,
        matchedProperties,
        followUps,
        analysisType,
      ),
      model:
        "rule-based-fallback",
      rawResponse: {
        mode: "fallback",
        reason:
          "OPENAI_API_KEY or OPENAI_MODEL is not configured.",
      },
    };
  }

  let taskInstruction =
    "Analyze this lead and return a useful CRM assessment.";

  if (
    analysisType ===
    "lead_scoring"
  ) {
    taskInstruction =
      "Score the lead based on buying intent, qualification quality, activity, requirements, matching properties, and sales readiness.";
  }

  if (
    analysisType ===
    "lead_summary"
  ) {
    taskInstruction =
      "Create a concise factual summary of the lead using only the supplied CRM data.";
  }

  if (
    analysisType ===
    "next_action"
  ) {
    taskInstruction =
      "Determine the single most useful next sales action for the assigned agent to take now. Make it concrete and actionable.";
  }

  if (
    analysisType ===
    "property_match"
  ) {
    taskInstruction = `
Analyze the supplied property candidates against the lead's actual requirements.

Evaluate:
- budget fit
- preferred location
- property type
- bedroom requirement
- availability
- overall suitability

Identify the strongest property candidate.

Explain why it is the strongest match and what the agent should do next.

Do not invent any property details.
Do not invent availability.
Use only the supplied CRM data.
`;
  }

  if (
    analysisType ===
      "message_generation" &&
    channel
  ) {
    const channelRules =
      channel ===
      "whatsapp"
        ? "Write a natural WhatsApp message. Friendly, concise, conversational, and professional."
        : channel ===
            "sms"
          ? "Write a very concise SMS that is easy to read and reply to."
          : "Write a professional sales email. Include a subject line and concise body.";

    taskInstruction = `
Generate a personalized ${channel} message for the lead.

${channelRules}

Use the lead's actual name and relevant CRM context.
Use property information only when it is present in the supplied CRM data.
Do not invent property features, availability, price, location, appointments, or promises.
Do not mention AI.
`;
  }

  const prompt = `
You are an AI sales intelligence engine for PropFlow, a real estate CRM.

TASK:
${taskInstruction}

LEAD
${JSON.stringify(
  lead,
  null,
  2,
)}

ACTIVITIES
${JSON.stringify(
  activities,
  null,
  2,
)}

PROPERTY CANDIDATES
${JSON.stringify(
  matchedProperties,
  null,
  2,
)}

FOLLOW-UPS
${JSON.stringify(
  followUps,
  null,
  2,
)}

${
  analysisType ===
    "message_generation" &&
  channel
    ? `
MESSAGE CHANNEL:
${channel}

For message_generation, put the final message in "recommendation".
For email, include the subject line at the beginning of "recommendation".
`
    : ""
}

Return ONLY valid JSON:

{
  "score": 0,
  "priority": "cold",
  "summary": "string",
  "recommendation": "string"
}

Rules:
- score must be an integer from 0 to 100 when applicable
- property_match score should represent the strongest candidate match
- priority must be exactly cold, warm, or hot
- summary must be concise and factual
- recommendation must be actionable
- for property_match, recommendation must name the strongest property and explain why
- for message_generation, recommendation must contain only the final message
- never invent information
- do not return markdown
- do not return extra JSON keys
`;

  const response =
    await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
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
              content:
                prompt,
            },
          ],
        }),
      },
    );

  if (
    !response.ok
  ) {
    const errorText =
      await response.text();

    throw new Error(
      `AI provider request failed: ${response.status} ${errorText}`,
    );
  }

  const result =
    (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

  const content =
    result
      .choices?.[0]
      ?.message
      ?.content;

  if (!content) {
    throw new Error(
      "AI provider returned an empty response.",
    );
  }

  let parsed: AIResponse;

  try {
    parsed =
      JSON.parse(
        content,
      ) as AIResponse;
  } catch {
    throw new Error(
      "AI provider returned invalid JSON.",
    );
  }

  const score =
    analysisType ===
    "message_generation"
      ? null
      : clampScore(
          parsed.score,
        );

  const priority =
    normalizePriority(
      parsed.priority,
      Number(
        score ??
          lead.lead_score ??
          0,
      ),
    );

  const summary =
    typeof parsed.summary ===
    "string"
      ? parsed.summary.trim()
      : "";

  const recommendation =
    typeof parsed.recommendation ===
    "string"
      ? parsed.recommendation.trim()
      : "";

  if (
    !summary ||
    !recommendation
  ) {
    throw new Error(
      "AI response did not contain the required analysis fields.",
    );
  }

  return {
    score,
    priority,
    summary,
    recommendation,
    model,
    rawResponse:
      parsed,
  };
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as {
        leadId?: string;
        analysisType?: AnalysisType;
        channel?: MessageChannel;
      };

    const leadId =
      body.leadId?.trim();

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

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
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
      return NextResponse.json(
        {
          error:
            "Unable to resolve your organization.",
        },
        {
          status: 403,
        },
      );
    }

    const {
      data: leadData,
      error:
        leadError,
    } =
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
      leadError
    ) {
      return NextResponse.json(
        {
          error:
            leadError.message,
        },
        {
          status: 404,
        },
      );
    }

    const lead =
      leadData as LeadRow;

    if (
      lead.organization_id !==
      profile.organization_id
    ) {
      return NextResponse.json(
        {
          error:
            "Lead does not belong to your organization.",
        },
        {
          status: 403,
        },
      );
    }

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
              type,
              description,
              created_at
            `,
          )
          .eq(
            "lead_id",
            lead.id,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(20),

        supabase
          .from(
            "lead_properties",
          )
          .select(
            `
              id,
              property_id,
              match_score,
              match_reason
            `,
          )
          .eq(
            "lead_id",
            lead.id,
          )
          .order(
            "match_score",
            {
              ascending:
                false,
              nullsFirst:
                false,
            },
          )
          .limit(20),

        supabase
          .from("follow_ups")
          .select(
            `
              id,
              due_at,
              type,
              notes,
              status
            `,
          )
          .eq(
            "lead_id",
            lead.id,
          )
          .order(
            "due_at",
            {
              ascending:
                true,
            },
          )
          .limit(10),
      ]);

    if (
      activitiesResult.error
    ) {
      return NextResponse.json(
        {
          error:
            activitiesResult.error
              .message,
        },
        {
          status: 500,
        },
      );
    }

    if (
      matchesResult.error
    ) {
      return NextResponse.json(
        {
          error:
            matchesResult.error
              .message,
        },
        {
          status: 500,
        },
      );
    }

    if (
      followUpsResult.error
    ) {
      return NextResponse.json(
        {
          error:
            followUpsResult.error
              .message,
        },
        {
          status: 500,
        },
      );
    }

    const activities =
      (activitiesResult.data ??
        []) as ActivityRow[];

    const followUps =
      (followUpsResult.data ??
        []) as FollowUpRow[];

    const existingMatches =
      (matchesResult.data ??
        []) as MatchRow[];

    const existingPropertyIds =
      Array.from(
        new Set(
          existingMatches.map(
            (item) =>
              item.property_id,
          ),
        ),
      );

    let candidateProperties:
      PropertyRow[] = [];

    /*
     * For property_match we intentionally load the available
     * inventory as well, so the AI can find a strong candidate
     * even before the regular lead_properties matching has run.
     */
    if (
      analysisType ===
      "property_match"
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
        return NextResponse.json(
          {
            error:
              propertyError.message,
          },
          {
            status: 500,
          },
        );
      }

      candidateProperties =
        (propertyData ??
          []) as PropertyRow[];
    } else if (
      existingPropertyIds.length >
      0
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
          .in(
            "id",
            existingPropertyIds,
          );

      if (
        propertyError
      ) {
        return NextResponse.json(
          {
            error:
              propertyError.message,
          },
          {
            status: 500,
          },
        );
      }

      candidateProperties =
        (propertyData ??
          []) as PropertyRow[];
    }

    const rankedProperties =
      candidateProperties
        .map(
          (property) =>
            calculatePropertyMatch(
              lead,
              property,
            ),
        )
        .sort(
          (a, b) =>
            b.match_score -
            a.match_score,
        )
        .slice(
          0,
          15,
        );

    if (
      analysisType ===
      "property_match"
    ) {
      /*
       * Store/update the top AI-prepared candidates in lead_properties.
       * Existing manual/rule-based match workflow remains compatible.
       */
      if (
        rankedProperties.length >
        0
      ) {
        for (
          const ranked of rankedProperties
        ) {
          const {
            data: existingRow,
          } =
            await supabase
              .from(
                "lead_properties",
              )
              .select(
                "id",
              )
              .eq(
                "lead_id",
                lead.id,
              )
              .eq(
                "property_id",
                ranked
                  .property
                  .id,
              )
              .maybeSingle();

          if (
            existingRow
          ) {
            await supabase
              .from(
                "lead_properties",
              )
              .update({
                match_score:
                  ranked.match_score,
                match_reason:
                  ranked.match_reason,
              })
              .eq(
                "id",
                existingRow.id,
              );
          } else {
            await supabase
              .from(
                "lead_properties",
              )
              .insert({
                lead_id:
                  lead.id,
                property_id:
                  ranked
                    .property
                    .id,
                match_score:
                  ranked.match_score,
                match_reason:
                  ranked.match_reason,
              });
          }
        }
      }
    }

    const analysis =
      await callAI(
        lead,
        activities,
        rankedProperties,
        followUps,
        analysisType,
        channel,
      );

    const analysisRow = {
      organization_id:
        profile.organization_id,
      lead_id:
        lead.id,
      analysis_type:
        analysisType,
      score:
        analysis.score,
      priority:
        analysis.priority,
      summary:
        analysis.summary,
      recommendation:
        analysis.recommendation,
      raw_response:
        analysis.rawResponse,
      model:
        analysis.model,
    };

    const {
      data: savedAnalysis,
      error:
        saveError,
    } =
      await supabase
        .from("ai_analyses")
        .insert(
          analysisRow,
        )
        .select(
          `
            id,
            organization_id,
            lead_id,
            analysis_type,
            score,
            priority,
            summary,
            recommendation,
            raw_response,
            model,
            created_at
          `,
        )
        .single();

    if (
      saveError
    ) {
      return NextResponse.json(
        {
          error:
            saveError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (
      analysisType ===
      "lead_scoring"
    ) {
      const {
        error:
          leadUpdateError,
      } =
        await supabase
          .from("leads")
          .update({
            lead_score:
              analysis.score,
            priority:
              analysis.priority,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            lead.id,
          );

      if (
        leadUpdateError
      ) {
        return NextResponse.json(
          {
            error:
              leadUpdateError.message,
          },
          {
            status: 500,
          },
        );
      }
    }

    return NextResponse.json({
      success: true,
      analysis:
        savedAnalysis,
      propertyMatches:
        analysisType ===
        "property_match"
          ? rankedProperties.map(
              (item) => ({
                property_id:
                  item
                    .property
                    .id,
                title:
                  item
                    .property
                    .title,
                score:
                  item.match_score,
                reason:
                  item.match_reason,
              }),
            )
          : undefined,
    });
  } catch (error) {
    console.error(
      "[AI Lead Analysis]",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unexpected AI analysis error.",
      },
      {
        status: 500,
      },
    );
  }
}