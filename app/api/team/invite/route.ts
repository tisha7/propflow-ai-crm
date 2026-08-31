import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type InviteRole =
  | "admin"
  | "manager"
  | "agent";

type InvitePayload = {
  email?: string;
  fullName?: string;
  role?: InviteRole;
};

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
      error:
        authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
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

    const body =
      (await request.json()) as InvitePayload;

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
      return NextResponse.json(
        {
          error:
            "Email address is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      ![
        "admin",
        "manager",
        "agent",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid team role.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: inviter,
      error:
        inviterError,
    } =
      await supabase
        .from("profiles")
        .select(
          "organization_id, role",
        )
        .eq(
          "id",
          user.id,
        )
        .single();

    if (
      inviterError ||
      !inviter
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

    if (
      inviter.role !==
      "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an Admin can invite team members.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Check whether this email already has an
     * Auth account in another organization/profile.
     */
    const {
      data:
        existingUsers,
      error:
        usersError,
    } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      return NextResponse.json(
        {
          error:
            usersError.message,
        },
        {
          status: 500,
        },
      );
    }

    const existingAuthUser =
      existingUsers.users.find(
        (item) =>
          item.email
            ?.toLowerCase() ===
          email,
      );

    if (
      existingAuthUser
    ) {
      const {
        data: existingProfile,
      } =
        await supabaseAdmin
          .from("profiles")
          .select(
            "id, organization_id, role",
          )
          .eq(
            "id",
            existingAuthUser.id,
          )
          .maybeSingle();

      if (
        existingProfile
      ) {
        return NextResponse.json(
          {
            error:
              existingProfile.organization_id ===
              inviter.organization_id
                ? "This user is already a member of your organization."
                : "This email already belongs to another PropFlow organization.",
          },
          {
            status: 409,
          },
        );
      }
    }

    /*
     * Remove any old/cancelled invitations for this
     * organization/email before creating a fresh one.
     */
    await supabaseAdmin
      .from("team_invitations")
      .update({
        status: "cancelled",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "organization_id",
        inviter.organization_id,
      )
      .ilike(
        "email",
        email,
      )
      .eq(
        "status",
        "pending",
      );

    const {
      data:
        invitation,
      error:
        invitationError,
    } =
      await supabaseAdmin
        .from("team_invitations")
        .insert({
          organization_id:
            inviter.organization_id,
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

    if (invitationError) {
      return NextResponse.json(
        {
          error:
            invitationError.message,
        },
        {
          status: 500,
        },
      );
    }

    const origin =
      new URL(
        request.url,
      ).origin;

    const redirectTo =
      `${origin}/auth/confirm?next=/auth/invite`;

    const {
      error:
        inviteError,
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

    if (inviteError) {
      await supabaseAdmin
        .from("team_invitations")
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

      return NextResponse.json(
        {
          error:
            inviteError.message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        invitation,
        message:
          `Invitation sent to ${email}.`,
      },
    );
  } catch (error) {
    console.error(
      "Team invite error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send invitation.",
      },
      {
        status: 500,
      },
    );
  }
}