"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Clock,
  FileText,
  Download,
  Award,
  Zap,
  PieChart,
  LineChart,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

interface AnalyticsData {
  kpis: {
    totalDeals: number;
    totalPipelineValue: number;
    wonDeals: number;
    wonValue: number;
    lostDeals: number;
    winRate: number;
    avgDealSize: number;
    weightedPipelineValue: number;
    avgDaysToClose: number;
    totalContacts: number;
    totalQuotes: number;
    pendingTasks: number;
  };
  dealsByStage: Record<string, { count: number; value: number }>;
  leaderboard: Array<{
    id: string;
    name: string;
    email: string;
    deals: number;
    wonDeals: number;
    wonValue: number;
    pipelineValue: number;
    winRate: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    won: number;
    lost: number;
    created: number;
    value: number;
  }>;
  weeklyActivity: Array<{
    week: string;
    deals: number;
    tasks: number;
  }>;
  recentDeals: Array<{
    id: string;
    title: string;
    value: number;
    stage: string;
    probability: number;
    company: string;
    owner: string;
    createdAt: string;
  }>;
}

const stageLabels: Record<string, string> = {
  QUALIFICATION: "Qualification",
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Won",
  CLOSED_LOST: "Lost",
};

const stageColors: Record<string, string> = {
  QUALIFICATION: "#94a3b8",
  DISCOVERY: "#3b82f6",
  PROPOSAL: "#eab308",
  NEGOTIATION: "#f97316",
  CLOSED_WON: "#22c55e",
  CLOSED_LOST: "#ef4444",
};

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const exportToCSV = () => {
    if (!data) return;

    // Create CSV content
    let csv = "Report Type,Metric,Value\n";
    csv += `KPI,Total Deals,${data.kpis.totalDeals}\n`;
    csv += `KPI,Pipeline Value,$${data.kpis.totalPipelineValue}\n`;
    csv += `KPI,Won Revenue,$${data.kpis.wonValue}\n`;
    csv += `KPI,Win Rate,${data.kpis.winRate.toFixed(1)}%\n`;
    csv += `KPI,Avg Deal Size,$${data.kpis.avgDealSize}\n`;
    csv += `KPI,Avg Days to Close,${data.kpis.avgDaysToClose.toFixed(0)}\n`;
    csv += "\n";

    // Leaderboard
    csv += "Leaderboard\n";
    csv += "Rep Name,Won Deals,Won Value,Win Rate\n";
    data.leaderboard.forEach((rep) => {
      csv += `${rep.name},${rep.wonDeals},$${rep.wonValue},${rep.winRate.toFixed(1)}%\n`;
    });

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Prepare chart data
  const pipelineData = data
    ? Object.entries(data.dealsByStage)
        .filter(([stage]) => !["CLOSED_WON", "CLOSED_LOST"].includes(stage))
        .map(([stage, info]) => ({
          name: stageLabels[stage] || stage,
          count: info.count,
          value: info.value,
          fill: stageColors[stage],
        }))
        .sort((a, b) => {
          const order = ["QUALIFICATION", "DISCOVERY", "PROPOSAL", "NEGOTIATION"];
          const aIndex = order.indexOf(Object.keys(stageLabels).find((k) => stageLabels[k] === a.name) || "");
          const bIndex = order.indexOf(Object.keys(stageLabels).find((k) => stageLabels[k] === b.name) || "");
          return aIndex - bIndex;
        })
    : [];

  const pieData = data
    ? Object.entries(data.dealsByStage).map(([stage, info]) => ({
        name: stageLabels[stage] || stage,
        value: info.count,
        fill: stageColors[stage],
      }))
    : [];

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Reports & Analytics"
          subtitle="Sales performance insights and forecasting"
          actions={
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Link href="/reports/builder">
                <Button variant="outline">
                  <Wrench className="w-4 h-4 mr-2" />
                  Report Builder
                </Button>
              </Link>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="team">Team Performance</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Executive KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-100">
                      Pipeline Value
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-200" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(data?.kpis.totalPipelineValue || 0)}
                    </div>
                    <p className="text-xs text-blue-200">
                      {data?.kpis.totalDeals || 0} active deals
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-100">
                      Won Revenue
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-200" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(data?.kpis.wonValue || 0)}
                    </div>
                    <p className="text-xs text-green-200">
                      {data?.kpis.wonDeals || 0} closed deals
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Win Rate
                    </CardTitle>
                    <Target className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatPercent(data?.kpis.winRate || 0)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {data?.kpis.lostDeals || 0} lost deals
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Avg Deal Size
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(data?.kpis.avgDealSize || 0)}
                    </div>
                    <p className="text-xs text-gray-500">per won deal</p>
                  </CardContent>
                </Card>
              </div>

              {/* Velocity Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Pipeline Velocity
                    </CardTitle>
                    <Zap className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data?.kpis.avgDaysToClose.toFixed(0) || 0} days
                    </div>
                    <p className="text-xs text-gray-500">avg time to close</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Total Contacts
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data?.kpis.totalContacts || 0}
                    </div>
                    <p className="text-xs text-gray-500">in database</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Active Quotes
                    </CardTitle>
                    <FileText className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data?.kpis.totalQuotes || 0}
                    </div>
                    <p className="text-xs text-gray-500">pending quotes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Revenue Trend
                  </CardTitle>
                  <CardDescription>Won deal value over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.monthlyTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={formatCurrencyShort} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ fontWeight: "bold" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.3}
                          name="Won Revenue"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Deal Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Deal Activity
                  </CardTitle>
                  <CardDescription>Won vs Lost deals by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.monthlyTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="won" name="Won" fill="#22c55e" />
                        <Bar dataKey="lost" name="Lost" fill="#ef4444" />
                        <Bar dataKey="created" name="Created" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pipeline Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pipeline Stages</CardTitle>
                    <CardDescription>Deals by stage with value</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pipelineData.map((stage) => (
                        <div key={stage.name} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{stage.name}</span>
                            <span className="text-gray-500">
                              {stage.count} deals · {formatCurrency(stage.value)}
                            </span>
                          </div>
                          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.max((stage.count / (data?.kpis.totalDeals || 1)) * 100, 5)}%`,
                                backgroundColor: stage.fill,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Distribution Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Deal Distribution
                    </CardTitle>
                    <CardDescription>By current stage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Deals */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Deals</CardTitle>
                  <CardDescription>Latest deal activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.recentDeals.slice(0, 8).map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{deal.title}</div>
                          <div className="text-sm text-gray-500">
                            {deal.company || "No company"} · {deal.owner || "Unassigned"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(deal.value)}</div>
                          <Badge
                            variant={
                              deal.stage === "CLOSED_WON"
                                ? "default"
                                : deal.stage === "CLOSED_LOST"
                                ? "destructive"
                                : "secondary"
                            }
                            className="mt-1"
                          >
                            {stageLabels[deal.stage] || deal.stage}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Performance Tab */}
            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    Sales Leaderboard
                  </CardTitle>
                  <CardDescription>Top performers by closed revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.leaderboard.map((rep, index) => (
                      <div
                        key={rep.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                              ? "bg-gray-400"
                              : index === 2
                              ? "bg-amber-600"
                              : "bg-gray-300"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{rep.name || rep.email}</div>
                          <div className="text-sm text-gray-500">
                            {rep.wonDeals} won · {formatPercent(rep.winRate)} win rate
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(rep.wonValue)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(rep.pipelineValue)} pipeline
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!data?.leaderboard || data.leaderboard.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        No sales data available yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Rep Performance Chart */}
              {data?.leaderboard && data.leaderboard.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Comparison</CardTitle>
                    <CardDescription>Won revenue by rep</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.leaderboard.slice(0, 5)}
                          layout="vertical"
                          margin={{ left: 100 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={formatCurrencyShort} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="wonValue" fill="#22c55e" name="Won Revenue" />
                          <Bar dataKey="pipelineValue" fill="#3b82f6" name="Pipeline" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Forecast Tab */}
            <TabsContent value="forecast" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-100">
                      Weighted Pipeline
                    </CardTitle>
                    <Target className="h-4 w-4 text-purple-200" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(data?.kpis.weightedPipelineValue || 0)}
                    </div>
                    <p className="text-xs text-purple-200">
                      Forecast based on deal probability
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Best Case
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(data?.kpis.totalPipelineValue || 0)}
                    </div>
                    <p className="text-xs text-gray-500">
                      If all deals close
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Forecast</CardTitle>
                  <CardDescription>
                    Projected revenue based on pipeline probability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-500 mb-2">
                          Forecast Confidence
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                            style={{
                              width: `${
                                ((data?.kpis.weightedPipelineValue || 0) /
                                  (data?.kpis.totalPipelineValue || 1)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Conservative</span>
                          <span>
                            {(
                              ((data?.kpis.weightedPipelineValue || 0) /
                                (data?.kpis.totalPipelineValue || 1)) *
                              100
                            ).toFixed(0)}
                            % weighted
                          </span>
                          <span>Optimistic</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {formatCurrency((data?.kpis.weightedPipelineValue || 0) * 0.7)}
                        </div>
                        <div className="text-sm text-gray-500">Conservative</div>
                        <div className="text-xs text-gray-400">70% of weighted</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(data?.kpis.weightedPipelineValue || 0)}
                        </div>
                        <div className="text-sm text-gray-500">Expected</div>
                        <div className="text-xs text-gray-400">Weighted pipeline</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(data?.kpis.totalPipelineValue || 0)}
                        </div>
                        <div className="text-sm text-gray-500">Best Case</div>
                        <div className="text-xs text-gray-400">All deals close</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Historical Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Historical Performance</CardTitle>
                  <CardDescription>Track record for forecasting accuracy</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={data?.monthlyTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="created"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Deals Created"
                        />
                        <Line
                          type="monotone"
                          dataKey="won"
                          stroke="#22c55e"
                          strokeWidth={2}
                          name="Deals Won"
                        />
                        <Line
                          type="monotone"
                          dataKey="lost"
                          stroke="#ef4444"
                          strokeWidth={2}
                          name="Deals Lost"
                        />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
