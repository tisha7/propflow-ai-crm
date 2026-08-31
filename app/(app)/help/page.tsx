"use client";

import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileText,
  Home,
  Search,
  ShieldCheck,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

type HelpSection = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
};

type FAQ = {
  category: string;
  question: string;
  answer: string;
};

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description:
      "Learn the main areas of PropFlow and how they connect.",
    icon: (
      <BookOpen className="size-5" />
    ),
  },
  {
    id: "leads",
    title: "Leads",
    description:
      "Create, search, qualify, score, and manage prospects.",
    icon: (
      <Users className="size-5" />
    ),
    href: "/leads",
  },
  {
    id: "pipeline",
    title: "Pipeline",
    description:
      "Move opportunities through your sales stages.",
    icon: (
      <Target className="size-5" />
    ),
    href: "/pipeline",
  },
  {
    id: "properties",
    title: "Properties",
    description:
      "Manage inventory, availability, pricing, and matching.",
    icon: (
      <Home className="size-5" />
    ),
    href: "/properties",
  },
  {
    id: "follow-ups",
    title: "Follow-ups",
    description:
      "Track the next sales action and overdue work.",
    icon: (
      <Bell className="size-5" />
    ),
    href: "/follow-ups",
  },
  {
    id: "appointments",
    title: "Appointments",
    description:
      "Schedule and manage meetings and property visits.",
    icon: (
      <CalendarDays className="size-5" />
    ),
    href: "/appointments",
  },
  {
    id: "deals",
    title: "Deals",
    description:
      "Track open, won, and lost opportunities.",
    icon: (
      <FileText className="size-5" />
    ),
    href: "/deals",
  },
  {
    id: "ai",
    title: "AI Assistant",
    description:
      "Use lead scoring, summaries, next actions, and matching.",
    icon: (
      <Brain className="size-5" />
    ),
    href: "/ai-assistant",
  },
  {
    id: "analytics",
    title: "Analytics",
    description:
      "Understand revenue, conversion, sources, and performance.",
    icon: (
      <BarChart3 className="size-5" />
    ),
    href: "/analytics",
  },
  {
    id: "team",
    title: "Team & Roles",
    description:
      "Understand Admin, Manager, and Agent responsibilities.",
    icon: (
      <ShieldCheck className="size-5" />
    ),
    href: "/team",
  },
  {
    id: "account",
    title: "Account & Security",
    description:
      "Manage your profile, password, notifications, and security.",
    icon: (
      <UserRound className="size-5" />
    ),
    href: "/settings",
  },
];

