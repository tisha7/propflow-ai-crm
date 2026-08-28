import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-5 w-fit",
  {
    variants: {
      variant: {
        neutral: "bg-surface-sunken text-ink-700 border border-border",
        brand: "bg-brand-50 text-brand-700",
        success: "bg-success-50 text-success-500",
        warning: "bg-warning-50 text-warning-500",
        error: "bg-error-50 text-error-500",
        info: "bg-info-50 text-info-500",
        signal: "bg-signal-50 text-signal-600",
        hot: "bg-error-50 text-priority-hot",
        warm: "bg-warning-50 text-priority-warm",
        cold: "bg-info-50 text-priority-cold",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className="size-1.5 rounded-full bg-current opacity-70"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
