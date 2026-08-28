import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Columns3,
  Building2,
  Clock,
  CalendarDays,
  Sparkles,
  BarChart3,
  UsersRound,
  Settings,
  CircleHelp,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Short line shown on the placeholder page for modules not yet built. */
  moduleDescription: string;
}

export const primaryNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    moduleDescription:
      "A daily snapshot of pipeline health, hot leads, and AI-surfaced priorities.",
  },
  {
    label: "Leads",
    href: "/leads",
    icon: Users,
    moduleDescription:
      "Capture, qualify, and route leads to the right agent.",
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: Columns3,
    moduleDescription:
      "A Kanban view of every deal in motion, from new lead to closed won.",
  },
  {
    label: "Properties",
    href: "/properties",
    icon: Building2,
    moduleDescription: "The active listing inventory available to match against leads.",
  },
  {
    label: "Follow-ups",
    href: "/follow-ups",
    icon: Clock,
    moduleDescription: "Every commitment to a lead, sorted by overdue, today, and upcoming.",
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: CalendarDays,
    moduleDescription: "Viewings, consultations, and negotiations on the calendar.",
  },
  {
    label: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles,
    moduleDescription: "Ask questions about your pipeline in plain language.",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    moduleDescription: "Lead, sales, team, and property performance in one place.",
  },
];

export const secondaryNav: NavItem[] = [
  {
    label: "Team",
    href: "/team",
    icon: UsersRound,
    moduleDescription: "Manage agents, managers, and admin access for your organization.",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    moduleDescription: "Organization details, currency, timezone, and preferences.",
  },
  {
    label: "Help",
    href: "/help",
    icon: CircleHelp,
    moduleDescription: "Guides and support for getting the most out of PropFlow.",
  },
];

export const allNav = [...primaryNav, ...secondaryNav];
