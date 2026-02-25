import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface MenubarTemplateProps extends PropsWithChildren {
  className?: string;
}

export function MenubarTemplate({ children, className }: MenubarTemplateProps) {
  return <main className={cn("menubar-root", className)}>{children}</main>;
}
