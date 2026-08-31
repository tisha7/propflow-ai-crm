"use client";

import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type AuthCheckResult = {
  userId: string | null;
  email: string | null;
  profileId: string | null;
  fullName: string | null;
  role: string | null;
  organizationId: string | null;
  profileError: string | null;
};

const EMPTY_RESULT: AuthCheckResult = {
  userId: null,
  email: null,
  profileId: null,
  fullName: null,
  role: null,
  organizationId: null,
  profileError: null,
};

export default function AuthCheckPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [result, setResult] =
    useState<AuthCheckResult>(
      EMPTY_RESULT,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [checkedAt, setCheckedAt] =
    useState<string | null>(
      null,
    );

  const runCheck = useCallback(
    async () => {
      setLoading(true);
      setError("");

      const {
        data: {
          user,
        },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        setError(
          userError.message,
        );
        setLoading(false);
        return;
      }

      if (!user) {
        setResult(
          EMPTY_RESULT,
        );
        setError(
          "No authenticated browser session was found.",
        );
        setLoading(false);
        return;
      }

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, role, organization_id",
          )
          .eq(
            "id",
            user.id,
          )
          .single();

      setResult({
        userId: user.id,
        email:
          user.email ??
          null,
        profileId:
          profile?.id ??
          null,
        fullName:
          profile?.full_name ??
          null,
        role:
          profile?.role ??
          null,
        organizationId:
          profile?.organization_id ??
          null,
        profileError:
          profileError?.message ??
          null,
      });

      setCheckedAt(
        new Date().toLocaleString(),
      );

      if (profileError) {
        setError(
          profileError.message,
        );
      }

      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void runCheck();
        },
        0,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [runCheck]);

  const authenticated =
    Boolean(
      result.userId,
    );

  const profileResolved =
    Boolean(
      result.profileId,
    );

  const organizationResolved =
    Boolean(
      result.organizationId,
    );

  const roleResolved =
    Boolean(
      result.role,
    );

  const allGood =
    authenticated &&
    profileResolved &&
    organizationResolved &&
    roleResolved &&
    !result.profileError;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-surface-sunken text-ink-700">
              <ShieldCheck className="size-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              Browser Auth Check
            </h1>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-400">
            Temporary diagnostic page for verifying the authenticated
            browser session and organization mapping.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void runCheck()
          }
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-700 disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${
              loading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-medium text-red-800">
                Diagnostic error
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section
        className={`rounded-xl border p-5 ${
          allGood
            ? "border-green-200 bg-green-50/40"
            : "border-border bg-surface"
        }`}
      >
        <div className="flex items-center gap-3">
          {allGood ? (
            <CheckCircle2 className="size-5 text-green-600" />
          ) : (
            <AlertCircle className="size-5 text-amber-600" />
          )}

          <div>
            <h2 className="text-sm font-semibold text-ink-900">
              {allGood
                ? "Browser authentication is resolved"
                : "Browser authentication needs attention"}
            </h2>

            <p className="mt-1 text-xs text-ink-500">
              {checkedAt
                ? `Checked at ${checkedAt}`
                : "Checking current session..."}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink-900">
            Session details
          </h2>

          <p className="mt-1 text-xs text-ink-400">
            These values are read directly from the current browser session.
          </p>
        </div>

        <div className="divide-y divide-border">
          <CheckRow
            label="Authenticated user"
            value={
              authenticated
                ? "Yes"
                : "No"
            }
            detail={
              result.userId ??
              "No auth user"
            }
            ok={
              authenticated
            }
          />

          <CheckRow
            label="Email"
            value={
              result.email ??
              "Not available"
            }
            detail="Supabase Auth"
            ok={
              Boolean(
                result.email,
              )
            }
          />

          <CheckRow
            label="Profile"
            value={
              profileResolved
                ? "Resolved"
                : "Not resolved"
            }
            detail={
              result.profileId ??
              "No matching profile"
            }
            ok={
              profileResolved
            }
          />

          <CheckRow
            label="Full name"
            value={
              result.fullName ??
              "Not available"
            }
            detail="profiles.full_name"
            ok={
              Boolean(
                result.fullName,
              )
            }
          />

          <CheckRow
            label="Role"
            value={
              result.role ??
              "Not resolved"
            }
            detail="profiles.role"
            ok={
              roleResolved
            }
          />

          <CheckRow
            label="Organization"
            value={
              organizationResolved
                ? "Resolved"
                : "Not resolved"
            }
            detail={
              result.organizationId ??
              "No organization mapping"
            }
            ok={
              organizationResolved
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink-900">
          Expected result
        </h2>

        <div className="mt-4 rounded-lg bg-surface-sunken p-4">
          <pre className="overflow-x-auto text-xs leading-6 text-ink-600">
{`Authenticated user → Yes
Profile           → Resolved
Role              → admin
Organization      → Resolved

User ID           → ${result.userId ?? "pending"}
Organization ID   → ${result.organizationId ?? "pending"}`}
          </pre>
        </div>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-5 text-amber-800">
          This is a temporary diagnostic route. After the browser session
          and RLS behavior are verified, remove this page before production.
        </p>
      </div>
    </div>
  );
}

function CheckRow({
  label,
  value,
  detail,
  ok,
}: {
  label: string;
  value: string;
  detail: string;
  ok: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink-800">
          {label}
        </p>

        <p className="mt-1 text-[11px] text-ink-400">
          {detail}
        </p>
      </div>

      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
          ok
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {ok ? (
          <CheckCircle2 className="size-3" />
        ) : (
          <AlertCircle className="size-3" />
        )}

        {value}
      </span>
    </div>
  );
}