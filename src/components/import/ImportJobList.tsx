"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  MoreVertical,
  RotateCcw,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImportJob {
  id: string;
  name: string;
  targetEntity: string;
  sourceType: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "ROLLED_BACK";
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  errors: string[] | null;
  canRollback: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  dataSource?: {
    name: string;
  };
}

interface ImportJobListProps {
  className?: string;
  onRefresh?: () => void;
}

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    color: "bg-slate-100 text-slate-700",
  },
  PROCESSING: {
    label: "Processing",
    icon: Loader2,
    color: "bg-blue-100 text-blue-700",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle,
    color: "bg-green-100 text-green-700",
  },
  FAILED: {
    label: "Failed",
    icon: XCircle,
    color: "bg-red-100 text-red-700",
  },
  ROLLED_BACK: {
    label: "Rolled Back",
    icon: RotateCcw,
    color: "bg-orange-100 text-orange-700",
  },
};

export function ImportJobList({ className, onRefresh }: ImportJobListProps) {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/import/jobs");
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      toast.error("Failed to load import jobs", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    // Poll for updates if any job is processing
    const interval = setInterval(() => {
      if (jobs.some((j) => j.status === "PROCESSING")) {
        fetchJobs();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs, jobs]);

  const handleViewDetails = (job: ImportJob) => {
    setSelectedJob(job);
    setIsDetailOpen(true);
  };

  const handleRollback = async (job: ImportJob) => {
    if (!window.confirm(`Rollback import "${job.name}"? This will undo all changes.`)) {
      return;
    }

    setRollingBack(job.id);
    try {
      const res = await fetch(`/api/import/jobs/${job.id}/rollback`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
      }
    } catch (error) {
      console.error("Failed to rollback:", error);
      toast.error("Failed to rollback import", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setRollingBack(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  const calculateProgress = (job: ImportJob) => {
    if (job.totalRows === 0) return 0;
    return Math.round(
      ((job.importedRows + job.updatedRows + job.skippedRows + job.errorRows) /
        job.totalRows) *
        100
    );
  };

  if (loading) {
    return (
      <div className={cn("p-4 text-center text-sm text-slate-500", className)}>
        Loading import jobs...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileSpreadsheet className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium mb-1">No Import Jobs</h3>
          <p className="text-sm text-muted-foreground">
            Start an import to see jobs here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Recent Imports</h3>
        <Button variant="outline" size="sm" onClick={fetchJobs}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Import</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const statusConfig = STATUS_CONFIG[job.status];
              const StatusIcon = statusConfig.icon;
              const progress = calculateProgress(job);

              return (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-medium">{job.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.totalRows} rows
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {job.sourceType.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{job.targetEntity}</TableCell>
                  <TableCell className="w-[150px]">
                    {job.status === "PROCESSING" ? (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {progress}%
                        </div>
                      </div>
                    ) : job.status === "COMPLETED" || job.status === "FAILED" ? (
                      <div className="text-sm">
                        <span className="text-green-600">{job.importedRows}</span>
                        {job.updatedRows > 0 && (
                          <span className="text-blue-600 ml-1">+{job.updatedRows}</span>
                        )}
                        {job.errorRows > 0 && (
                          <span className="text-red-600 ml-1">({job.errorRows} errors)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig.color}>
                      <StatusIcon
                        className={cn(
                          "h-3 w-3 mr-1",
                          job.status === "PROCESSING" && "animate-spin"
                        )}
                      />
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(job.completedAt || job.startedAt || job.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(job)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {job.canRollback &&
                          (job.status === "COMPLETED" || job.status === "FAILED") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRollback(job)}
                                disabled={rollingBack === job.id}
                                className="text-orange-600"
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {rollingBack === job.id ? "Rolling back..." : "Rollback"}
                              </DropdownMenuItem>
                            </>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Job Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Job Details</DialogTitle>
            <DialogDescription>{selectedJob?.name}</DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{selectedJob.totalRows}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedJob.importedRows}
                  </div>
                  <div className="text-xs text-muted-foreground">Imported</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedJob.updatedRows}
                  </div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-600">
                    {selectedJob.skippedRows}
                  </div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedJob.errorRows}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Source Type:</span>
                  <span className="ml-2 font-medium">
                    {selectedJob.sourceType.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Target:</span>
                  <span className="ml-2 font-medium capitalize">
                    {selectedJob.targetEntity}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Started:</span>
                  <span className="ml-2">{formatDate(selectedJob.startedAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="ml-2">{formatDate(selectedJob.completedAt)}</span>
                </div>
              </div>

              {/* Errors */}
              {selectedJob.errors && selectedJob.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Errors ({selectedJob.errors.length})
                  </h4>
                  <div className="bg-red-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedJob.errors.map((err, i) => (
                      <p key={i} className="text-sm text-red-700 mb-1">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedJob.canRollback &&
                (selectedJob.status === "COMPLETED" || selectedJob.status === "FAILED") && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleRollback(selectedJob);
                        setIsDetailOpen(false);
                      }}
                      disabled={rollingBack === selectedJob.id}
                      className="text-orange-600"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rollback Import
                    </Button>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ImportJobList;
