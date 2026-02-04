"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentStats {
  callsMade: number;
  callsTarget: number;
  callbacksDue: number;
  callbacksOverdue: number;
  successRate: number;
  avgCallDuration: number;
  outcomes: Record<string, number>;
  trend: {
    callsVsAvg: number;
    successRateVsAvg: number;
  };
}

interface AgentDashboardProps {
  className?: string;
  onCallbacksClick?: () => void;
  refreshTrigger?: number;
}

export function AgentDashboard({
  className,
  onCallbacksClick,
  refreshTrigger,
}: AgentDashboardProps) {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch agent stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchStats();
    }
  }, [refreshTrigger, fetchStats]);

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const progressPercent = Math.min((stats.callsMade / stats.callsTarget) * 100, 100);
  const successPercent = stats.successRate * 100;
  const remaining = stats.callsTarget - stats.callsMade;

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            {stats.trend.callsVsAvg !== 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  stats.trend.callsVsAvg > 0
                    ? "text-green-600 border-green-200 bg-green-50"
                    : "text-red-600 border-red-200 bg-red-50"
                )}
              >
                {stats.trend.callsVsAvg > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {stats.trend.callsVsAvg > 0 ? "+" : ""}{stats.trend.callsVsAvg} vs avg
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold">
            {stats.callsMade}<span className="text-lg text-muted-foreground font-normal">/{stats.callsTarget}</span>
          </div>
          <p className="text-xs text-muted-foreground">Calls Today</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-sm font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            {remaining > 0 ? remaining + " calls to target" : "Target reached!"}
          </p>
        </CardContent>
      </Card>

      <Card
        className={cn("cursor-pointer transition-colors hover:bg-muted/50", stats.callbacksOverdue > 0 && "border-orange-300")}
        onClick={onCallbacksClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className={cn("p-2 rounded-lg", stats.callbacksOverdue > 0 ? "bg-orange-100" : "bg-slate-100")}>
              <Clock className={cn("h-4 w-4", stats.callbacksOverdue > 0 ? "text-orange-600" : "text-slate-600")} />
            </div>
            {stats.callbacksOverdue > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />{stats.callbacksOverdue} overdue
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold">{stats.callbacksDue}</div>
          <p className="text-xs text-muted-foreground">Callbacks Due Today</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className={cn("p-2 rounded-lg", successPercent >= 50 ? "bg-green-100" : "bg-slate-100")}>
              <CheckCircle2 className={cn("h-4 w-4", successPercent >= 50 ? "text-green-600" : "text-slate-600")} />
            </div>
            {stats.trend.successRateVsAvg !== 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  stats.trend.successRateVsAvg > 0
                    ? "text-green-600 border-green-200 bg-green-50"
                    : "text-red-600 border-red-200 bg-red-50"
                )}
              >
                {stats.trend.successRateVsAvg > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {stats.trend.successRateVsAvg > 0 ? "+" : ""}{Math.round(stats.trend.successRateVsAvg * 100)}%
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold">{Math.round(successPercent)}%</div>
          <p className="text-xs text-muted-foreground">Success Rate ({stats.avgCallDuration.toFixed(1)} min avg)</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AgentDashboard;
