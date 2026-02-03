"use client";

import { cn } from "@/lib/utils";
import { Star, Sparkles, Flame, Snowflake } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeadScoreProgressProps {
  score: number;
  qualifiedThreshold?: number;
  customerThreshold?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
}

function getScoreCategory(
  score: number,
  qualifiedThreshold = 50,
  customerThreshold = 100
): {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  if (score >= customerThreshold) {
    return {
      label: "Hot Lead",
      color: "text-orange-600",
      bgColor: "bg-orange-500",
      icon: Flame,
    };
  }
  if (score >= qualifiedThreshold) {
    return {
      label: "Qualified",
      color: "text-green-600",
      bgColor: "bg-green-500",
      icon: Sparkles,
    };
  }
  if (score >= qualifiedThreshold / 2) {
    return {
      label: "Engaged",
      color: "text-yellow-600",
      bgColor: "bg-yellow-500",
      icon: Star,
    };
  }
  return {
    label: "Cold",
    color: "text-slate-500",
    bgColor: "bg-slate-400",
    icon: Snowflake,
  };
}

export function LeadScoreProgress({
  score,
  qualifiedThreshold = 50,
  customerThreshold = 100,
  size = "md",
  showLabel = true,
  showIcon = true,
  className,
}: LeadScoreProgressProps) {
  const maxScore = customerThreshold * 1.2; // Allow some overflow visualization
  const percentage = Math.min((score / maxScore) * 100, 100);
  const qualifiedPercent = (qualifiedThreshold / maxScore) * 100;
  const customerPercent = (customerThreshold / maxScore) * 100;

  const category = getScoreCategory(score, qualifiedThreshold, customerThreshold);
  const Icon = category.icon;

  const sizeClasses = {
    sm: {
      height: "h-2",
      text: "text-xs",
      icon: "h-3 w-3",
      wrapper: "gap-1.5",
    },
    md: {
      height: "h-3",
      text: "text-sm",
      icon: "h-4 w-4",
      wrapper: "gap-2",
    },
    lg: {
      height: "h-4",
      text: "text-base",
      icon: "h-5 w-5",
      wrapper: "gap-2.5",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <TooltipProvider>
      <div className={cn("w-full", className)}>
        {(showLabel || showIcon) && (
          <div className={cn("flex items-center justify-between mb-1", sizes.wrapper)}>
            <div className="flex items-center gap-1.5">
              {showIcon && <Icon className={cn(sizes.icon, category.color)} />}
              {showLabel && (
                <span className={cn(sizes.text, "font-medium", category.color)}>
                  {category.label}
                </span>
              )}
            </div>
            <span className={cn(sizes.text, "font-semibold tabular-nums")}>
              {score} pts
            </span>
          </div>
        )}

        <div className={cn("relative bg-slate-200 rounded-full overflow-hidden", sizes.height)}>
          {/* Threshold markers */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-green-600/50 z-10"
                style={{ left: `${qualifiedPercent}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Qualified threshold: {qualifiedThreshold} pts</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-orange-600/50 z-10"
                style={{ left: `${customerPercent}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Hot threshold: {customerThreshold} pts</p>
            </TooltipContent>
          </Tooltip>

          {/* Progress bar */}
          <div
            className={cn(
              "absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500",
              category.bgColor
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Scale labels */}
        {size !== "sm" && (
          <div className="flex justify-between mt-1 text-[10px] text-slate-400">
            <span>0</span>
            <span>{qualifiedThreshold}</span>
            <span>{customerThreshold}</span>
            <span>{Math.round(maxScore)}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default LeadScoreProgress;
