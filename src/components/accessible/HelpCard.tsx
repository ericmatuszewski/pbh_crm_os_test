"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ChevronDown, HelpCircle, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

/**
 * HelpCard
 *
 * An accessible expandable help card for inline guidance:
 * - Large touch target for expand/collapse
 * - Clear visual hierarchy with icons
 * - High contrast text
 * - Keyboard accessible
 * - Persists expanded state for user preference
 */

const helpCardVariants = cva(
  [
    "rounded-xl border-2 overflow-hidden",
    "transition-all duration-200",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-slate-50 border-slate-200",
        info: "bg-blue-50 border-blue-200",
        success: "bg-emerald-50 border-emerald-200",
        warning: "bg-amber-50 border-amber-200",
        danger: "bg-red-50 border-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const helpCardIconVariants = cva("shrink-0", {
  variants: {
    variant: {
      default: "text-slate-600",
      info: "text-blue-600",
      success: "text-emerald-600",
      warning: "text-amber-600",
      danger: "text-red-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const helpCardTitleVariants = cva("font-semibold text-lg", {
  variants: {
    variant: {
      default: "text-slate-800",
      info: "text-blue-800",
      success: "text-emerald-800",
      warning: "text-amber-800",
      danger: "text-red-800",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface HelpCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof helpCardVariants> {
  /** Card title */
  title: string;
  /** Whether the card is expandable */
  expandable?: boolean;
  /** Whether the card starts expanded (for expandable cards) */
  defaultExpanded?: boolean;
  /** Custom icon - if not provided, uses variant default */
  icon?: React.ReactNode;
  /** ID for aria-controls */
  contentId?: string;
}

const variantIcons = {
  default: HelpCircle,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: XCircle,
};

const HelpCard = React.forwardRef<HTMLDivElement, HelpCardProps>(
  (
    {
      className,
      variant = "default",
      title,
      expandable = true,
      defaultExpanded = false,
      icon,
      contentId,
      children,
      ...props
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
    const generatedId = React.useId();
    const panelId = contentId || `help-panel-${generatedId}`;

    const IconComponent = variantIcons[variant || "default"];
    const displayIcon = icon || <IconComponent className="h-6 w-6" />;

    if (!expandable) {
      return (
        <div
          ref={ref}
          className={cn(helpCardVariants({ variant }), className)}
          {...props}
        >
          <div className="p-5">
            <div className="flex items-start gap-4">
              <span className={cn(helpCardIconVariants({ variant }))}>
                {displayIcon}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className={cn(helpCardTitleVariants({ variant }))}>
                  {title}
                </h3>
                <div className="mt-3 text-base text-slate-700 leading-relaxed">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(helpCardVariants({ variant }), className)}
        {...props}
      >
        <button
          type="button"
          className={cn(
            "w-full p-5 text-left",
            "flex items-center gap-4",
            "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
            "focus-visible:ring-blue-500",
            "hover:bg-black/5 transition-colors",
            // Minimum touch target
            "min-h-[56px]"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
        >
          <span className={cn(helpCardIconVariants({ variant }))}>
            {displayIcon}
          </span>
          <span className={cn(helpCardTitleVariants({ variant }), "flex-1")}>
            {title}
          </span>
          <ChevronDown
            className={cn(
              "h-6 w-6 text-slate-500 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-button`}
          className={cn(
            "overflow-hidden transition-all duration-200",
            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-5 pb-5 pt-0">
            <div className="pl-10 text-base text-slate-700 leading-relaxed">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

HelpCard.displayName = "HelpCard";

/**
 * HelpCardGroup
 *
 * Groups multiple HelpCards together with proper spacing.
 */

interface HelpCardGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Title for the group */
  title?: string;
}

const HelpCardGroup: React.FC<HelpCardGroupProps> = ({
  title,
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {title && (
        <h2 className="text-xl font-bold text-slate-900 mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
};

/**
 * QuickTip
 *
 * A smaller, inline tip for quick guidance.
 */

interface QuickTipProps {
  children: React.ReactNode;
  variant?: "default" | "info" | "success" | "warning";
  className?: string;
}

const QuickTip: React.FC<QuickTipProps> = ({
  children,
  variant = "info",
  className,
}) => {
  const bgColors = {
    default: "bg-slate-100",
    info: "bg-blue-100",
    success: "bg-emerald-100",
    warning: "bg-amber-100",
  };

  const textColors = {
    default: "text-slate-700",
    info: "text-blue-700",
    success: "text-emerald-700",
    warning: "text-amber-700",
  };

  const iconColors = {
    default: "text-slate-500",
    info: "text-blue-500",
    success: "text-emerald-500",
    warning: "text-amber-500",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg",
        bgColors[variant],
        className
      )}
      role="note"
    >
      <Info className={cn("h-5 w-5 shrink-0 mt-0.5", iconColors[variant])} aria-hidden="true" />
      <p className={cn("text-base leading-relaxed", textColors[variant])}>
        {children}
      </p>
    </div>
  );
};

export { HelpCard, HelpCardGroup, QuickTip };