const FAQS: FAQ[] = [
  {
    category: "Getting Started",
    question:
      "What should I do first in PropFlow?",
    answer:
      "Start by creating or importing leads, adding your property inventory, and assigning leads to the appropriate sales workflow. From there, use Pipeline, Follow-ups, Appointments, and Deals to manage the sales process.",
  },
  {
    category: "Leads",
    question:
      "How do I create a lead?",
    answer:
      "Open Leads and select Add lead. Enter the prospect's contact information, source, budget, preferred location, property type, timeline, priority, and notes, then save the lead.",
  },
  {
    category: "Leads",
    question:
      "Where can I see an individual lead?",
    answer:
      "Click the lead name from the Leads page or a search result. This opens the lead detail workspace where the lead's sales information, activities, AI analysis, property matches, and follow-up context can be reviewed.",
  },
  {
    category: "Pipeline",
    question:
      "How does the sales pipeline work?",
    answer:
      "The pipeline represents the lead lifecycle. Leads can progress from New to Contacted, Qualified, Property Matched, Site Visit, Negotiation, Won, or Lost as the sales process develops.",
  },
  {
    category: "Properties",
    question:
      "How do I add a property?",
    answer:
      "Open Properties and choose Add property. You can enter the title, property type, status, price, currency, location, address, room information, area, description, and an optional image.",
  },
  {
    category: "Follow-ups",
    question:
      "How do I know which follow-ups need attention?",
    answer:
      "Open Follow-ups to review scheduled actions. The Dashboard also surfaces pending and overdue follow-ups so the next sales action is easy to identify.",
  },
  {
    category: "Appointments",
    question:
      "What can I use appointments for?",
    answer:
      "Appointments can be used for property viewings, consultations, negotiations, and follow-up meetings. The appointment record can be connected to a lead and property.",
  },
  {
    category: "Deals",
    question:
      "What do open, won, and lost deals mean?",
    answer:
      "Open represents an active opportunity, Won represents a successfully closed opportunity, and Lost represents an opportunity that did not close.",
  },
  {
    category: "AI",
    question:
      "What does AI lead scoring do?",
    answer:
      "AI lead scoring analyzes available CRM context and produces a score and priority signal to help identify stronger opportunities and decide which leads deserve faster attention.",
  },
  {
    category: "AI",
    question:
      "What other AI features are available?",
    answer:
      "The AI workspace supports lead scoring, lead summaries, next-action recommendations, property matching, and message generation. AI-generated messages should remain under human review before being sent.",
  },
  {
    category: "Analytics",
    question:
      "What does Analytics show?",
    answer:
      "Analytics provides CRM performance information such as revenue, pipeline value, win rate, lead funnel, source performance, agent performance, AI activity, follow-up health, appointments, and property inventory.",
  },
  {
    category: "Search",
    question:
      "How does the top search bar work?",
    answer:
      "Type at least two characters in the global search bar. PropFlow searches the available CRM records and groups matching Leads, Properties, Deals, and Appointments.",
  },
  {
    category: "Quick Add",
    question:
      "What is Quick Add?",
    answer:
      "Quick Add provides fast access to the main creation workflows for leads, properties, appointments, and deals.",
  },
  {
    category: "Team",
    question:
      "What are the team roles?",
    answer:
      "PropFlow uses Admin, Manager, and Agent roles. Admins have organization-level access, Managers have team-level responsibilities, and Agents focus on assigned sales work.",
  },
  {
    category: "Account",
    question:
      "Where can I manage my profile and password?",
    answer:
      "Open Settings from the profile menu. You can update your name, manage preferences, change your password, and review account security information.",
  },
];

const CATEGORY_ORDER = [
  "Getting Started",
  "Leads",
  "Pipeline",
  "Properties",
  "Follow-ups",
  "Appointments",
  "Deals",
  "AI",
  "Analytics",
  "Search",
  "Quick Add",
  "Team",
  "Account",
];

