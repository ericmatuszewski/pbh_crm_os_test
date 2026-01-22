"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Phone, Target, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OutcomeStats {
  ANSWERED: number;
  NO_ANSWER: number;
  VOICEMAIL: number;
  BUSY: number;
  CALLBACK_REQUESTED: number;
  NOT_INTERESTED: number;
  WRONG_NUMBER: number;
  DO_NOT_CALL: number;
}

interface AgentStats {
  callsMade: number;
  callsTarget: number;
  callbacksDue: number;
  callbacksOverdue: number;
  successRate: number;
  avgCallDuration: number;
  outcomes: OutcomeStats;
}

interface AgentDashboardProps {
  refreshTrigger?: number; // Increment to trigger refresh
  className?: string;
}

export function AgentDashboard({ refreshTrigger, className }: AgentDashboardProps) {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/agents/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching agent stats:", error);
      toast.error("Failed to load dashboard stats");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and refresh on trigger
  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-4 gap-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 bg-slate-100 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const progressPercent = Math.min((stats.callsMade / stats.callsTarget) * 100, 100);
  const isOnTrack = progressPercent >= (new Date().getHours() / 8) * 100; // Simple tracking based on 8-hour day

  return (
    <div className={cn("grid grid-cols-4 gap-4", className)}>
      {/* Calls Made Today */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Calls Today</p>
              <p className="text-3xl font-bold">
                {stats.callsMade}
                <span className="text-lg text-muted-foreground font-normal">/{stats.callsTarget}</span>
              </p>
            </div>
            <div className={cn(
              "p-3 rounded-full",
              stats.callsMade >= stats.callsTarget ? "bg-green-100" : "bg-blue-100"
            )}>
              <Phone className={cn(
                "h-6 w-6",
                stats.callsMade >= stats.callsTarget ? "text-green-600" : "text-blue-600"
              )} />
            </div>
          </div>
          <p className={cn(
            "text-xs mt-2",
            stats.callsMade >= stats.callsTarget ? "text-green-600" : "text-muted-foreground"
          )}>
            {stats.callsMade >= stats.callsTarget
              ? "Target reached!"
              : `${stats.callsTarget - stats.callsMade} more to go`}
          </p>
        </CardContent>
      </Card>

      {/* Target Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Daily Progress</p>
              <p className="text-3xl font-bold">{Math.round(progressPercent)}%</p>
            </div>
            <div className={cn(
              "p-3 rounded-full",
              isOnTrack ? "bg-green-100" : "bg-orange-100"
            )}>
              <Target className={cn(
                "h-6 w-6",
                isOnTrack ? "text-green-600" : "text-orange-600"
              )} />
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className={cn(
            "text-xs mt-2",
            isOnTrack ? "text-green-600" : "text-orange-600"
          )}>
            {isOnTrack ? "On track" : "Behind schedule"}
          </p>
        </CardContent>
      </Card>

      {/* Callbacks Due */}
      <Card className={stats.callbacksOverdue > 0 ? "border-orange-200" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Callbacks Due</p>
              <p className="text-3xl font-bold">{stats.callbacksDue}</p>
            </div>
            <div className={cn(
              "p-3 rounded-full",
              stats.callbacksOverdue > 0 ? "bg-orange-100" : "bg-slate-100"
            )}>
              <Clock className={cn(
                "h-6 w-6",
                stats.callbacksOverdue > 0 ? "text-orange-600" : "text-slate-600"
              )} />
            </div>
          </div>
          {stats.callbacksOverdue > 0 ? (
            <p className="text-xs mt-2 text-orange-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {stats.callbacksOverdue} overdue
            </p>
          ) : (
            <p className="text-xs mt-2 text-muted-foreground">
              {stats.callbacksDue > 0 ? "All on schedule" : "No callbacks pending"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-3xl font-bold">{Math.round(stats.successRate * 100)}%</p>
            </div>
            <div className={cn(
              "p-3 rounded-full",
              stats.successRate >= 0.5 ? "bg-green-100" : "bg-slate-100"
            )}>
              <TrendingUp className={cn(
                "h-6 w-6",
                stats.successRate >= 0.5 ? "text-green-600" : "text-slate-600"
              )} />
            </div>
          </div>
          <p className="text-xs mt-2 text-muted-foreground">
            {stats.outcomes.ANSWERED} answered, {stats.outcomes.CALLBACK_REQUESTED} callbacks
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AgentDashboard;
