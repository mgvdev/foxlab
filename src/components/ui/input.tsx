import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors [border-color:var(--ui-input-border)] [background:var(--ui-input-bg)] [color:var(--ui-input-fg)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:[color:var(--ui-input-placeholder)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
