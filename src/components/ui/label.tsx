import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva("text-xs font-medium leading-none [color:var(--ui-muted-fg)]");

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>) {
  return <LabelPrimitive.Root className={cn(labelVariants(), className)} {...props} />;
}

export { Label };
