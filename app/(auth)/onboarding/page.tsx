"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [organizationName, setOrganizationName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("USD");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = organizationName.trim();

    if (!name) {
      setError("Please enter your organization name.");
      return;
    }

    const slug = slugify(name);

    if (!slug) {
      setError("Please enter a valid organization name.");
      return;
    }

    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc(
      "create_organization_with_admin",
      {
        p_name: name,
        p_slug: slug,
        p_timezone: timezone,
        p_currency: currency,
      },
    );

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Organization creation failed.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">
            P
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Set up your workspace
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Create your PropFlow workspace to start managing your real estate
            sales operation.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="organizationName"
                className="text-sm font-medium"
              >
                Organization name
              </label>

              <input
                id="organizationName"
                type="text"
                required
                value={organizationName}
                onChange={(event) =>
                  setOrganizationName(event.target.value)
                }
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2"
                placeholder="PrimeNest Realty"
              />

              <p className="text-xs text-muted-foreground">
                This is the name your team will see inside PropFlow.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="timezone" className="text-sm font-medium">
                Organization timezone
              </label>

              <select
                id="timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">
                  America/New_York
                </option>
                <option value="America/Toronto">
                  America/Toronto
                </option>
                <option value="Europe/London">Europe/London</option>
                <option value="Australia/Sydney">
                  Australia/Sydney
                </option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="currency" className="text-sm font-medium">
                Default currency
              </label>

              <select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2"
              >
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="AED">AED — UAE Dirham</option>
              </select>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating workspace..." : "Create workspace"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          You can configure additional workspace settings later.
        </p>
      </div>
    </main>
  );
}