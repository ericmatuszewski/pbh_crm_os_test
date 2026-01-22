"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const callOutcomes = [
  { value: "ANSWERED", label: "Answered", color: "text-green-600" },
  { value: "NO_ANSWER", label: "No Answer", color: "text-yellow-600" },
  { value: "VOICEMAIL", label: "Left Voicemail", color: "text-blue-600" },
  { value: "BUSY", label: "Busy", color: "text-orange-600" },
  { value: "CALLBACK_REQUESTED", label: "Callback Requested", color: "text-purple-600" },
  { value: "NOT_INTERESTED", label: "Not Interested", color: "text-red-600" },
  { value: "WRONG_NUMBER", label: "Wrong Number", color: "text-gray-600" },
  { value: "DO_NOT_CALL", label: "Do Not Call", color: "text-red-800" },
] as const;

const completeCallSchema = z.object({
  outcome: z.enum([
    "ANSWERED",
    "NO_ANSWER",
    "VOICEMAIL",
    "BUSY",
    "CALLBACK_REQUESTED",
    "NOT_INTERESTED",
    "WRONG_NUMBER",
    "DO_NOT_CALL",
  ]),
  notes: z.string().optional(),
  duration: z.number().optional(),
  callbackAt: z.string().optional(),
});

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
      outcome: "ANSWERED",
      notes: "",
      duration: undefined,
    },
  });

  const selectedOutcome = watch("outcome");

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
        console.error("Failed to complete call:", result.error);
      }
    } catch (error) {
      console.error("Error completing call:", error);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Call Outcome</DialogTitle>
          <DialogDescription>
            Recording outcome for call with {call.contact.firstName}{" "}
            {call.contact.lastName}
            {call.contact.phone && ` (${call.contact.phone})`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Outcome Selection */}
          <div className="space-y-2">
            <Label>Outcome *</Label>
            <Select
              value={selectedOutcome}
              onValueChange={outcomeChanged}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {callOutcomes.map((outcome) => (
                  <SelectItem key={outcome.value} value={outcome.value}>
                    <span className={outcome.color}>{outcome.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.outcome && (
              <p className="text-sm text-red-600">{errors.outcome.message}</p>
            )}
          </div>

          {/* Callback scheduling (shown only for CALLBACK_REQUESTED) */}
          {showCallback && (
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900">Schedule Callback</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !callbackDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {callbackDate
                          ? format(callbackDate, "PPP")
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
                  <Label>Time</Label>
                  <Select value={callbackTime} onValueChange={setCallbackTime}>
                    <SelectTrigger>
                      <Clock className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
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
            <Label>Call Duration (minutes)</Label>
            <Input
              type="number"
              min={0}
              {...register("duration", { valueAsNumber: true })}
              placeholder="Optional"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...register("notes")}
              placeholder="Add any notes about this call..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Outcome"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
