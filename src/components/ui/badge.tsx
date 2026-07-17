import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-transparent bg-muted text-muted-foreground",
        primary: "border-transparent bg-primary/15 text-primary",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/20 text-warning-foreground",
        danger: "border-transparent bg-destructive/15 text-destructive",
        info: "border-transparent bg-accent/15 text-accent",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
