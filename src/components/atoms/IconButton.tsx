import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ComponentProps<typeof Button> {
  label: string;
}

export function IconButton({ label, className, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      className={cn("h-8 w-8 rounded-md", className)}
      size="icon"
      variant="secondary"
      {...props}
    />
  );
}
