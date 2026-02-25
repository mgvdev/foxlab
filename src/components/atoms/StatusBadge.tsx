import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "default" | "success" | "warning" | "danger";
  children: string;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variant =
    status === "success"
      ? "success"
      : status === "warning"
        ? "warning"
        : status === "danger"
          ? "destructive"
          : "secondary";

  return <Badge variant={variant}>{children}</Badge>;
}
