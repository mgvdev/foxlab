import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-ring)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ui-accent)] text-[var(--ui-accent-fg)] shadow-sm hover:bg-[var(--ui-accent-hover)]",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-500",
        outline:
          "border [border-color:var(--ui-card-border)] [background:var(--ui-card-bg)] [color:var(--ui-fg)] shadow-sm hover:[background:var(--ui-surface)]",
        secondary:
          "[background:var(--ui-surface)] [color:var(--ui-fg)] hover:[background:var(--ui-surface-hover)]",
        ghost:
          "[color:var(--ui-fg)] hover:[background:var(--ui-surface-hover)]",
        link:
          "[color:var(--ui-muted-fg)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
