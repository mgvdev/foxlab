import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface SecondaryWindowTemplateProps extends PropsWithChildren {
  className?: string;
}

export function SecondaryWindowTemplate({ children, className }: SecondaryWindowTemplateProps) {
  return (
    <main className="window-shell">
      <section className={cn("window-card", className)}>{children}</section>
    </main>
  );
}
