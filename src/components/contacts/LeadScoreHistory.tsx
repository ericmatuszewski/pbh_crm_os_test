"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ScoreHistoryEntry {
  id: string;
  contactId: string;
  previousScore: number;
  newScore: number;
  change: number;
  eventType: string;
  eventDescription: string | null;
  scoringModelId: string | null;
  ruleId: string | null;
  createdAt: string;
}

interface LeadScoreHistoryProps {
  contactId: string;
  limit?: number;
  showChart?: boolean;
  className?: string;
}

const eventTypeLabels: Record<string, string> = {
  EMAIL_OPENED: "Email Opened",
  EMAIL_CLICKED: "Email Clicked",
  EMAIL_REPLIED: "Email Replied",
  MEETING_BOOKED: "Meeting Booked",
  MEETING_ATTENDED: "Meeting Attended",
  CALL_ANSWERED: "Call Answered",
  CALL_POSITIVE_OUTCOME: "Call Positive",
  FORM_SUBMITTED: "Form Submitted",
  PAGE_VISITED: "Page Visited",
  DOCUMENT_VIEWED: "Doc Viewed",
  DEMO_REQUESTED: "Demo Requested",
  TRIAL_STARTED: "Trial Started",
  QUOTE_REQUESTED: "Quote Requested",
  DEAL_CREATED: "Deal Created",
  STAGE_ADVANCED: "Stage Advanced",
  DECAY: "Score Decay",
  MANUAL: "Manual Adjustment",
  CUSTOM: "Custom Event",
};

export function LeadScoreHistory({
  contactId,
  limit = 20,
  showChart = true,
  className,
}: LeadScoreHistoryProps) {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/lead-scoring/history?contactId=${contactId}&limit=${limit}`);
        const data = await res.json();
        if (data.success) {
          setHistory(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch score history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [contactId, limit]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Score History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Score History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            No scoring events recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate mini sparkline data
  const sparklineData = [...history].reverse().slice(-10);
  const maxScore = Math.max(...sparklineData.map((h) => h.newScore), 1);
  const minScore = Math.min(...sparklineData.map((h) => h.newScore), 0);
  const range = maxScore - minScore || 1;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Score History
          </CardTitle>
          {history.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {history.length} events
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Mini Sparkline Chart */}
        {showChart && sparklineData.length > 1 && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Recent Trend</span>
              <span className="text-xs font-medium">
                {sparklineData[sparklineData.length - 1]?.newScore ?? 0} pts
              </span>
            </div>
            <svg viewBox="0 0 200 40" className="w-full h-10">
              {/* Gradient fill */}
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path
                d={`
                  M 0 ${40 - ((sparklineData[0]?.newScore ?? 0) - minScore) / range * 35}
                  ${sparklineData.map((h, i) => {
                    const x = (i / (sparklineData.length - 1)) * 200;
                    const y = 40 - ((h.newScore - minScore) / range) * 35;
                    return `L ${x} ${y}`;
                  }).join(" ")}
                  L 200 40
                  L 0 40
                  Z
                `}
                fill="url(#scoreGradient)"
              />

              {/* Line */}
              <path
                d={`
                  M 0 ${40 - ((sparklineData[0]?.newScore ?? 0) - minScore) / range * 35}
                  ${sparklineData.map((h, i) => {
                    const x = (i / (sparklineData.length - 1)) * 200;
                    const y = 40 - ((h.newScore - minScore) / range) * 35;
                    return `L ${x} ${y}`;
                  }).join(" ")}
                `}
                fill="none"
                stroke="rgb(59, 130, 246)"
                strokeWidth="2"
              />

              {/* Data points */}
              {sparklineData.map((h, i) => {
                const x = (i / (sparklineData.length - 1)) * 200;
                const y = 40 - ((h.newScore - minScore) / range) * 35;
                return (
                  <circle
                    key={h.id}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="white"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* History List */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "p-1 rounded-full mt-0.5",
                      entry.change > 0
                        ? "bg-green-100 text-green-600"
                        : entry.change < 0
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {entry.change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : entry.change < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {eventTypeLabels[entry.eventType] || entry.eventType}
                    </p>
                    {entry.eventDescription && (
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {entry.eventDescription}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    className={cn(
                      "text-xs font-mono",
                      entry.change > 0
                        ? "bg-green-100 text-green-700"
                        : entry.change < 0
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {entry.change > 0 ? "+" : ""}
                    {entry.change}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.previousScore} → {entry.newScore}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default LeadScoreHistory;
