"use client";

import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

export default function InvitePage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function acceptInvitation() {
      const {
        data: {
          user,
        },
        error:
          authError,
      } =
        await supabase.auth.getUser();

      if (
        cancelled
      ) {
        return;
      }

      if (
        authError ||
        !user
      ) {
        setError(
          "Your invitation session could not be verified.",
        );
        setLoading(false);
        return;
      }

      const {
        data,
        error:
          acceptError,
      } =
        await supabase.rpc(
          "accept_team_invitation",
        );

      if (
        cancelled
      ) {
        return;
      }

      if (
        acceptError
      ) {
        setError(
          acceptError.message,
        );
        setLoading(false);
        return;
      }

      if (
        !data ||
        data.success !==
          true
      ) {
        setError(
          "The invitation could not be accepted.",
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      window.setTimeout(
        () => {
          router.replace(
            "/dashboard",
          );
          router.refresh();
        },
        1000,
      );
    }

    void acceptInvitation();

    return () => {
      cancelled = true;
    };
  }, [
    router,
    supabase,
  ]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-7 text-center shadow-sm">
        {loading ? (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              Joining your team...
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Setting up your PropFlow account.
            </p>
          </>
        ) : success ? (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CheckCircle2 className="size-6" />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              Invitation accepted
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Your PropFlow account is ready.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <ShieldCheck className="size-6" />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              Invitation failed
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
              className="mt-5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </main>
  );
}