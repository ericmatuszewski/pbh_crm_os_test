"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { CalendarIcon, Clock, HelpCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  AccessibleButton,
  AccessibleLabel,
  AccessibleText,
  HelpTooltip,
  QuickTip,
} from "@/components/accessible";
import {
  CALL_OUTCOME_DEFINITIONS,
  OutcomeIcon,
  type CallOutcome,
} from "@/components/accessible/CallOutcomeHelp";

// Outcomes that require notes (matching backend validation)
const OUTCOMES_REQUIRING_NOTES = [
  "NOT_INTERESTED",
  "WRONG_NUMBER",
  "DO_NOT_CALL",
] as const;

const completeCallSchema = z
  .object({
    outcome: z.enum([
      "COMPLETED",
      "NO_ANSWER",
      "VOICEMAIL",
      "BUSY",
      "CALLBACK_REQUESTED",
      "NOT_INTERESTED",
      "WRONG_NUMBER",
      "DO_NOT_CALL",
    ]),
    notes: z.string().optional(),
    duration: z.number().min(0).max(480).optional(),
    callbackAt: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        OUTCOMES_REQUIRING_NOTES.includes(
          data.outcome as (typeof OUTCOMES_REQUIRING_NOTES)[number]
        )
      ) {
        return data.notes && data.notes.trim().length >= 10;
      }
      return true;
    },
    {
      message:
        "Notes are required (minimum 10 characters) for this outcome to protect you and the company.",
      path: ["notes"],
    }
  );

type CompleteCallData = z.infer<typeof completeCallSchema>;

