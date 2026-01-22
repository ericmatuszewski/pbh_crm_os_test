"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  X,
  Phone,
  Users,
  Calendar,
  HelpCircle,
  Rocket,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccessibleButton, AccessibleHeading, QuickTip } from "@/components/accessible";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  actionLabel: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "view-help",
    title: "Read the Help Guide",
    description: "Learn how to use the system effectively with our step-by-step guide",
    href: "/help",
    icon: HelpCircle,
    actionLabel: "Open Help Guide",
  },
  {
    id: "view-calls",
    title: "View Your Calls",
    description: "Check out today's scheduled calls and familiarise yourself with the call list",
    href: "/calls",
    icon: Phone,
    actionLabel: "Go to Calls",
  },
  {
    id: "browse-contacts",
    title: "Browse Contacts",
    description: "Search and explore the contact database to see customer information",
    href: "/contacts",
    icon: Users,
    actionLabel: "View Contacts",
  },
  {
    id: "check-calendar",
    title: "Check the Calendar",
    description: "See your scheduled calls and appointments in calendar view",
    href: "/calls/schedule",
    icon: Calendar,
    actionLabel: "Open Calendar",
  },
];

const STORAGE_KEY = "pbh-onboarding-progress";

interface OnboardingProgress {
  completedSteps: string[];
  dismissed: boolean;
  startedAt: string;
}

function getProgress(): OnboardingProgress {
  if (typeof window === "undefined") {
    return { completedSteps: [], dismissed: false, startedAt: new Date().toISOString() };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading onboarding progress:", e);
  }

  return { completedSteps: [], dismissed: false, startedAt: new Date().toISOString() };
}

function saveProgress(progress: OnboardingProgress) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Error saving onboarding progress:", e);
  }
}

export function OnboardingChecklist() {
  const [progress, setProgress] = useState<OnboardingProgress>({
    completedSteps: [],
    dismissed: false,
    startedAt: new Date().toISOString(),
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const stored = getProgress();
    setProgress(stored);
    // Collapse if more than half complete
    if (stored.completedSteps.length > onboardingSteps.length / 2) {
      setIsExpanded(false);
    }
  }, []);

  const toggleStep = (stepId: string) => {
    const newCompletedSteps = progress.completedSteps.includes(stepId)
      ? progress.completedSteps.filter((id) => id !== stepId)
      : [...progress.completedSteps, stepId];

    const newProgress = { ...progress, completedSteps: newCompletedSteps };
    setProgress(newProgress);
    saveProgress(newProgress);
  };

  const dismiss = () => {
    const newProgress = { ...progress, dismissed: true };
    setProgress(newProgress);
    saveProgress(newProgress);
  };

  const reset = () => {
    const newProgress = {
      completedSteps: [],
      dismissed: false,
      startedAt: new Date().toISOString(),
    };
    setProgress(newProgress);
    saveProgress(newProgress);
    setIsExpanded(true);
  };

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  // Don't show if dismissed and all steps complete
  if (progress.dismissed && progress.completedSteps.length === onboardingSteps.length) {
    return null;
  }

  const completedCount = progress.completedSteps.length;
  const totalSteps = onboardingSteps.length;
  const progressPercent = (completedCount / totalSteps) * 100;
  const isComplete = completedCount === totalSteps;

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      isComplete ? "border-emerald-300 bg-emerald-50" : "border-blue-200 bg-blue-50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className={cn(
              "rounded-full p-2",
              isComplete ? "bg-emerald-100" : "bg-blue-100"
            )}>
              <Rocket className={cn(
                "h-6 w-6",
                isComplete ? "text-emerald-600" : "text-blue-600"
              )} />
            </div>
            {isComplete ? "You're All Set!" : "Getting Started"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-slate-600">
              {completedCount}/{totalSteps} complete
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Collapse checklist" : "Expand checklist"}
              className="h-10 w-10 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
            {isComplete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={dismiss}
                aria-label="Dismiss checklist"
                className="h-10 w-10 p-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              isComplete ? "bg-emerald-500" : "bg-blue-500"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {isComplete ? (
            <div className="text-center py-4">
              <p className="text-lg text-emerald-800 mb-4">
                Congratulations! You've completed all the getting started tasks.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/calls">
                  <AccessibleButton variant="primary" size="lg">
                    <Phone className="h-5 w-5 mr-2" />
                    Start Calling
                  </AccessibleButton>
                </Link>
                <Button variant="outline" onClick={dismiss}>
                  Hide Checklist
                </Button>
              </div>
            </div>
          ) : (
            <>
              <QuickTip variant="info" className="mb-4">
                Complete these steps to learn the basics. Click on each task to
                mark it done, or click the button to go to that section.
              </QuickTip>

              <div className="space-y-3">
                {onboardingSteps.map((step) => {
                  const isStepComplete = progress.completedSteps.includes(step.id);
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                        isStepComplete
                          ? "bg-white border-emerald-200"
                          : "bg-white border-slate-200 hover:border-blue-300"
                      )}
                    >
                      <button
                        onClick={() => toggleStep(step.id)}
                        className={cn(
                          "shrink-0 rounded-full p-2 transition-colors",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                          isStepComplete
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600"
                        )}
                        aria-label={isStepComplete ? `Mark ${step.title} as incomplete` : `Mark ${step.title} as complete`}
                      >
                        {isStepComplete ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Circle className="h-6 w-6" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={cn(
                            "font-semibold text-lg",
                            isStepComplete ? "text-emerald-800 line-through" : "text-slate-800"
                          )}
                        >
                          {step.title}
                        </h4>
                        <p className="text-base text-slate-600">{step.description}</p>
                      </div>

                      <Link href={step.href}>
                        <Button
                          variant={isStepComplete ? "outline" : "default"}
                          size="lg"
                          className="shrink-0 min-w-[140px]"
                        >
                          <Icon className="h-5 w-5 mr-2" />
                          {step.actionLabel}
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Hook to check if onboarding is complete
 */
export function useOnboardingComplete(): boolean {
  const [isComplete, setIsComplete] = useState(true);

  useEffect(() => {
    const progress = getProgress();
    setIsComplete(
      progress.dismissed || progress.completedSteps.length === onboardingSteps.length
    );
  }, []);

  return isComplete;
}
