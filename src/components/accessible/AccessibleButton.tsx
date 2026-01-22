"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * AccessibleButton
 *
 * An enhanced button component designed for accessibility:
 * - Large touch targets (48px+ for accessible sizes)
 * - High contrast colors meeting WCAG AA 4.5:1 ratio
 * - Prominent focus indicators (3px ring)
 * - Optional loading state with spinner
 * - Clear hover/active states
 */

const accessibleButtonVariants = cva(
  [
    // Base styles
    "inline-flex items-center justify-center gap-2",
    "font-semibold rounded-lg",
    "transition-all duration-200 ease-in-out",
    // Focus - prominent 3px ring for visibility
    "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2",
    "focus-visible:ring-blue-500 focus-visible:ring-offset-white",
    // Disabled state
    "disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none",
    // Active state - slight scale for feedback
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary - high contrast green for positive actions (calls, success)
        primary: [
          "bg-emerald-600 text-white",
          "hover:bg-emerald-700",
          "shadow-sm hover:shadow-md",
          "border-2 border-emerald-700",
        ].join(" "),

        // Secondary - outlined style for secondary actions
        secondary: [
          "bg-white text-slate-800",
          "hover:bg-slate-100",
          "border-2 border-slate-300",
          "hover:border-slate-400",
        ].join(" "),

        // Danger - high contrast red for destructive actions
        danger: [
          "bg-red-600 text-white",
          "hover:bg-red-700",
          "shadow-sm hover:shadow-md",
          "border-2 border-red-700",
        ].join(" "),

        // Warning - amber for caution actions
        warning: [
          "bg-amber-500 text-slate-900",
          "hover:bg-amber-600",
          "shadow-sm hover:shadow-md",
          "border-2 border-amber-600",
        ].join(" "),

        // Ghost - minimal style for less prominent actions
        ghost: [
          "bg-transparent text-slate-700",
          "hover:bg-slate-100",
          "border-2 border-transparent",
          "hover:border-slate-200",
        ].join(" "),

        // Call action - prominent blue for phone-related actions
        call: [
          "bg-blue-600 text-white",
          "hover:bg-blue-700",
          "shadow-md hover:shadow-lg",
          "border-2 border-blue-700",
        ].join(" "),
      },

      size: {
        // Standard - default size (still larger than typical)
        default: "h-11 px-5 text-base min-w-[100px]",

        // Small - minimum 44px for touch (iOS guideline)
        sm: "h-11 px-4 text-sm min-w-[80px]",

        // Large - 48px+ for better accessibility
        lg: "h-12 px-6 text-lg min-w-[120px]",

        // Extra large - maximum accessibility, great for primary actions
        xl: "h-14 px-8 text-xl min-w-[140px]",

        // Accessible - specifically designed for older users (56px)
        accessible: "h-14 px-8 text-lg min-w-[160px] tracking-wide",

        // Icon only - square with good touch target
        icon: "h-12 w-12 p-0",

        // Icon large - even bigger icon button
        "icon-lg": "h-14 w-14 p-0",
      },

      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      fullWidth: false,
    },
  }
);

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof accessibleButtonVariants> {
  /** Render as a different element (for links styled as buttons) */
  asChild?: boolean;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Loading text to announce to screen readers */
  loadingText?: string;
  /** Icon to display before text */
  leftIcon?: React.ReactNode;
  /** Icon to display after text */
  rightIcon?: React.ReactNode;
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      loadingText = "Loading, please wait...",
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(
          accessibleButtonVariants({ variant, size, fullWidth, className })
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="sr-only">{loadingText}</span>
            <span aria-hidden="true">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="shrink-0" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className="shrink-0" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </Comp>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";

export { AccessibleButton, accessibleButtonVariants };