export default function HelpPage() {
  const [search, setSearch] =
    useState("");

  const [openFAQ, setOpenFAQ] =
    useState<number | null>(
      null,
    );

  const [activeCategory, setActiveCategory] =
    useState("All");

  const filteredFAQs =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return FAQS.filter(
        (faq) => {
          const categoryMatch =
            activeCategory ===
              "All" ||
            faq.category ===
              activeCategory;

          const searchMatch =
            !query ||
            faq.question
              .toLowerCase()
              .includes(
                query,
              ) ||
            faq.answer
              .toLowerCase()
              .includes(
                query,
              ) ||
            faq.category
              .toLowerCase()
              .includes(
                query,
              );

          return (
            categoryMatch &&
            searchMatch
          );
        },
      );
    }, [
      activeCategory,
      search,
    ]);

  const categoryCounts =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      for (
        const faq of FAQS
      ) {
        counts.set(
          faq.category,
          (counts.get(
            faq.category,
          ) ?? 0) + 1,
        );
      }

      return counts;
    }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div className="absolute -right-24 -top-24 size-64 rounded-full bg-surface-sunken" />

          <div className="relative max-w-3xl">
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface-sunken text-ink-700">
              <CircleHelp className="size-5" />
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink-900">
              How can we help?
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-400">
              Find answers about leads, pipeline, properties, AI, analytics,
              team management, and the rest of your PropFlow workspace.
            </p>

            <div className="relative mt-6 max-w-2xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

              <input
                value={
                  search
                }
                onChange={(
                  event,
                ) => {
                  setSearch(
                    event.target
                      .value,
                  );
                  setOpenFAQ(
                    null,
                  );
                }}
                placeholder="Search help articles..."
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2"
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink-900">
            Explore PropFlow
          </h2>

          <p className="mt-1 text-xs text-ink-400">
            Jump directly to the area you need.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {HELP_SECTIONS.map(
            (section) => {
              const content = (
                <div className="group flex h-full items-start gap-3 rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-sunken">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-ink-600">
                    {
                      section.icon
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink-900">
                        {
                          section.title
                        }
                      </h3>

                      <ArrowRight className="size-3.5 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-600" />
                    </div>

                    <p className="mt-1 text-xs leading-5 text-ink-400">
                      {
                        section.description
                      }
                    </p>
                  </div>
                </div>
              );

              if (
                section.href
              ) {
                return (
                  <Link
                    key={
                      section.id
                    }
                    href={
                      section.href
                    }
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={
                    section.id
                  }
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(
                        "faq",
                      )
                      ?.scrollIntoView(
                        {
                          behavior:
                            "smooth",
                        },
                      );

                    setActiveCategory(
                      section.title,
                    );
                  }}
                  className="text-left"
                >
                  {content}
                </button>
              );
            },
          )}
        </div>
      </section>

      <section
        id="faq"
        className="rounded-xl border border-border bg-surface"
      >
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">
                Frequently asked questions
              </h2>

              <p className="mt-1 text-xs text-ink-400">
                {filteredFAQs.length}{" "}
                {filteredFAQs.length ===
                1
                  ? "answer"
                  : "answers"}{" "}
                available
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <CategoryButton
                active={
                  activeCategory ===
                  "All"
                }
                label="All"
                onClick={() =>
                  setActiveCategory(
                    "All",
                  )
                }
              />

              {CATEGORY_ORDER.map(
                (
                  category,
                ) => {
                  if (
                    !categoryCounts.has(
                      category,
                    )
                  ) {
                    return null;
                  }

                  return (
                    <CategoryButton
                      key={
                        category
                      }
                      active={
                        activeCategory ===
                        category
                      }
                      label={
                        category
                      }
                      count={
                        categoryCounts.get(
                          category,
                        )
                      }
                      onClick={() =>
                        setActiveCategory(
                          category,
                        )
                      }
                    />
                  );
                },
              )}
            </div>
          </div>
        </div>

        {filteredFAQs.length ===
        0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <Search className="size-7 text-ink-300" />

            <p className="mt-3 text-sm font-medium text-ink-900">
              No help articles found
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-ink-400">
              Try another search term or clear the category filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveCategory(
                  "All",
                );
              }}
              className="mt-4 rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink-700 hover:bg-surface-sunken"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredFAQs.map(
              (
                faq,
                index,
              ) => {
                const isOpen =
                  openFAQ ===
                  index;

                return (
                  <div
                    key={`${faq.category}-${faq.question}`}
                    className="px-5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFAQ(
                          isOpen
                            ? null
                            : index,
                        )
                      }
                      className="flex w-full items-center justify-between gap-4 py-4 text-left"
                      aria-expanded={
                        isOpen
                      }
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                          {
                            faq.category
                          }
                        </span>

                        <p className="mt-1 text-sm font-medium text-ink-900">
                          {
                            faq.question
                          }
                        </p>
                      </div>

                      <ChevronDown
                        className={`size-4 shrink-0 text-ink-400 transition ${
                          isOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>

                    {isOpen ? (
                      <div className="pb-5 pr-8">
                        <p className="text-xs leading-6 text-ink-500">
                          {
                            faq.answer
                          }
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <HelpTip
          icon={
            <Search className="size-4" />
          }
          title="Use global search"
          description="Search CRM records from the topbar without opening each module first."
        />

        <HelpTip
          icon={
            <Brain className="size-4" />
          }
          title="Let AI prioritize"
          description="Use AI scoring and next actions to decide which leads deserve attention first."
        />

        <HelpTip
          icon={
            <BarChart3 className="size-4" />
          }
          title="Use Analytics"
          description="Check revenue, conversion, sources, agent performance, and operations from one place."
        />
      </section>
    </div>
  );
}

function CategoryButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition ${
        active
          ? "border-ink-900 bg-ink-900 text-white"
          : "border-border bg-background text-ink-500 hover:bg-surface-sunken"
      }`}
    >
      {label}

      {count !==
      undefined ? (
        <span
          className={`ml-1 ${
            active
              ? "text-white/70"
              : "text-ink-300"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function HelpTip({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex size-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-600">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-semibold text-ink-900">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-ink-400">
        {description}
      </p>
    </div>
  );
}