interface ScheduledCall {
  id: string;
  scheduledAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

interface CallOutcomeDialogProps {
  call: ScheduledCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function CallOutcomeDialog({
  call,
  open,
  onOpenChange,
  onComplete,
}: CallOutcomeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [callbackDate, setCallbackDate] = useState<Date | undefined>();
  const [callbackTime, setCallbackTime] = useState("09:00");
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CompleteCallData>({
    resolver: zodResolver(completeCallSchema),
    defaultValues: {
      outcome: "COMPLETED",
      notes: "",
      duration: undefined,
    },
  });

  const selectedOutcome = watch("outcome") as CallOutcome | undefined;

  // Get the current outcome definition for help text
  const currentDefinition = selectedOutcome
    ? CALL_OUTCOME_DEFINITIONS[selectedOutcome]
    : null;
  const notesRequired =
    selectedOutcome &&
    OUTCOMES_REQUIRING_NOTES.includes(
      selectedOutcome as (typeof OUTCOMES_REQUIRING_NOTES)[number]
    );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        outcome: "COMPLETED",
        notes: "",
        duration: undefined,
      });
      setShowCallback(false);
      setCallbackDate(undefined);
      setCallbackTime("09:00");
      setApiError(null);
    }
  }, [open, reset]);

  // Show callback options when "Callback Requested" is selected
  const outcomeChanged = (value: string) => {
    setValue("outcome", value as CompleteCallData["outcome"]);
    setShowCallback(value === "CALLBACK_REQUESTED");
    if (value === "CALLBACK_REQUESTED" && !callbackDate) {
      setCallbackDate(addDays(new Date(), 1));
    }
  };

  const onSubmit = async (data: CompleteCallData) => {
    if (!call) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      // Build callback datetime if needed
      if (data.outcome === "CALLBACK_REQUESTED" && callbackDate) {
        const [hours, minutes] = callbackTime.split(":").map(Number);
        const callbackDateTime = new Date(callbackDate);
        callbackDateTime.setHours(hours, minutes, 0, 0);
        data.callbackAt = callbackDateTime.toISOString();
      }

      const response = await fetch(`/api/calls/scheduled/${call.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        reset();
        setShowCallback(false);
        setCallbackDate(undefined);
        onOpenChange(false);
        onComplete?.();
      } else {
        // Show validation errors from the server
        const errorMessage =
          result.error?.message ||
          result.error?.details?.join(", ") ||
          "Failed to save outcome. Please try again.";
        setApiError(errorMessage);
      }
    } catch (error) {
      console.error("Error completing call:", error);
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (const minute of ["00", "30"]) {
      const time = `${hour.toString().padStart(2, "0")}:${minute}`;
      timeSlots.push(time);
    }
  }

  if (!call) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Record Call Outcome</DialogTitle>
          <DialogDescription className="text-base">
            Recording outcome for call with{" "}
            <strong>
              {call.contact.firstName} {call.contact.lastName}
            </strong>
            {call.contact.phone && (
              <span className="block mt-1 text-slate-700 font-medium">
                {call.contact.phone}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* API Error Message */}
          {apiError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 text-lg">
                  Could not save outcome
                </p>
                <p className="text-red-700 text-base">{apiError}</p>
              </div>
            </div>
          )}

          {/* Outcome Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AccessibleLabel htmlFor="outcome" required className="mb-0">
                What happened on this call?
              </AccessibleLabel>
              <HelpTooltip
                content="Choose the option that best describes the result of your call. If you're unsure, ask your supervisor."
                iconSize="default"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(CALL_OUTCOME_DEFINITIONS) as CallOutcome[]).map(
                (outcome) => {
                  const definition = CALL_OUTCOME_DEFINITIONS[outcome];
                  const isSelected = selectedOutcome === outcome;
                  const Icon = definition.icon;

                  return (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => outcomeChanged(outcome)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all duration-200",
                        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                        "min-h-[72px]",
                        isSelected
                          ? cn("border-blue-500", definition.bgColor)
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      )}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "shrink-0 rounded-full p-2",
                            isSelected ? definition.bgColor : "bg-slate-100"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              isSelected ? definition.color : "text-slate-500"
                            )}
                          />
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "font-semibold text-base",
                              isSelected ? definition.color : "text-slate-800"
                            )}
                          >
                            {definition.label}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            {errors.outcome && (
              <p className="text-base text-red-600 font-medium">
                {errors.outcome.message}
              </p>
            )}
          </div>

          {/* Outcome Description */}
          {currentDefinition && (
            <div
              className={cn(
                "rounded-lg p-4 border",
                currentDefinition.bgColor,
                "border-slate-200"
              )}
            >
              <p className="text-base text-slate-700">
                <strong className={currentDefinition.color}>
                  {currentDefinition.label}:
                </strong>{" "}
                {currentDefinition.shortDescription}
              </p>
            </div>
          )}

          {/* Notes Required Warning */}
          {notesRequired && (
            <QuickTip variant="warning">
              <strong>Notes are required for this outcome.</strong> Please
              explain what happened in at least 10 characters. This protects you
              and helps other agents understand the situation.
            </QuickTip>
          )}

          {/* Callback scheduling (shown only for CALLBACK_REQUESTED) */}
          {showCallback && (
            <div className="space-y-4 p-5 bg-purple-50 rounded-xl border-2 border-purple-200">
              <h4 className="font-semibold text-lg text-purple-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Schedule Callback
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <AccessibleLabel size="default">Date</AccessibleLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12 text-base",
                          !callbackDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        {callbackDate
                          ? format(callbackDate, "d MMM yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={callbackDate}
                        onSelect={setCallbackDate}
                        initialFocus
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <AccessibleLabel size="default">Time</AccessibleLabel>
                  <Select value={callbackTime} onValueChange={setCallbackTime}>
                    <SelectTrigger className="h-12 text-base">
                      <Clock className="mr-2 h-5 w-5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem
                          key={time}
                          value={time}
                          className="text-base"
                        >
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Call Duration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AccessibleLabel htmlFor="duration" className="mb-0">
                Call Duration (minutes)
              </AccessibleLabel>
              <HelpTooltip
                content="How long did the call last? This is optional but helps with reporting."
                iconSize="sm"
              />
            </div>
            <Input
              id="duration"
              type="number"
              min={0}
              max={480}
              {...register("duration", { valueAsNumber: true })}
              placeholder="Optional - enter minutes"
              className="h-12 text-base"
            />
            {errors.duration && (
              <p className="text-base text-red-600">
                {errors.duration.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AccessibleLabel
                htmlFor="notes"
                required={notesRequired}
                className="mb-0"
              >
                Notes
              </AccessibleLabel>
              {notesRequired && "notesPrompt" in (currentDefinition || {}) && (
                <span className="text-amber-600 text-sm font-medium">
                  (Required)
                </span>
              )}
            </div>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder={
                (currentDefinition && "notesPrompt" in currentDefinition
                  ? (currentDefinition as { notesPrompt?: string }).notesPrompt
                  : undefined) ||
                "Add any notes about this call..."
              }
              rows={4}
              className="text-base leading-relaxed resize-none"
            />
            {errors.notes && (
              <p className="text-base text-red-600 font-medium">
                {errors.notes.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <AccessibleButton
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </AccessibleButton>
            <AccessibleButton
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              loadingText="Saving outcome..."
            >
              Save Outcome
            </AccessibleButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
