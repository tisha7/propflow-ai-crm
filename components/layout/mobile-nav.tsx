"use client";

import { X } from "lucide-react";
import { SidebarContent } from "@/components/layout/sidebar";

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div
        className="absolute inset-0 bg-ink-900/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative flex h-full w-[280px] flex-col bg-surface shadow-[var(--shadow-popover)]"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-[var(--radius-control)] text-ink-500 hover:bg-surface-sunken"
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
