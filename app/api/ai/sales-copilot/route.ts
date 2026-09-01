import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

type FollowUpRow = {
  id: string;
  due_at: string;
  type: string;
  notes: string | null;
  status: string;
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

type CopilotResponse = {
  executive_summary?: string;
  priority_focus?: string;
  next_action?: string;
  recommended_property_id?: string | null;
  recommended_property_title?: string | null;
  property_reason?: string;
  suggested_message?: string;
  follow_up_plan?: string;
  closing_tip?: string;
  risk_or_objection?: string;
};

function fallbackCopilot(
  lead: LeadRow,
  activities: ActivityRow[],
  followUps: FollowUpRow[],
  matchedProperties: Array<
    MatchRow & {
      property?: PropertyRow;
    }
  >,
) {
  const bestMatch =
    matchedProperties
      .filter(
        (item) =>
          item.property,
      )
      .sort(
        (a, b) =>
          Number(
            b.match_score ??
              0,
          ) -
          Number(
            a.match_score ??
              0,
          ),
      )[0] ?? null;

  const bestProperty =
    bestMatch?.property ??
    null;

  let nextAction =
    "Contact the lead and confirm the most important buying requirement before taking the next sales step.";

  if (
    lead.status ===
    "new"
  ) {
    nextAction =
      "Make the first contact, verify the lead's requirements, and establish a clear buying timeline.";
  } else if (
    lead.status ===
    "contacted"
  ) {
    nextAction =
      "Follow up on the previous conversation, confirm the lead's requirements, and move toward qualification.";
  } else if (
    lead.status ===
    "qualified"
  ) {
    nextAction =
      bestProperty
        ? `Present ${bestProperty.title} as the first recommendation and ask for feedback or a viewing time.`
        : "Present suitable properties and schedule a viewing or consultation.";
  } else if (
    lead.status ===
    "property_matched"
  ) {
    nextAction =
      bestProperty
        ? `Contact the lead about ${bestProperty.title} and convert the property interest into a viewing or appointment.`
        : "Contact the lead and schedule the next concrete property-related action.";
  } else if (
    lead.status ===
    "site_visit"
  ) {
    nextAction =
      "Follow up on the site visit, capture objections or feedback, and determine whether the lead is ready for negotiation.";
  } else if (
    lead.status ===
    "negotiation"
  ) {
    nextAction =
      "Clarify the remaining objection or commercial issue and move the lead toward a decision.";
  }

  if (
    followUps.some(
      (item) =>
        item.status ===
        "pending",
    )
  ) {
    nextAction =
      `Complete the scheduled follow-up first, then continue with the next sales step.`;
  }

  const firstName =
    lead.full_name
      .trim()
      .split(/\s+/)[0] ||
    lead.full_name;

  const propertyMessage =
    bestProperty
      ? ` I also have ${bestProperty.title} in ${bestProperty.location}${
          bestProperty.price
            ? ` at ${bestProperty.currency} ${Number(
                bestProperty.price,
              ).toLocaleString()}`
            : ""
        } that may fit what you're looking for.`
      : "";

  const suggestedMessage =
    `Hi ${firstName}, I wanted to follow up on your property search.${propertyMessage} Would you be available for a quick call so we can discuss the best option for you?`;

  const executiveSummary =
    `${lead.full_name} is a ${lead.priority} priority lead in the ${lead.status} stage with ${
      activities.length
    } recorded activities and ${
      matchedProperties.length
    } matched properties.`;

  const followUpPlan =
    followUps.length > 0
      ? "Use the existing scheduled follow-up as the immediate contact point. Update the lead after the interaction."
      : "Create a specific follow-up time after the next contact rather than leaving the lead without a scheduled next step.";

  const closingTip =
    lead.priority ===
    "hot"
      ? "Reduce friction: move quickly to a specific viewing, consultation, or negotiation step."
      : "Ask for one concrete commitment at the end of the conversation, such as a viewing time or follow-up date.";

  return {
    executive_summary:
      executiveSummary,
    priority_focus:
      lead.priority ===
      "hot"
        ? "High priority: respond quickly and push toward a concrete sales milestone."
        : lead.priority ===
            "warm"
          ? "Warm opportunity: strengthen qualification and create a specific next commitment."
          : "Cold opportunity: focus on qualification, engagement, and identifying real buying intent.",
    next_action:
      nextAction,
    recommended_property_id:
      bestProperty?.id ??
      null,
    recommended_property_title:
      bestProperty?.title ??
      null,
    property_reason:
      bestMatch
        ? bestMatch.match_reason
        : "No strong property match is currently available.",
    suggested_message:
      suggestedMessage,
    follow_up_plan:
      followUpPlan,
    closing_tip:
      closingTip,
    risk_or_objection:
      activities.length ===
      0
        ? "There is limited interaction history, so actual buying intent still needs to be validated."
        : "Watch for unresolved budget, location, timing, or property-fit objections during the next conversation.",
    model:
      "rule-based-fallback",
  };
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as {
        leadId?: string;
      };

    const leadId =
      body.leadId?.trim();

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
            "Unable to load lead.",
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
      followUpsResult,
      matchesResult,
    ] = await Promise.all([
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
        .limit(25),

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
        .limit(15),

      supabase
        .from("lead_properties")
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
        .limit(15),
    ]);

    if (
      activitiesResult.error
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to load recent activity.",
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
            "Unable to load follow-up data.",
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
            "Unable to load property matches.",
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

    const matchRows =
      (matchesResult.data ??
        []) as MatchRow[];

    const propertyIds =
      Array.from(
        new Set(
          matchRows.map(
            (match) =>
              match.property_id,
          ),
        ),
      );

    let properties:
      PropertyRow[] = [];

    if (
      propertyIds.length >
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
            propertyIds,
          );

      if (
        propertyError
      ) {
        return NextResponse.json(
          {
            error:
              "Unable to load matched properties.",
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

    const propertyMap =
      new Map(
        properties.map(
          (property) => [
            property.id,
            property,
          ],
        ),
      );

    const matchedProperties =
      matchRows.map(
        (match) => ({
          ...match,
          property:
            propertyMap.get(
              match.property_id,
            ),
        }),
      );

    const apiKey =
      process.env.OPENAI_API_KEY;

    const model =
      process.env.OPENAI_MODEL;

    if (
      !apiKey ||
      !model
    ) {
      return NextResponse.json({
        success: true,
        copilot:
          fallbackCopilot(
            lead,
            activities,
            followUps,
            matchedProperties,
          ),
      });
    }

    const prompt = `
You are the Sales Copilot for PropFlow, a professional real-estate CRM.

Your job is to help a real estate agent decide exactly what to do next.

Analyze the COMPLETE CRM context below.

LEAD:
${JSON.stringify(
  lead,
  null,
  2,
)}

RECENT ACTIVITIES:
${JSON.stringify(
  activities,
  null,
  2,
)}

FOLLOW-UPS:
${JSON.stringify(
  followUps,
  null,
  2,
)}

MATCHED PROPERTIES:
${JSON.stringify(
  matchedProperties,
  null,
  2,
)}

Return ONLY valid JSON with this exact structure:

{
  "executive_summary": "string",
  "priority_focus": "string",
  "next_action": "string",
  "recommended_property_id": "string or null",
  "recommended_property_title": "string or null",
  "property_reason": "string",
  "suggested_message": "string",
  "follow_up_plan": "string",
  "closing_tip": "string",
  "risk_or_objection": "string"
}

Rules:
- Use only the supplied CRM data.
- Never invent property details.
- Never invent lead information.
- If no property is suitable, recommended_property_id and recommended_property_title must be null.
- next_action must be ONE concrete action the agent should take next.
- suggested_message must be ready to send and personalized.
- property_reason must explain why the selected property is appropriate.
- follow_up_plan must be practical.
- closing_tip must help move the opportunity toward a specific commitment.
- risk_or_objection must mention the most important current uncertainty or objection.
- Keep the language concise and sales-oriented.
- Do not mention that you are an AI.
`;

    const controller =
      new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 20_000);

    let response: Response;

    try {
      response =
        await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method:
              "POST",
            headers: {
              Authorization:
                `Bearer ${apiKey}`,
              "Content-Type":
                "application/json",
            },
            signal:
              controller.signal,
            body: JSON.stringify(
              {
                model,
                temperature:
                  0.35,
                response_format:
                  {
                    type: "json_object",
                  },
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a precise real-estate sales copilot. Return JSON only.",
                  },
                  {
                    role: "user",
                    content:
                      prompt,
                  },
                ],
              },
            ),
          },
        );
    } catch (error) {
      if (
        error instanceof DOMException &&
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

    if (
      !response.ok
    ) {
      const providerError =
        await response.text();

      console.error(
        "[Sales Copilot] OpenAI provider error:",
        response.status,
        providerError,
      );

      return NextResponse.json({
        success: true,
        copilot:
          fallbackCopilot(
            lead,
            activities,
            followUps,
            matchedProperties,
          ),
      });
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
      return NextResponse.json({
        success: true,
        copilot:
          fallbackCopilot(
            lead,
            activities,
            followUps,
            matchedProperties,
          ),
      });
    }

    let copilot: CopilotResponse;

    try {
      copilot =
        JSON.parse(
          content,
        ) as CopilotResponse;
    } catch {
      return NextResponse.json({
        success: true,
        copilot:
          fallbackCopilot(
            lead,
            activities,
            followUps,
            matchedProperties,
          ),
      });
    }

    return NextResponse.json({
      success: true,
      copilot: {
        executive_summary:
          copilot.executive_summary ??
          "",
        priority_focus:
          copilot.priority_focus ??
          "",
        next_action:
          copilot.next_action ??
          "",
        recommended_property_id:
          copilot.recommended_property_id ??
          null,
        recommended_property_title:
          copilot.recommended_property_title ??
          null,
        property_reason:
          copilot.property_reason ??
          "",
        suggested_message:
          copilot.suggested_message ??
          "",
        follow_up_plan:
          copilot.follow_up_plan ??
          "",
        closing_tip:
          copilot.closing_tip ??
          "",
        risk_or_objection:
          copilot.risk_or_objection ??
          "",
        model,
      },
    });
  } catch (error) {
    console.error(
      "[Sales Copilot]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete Sales Copilot right now.",
      },
      {
        status: 500,
      },
    );
  }
}