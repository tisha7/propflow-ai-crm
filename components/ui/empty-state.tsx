import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * Contextual empty state. Every screen that uses this must supply a title
 * and description specific to what's missing and what to do about it —
 * never a generic "No data found."
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-panel)] border border-dashed border-border-strong bg-surface px-6 py-16 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex size-11 items-center justify-center rounded-full bg-surface-sunken text-ink-500">
          {icon}
        </div>
      )}
      <div className="max-w-sm space-y-1">
        <p className="text-[14px] font-semibold text-ink-900">{title}</p>
        <p className="text-[13px] leading-relaxed text-ink-500">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
