"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type InviteState =
  | "loading"
  | "password"
  | "success"
  | "error";

type HashAuthData = {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
};

function getInviteHashData(): HashAuthData {
  if (
    typeof window ===
    "undefined"
  ) {
    return {
      accessToken: null,
      refreshToken: null,
      type: null,
    };
  }

  const hash =
    window.location.hash.startsWith(
      "#",
    )
      ? window.location.hash.slice(
          1,
        )
      : window.location.hash;

  const params =
    new URLSearchParams(
      hash,
    );

  return {
    accessToken:
      params.get(
        "access_token",
      ),
    refreshToken:
      params.get(
        "refresh_token",
      ),
    type:
      params.get("type"),
  };
}

export default function InvitePage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    state,
    setState,
  ] = useState<InviteState>(
    "loading",
  );

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initializeInvite() {
      try {
        setState(
          "loading",
        );
        setError("");

        /*
         * IMPORTANT:
         * Supabase invite tokens arrive in the URL hash.
         * The server/proxy cannot see the hash.
         * We therefore establish the browser session first.
         */
        const {
          accessToken,
          refreshToken,
          type,
        } = getInviteHashData();

        if (
          type ===
            "invite" &&
          accessToken &&
          refreshToken
        ) {
          const {
            error:
              sessionError,
          } =
            await supabase.auth.setSession(
              {
                access_token:
                  accessToken,
                refresh_token:
                  refreshToken,
              },
            );

          if (
            sessionError
          ) {
            throw new Error(
              sessionError.message,
            );
          }

          /*
           * Remove the sensitive token fragment
           * from the visible browser URL.
           */
          window.history.replaceState(
            {},
            document.title,
            "/auth/invite",
          );
        }

        /*
         * Now the browser session exists, so
         * getUser() can resolve the invited user.
         */
        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase.auth.getUser();

        if (
          userError
        ) {
          throw new Error(
            userError.message,
          );
        }

        if (!user) {
          throw new Error(
            "Your invitation session could not be established. Please open the latest invitation email again.",
          );
        }

        if (
          cancelled
        ) {
          return;
        }

        setEmail(
          user.email ??
            "",
        );

        /*
         * Check whether this invited user already
         * has an organization profile.
         */
        const {
          data: profile,
          error:
            profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, organization_id, role",
            )
            .eq(
              "id",
              user.id,
            )
            .maybeSingle();

        if (
          profileError
        ) {
          throw new Error(
            profileError.message,
          );
        }

        /*
         * Existing profile means the invitation
         * has already been completed.
         */
        if (
          profile
        ) {
          setState(
            "success",
          );

          window.setTimeout(
            () => {
              router.replace(
                "/dashboard",
              );
              router.refresh();
            },
            700,
          );

          return;
        }

        /*
         * New invited user:
         * let them create their password.
         */
        setState(
          "password",
        );
      } catch (
        initializeError
      ) {
        if (
          cancelled
        ) {
          return;
        }

        setError(
          initializeError instanceof
            Error
            ? initializeError.message
            : "Unable to verify your invitation.",
        );

        setState(
          "error",
        );
      }
    }

    void initializeInvite();

    return () => {
      cancelled = true;
    };
  }, [
    router,
    supabase,
  ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (
      password.length <
      8
    ) {
      setError(
        "Password must be at least 8 characters.",
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Set the password on the already-authenticated
       * invited Supabase user.
       */
      const {
        error:
          updateError,
      } =
        await supabase.auth.updateUser(
          {
            password,
          },
        );

      if (
        updateError
      ) {
        throw new Error(
          updateError.message,
        );
      }

      /*
       * Server-side/database function must use
       * auth.uid() + the pending invitation to resolve
       * organization_id and role.
       */
      const {
        data,
        error:
          acceptError,
      } =
        await supabase.rpc(
          "accept_team_invitation",
        );

      if (
        acceptError
      ) {
        throw new Error(
          acceptError.message,
        );
      }

      /*
       * Support both boolean and object-style
       * return values from the RPC.
       */
      const accepted =
        data === true ||
        Boolean(
          data &&
            typeof data ===
              "object" &&
            "success" in
              data &&
            (
              data as {
                success?: boolean;
              }
            ).success ===
              true,
        );

      if (!accepted) {
        throw new Error(
          "The invitation could not be completed. Please contact your organization administrator.",
        );
      }

      setState(
        "success",
      );

      window.setTimeout(
        () => {
          router.replace(
            "/dashboard",
          );
          router.refresh();
        },
        800,
      );
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Unable to complete your account setup.",
      );

      setSaving(false);
    }
  }

  if (
    state ===
    "loading"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-surface-sunken text-ink-700">
            <Loader2 className="size-6 animate-spin" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-ink-900">
            Verifying your invitation...
          </h1>

          <p className="mt-2 text-sm leading-6 text-ink-400">
            Please wait while we prepare your PropFlow account.
          </p>
        </div>
      </main>
    );
  }

  if (
    state ===
    "success"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <CheckCircle2 className="size-6" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-ink-900">
            Welcome to PropFlow
          </h1>

          <p className="mt-2 text-sm leading-6 text-ink-400">
            Your team account is ready. Redirecting to your dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (
    state ===
    "error"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <ShieldCheck className="size-6" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-ink-900">
            Invitation could not be completed
          </h1>

          <p className="mt-2 text-sm leading-6 text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              router.replace(
                "/login",
              )
            }
            className="mt-5 h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken"
          >
            Back to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-surface-sunken text-ink-700">
            <ShieldCheck className="size-6" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-ink-900">
            Complete your PropFlow account
          </h1>

          <p className="mt-2 text-sm leading-6 text-ink-400">
            Create a password to finish accepting your team invitation.
          </p>

          {email ? (
            <p className="mt-3 text-xs font-medium text-ink-600">
              {email}
            </p>
          ) : null}
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-6 space-y-4"
        >
          <div className="space-y-2">
            <label
              htmlFor="invite-password"
              className="text-sm font-medium text-ink-800"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="invite-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event.target
                      .value,
                  )
                }
                autoComplete="new-password"
                minLength={8}
                required
                disabled={
                  saving
                }
                placeholder="At least 8 characters"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm outline-none focus:ring-2 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      value,
                    ) =>
                      !value,
                  )
                }
                disabled={
                  saving
                }
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 hover:bg-surface-sunken"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="invite-confirm-password"
              className="text-sm font-medium text-ink-800"
            >
              Confirm password
            </label>

            <div className="relative">
              <input
                id="invite-confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(
                  event,
                ) =>
                  setConfirmPassword(
                    event.target
                      .value,
                  )
                }
                autoComplete="new-password"
                minLength={8}
                required
                disabled={
                  saving
                }
                placeholder="Repeat your password"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm outline-none focus:ring-2 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (
                      value,
                    ) =>
                      !value,
                  )
                }
                disabled={
                  saving
                }
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 hover:bg-surface-sunken"
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              saving ||
              !password ||
              !confirmPassword
            }
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink-900 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Activating account...
              </>
            ) : (
              "Accept invitation"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}