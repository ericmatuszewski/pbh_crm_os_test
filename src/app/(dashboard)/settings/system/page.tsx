"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  CheckCircle,
  Clock,
  Database,
  AlertCircle,
  RefreshCw,
  Play,
  XCircle,
  RotateCcw,
  Trash2,
  Zap,
  Server,
  Timer,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  database: boolean;
  responseTime: {
    avg: number;
    p95: number;
  };
  errorRate: number;
  uptime: number;
}

interface PerformanceData {
  overview: {
    totalRequests: number;
    avgResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    slowRequestCount: number;
  };
  topEndpoints: Array<{
    endpoint: string;
    method: string;
    requestCount: number;
    avgResponseTime: number;
    maxResponseTime: number;
    errorCount: number;
  }>;
  slowQueries: Array<{
    query: string;
    duration: number;
    source: string | null;
    createdAt: string;
  }>;
  health: HealthData;
}

interface Job {
  id: string;
  type: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  progressMessage: string | null;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  user: { name: string | null; email: string | null } | null;
}

export default function SystemMonitoringPage() {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [period, setPeriod] = useState("1h");
  const [jobStatus, setJobStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch(`/api/performance?period=${period}&view=overview`);
      const data = await res.json();
      if (data.success) {
        setPerformance(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch performance:", error);
    }
  }, [period]);

  const fetchJobs = useCallback(async () => {
    try {
      const statusParam = jobStatus === "all" ? "" : `&status=${jobStatus}`;
      const res = await fetch(`/api/jobs?limit=20${statusParam}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    }
  }, [jobStatus]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPerformance(), fetchJobs()]);
    setLoading(false);
  }, [fetchPerformance, fetchJobs]);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleProcessJobs = async () => {
    try {
      await fetch("/api/jobs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });
      await fetchJobs();
    } catch (error) {
      console.error("Failed to process jobs:", error);
    }
  };

  const handleJobAction = async (jobId: string, action: "cancel" | "retry") => {
    try {
      await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, action }),
      });
      await fetchJobs();
    } catch (error) {
      console.error(`Failed to ${action} job:`, error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      await fetchJobs();
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case "unhealthy":
        return <Badge variant="destructive">Unhealthy</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  if (loading && !performance) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor system health, performance metrics, and background jobs
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Health Overview */}
      {performance?.health && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {getStatusBadge(performance.health.status)}
              <p className="text-xs text-muted-foreground mt-1">
                Uptime: {formatUptime(performance.health.uptime)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {performance.health.database ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-lg font-semibold">
                  {performance.health.database ? "Connected" : "Disconnected"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time (P95)</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performance.health.responseTime.p95}ms
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {performance.health.responseTime.avg}ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performance.health.errorRate.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance">
            <Activity className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <Zap className="mr-2 h-4 w-4" />
            Background Jobs
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Performance Metrics</h3>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrics Summary */}
          {performance?.overview && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performance.overview.totalRequests.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Max Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performance.overview.maxResponseTime}ms
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Slow Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performance.overview.slowRequestCount}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>Top Endpoints</CardTitle>
              <CardDescription>Most requested API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                    <TableHead className="text-right">Max Time</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance?.topEndpoints.map((endpoint, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">
                        {endpoint.endpoint}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{endpoint.method}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {endpoint.requestCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {endpoint.avgResponseTime}ms
                      </TableCell>
                      <TableCell className="text-right">
                        {endpoint.maxResponseTime}ms
                      </TableCell>
                      <TableCell className="text-right">
                        {endpoint.errorCount > 0 ? (
                          <span className="text-red-500">{endpoint.errorCount}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!performance?.topEndpoints ||
                    performance.topEndpoints.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No endpoint data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Slow Queries */}
          <Card>
            <CardHeader>
              <CardTitle>Slow Queries</CardTitle>
              <CardDescription>Database queries exceeding 500ms</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance?.slowQueries.map((query, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm max-w-md truncate">
                        {query.query}
                      </TableCell>
                      <TableCell>{query.source || "-"}</TableCell>
                      <TableCell className="text-right text-red-500">
                        {query.duration}ms
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(query.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!performance?.slowQueries ||
                    performance.slowQueries.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No slow queries detected
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Background Jobs</h3>
              <Select value={jobStatus} onValueChange={setJobStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleProcessJobs} variant="outline">
              <Play className="mr-2 h-4 w-4" />
              Process Jobs
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.name}</div>
                          {job.errorMessage && (
                            <div className="text-xs text-red-500 truncate max-w-xs">
                              {job.errorMessage}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        {job.status === "processing" ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <span className="text-xs">{job.progress}%</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {job.attempts}/{job.maxAttempts}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(job.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(job.status === "pending" ||
                            job.status === "processing") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleJobAction(job.id, "cancel")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {job.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleJobAction(job.id, "retry")}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {["completed", "failed", "cancelled"].includes(
                            job.status
                          ) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No jobs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
