"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Scoring event types matching the schema
const EVENT_TYPES = [
  { value: "EMAIL_OPENED", label: "Email Opened", points: 5 },
  { value: "EMAIL_CLICKED", label: "Email Link Clicked", points: 10 },
  { value: "EMAIL_REPLIED", label: "Email Replied", points: 20 },
  { value: "MEETING_BOOKED", label: "Meeting Booked", points: 30 },
  { value: "MEETING_ATTENDED", label: "Meeting Attended", points: 40 },
  { value: "CALL_ANSWERED", label: "Call Answered", points: 15 },
  { value: "CALL_POSITIVE_OUTCOME", label: "Call Positive Outcome", points: 25 },
  { value: "FORM_SUBMITTED", label: "Form Submitted", points: 20 },
  { value: "PAGE_VISITED", label: "Website Page Visited", points: 3 },
  { value: "DOCUMENT_VIEWED", label: "Document Viewed", points: 15 },
  { value: "DEMO_REQUESTED", label: "Demo Requested", points: 50 },
  { value: "QUOTE_REQUESTED", label: "Quote Requested", points: 40 },
  { value: "TRIAL_STARTED", label: "Trial Started", points: 60 },
  { value: "INACTIVITY", label: "Inactivity (Decay)", points: -5 },
  { value: "UNSUBSCRIBED", label: "Unsubscribed", points: -20 },
  { value: "BOUNCED_EMAIL", label: "Email Bounced", points: -10 },
] as const;

interface ScoringRule {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  points: number;
  isActive: boolean;
  decayDays: number | null;
  decayPoints: number | null;
  maxOccurrences: number | null;
  cooldownHours: number | null;
}

interface ScoringRuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  rule?: ScoringRule | null;
  onSuccess?: () => void;
}

export function ScoringRuleForm({
  open,
  onOpenChange,
  modelId,
  rule,
  onSuccess,
}: ScoringRuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!rule;

  // Form state
  const [name, setName] = useState(rule?.name || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [eventType, setEventType] = useState(rule?.eventType || "");
  const [points, setPoints] = useState(rule?.points || 10);
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [maxOccurrences, setMaxOccurrences] = useState<string>(
    rule?.maxOccurrences?.toString() || ""
  );
  const [cooldownHours, setCooldownHours] = useState<string>(
    rule?.cooldownHours?.toString() || ""
  );
  const [decayDays, setDecayDays] = useState<string>(
    rule?.decayDays?.toString() || ""
  );
  const [decayPoints, setDecayPoints] = useState<string>(
    rule?.decayPoints?.toString() || ""
  );

  // Auto-fill suggested points when event type changes
  const handleEventTypeChange = (value: string) => {
    setEventType(value);
    const eventConfig = EVENT_TYPES.find((e) => e.value === value);
    if (eventConfig && !isEditing) {
      setPoints(eventConfig.points);
      setName(eventConfig.label);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        name,
        description: description || null,
        eventType,
        points,
        isActive,
        maxOccurrences: maxOccurrences ? parseInt(maxOccurrences) : null,
        cooldownHours: cooldownHours ? parseInt(cooldownHours) : null,
        decayDays: decayDays ? parseInt(decayDays) : null,
        decayPoints: decayPoints ? parseInt(decayPoints) : null,
      };

      const url = isEditing
        ? `/api/lead-scoring/${modelId}/rules/${rule.id}`
        : `/api/lead-scoring/${modelId}/rules`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save rule");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving rule:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Scoring Rule</DialogTitle>
          <DialogDescription>
            Configure how this event affects lead scores
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select value={eventType} onValueChange={handleEventTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    {event.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Email engagement bonus"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when this rule applies..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min={-100}
                max={100}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Positive to add, negative to subtract
              </p>
            </div>

            <div className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Enable this rule</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">Advanced Options</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxOccurrences">Max Occurrences</Label>
                <Input
                  id="maxOccurrences"
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={maxOccurrences}
                  onChange={(e) => setMaxOccurrences(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Max times per contact</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldownHours">Cooldown (hours)</Label>
                <Input
                  id="cooldownHours"
                  type="number"
                  min={0}
                  placeholder="None"
                  value={cooldownHours}
                  onChange={(e) => setCooldownHours(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Hours before re-trigger</p>
              </div>
            </div>

            {/* Decay settings for inactivity-type rules */}
            {eventType === "INACTIVITY" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="decayDays">Decay After (days)</Label>
                  <Input
                    id="decayDays"
                    type="number"
                    min={0}
                    placeholder="30"
                    value={decayDays}
                    onChange={(e) => setDecayDays(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="decayPoints">Decay Points</Label>
                  <Input
                    id="decayPoints"
                    type="number"
                    max={0}
                    placeholder="-5"
                    value={decayPoints}
                    onChange={(e) => setDecayPoints(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name || !eventType}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ScoringRuleForm;
