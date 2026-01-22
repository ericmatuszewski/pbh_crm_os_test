"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type CreateCampaignData = z.infer<typeof createCampaignSchema>;

interface CampaignFormProps {
  campaign?: {
    id: string;
    name: string;
    description?: string | null;
    priority: string;
    startDate?: string | null;
    endDate?: string | null;
  };
  onSuccess?: (campaign: any) => void;
  onCancel?: () => void;
}

export function CampaignForm({
  campaign,
  onSuccess,
  onCancel,
}: CampaignFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    campaign?.startDate ? new Date(campaign.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    campaign?.endDate ? new Date(campaign.endDate) : undefined
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateCampaignData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: campaign?.name || "",
      description: campaign?.description || "",
      priority: (campaign?.priority as CreateCampaignData["priority"]) || "MEDIUM",
      startDate: campaign?.startDate || "",
      endDate: campaign?.endDate || "",
    },
  });

  const onSubmit = async (data: CreateCampaignData) => {
    setIsSubmitting(true);
    try {
      const url = campaign
        ? `/api/calls/campaigns/${campaign.id}`
        : "/api/calls/campaigns";
      const method = campaign ? "PUT" : "POST";

      // Add dates to data
      if (startDate) {
        data.startDate = startDate.toISOString();
      }
      if (endDate) {
        data.endDate = endDate.toISOString();
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess?.(result.data);
      } else {
        console.error("Failed to save campaign:", result.error);
      }
    } catch (error) {
      console.error("Error saving campaign:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g., Q1 Follow-up Campaign"
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe the campaign objectives..."
          rows={3}
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select
          defaultValue={campaign?.priority || "MEDIUM"}
          onValueChange={(value) =>
            setValue("priority", value as CreateCampaignData["priority"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Optional"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Optional"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                disabled={(date) =>
                  startDate ? date < startDate : false
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : campaign
            ? "Update Campaign"
            : "Create Campaign"}
        </Button>
      </div>
    </form>
  );
}
