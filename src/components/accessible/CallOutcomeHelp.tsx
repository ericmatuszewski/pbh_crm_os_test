"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Phone,
  PhoneOff,
  PhoneMissed,
  Clock,
  UserX,
  Ban,
  MessageSquare,
  CalendarClock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { HelpCard, HelpCardGroup, QuickTip } from "./HelpCard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./Tooltip";

/**
 * CallOutcomeHelp
 *
 * Comprehensive help for understanding and selecting call outcomes.
 * Designed for agents who may be unfamiliar with CRM terminology.
 */

// Outcome definitions with detailed explanations
export const CALL_OUTCOME_DEFINITIONS = {
  COMPLETED: {
    label: "Completed",
    shortDescription: "You spoke with the contact and finished the call successfully.",
    fullDescription:
      "Use this when you had a full conversation with the contact. This could be a successful sale, gathering information, or any call where you achieved the purpose of calling.",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    examples: [
      "You discussed the product and they made a purchase",
      "You answered their questions and resolved their query",
      "You gathered the information you needed",
    ],
    requiresNotes: false,
  },
  NO_ANSWER: {
    label: "No Answer",
    shortDescription: "The phone rang but nobody picked up.",
    fullDescription:
      "Use this when the call connected (you heard ringing) but the contact did not answer. The system will usually schedule a callback for you.",
    icon: PhoneMissed,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    examples: [
      "The phone rang 5-6 times with no answer",
      "The call went to voicemail after ringing",
    ],
    requiresNotes: false,
  },
  VOICEMAIL: {
    label: "Voicemail",
    shortDescription: "You reached their voicemail and left a message.",
    fullDescription:
      "Use this when the call went to voicemail and you left a message. Make a note of what message you left so you or another agent knows the context if they call back.",
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    examples: [
      "You left a message asking them to call back",
      "You left details about why you were calling",
    ],
    requiresNotes: false,
  },
  BUSY: {
    label: "Busy",
    shortDescription: "The line was engaged (busy signal).",
    fullDescription:
      "Use this when you heard a busy/engaged tone, meaning the contact was already on another call. Try calling back in a few minutes.",
    icon: Phone,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    examples: [
      "You heard a busy tone immediately",
      "The call couldn't connect because they were on another call",
    ],
    requiresNotes: false,
  },
  CALLBACK_REQUESTED: {
    label: "Callback Requested",
    shortDescription: "They asked you to call them back at a specific time.",
    fullDescription:
      "Use this when the contact answered but asked you to call back later. Always note when they want to be called and schedule it in the system.",
    icon: CalendarClock,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    examples: [
      "They said 'Can you call me tomorrow afternoon?'",
      "They were busy and asked for a call next week",
      "They want to be called after they've checked something",
    ],
    requiresNotes: false,
  },
  NOT_INTERESTED: {
    label: "Not Interested",
    shortDescription: "They told you they are not interested.",
    fullDescription:
      "Use this when the contact clearly states they are not interested in what you're offering. Always make detailed notes about why - this helps future agents and protects the company.",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    examples: [
      "They said 'No thank you, I'm not interested'",
      "They already have a competitor's product",
      "They don't need the service right now",
    ],
    requiresNotes: true,
    notesPrompt: "Please explain why they're not interested (min 10 characters)",
  },
  WRONG_NUMBER: {
    label: "Wrong Number",
    shortDescription: "The number doesn't belong to the contact you were trying to reach.",
    fullDescription:
      "Use this when you reached someone who is not the contact in the system. This helps keep our database clean. Note who you actually spoke to if possible.",
    icon: UserX,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    examples: [
      "Someone else answered and said 'Wrong number'",
      "The person said they don't know the contact",
      "It was a business but not the right one",
    ],
    requiresNotes: true,
    notesPrompt: "Please describe what happened (min 10 characters)",
  },
  DO_NOT_CALL: {
    label: "Do Not Call",
    shortDescription: "They requested to be removed from all call lists.",
    fullDescription:
      "IMPORTANT: Use this when someone explicitly asks not to be called again. This is a legal requirement. The contact will be marked to prevent future calls. Always document exactly what they said.",
    icon: Ban,
    color: "text-red-700",
    bgColor: "bg-red-100",
    examples: [
      "They said 'Please remove me from your list'",
      "They said 'Don't call me again'",
      "They threatened legal action if called again",
    ],
    requiresNotes: true,
    notesPrompt: "Document their exact request (min 10 characters) - this is required by law",
  },
} as const;

export type CallOutcome = keyof typeof CALL_OUTCOME_DEFINITIONS;

/**
 * OutcomeIcon
 *
 * Displays the appropriate icon for a call outcome.
 */
interface OutcomeIconProps {
  outcome: CallOutcome;
  size?: "sm" | "default" | "lg";
  showBackground?: boolean;
}

const OutcomeIcon: React.FC<OutcomeIconProps> = ({
  outcome,
  size = "default",
  showBackground = false,
}) => {
  const definition = CALL_OUTCOME_DEFINITIONS[outcome];
  const Icon = definition.icon;

  const sizes = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const bgSizes = {
    sm: "p-1.5",
    default: "p-2",
    lg: "p-3",
  };

  if (showBackground) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full",
          definition.bgColor,
          bgSizes[size]
        )}
      >
        <Icon className={cn(sizes[size], definition.color)} />
      </span>
    );
  }

  return <Icon className={cn(sizes[size], definition.color)} />;
};

