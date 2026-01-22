"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeadScoreBadgeProps {
  score: number;
  previousScore?: number;
  qualifiedThreshold?: number;
  customerThreshold?: number;
  showTrend?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getScoreColor(score: number, qualifiedThreshold = 50, customerThreshold = 100): string {
  if (score >= customerThreshold) {
    return "bg-green-100 text-green-800 border-green-200";
  }
  if (score >= qualifiedThreshold) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (score >= qualifiedThreshold / 2) {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function getScoreLabel(score: number, qualifiedThreshold = 50, customerThreshold = 100): string {
  if (score >= customerThreshold) {
    return "Hot";
  }
  if (score >= qualifiedThreshold) {
    return "Warm";
  }
  if (score >= qualifiedThreshold / 2) {
    return "Engaged";
  }
  return "Cold";
}

export function LeadScoreBadge({
  score,
  previousScore,
  qualifiedThreshold = 50,
  customerThreshold = 100,
  showTrend = true,
  size = "md",
  className,
}: LeadScoreBadgeProps) {
  const scoreDiff = previousScore !== undefined ? score - previousScore : 0;
  const colorClasses = getScoreColor(score, qualifiedThreshold, customerThreshold);
  const label = getScoreLabel(score, qualifiedThreshold, customerThreshold);

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-sm px-2 py-1 gap-1.5",
    lg: "text-base px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center rounded-full border font-medium",
              colorClasses,
              sizeClasses[size],
              className
            )}
          >
            <span>{score}</span>
            {showTrend && scoreDiff !== 0 && (
              <>
                {scoreDiff > 0 ? (
                  <TrendingUp className={cn(iconSizes[size], "text-green-600")} />
                ) : (
                  <TrendingDown className={cn(iconSizes[size], "text-red-600")} />
                )}
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{label} Lead</p>
            <p className="text-xs text-muted-foreground">Score: {score} points</p>
            {scoreDiff !== 0 && (
              <p className={cn("text-xs", scoreDiff > 0 ? "text-green-600" : "text-red-600")}>
                {scoreDiff > 0 ? "+" : ""}{scoreDiff} from previous
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default LeadScoreBadge;
