"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Sparkles,
  Star,
  Snowflake,
  Users,
  Target,
  Activity,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadScoreBadge } from "@/components/contacts/LeadScoreBadge";
import { LeadScoreProgress } from "@/components/contacts/LeadScoreProgress";

interface LeadScoringModel {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  qualifiedThreshold: number;
  customerThreshold: number;
  rules: {
    id: string;
    name: string;
    eventType: string;
    points: number;
    isActive: boolean;
  }[];
}

interface LeadDistribution {
  hot: number;
  qualified: number;
  engaged: number;
  cold: number;
  total: number;
}

interface TopLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  leadScore: number;
  lastScoredAt: string | null;
  company: { name: string } | null;
}

interface RecentActivity {
  id: string;
  contactId: string;
  contactName: string;
  eventType: string;
  pointsChange: number;
  previousScore: number;
  newScore: number;
  createdAt: string;
}

// Fetch lead scoring overview data
async function fetchLeadScoringOverview() {
  const response = await fetch("/api/analytics/lead-scoring");
  if (!response.ok) throw new Error("Failed to fetch lead scoring data");
  const data = await response.json();
  return data.data;
}

// Fetch scoring models
async function fetchScoringModels() {
  const response = await fetch("/api/lead-scoring");
  if (!response.ok) throw new Error("Failed to fetch scoring models");
  const data = await response.json();
  return data.data;
}

export function LeadScoringDashboard() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["lead-scoring-overview", timeRange],
    queryFn: fetchLeadScoringOverview,
  });

  const { data: models, isLoading: loadingModels } = useQuery({
    queryKey: ["scoring-models"],
    queryFn: fetchScoringModels,
  });

  // Mock data for demonstration
  const distribution: LeadDistribution = overview?.distribution || {
    hot: 15,
    qualified: 45,
    engaged: 120,
    cold: 320,
    total: 500,
  };

  const topLeads: TopLead[] = overview?.topLeads || [];
  const recentActivity: RecentActivity[] = overview?.recentActivity || [];
  const activeModel: LeadScoringModel | null = models?.find((m: LeadScoringModel) => m.isDefault) || null;

  const distributionCards = [
    {
      label: "Hot Leads",
      value: distribution.hot,
      percentage: ((distribution.hot / distribution.total) * 100).toFixed(1),
      icon: Flame,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      label: "Qualified",
      value: distribution.qualified,
      percentage: ((distribution.qualified / distribution.total) * 100).toFixed(1),
      icon: Sparkles,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      label: "Engaged",
      value: distribution.engaged,
      percentage: ((distribution.engaged / distribution.total) * 100).toFixed(1),
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      label: "Cold",
      value: distribution.cold,
      percentage: ((distribution.cold / distribution.total) * 100).toFixed(1),
      icon: Snowflake,
      color: "text-slate-500",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lead Scoring</h2>
          <p className="text-muted-foreground">
            Monitor and analyze your lead scoring performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Distribution Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {distributionCards.map((card) => (
          <Card key={card.label} className={cn("border", card.borderColor)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.percentage}% of total contacts
              </p>
              <Progress
                value={parseFloat(card.percentage)}
                className="mt-2 h-1"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Scoring Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Scoring Leads
            </CardTitle>
            <CardDescription>
              Highest scoring leads ready for outreach
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topLeads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLeads.slice(0, 5).map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lead.email}
                        </div>
                      </TableCell>
                      <TableCell>{lead.company?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        <LeadScoreBadge
                          score={lead.leadScore}
                          qualifiedThreshold={activeModel?.qualifiedThreshold}
                          customerThreshold={activeModel?.customerThreshold}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No scored leads yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scoring Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest lead score changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <div className="font-medium">{activity.contactName}</div>
                      <div className="text-xs text-muted-foreground">
                        {activity.eventType.replace(/_/g, " ").toLowerCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {activity.previousScore}
                      </span>
                      {activity.pointsChange > 0 ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{activity.pointsChange}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {activity.pointsChange}
                        </Badge>
                      )}
                      <span className="text-sm font-medium">
                        {activity.newScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Scoring Model */}
      {activeModel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Scoring Model</CardTitle>
                <CardDescription>{activeModel.name}</CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Thresholds */}
              <div className="space-y-4">
                <h4 className="font-medium">Score Thresholds</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <span>Qualified Threshold</span>
                    </div>
                    <Badge variant="secondary">{activeModel.qualifiedThreshold} pts</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-600" />
                      <span>Hot Lead Threshold</span>
                    </div>
                    <Badge variant="secondary">{activeModel.customerThreshold} pts</Badge>
                  </div>
                </div>
              </div>

              {/* Active Rules Summary */}
              <div className="space-y-4">
                <h4 className="font-medium">Active Rules</h4>
                <div className="space-y-2">
                  {activeModel.rules.slice(0, 4).map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{rule.name}</span>
                      <Badge
                        variant="outline"
                        className={rule.points > 0 ? "text-green-700" : "text-red-700"}
                      >
                        {rule.points > 0 ? "+" : ""}{rule.points} pts
                      </Badge>
                    </div>
                  ))}
                  {activeModel.rules.length > 4 && (
                    <p className="text-xs text-muted-foreground">
                      +{activeModel.rules.length - 4} more rules
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LeadScoringDashboard;
