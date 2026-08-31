"use client";

import {
  Bell,
  Brain,
  Check,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  organization_id: string | null;
  role: string | null;
};

type PreferenceState = {
  followUpReminders: boolean;
  appointmentReminders: boolean;
  newLeadAlerts: boolean;
  aiAlerts: boolean;
  aiAutoContext: boolean;
};

const DEFAULT_PREFERENCES: PreferenceState = {
  followUpReminders: true,
  appointmentReminders: true,
  newLeadAlerts: true,
  aiAlerts: true,
  aiAutoContext: true,
};

const PREFERENCES_KEY =
  "propflow-settings-preferences";

function safeReadPreferences(): PreferenceState {
  if (
    typeof window ===
    "undefined"
  ) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const saved =
      window.localStorage.getItem(
        PREFERENCES_KEY,
      );

    if (!saved) {
      return DEFAULT_PREFERENCES;
    }

    const parsed =
      JSON.parse(
        saved,
      ) as Partial<PreferenceState>;

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function formatRole(
  role: string | null,
) {
  if (!role) {
    return "Member";
  }

  return role
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

export default function SettingsPage() {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(
    null,
  );

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    preferences,
    setPreferences,
  ] =
    useState<PreferenceState>(
      DEFAULT_PREFERENCES,
    );

  const [
    profileMessage,
    setProfileMessage,
  ] = useState("");

  const [
    profileError,
    setProfileError,
  ] = useState("");

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordError,
    setPasswordError,
  ] = useState("");

  const [
    preferenceMessage,
    setPreferenceMessage,
  ] = useState("");

  const loadSettings =
    useCallback(
      async () => {
        setLoading(true);
        setProfileError("");

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setProfileError(
            "Your session has expired. Please sign in again.",
          );
          setLoading(false);
          return;
        }

        setEmail(
          user.email ??
            "",
        );

        const {
          data,
          error,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, organization_id, role",
            )
            .eq(
              "id",
              user.id,
            )
            .single();

        if (error) {
          setProfileError(
            error.message,
          );
          setLoading(false);
          return;
        }

        const loadedProfile =
          data as Profile;

        setProfile(
          loadedProfile,
        );

        setFullName(
          loadedProfile.full_name ??
            "",
        );

        setPreferences(
          safeReadPreferences(),
        );

        setLoading(false);
      },
      [supabase],
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadSettings();
        },
        0,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [loadSettings]);

  function updatePreference(
    key: keyof PreferenceState,
    value: boolean,
  ) {
    setPreferences(
      (current) => {
        const next = {
          ...current,
          [key]: value,
        };

        try {
          window.localStorage.setItem(
            PREFERENCES_KEY,
            JSON.stringify(
              next,
            ),
          );
        } catch {
          // Local preference persistence is best-effort.
        }

        return next;
      },
    );

    setPreferenceMessage(
      "Preferences saved.",
    );

    window.setTimeout(
      () => {
        setPreferenceMessage(
          "",
        );
      },
      2000,
    );
  }

  async function handleProfileSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName =
      fullName.trim();

    if (!trimmedName) {
      setProfileError(
        "Full name is required.",
      );
      setProfileMessage("");
      return;
    }

    if (!profile) {
      setProfileError(
        "Profile is not loaded.",
      );
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    const {
      data,
      error,
    } =
      await supabase
        .from("profiles")
        .update({
          full_name:
            trimmedName,
        })
        .eq(
          "id",
          profile.id,
        )
        .select(
          "id, full_name, organization_id, role",
        )
        .single();

    if (error) {
      setProfileError(
        error.message,
      );
      setSavingProfile(false);
      return;
    }

    setProfile(
      data as Profile,
    );

    setFullName(
      trimmedName,
    );

    setProfileMessage(
      "Profile updated successfully.",
    );

    setSavingProfile(false);
  }

  async function handlePasswordChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (
      newPassword.length <
      8
    ) {
      setPasswordError(
        "Password must be at least 8 characters.",
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(
        "Passwords do not match.",
      );
      return;
    }

    setChangingPassword(true);

    const {
      error,
    } =
      await supabase.auth.updateUser(
        {
          password:
            newPassword,
        },
      );

    if (error) {
      setPasswordError(
        error.message,
      );
      setChangingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    setPasswordMessage(
      "Password changed successfully.",
    );

    setChangingPassword(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    setProfileError("");

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      setProfileError(
        error.message,
      );
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Settings
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Loading account settings...
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="h-40 animate-pulse rounded-xl border border-border bg-surface xl:col-span-2" />
          <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" />
        </div>

        <div className="h-80 animate-pulse rounded-xl border border-border bg-surface" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Settings
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-400">
          Manage your PropFlow profile, notifications, AI preferences,
          and account security.
        </p>
      </div>

      {profileError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {profileError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-5 xl:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-ink-700">
              <UserRound className="size-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink-900">
                Profile
              </h2>

              <p className="mt-1 text-xs leading-5 text-ink-400">
                Update the information shown on your CRM account.
              </p>
            </div>
          </div>

          <form
            onSubmit={
              handleProfileSave
            }
            className="mt-6 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-800">
                  Full name
                </label>

                <input
                  value={
                    fullName
                  }
                  onChange={(
                    event,
                  ) =>
                    setFullName(
                      event.target.value,
                    )
                  }
                  placeholder="Your full name"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-800">
                  Email
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

                  <input
                    value={
                      email
                    }
                    disabled
                    className="h-10 w-full rounded-lg border border-border bg-surface-sunken pl-9 pr-3 text-sm text-ink-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <ReadOnlyInfo
                label="Role"
                value={formatRole(
                  profile?.role ??
                    null,
                )}
              />

              <ReadOnlyInfo
                label="Organization access"
                value={
                  profile?.organization_id
                    ? "Organization member"
                    : "Not assigned"
                }
              />
            </div>

            {profileMessage ? (
              <SuccessMessage>
                {profileMessage}
              </SuccessMessage>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  savingProfile
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingProfile ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Check className="size-4" />
                )}

                {savingProfile
                  ? "Saving..."
                  : "Save profile"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-ink-700">
              <ShieldCheck className="size-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink-900">
                Account security
              </h2>

              <p className="mt-1 text-xs leading-5 text-ink-400">
                Keep your account secure.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <SecurityRow
              icon={
                <Mail className="size-4" />
              }
              title="Email account"
              value={
                email ||
                "Not available"
              }
            />

            <SecurityRow
              icon={
                <ShieldCheck className="size-4" />
              }
              title="Authentication"
              value="Supabase Auth"
            />

            <SecurityRow
              icon={
                <KeyRound className="size-4" />
              }
              title="Password"
              value="Protected"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void handleSignOut()
            }
            disabled={
              signingOut
            }
            className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 disabled:opacity-50"
          >
            <LogOut className="size-4" />

            {signingOut
              ? "Signing out..."
              : "Sign out"}
          </button>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-ink-700">
              <Bell className="size-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ink-900">
                Notifications
              </h2>

              <p className="mt-1 text-xs leading-5 text-ink-400">
                Choose which CRM alerts you want enabled.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          <PreferenceRow
            label="Follow-up reminders"
            description="Show reminders for pending and overdue follow-ups."
            checked={
              preferences.followUpReminders
            }
            onChange={(value) =>
              updatePreference(
                "followUpReminders",
                value,
              )
            }
          />

          <PreferenceRow
            label="Appointment reminders"
            description="Keep upcoming property visits and meetings visible."
            checked={
              preferences.appointmentReminders
            }
            onChange={(value) =>
              updatePreference(
                "appointmentReminders",
                value,
              )
            }
          />

          <PreferenceRow
            label="New lead alerts"
            description="Highlight newly created opportunities in the workspace."
            checked={
              preferences.newLeadAlerts
            }
            onChange={(value) =>
              updatePreference(
                "newLeadAlerts",
                value,
              )
            }
          />

          <PreferenceRow
            label="AI alerts"
            description="Show AI-generated sales intelligence and recommendations."
            checked={
              preferences.aiAlerts
            }
            onChange={(value) =>
              updatePreference(
                "aiAlerts",
                value,
              )
            }
          />
        </div>

        {preferenceMessage ? (
          <div className="px-5 py-4">
            <SuccessMessage>
              {preferenceMessage}
            </SuccessMessage>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-ink-700">
              <Brain className="size-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ink-900">
                AI preferences
              </h2>

              <p className="mt-1 text-xs leading-5 text-ink-400">
                Control how AI intelligence is presented inside PropFlow.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          <PreferenceRow
            label="AI context enrichment"
            description="Allow AI features to use relevant CRM context such as lead stage and activity history."
            checked={
              preferences.aiAutoContext
            }
            onChange={(value) =>
              updatePreference(
                "aiAutoContext",
                value,
              )
            }
          />

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-ink-800">
                Human review before sending
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-400">
                AI-generated messages remain drafts and are never sent
                automatically.
              </p>
            </div>

            <div className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[10px] font-semibold text-green-700">
              Enforced
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">
              More workspace settings
            </h2>

            <p className="mt-1 text-xs leading-5 text-ink-400">
              Team management is available separately.
            </p>
          </div>

          <a
            href="/team"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-xs font-medium text-ink-700 hover:bg-surface-sunken"
          >
            Team
            <ChevronRight className="size-3.5" />
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink-900">
            Change password
          </h2>

          <p className="mt-1 text-xs leading-5 text-ink-400">
            Use a strong password you do not reuse elsewhere.
          </p>
        </div>

        <form
          onSubmit={
            handlePasswordChange
          }
          className="p-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <PasswordField
              label="New password"
              value={
                newPassword
              }
              onChange={
                setNewPassword
              }
              placeholder="At least 8 characters"
            />

            <PasswordField
              label="Confirm password"
              value={
                confirmPassword
              }
              onChange={
                setConfirmPassword
              }
              placeholder="Repeat your new password"
            />
          </div>

          {passwordError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              {
                passwordError
              }
            </div>
          ) : null}

          {passwordMessage ? (
            <div className="mt-4">
              <SuccessMessage>
                {passwordMessage}
              </SuccessMessage>
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={
                changingPassword
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {changingPassword ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <KeyRound className="size-4" />
              )}

              {changingPassword
                ? "Updating..."
                : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ReadOnlyInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <div className="flex h-10 items-center rounded-lg border border-border bg-surface-sunken px-3 text-sm text-ink-600">
        {value}
      </div>
    </div>
  );
}

function SecurityRow({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] text-ink-400">
          {title}
        </p>

        <p className="truncate text-xs font-medium text-ink-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-800">
          {label}
        </p>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={
          checked
        }
        onClick={() =>
          onChange(
            !checked,
          )
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked
            ? "bg-ink-900"
            : "bg-ink-200"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition ${
            checked
              ? "left-[22px]"
              : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <input
        type="password"
        value={value}
        onChange={(event) =>
          onChange(
            event.target
              .value,
          )
        }
        placeholder={
          placeholder
        }
        autoComplete="new-password"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2"
      />
    </div>
  );
}

function SuccessMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700">
      <div className="flex items-center gap-2">
        <Check className="size-3.5" />

        <span>
          {children}
        </span>
      </div>
    </div>
  );
}