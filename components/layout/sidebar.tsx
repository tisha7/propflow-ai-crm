"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav, secondaryNav } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-ink-700 hover:bg-surface-sunken hover:text-ink-900"
      )}
    >
      <span
        className={cn(
          "absolute left-[-13px] top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-brand-500 transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
      <Icon
        className={cn(
          "size-[17px] shrink-0",
          active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[var(--header-height)] shrink-0 items-center gap-2 px-5">
        <div className="flex size-7 items-center justify-center rounded-[7px] bg-ink-900 font-mono text-[13px] font-semibold text-white">
          P
        </div>
        <span className="text-[14.5px] font-semibold tracking-tight text-ink-900">
          PropFlow
        </span>
      </div>

      <div className="mx-4 mb-3 rounded-[var(--radius-control)] border border-border bg-surface-sunken px-3 py-2">
        <p className="truncate text-[12.5px] font-medium text-ink-800">
          PrimeNest Realty
        </p>
        <p className="text-[11px] text-ink-400">Demo workspace</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 pl-[17px]">
        {primaryNav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.icon}
            active={pathname.startsWith(item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-0.5 border-t border-border px-4 pl-[17px] py-3">
        {secondaryNav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.icon}
            active={pathname.startsWith(item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside
      className="hidden shrink-0 border-r border-border bg-surface lg:block"
      style={{ width: "var(--sidebar-width)" }}
    >
      <SidebarContent />
    </aside>
  );
}
