"use client";

import { Menu, Plus, Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header
      className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/75 lg:px-6"
      style={{ height: "var(--header-height)" }}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex size-8 items-center justify-center rounded-[var(--radius-control)] text-ink-600 hover:bg-surface-sunken lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-[18px]" />
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-[15px] -translate-y-1/2 text-ink-400" />
        <Input
          placeholder="Search leads, properties, deals…"
          className="h-8 pl-8 text-[12.5px]"
          aria-label="Global search"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <Button size="sm" className="hidden sm:inline-flex">
          <Plus className="size-[15px]" />
          Quick add
        </Button>

        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-[var(--radius-control)] text-ink-600 hover:bg-surface-sunken"
          aria-label="Notifications"
        >
          <Bell className="size-[17px]" />
        </button>

        <div className="ml-1 flex items-center gap-2 rounded-[var(--radius-control)] py-1 pl-1 pr-2 hover:bg-surface-sunken">
          <Avatar name="Sarah Mitchell" size="sm" />
          <div className="hidden leading-tight md:block">
            <p className="text-[12.5px] font-medium text-ink-900">Sarah Mitchell</p>
            <p className="text-[11px] text-ink-400">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
