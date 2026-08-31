import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function GET(
  request: Request,
) {
  const url =
    new URL(request.url);

  const tokenHash =
    url.searchParams.get(
      "token_hash",
    );

  const type =
    url.searchParams.get(
      "type",
    );

  const next =
    url.searchParams.get(
      "next",
    ) || "/auth/invite";

  if (
    !tokenHash ||
    !type
  ) {
    return NextResponse.redirect(
      new URL(
        `/login?error=invalid_invitation`,
        request.url,
      ),
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.auth.verifyOtp({
      token_hash:
        tokenHash,
      type: type as
        | "invite"
        | "recovery"
        | "signup"
        | "magiclink"
        | "email_change",
    });

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          error.message,
        )}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      next,
      request.url,
    ),
  );
}