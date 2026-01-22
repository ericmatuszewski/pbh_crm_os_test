"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * AccessibleText
 *
 * Typography components with accessibility-focused sizing:
 * - Minimum 16px base size (no text smaller than this)
 * - High contrast colors (slate-800 on white = 12.6:1 ratio)
 * - Generous line heights for readability
 * - Clear visual hierarchy
 */

const accessibleTextVariants = cva(
  "text-slate-800 leading-relaxed", // High contrast + good line height
  {
    variants: {
      size: {
        // Base - minimum readable size (16px)
        base: "text-base", // 16px
        // Large - comfortable reading size (18px)
        lg: "text-lg", // 18px
        // Extra large - very easy to read (20px)
        xl: "text-xl", // 20px
        // 2XL - for important information (24px)
        "2xl": "text-2xl", // 24px
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
      },
      color: {
        default: "text-slate-800",
        muted: "text-slate-600",
        primary: "text-blue-700",
        success: "text-emerald-700",
        warning: "text-amber-700",
        danger: "text-red-700",
      },
    },
    defaultVariants: {
      size: "base",
      weight: "normal",
      color: "default",
    },
  }
);

export interface AccessibleTextProps
  extends Omit<React.HTMLAttributes<HTMLParagraphElement>, "color">,
    VariantProps<typeof accessibleTextVariants> {
  as?: "p" | "span" | "div";
}

const AccessibleText = React.forwardRef<HTMLParagraphElement, AccessibleTextProps>(
  ({ className, size, weight, color, as: Component = "p", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(accessibleTextVariants({ size, weight, color, className }))}
        {...props}
      />
    );
  }
);

AccessibleText.displayName = "AccessibleText";

/**
 * AccessibleHeading
 *
 * Heading component with clear visual hierarchy:
 * - Large sizes for clear differentiation
 * - Bold weights for emphasis
 * - Proper semantic HTML (h1-h6)
 */

const accessibleHeadingVariants = cva("text-slate-900 font-bold tracking-tight", {
  variants: {
    level: {
      1: "text-4xl md:text-5xl leading-tight", // Page titles
      2: "text-3xl md:text-4xl leading-tight", // Section titles
      3: "text-2xl md:text-3xl leading-snug", // Subsections
      4: "text-xl md:text-2xl leading-snug", // Card titles
      5: "text-lg md:text-xl leading-normal", // Small headings
      6: "text-base md:text-lg leading-normal font-semibold", // Labels
    },
  },
  defaultVariants: {
    level: 2,
  },
});

export interface AccessibleHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof accessibleHeadingVariants> {
  /** Visual level (affects size) */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Semantic level (h1-h6), defaults to matching visual level */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

const AccessibleHeading = React.forwardRef<
  HTMLHeadingElement,
  AccessibleHeadingProps
>(({ className, level = 2, as, ...props }, ref) => {
  const Component = as || (`h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6");

  return (
    <Component
      ref={ref}
      className={cn(accessibleHeadingVariants({ level, className }))}
      {...props}
    />
  );
});

AccessibleHeading.displayName = "AccessibleHeading";

/**
 * AccessibleLabel
 *
 * Form label with clear association to inputs:
 * - Generous size for readability
 * - Required indicator option
 * - Help text support
 */

const accessibleLabelVariants = cva(
  "block text-slate-800 font-medium leading-normal",
  {
    variants: {
      size: {
        default: "text-base mb-2", // 16px
        lg: "text-lg mb-2", // 18px
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface AccessibleLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof accessibleLabelVariants> {
  /** Show required asterisk */
  required?: boolean;
  /** Help text shown below label */
  helpText?: string;
  /** ID of the help text element (for aria-describedby) */
  helpTextId?: string;
}

const AccessibleLabel = React.forwardRef<HTMLLabelElement, AccessibleLabelProps>(
  (
    { className, size, required, helpText, helpTextId, children, ...props },
    ref
  ) => {
    return (
      <div className="space-y-1">
        <label
          ref={ref}
          className={cn(accessibleLabelVariants({ size, className }))}
          {...props}
        >
          {children}
          {required && (
            <span className="text-red-600 ml-1" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">(required)</span>}
        </label>
        {helpText && (
          <p
            id={helpTextId}
            className="text-sm text-slate-600 leading-relaxed"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

AccessibleLabel.displayName = "AccessibleLabel";

export {
  AccessibleText,
  accessibleTextVariants,
  AccessibleHeading,
  accessibleHeadingVariants,
  AccessibleLabel,
  accessibleLabelVariants,
};