/**
 * OutcomeLabel
 *
 * Badge-style label for an outcome.
 */
interface OutcomeLabelProps {
  outcome: CallOutcome;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
}

const OutcomeLabel: React.FC<OutcomeLabelProps> = ({
  outcome,
  showIcon = true,
  size = "default",
}) => {
  const definition = CALL_OUTCOME_DEFINITIONS[outcome];
  const Icon = definition.icon;

  const sizes = {
    sm: "text-sm px-2 py-1 gap-1.5",
    default: "text-base px-3 py-1.5 gap-2",
    lg: "text-lg px-4 py-2 gap-2",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    default: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        definition.bgColor,
        definition.color,
        sizes[size]
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {definition.label}
    </span>
  );
};

/**
 * OutcomeHelpTooltip
 *
 * Quick tooltip explaining an outcome.
 */
interface OutcomeHelpTooltipProps {
  outcome: CallOutcome;
}

const OutcomeHelpTooltip: React.FC<OutcomeHelpTooltipProps> = ({ outcome }) => {
  const definition = CALL_OUTCOME_DEFINITIONS[outcome];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "text-slate-400 hover:text-slate-600",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "min-h-[44px] min-w-[44px]"
            )}
            aria-label={`Help for ${definition.label}`}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <p className="font-semibold mb-1">{definition.label}</p>
          <p>{definition.shortDescription}</p>
          {definition.requiresNotes && (
            <p className="mt-2 text-amber-200 text-sm">
              Notes are required for this outcome.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * CallOutcomeHelp
 *
 * Full help page section explaining all call outcomes.
 */
interface CallOutcomeHelpProps {
  className?: string;
  /** Only show specific outcomes */
  outcomes?: CallOutcome[];
  /** Whether to show as expandable cards */
  expandable?: boolean;
}

const CallOutcomeHelp: React.FC<CallOutcomeHelpProps> = ({
  className,
  outcomes,
  expandable = true,
}) => {
  const outcomesToShow = outcomes || (Object.keys(CALL_OUTCOME_DEFINITIONS) as CallOutcome[]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Understanding Call Outcomes
        </h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          After each call, you need to record what happened. Choosing the right
          outcome helps the team track progress and ensures proper follow-up.
        </p>
      </div>

      <QuickTip variant="warning">
        <strong>Important:</strong> Some outcomes require you to add notes
        explaining what happened. The system will prompt you when notes are
        needed.
      </QuickTip>

      <HelpCardGroup>
        {outcomesToShow.map((outcome) => {
          const definition = CALL_OUTCOME_DEFINITIONS[outcome];
          const Icon = definition.icon;

          return (
            <HelpCard
              key={outcome}
              title={definition.label}
              variant={
                definition.requiresNotes
                  ? "warning"
                  : outcome === "COMPLETED"
                  ? "success"
                  : "default"
              }
              expandable={expandable}
              defaultExpanded={!expandable}
              icon={<Icon className="h-6 w-6" />}
            >
              <div className="space-y-4">
                <p className="text-lg">{definition.fullDescription}</p>

                <div>
                  <p className="font-semibold text-slate-800 mb-2">Examples:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {definition.examples.map((example, i) => (
                      <li key={i}>{example}</li>
                    ))}
                  </ul>
                </div>

                {definition.requiresNotes && (
                  <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
                    <p className="font-semibold text-amber-800 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Notes Required
                    </p>
                    <p className="text-amber-700 mt-1">
                      {definition.notesPrompt}
                    </p>
                  </div>
                )}
              </div>
            </HelpCard>
          );
        })}
      </HelpCardGroup>
    </div>
  );
};

/**
 * OutcomeSelector
 *
 * Accessible outcome selection with inline help.
 */
interface OutcomeSelectorProps {
  value?: CallOutcome;
  onChange: (outcome: CallOutcome) => void;
  disabled?: boolean;
}

const OutcomeSelector: React.FC<OutcomeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const outcomes = Object.keys(CALL_OUTCOME_DEFINITIONS) as CallOutcome[];

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Select call outcome">
      {outcomes.map((outcome) => {
        const definition = CALL_OUTCOME_DEFINITIONS[outcome];
        const Icon = definition.icon;
        const isSelected = value === outcome;

        return (
          <button
            key={outcome}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(outcome)}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left",
              "flex items-start gap-4",
              "transition-all duration-200",
              "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "min-h-[64px]",
              isSelected
                ? cn("border-blue-500 bg-blue-50", definition.bgColor)
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "shrink-0 rounded-full p-2",
                isSelected ? definition.bgColor : "bg-slate-100"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  isSelected ? definition.color : "text-slate-500"
                )}
              />
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-semibold text-lg",
                  isSelected ? definition.color : "text-slate-800"
                )}
              >
                {definition.label}
              </p>
              <p className="text-base text-slate-600 mt-0.5">
                {definition.shortDescription}
              </p>
              {definition.requiresNotes && (
                <p className="text-sm text-amber-600 mt-1 font-medium">
                  Notes required
                </p>
              )}
            </div>
            {isSelected && (
              <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export {
  CallOutcomeHelp,
  OutcomeIcon,
  OutcomeLabel,
  OutcomeHelpTooltip,
  OutcomeSelector,
};
