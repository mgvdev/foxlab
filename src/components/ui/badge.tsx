import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-zinc-700 bg-zinc-900 text-zinc-200",
        secondary: "border-zinc-700 bg-zinc-900/60 text-zinc-300",
        destructive: "border-red-700/60 bg-red-900/30 text-red-200",
        outline: "border-zinc-700 text-zinc-200",
        success: "border-emerald-700/60 bg-emerald-900/30 text-emerald-200",
        warning: "border-amber-700/60 bg-amber-900/30 text-amber-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
