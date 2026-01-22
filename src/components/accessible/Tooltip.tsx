"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

/**
 * Accessible Tooltip
 *
 * A fully accessible tooltip that:
 * - Shows on hover AND focus (keyboard accessible)
 * - Has appropriate ARIA attributes
 * - Uses high contrast colors
 * - Has larger text than typical tooltips (14px minimum)
 * - Supports longer content with max-width
 * - Persists long enough for slow readers
 */

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // Base styles
      "z-50 overflow-hidden rounded-lg px-4 py-3",
      // Colors - high contrast
      "bg-slate-900 text-white",
      // Typography - larger than typical tooltips
      "text-sm leading-relaxed max-w-xs",
      // Shadow for depth
      "shadow-lg",
      // Animation
      "animate-in fade-in-0 zoom-in-95",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-2",
      "data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2",
      "data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * HelpTooltip
 *
 * A pre-built tooltip with help icon, commonly used for form fields.
 * Click or focus the icon to see helpful information.
 */

interface HelpTooltipProps {
  content: React.ReactNode;
  /** Delay before showing (ms) - longer for accessibility */
  delayDuration?: number;
  /** Side to show tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Size of help icon */
  iconSize?: "sm" | "default" | "lg";
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  delayDuration = 300,
  side = "top",
  iconSize = "default",
}) => {
  const iconSizes = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "text-slate-500 hover:text-slate-700",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "transition-colors duration-200",
              // Ensure minimum touch target
              "min-h-[44px] min-w-[44px]"
            )}
            aria-label="Help information"
          >
            <HelpCircle className={iconSizes[iconSize]} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * InfoTooltip
 *
 * A tooltip that wraps any content and shows info on hover/focus.
 * Useful for adding context to any element.
 */

interface InfoTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  /** Delay before showing (ms) */
  delayDuration?: number;
  /** Side to show tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Whether the trigger should be inline */
  inline?: boolean;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  children,
  content,
  delayDuration = 300,
  side = "top",
  inline = false,
}) => {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "cursor-help underline decoration-dotted decoration-slate-400 underline-offset-4",
              inline ? "inline" : "inline-block"
            )}
            tabIndex={0}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  HelpTooltip,
  InfoTooltip,
};
