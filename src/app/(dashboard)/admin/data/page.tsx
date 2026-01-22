"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Download,
  HardDrive,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  FileDown,
  Users,
  Building,
  Target,
  ShoppingCart,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Backup {
  id: string;
  filename: string;
  fileSize: number | null;
  backupType: string;
  status: string;
  progress: number;
  errorMessage: string | null;
  triggeredByName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface CleanupConfig {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  retentionDays: number;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunRecords: number | null;
}

interface DataStats {
  core: {
    users: { total: number; active: number };
    contacts: number;
    companies: number;
    deals: number;
    products: number;
    quotes: number;
  };
  maintenance: Record<string, number>;
  lastBackup: {
    id: string;
    filename: string;
    completedAt: string;
    fileSize: number;
  } | null;
}

export default function DataManagementPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [cleanupConfigs, setCleanupConfigs] = useState<CleanupConfig[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data/backup");
      const data = await res.json();
      if (data.success) {
        setBackups(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch backups:", error);
    }
  }, []);

  const fetchCleanupConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data/cleanup");
      const data = await res.json();
      if (data.success) {
        setCleanupConfigs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch cleanup configs:", error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchBackups(), fetchCleanupConfigs(), fetchStats()]).finally(
      () => setLoading(false)
    );
  }, [fetchBackups, fetchCleanupConfigs, fetchStats]);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch("/api/admin/data/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupType: "full" }),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh backups list to show new backup
        setTimeout(() => {
          fetchBackups();
          setBackingUp(false);
        }, 2000);
      } else {
        alert(data.error?.message || "Failed to start backup");
        setBackingUp(false);
      }
    } catch (error) {
      console.error("Failed to start backup:", error);
      setBackingUp(false);
    }
  };

  const handleRunCleanup = async (configId: string, entity: string) => {
    setRunningCleanup(configId);
    try {
      const res = await fetch(`/api/admin/data/cleanup/${configId}`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchCleanupConfigs();
        fetchStats();
      } else {
        alert(data.error?.message || "Failed to run cleanup");
      }
    } catch (error) {
      console.error("Failed to run cleanup:", error);
    } finally {
      setRunningCleanup(null);
    }
  };

  const handleToggleCleanup = async (config: CleanupConfig) => {
    try {
      await fetch(`/api/admin/data/cleanup/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !config.isActive }),
      });
      fetchCleanupConfigs();
    } catch (error) {
      console.error("Failed to toggle cleanup:", error);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Data Management"
          subtitle="Backup, cleanup, and maintain your database"
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Admin Access Required</h4>
                <p className="text-sm text-amber-700 mt-1">
                  These operations can affect system data. Only administrators should
                  perform backups and cleanup operations.
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="backup">Backup</TabsTrigger>
              <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Core Data Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Core Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Users</span>
                      </div>
                      <span className="font-medium">
                        {stats?.core.users.active || 0} / {stats?.core.users.total || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Contacts</span>
                      </div>
                      <span className="font-medium">{stats?.core.contacts || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>Companies</span>
                      </div>
                      <span className="font-medium">{stats?.core.companies || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>Deals</span>
                      </div>
                      <span className="font-medium">{stats?.core.deals || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span>Products</span>
                      </div>
                      <span className="font-medium">{stats?.core.products || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>Quotes</span>
                      </div>
                      <span className="font-medium">{stats?.core.quotes || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Maintenance Data Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Maintenance Data
                    </CardTitle>
                    <CardDescription>Records eligible for cleanup</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stats?.maintenance &&
                      Object.entries(stats.maintenance).map(([key, count]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                {/* Last Backup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Last Backup
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats?.lastBackup ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Filename</p>
                          <p className="font-medium truncate">
                            {stats.lastBackup.filename}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Size</p>
                          <p className="font-medium">
                            {formatFileSize(stats.lastBackup.fileSize)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="font-medium">
                            {formatDate(stats.lastBackup.completedAt)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No backups yet</p>
                    )}
                    <Button
                      className="w-full mt-4"
                      onClick={handleBackup}
                      disabled={backingUp}
                    >
                      {backingUp ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Backup...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Create Backup Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Backup Tab */}
            <TabsContent value="backup">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Database Backups</CardTitle>
                    <CardDescription>
                      Create and manage database backups
                    </CardDescription>
                  </div>
                  <Button onClick={handleBackup} disabled={backingUp}>
                    {backingUp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Create Backup
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Triggered By</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-medium">
                            {backup.filename}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{backup.backupType}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(backup.status)}</TableCell>
                          <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(backup.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {backup.triggeredByName || "System"}
                          </TableCell>
                          <TableCell>
                            {backup.status === "completed" && (
                              <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {backups.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No backups yet. Create your first backup above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cleanup Tab */}
            <TabsContent value="cleanup">
              <Card>
                <CardHeader>
                  <CardTitle>Data Cleanup Configuration</CardTitle>
                  <CardDescription>
                    Configure automatic cleanup of old records to keep your database
                    lean
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Retention</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cleanupConfigs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">
                            {config.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {config.description}
                          </TableCell>
                          <TableCell>{config.retentionDays} days</TableCell>
                          <TableCell>
                            {stats?.maintenance?.[config.entity] ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {config.lastRunAt
                              ? formatDate(config.lastRunAt)
                              : "Never"}
                            {config.lastRunRecords !== null && (
                              <span className="text-xs ml-1">
                                ({config.lastRunRecords} cleaned)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={config.isActive}
                              onCheckedChange={() => handleToggleCleanup(config)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRunCleanup(config.id, config.entity)
                              }
                              disabled={runningCleanup === config.id}
                            >
                              {runningCleanup === config.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  Run
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
