import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type InviteRole =
  | "admin"
  | "manager"
  | "agent";

type InvitePayload = {
  email?: string;
  fullName?: string | null;
  role?: InviteRole;
};

function jsonError(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return jsonError(
        "Authentication required.",
        401,
      );
    }

    let body: InvitePayload;

    try {
      body =
        (await request.json()) as InvitePayload;
    } catch {
      return jsonError(
        "Invalid request body.",
        400,
      );
    }

    const email =
      body.email
        ?.trim()
        .toLowerCase();

    const fullName =
      body.fullName?.trim() ||
      null;

    const role =
      body.role ?? "agent";

    if (!email) {
      return jsonError(
        "Email address is required.",
        400,
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      return jsonError(
        "Please enter a valid email address.",
        400,
      );
    }

    if (
      ![
        "admin",
        "manager",
        "agent",
      ].includes(role)
    ) {
      return jsonError(
        "Invalid team role.",
        400,
      );
    }

    const {
      data: inviterProfile,
      error:
        inviterProfileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "id, organization_id, role, full_name",
        )
        .eq(
          "id",
          user.id,
        )
        .single();

    if (
      inviterProfileError ||
      !inviterProfile
    ) {
      console.error(
        "[Team Invite] Unable to resolve inviter profile:",
        inviterProfileError,
      );

      return jsonError(
        "Unable to verify your team permissions.",
        403,
      );
    }

    if (
      inviterProfile.role !==
      "admin"
    ) {
      return jsonError(
        "Only an Admin can invite team members.",
        403,
      );
    }

    if (
      !inviterProfile.organization_id
    ) {
      return jsonError(
        "Your account is not connected to an organization.",
        403,
      );
    }

    let supabaseAdmin;

    try {
      supabaseAdmin =
        createAdminClient();
    } catch (error) {
      console.error(
        "[Team Invite] Admin client configuration error:",
        error,
      );

      return jsonError(
        "Invitation service is temporarily unavailable.",
        500,
      );
    }

    /*
     * Prevent inviting an already-existing profile.
     */
    const {
      data: existingProfileByEmail,
      error:
        existingProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, organization_id, role",
        )
        .ilike(
          "email",
          email,
        )
        .maybeSingle();

    /*
     * If profiles.email does not exist in the
     * current schema, don't fail here. Auth lookup
     * below remains authoritative.
     */
    if (
      existingProfileError &&
      !existingProfileError.message
        .toLowerCase()
        .includes("column")
    ) {
      console.error(
        "[Team Invite] Existing profile lookup failed:",
        existingProfileError,
      );

      return jsonError(
        "Unable to verify whether this email is already in use.",
        500,
      );
    }

    if (
      existingProfileByEmail
    ) {
      if (
        existingProfileByEmail.organization_id ===
        inviterProfile.organization_id
      ) {
        return jsonError(
          "This user is already a member of your organization.",
          409,
        );
      }

      return jsonError(
        "This email already belongs to another PropFlow organization.",
        409,
      );
    }

    /*
     * Cancel previous pending invite.
     */
    const {
      error:
        cancelError,
    } =
      await supabaseAdmin
        .from(
          "team_invitations",
        )
        .update({
          status:
            "cancelled",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "organization_id",
          inviterProfile.organization_id,
        )
        .ilike(
          "email",
          email,
        )
        .eq(
          "status",
          "pending",
        );

    if (
      cancelError
    ) {
      console.error(
        "[Team Invite] Unable to cancel previous pending invitation:",
        cancelError,
      );

      return jsonError(
        "Unable to prepare the invitation.",
        500,
      );
    }

    /*
     * Store trusted organization + role server-side.
     */
    const {
      data: invitation,
      error:
        invitationError,
    } =
      await supabaseAdmin
        .from(
          "team_invitations",
        )
        .insert({
          organization_id:
            inviterProfile.organization_id,
          email,
          full_name:
            fullName,
          role,
          invited_by:
            user.id,
          status:
            "pending",
        })
        .select(
          "id, email, full_name, role, expires_at",
        )
        .single();

    if (
      invitationError
    ) {
      console.error(
        "[Team Invite] Invitation insert failed:",
        invitationError,
      );

      return jsonError(
        "Unable to create the invitation.",
        500,
      );
    }

    /*
     * IMPORTANT:
     * Redirect directly to the client invite page.
     *
     * Supabase may return invite session tokens
     * in the URL fragment (#access_token=...).
     * The client page can process that fragment.
     */
    const origin =
      new URL(
        request.url,
      ).origin;

    const redirectTo =
      `${origin}/auth/invite`;

    const {
      error:
        authInviteError,
    } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name:
              fullName,
          },
          redirectTo,
        },
      );

    if (
      authInviteError
    ) {
      console.error(
        "[Team Invite] Supabase invitation email failed:",
        authInviteError,
      );

      await supabaseAdmin
        .from(
          "team_invitations",
        )
        .update({
          status:
            "cancelled",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          invitation.id,
        );

      return jsonError(
        "Unable to send the invitation email right now.",
        502,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          `Invitation sent to ${email}.`,
        invitation,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/team/invite:",
      error,
    );

    return jsonError(
      "Unexpected server error while sending the invitation.",
      500,
    );
  }
}