import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button as BaseButton } from "@/components/ui/button";
import { Card as BaseCard, CardContent } from "@/components/ui/card";
import { Popover as BasePopover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton as BaseSkeleton } from "@/components/ui/skeleton";
import {
  Tooltip as BaseTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "default";

interface ButtonProps extends Omit<React.ComponentProps<typeof BaseButton>, "variant"> {
  isDisabled?: boolean;
  onPress?: () => void;
  variant?: ButtonVariant;
}

function mapButtonVariant(variant?: ButtonVariant): React.ComponentProps<typeof BaseButton>["variant"] {
  if (variant === "secondary") {
    return "secondary";
  }

  return "default";
}

function Button({ isDisabled, onPress, onClick, variant, ...props }: ButtonProps) {
  return (
    <BaseButton
      disabled={isDisabled ?? props.disabled}
      onClick={(event) => {
        onClick?.(event);
        onPress?.();
      }}
      variant={mapButtonVariant(variant)}
      {...props}
    />
  );
}

function ButtonGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

const Card = Object.assign(
  function CardRoot(props: React.ComponentProps<typeof BaseCard>) {
    return <BaseCard {...props} />;
  },
  {
    Content: function Content(props: React.ComponentProps<typeof CardContent>) {
      return <CardContent {...props} />;
    },
  },
);

interface ChipProps extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  color?: "default" | "accent" | "success" | "warning";
  variant?: "solid" | "soft";
  size?: "sm" | "md";
}

function mapChipVariant(color?: ChipProps["color"]): React.ComponentProps<typeof Badge>["variant"] {
  if (color === "success") {
    return "success";
  }

  if (color === "warning") {
    return "warning";
  }

  if (color === "accent") {
    return "default";
  }

  return "secondary";
}

function Chip({ className, color, variant: _variant, size: _size, children, ...props }: ChipProps) {
  return (
    <Badge className={cn("px-2 py-0.5", className)} variant={mapChipVariant(color)} {...props}>
      {children}
    </Badge>
  );
}

const Popover = Object.assign(
  function PopoverRoot(props: React.ComponentProps<typeof BasePopover>) {
    return <BasePopover {...props} />;
  },
  {
    Trigger: function Trigger({ children, ...props }: React.ComponentProps<typeof PopoverTrigger>) {
      return (
        <PopoverTrigger asChild {...props}>
          {children}
        </PopoverTrigger>
      );
    },
    Content: function Content(props: React.ComponentProps<typeof PopoverContent>) {
      return <PopoverContent {...props} />;
    },
    Dialog: function Dialog(props: React.ComponentProps<"div">) {
      return <div {...props} />;
    },
    Heading: function Heading({ className, ...props }: React.ComponentProps<"h4">) {
      return <h4 className={cn("text-sm font-semibold", className)} {...props} />;
    },
  },
);

const Tooltip = Object.assign(
  function TooltipRoot({ delay = 100, children }: { delay?: number; children: React.ReactNode }) {
    return (
      <TooltipProvider delayDuration={delay}>
        <BaseTooltip>{children}</BaseTooltip>
      </TooltipProvider>
    );
  },
  {
    Trigger: function Trigger({ children, ...props }: React.ComponentProps<typeof TooltipTrigger>) {
      return (
        <TooltipTrigger asChild {...props}>
          {children}
        </TooltipTrigger>
      );
    },
    Content: function Content({ showArrow, ...props }: React.ComponentProps<typeof TooltipContent> & { showArrow?: boolean }) {
      return <TooltipContent {...props} />;
    },
    Arrow: function Arrow() {
      return null;
    },
  },
);

function Skeleton(props: React.ComponentProps<typeof BaseSkeleton>) {
  return <BaseSkeleton {...props} />;
}

export {
  Button,
  ButtonGroup,
  Card,
  Chip,
  Popover,
  Skeleton,
  Tooltip,
};
