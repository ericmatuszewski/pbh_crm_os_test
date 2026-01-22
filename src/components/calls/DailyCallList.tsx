"use client";

import { useState, useEffect, useCallback } from "react";
import { format, isToday, isBefore } from "date-fns";
import {
  Phone,
  Clock,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallButton } from "./PhoneDialer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduledCall {
  id: string;
  scheduledAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";
  outcome?: string | null;
  notes?: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    company?: { id: string; name: string } | null;
  };
  assignedTo?: { id: string; name: string | null } | null;
}

interface DailyCallListProps {
  calls?: ScheduledCall[];
  date?: Date;
  onCallComplete?: (call: ScheduledCall) => void;
  onRefresh?: () => void;
}

export function DailyCallList({
  calls: initialCalls,
  date = new Date(),
  onCallComplete,
  onRefresh,
}: DailyCallListProps) {
  const [calls, setCalls] = useState<ScheduledCall[]>(initialCalls || []);
  const [isLoading, setIsLoading] = useState(!initialCalls);

  const fetchTodaysCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await fetch(`/api/calls/scheduled/today?date=${dateStr}`);
      const data = await response.json();
      if (data.success) {
        setCalls(data.data);
      }
    } catch (error) {
      console.error("Error fetching calls:", error);
      toast.error("Error fetching calls", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (!initialCalls) {
      fetchTodaysCalls();
    }
  }, [initialCalls, fetchTodaysCalls]);

  const getStatusColor = (status: string, scheduledAt: string) => {
    if (status === "COMPLETED") return "bg-green-100 text-green-800";
    if (status === "CANCELLED") return "bg-gray-100 text-gray-800";
    if (status === "MISSED") return "bg-red-100 text-red-800";
    // Check if overdue
    if (isBefore(new Date(scheduledAt), new Date())) {
      return "bg-orange-100 text-orange-800";
    }
    return "bg-blue-100 text-blue-800";
  };

  const getStatusIcon = (status: string, scheduledAt: string) => {
    if (status === "COMPLETED") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === "CANCELLED") return <XCircle className="h-4 w-4 text-gray-600" />;
    if (status === "MISSED") return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (isBefore(new Date(scheduledAt), new Date())) {
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
    return <Clock className="h-4 w-4 text-blue-600" />;
  };

  const scheduledCalls = calls.filter((c) => c.status === "SCHEDULED");
  const completedCalls = calls.filter((c) => c.status === "COMPLETED");
  const otherCalls = calls.filter(
    (c) => c.status !== "SCHEDULED" && c.status !== "COMPLETED"
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{scheduledCalls.length}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedCalls.length}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{calls.length}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Calls */}
      {scheduledCalls.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Scheduled Calls</h3>
          <div className="space-y-3">
            {scheduledCalls
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
              .map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  onComplete={() => onCallComplete?.(call)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Completed Calls */}
      {completedCalls.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-muted-foreground">
            Completed ({completedCalls.length})
          </h3>
          <div className="space-y-3 opacity-75">
            {completedCalls.map((call) => (
              <CallCard key={call.id} call={call} compact />
            ))}
          </div>
        </div>
      )}

      {/* No calls message */}
      {calls.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No calls scheduled</p>
            <p className="text-sm text-muted-foreground">
              {isToday(date)
                ? "You have no calls scheduled for today."
                : `No calls scheduled for ${format(date, "MMMM d, yyyy")}.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface CallCardProps {
  call: ScheduledCall;
  onComplete?: () => void;
  compact?: boolean;
}

function CallCard({ call, onComplete, compact }: CallCardProps) {
  const isOverdue =
    call.status === "SCHEDULED" &&
    isBefore(new Date(call.scheduledAt), new Date());

  return (
    <Card
      className={cn(
        "transition-colors",
        isOverdue && "border-orange-300 bg-orange-50",
        call.status === "COMPLETED" && "bg-green-50/50"
      )}
    >
      <CardContent className={cn("pt-4", compact && "py-3")}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {call.contact.firstName} {call.contact.lastName}
              </span>
              <Badge
                variant="secondary"
                className={getStatusColor(call.status, call.scheduledAt)}
              >
                {isOverdue && call.status === "SCHEDULED" ? "Overdue" : call.status}
              </Badge>
            </div>

            {call.contact.company && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{call.contact.company.name}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(call.scheduledAt), "h:mm a")}</span>
              {call.assignedTo && (
                <>
                  <span>•</span>
                  <span>Assigned to {call.assignedTo.name}</span>
                </>
              )}
            </div>

            {call.notes && !compact && (
              <p className="text-sm text-muted-foreground mt-2">{call.notes}</p>
            )}

            {call.outcome && (
              <p className="text-sm mt-1">
                <span className="font-medium">Outcome:</span>{" "}
                {call.outcome.replace(/_/g, " ")}
              </p>
            )}
          </div>

          {call.status === "SCHEDULED" && call.contact.phone && (
            <div className="flex items-center gap-2">
              <CallButton
                phoneNumber={call.contact.phone}
                contactName={`${call.contact.firstName} ${call.contact.lastName}`}
              />
              {onComplete && (
                <Button variant="outline" size="sm" onClick={onComplete}>
                  Complete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string, scheduledAt: string) {
  if (status === "COMPLETED") return "bg-green-100 text-green-800";
  if (status === "CANCELLED") return "bg-gray-100 text-gray-800";
  if (status === "MISSED") return "bg-red-100 text-red-800";
  if (isBefore(new Date(scheduledAt), new Date())) {
    return "bg-orange-100 text-orange-800";
  }
  return "bg-blue-100 text-blue-800";
}
