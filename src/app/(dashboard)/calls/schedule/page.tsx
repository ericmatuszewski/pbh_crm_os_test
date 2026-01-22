"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  User,
  Clock,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScheduleCallForm } from "@/components/calls/ScheduleCallForm";
import { CallOutcomeDialog } from "@/components/calls/CallOutcomeDialog";
import { cn } from "@/lib/utils";

interface ScheduledCall {
  id: string;
  scheduledAt: string;
  status: string;
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

export default function ScheduleCalendarPage() {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedCall, setSelectedCall] = useState<ScheduledCall | null>(null);
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(weekEnd, "yyyy-MM-dd");
      const response = await fetch(
        `/api/calls/scheduled?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      if (data.success) {
        setCalls(data.data);
      }
    } catch (error) {
      console.error("Error fetching calls:", error);
    } finally {
      setIsLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const getCallsForDay = (date: Date) => {
    return calls.filter((call) =>
      isSameDay(new Date(call.scheduledAt), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "MISSED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const handleCallClick = (call: ScheduledCall) => {
    if (call.status === "SCHEDULED") {
      setSelectedCall(call);
      setShowOutcomeDialog(true);
    }
  };

  const handleScheduleSuccess = () => {
    setShowScheduleDialog(false);
    fetchCalls();
  };

  const handleOutcomeComplete = () => {
    setShowOutcomeDialog(false);
    setSelectedCall(null);
    fetchCalls();
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Call Calendar"
          subtitle={`${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`}
          actions={
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Call
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Schedule a Call</DialogTitle>
                </DialogHeader>
                <ScheduleCallForm
                  onSuccess={handleScheduleSuccess}
                  onCancel={() => setShowScheduleDialog(false)}
                />
              </DialogContent>
            </Dialog>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <h2 className="text-lg font-semibold">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </h2>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const dayCalls = getCallsForDay(day);

                return (
                  <Card
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[200px]",
                      isToday(day) && "border-primary border-2"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle
                        className={cn(
                          "text-sm font-medium flex items-center justify-between",
                          isToday(day) && "text-primary"
                        )}
                      >
                        <span>{format(day, "EEE")}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5",
                            isToday(day) && "bg-primary text-primary-foreground"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      ) : dayCalls.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No calls
                        </p>
                      ) : (
                        dayCalls
                          .sort(
                            (a, b) =>
                              new Date(a.scheduledAt).getTime() -
                              new Date(b.scheduledAt).getTime()
                          )
                          .map((call) => (
                            <div
                              key={call.id}
                              className={cn(
                                "p-2 rounded-md border text-xs cursor-pointer hover:opacity-80 transition-opacity",
                                getStatusColor(call.status)
                              )}
                              onClick={() => handleCallClick(call)}
                            >
                              <div className="flex items-center gap-1 font-medium">
                                <Clock className="h-3 w-3" />
                                {format(new Date(call.scheduledAt), "h:mm a")}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <User className="h-3 w-3" />
                                <span className="truncate">
                                  {call.contact.firstName} {call.contact.lastName}
                                </span>
                              </div>
                              {call.contact.company && (
                                <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {call.contact.company.name}
                                </div>
                              )}
                            </div>
                          ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
                <span>Cancelled</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Outcome Dialog */}
      <CallOutcomeDialog
        call={selectedCall}
        open={showOutcomeDialog}
        onOpenChange={setShowOutcomeDialog}
        onComplete={handleOutcomeComplete}
      />
    </div>
  );
}
