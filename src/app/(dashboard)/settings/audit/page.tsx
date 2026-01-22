"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Search,
  Shield,
  User,
  Clock,
  Globe,
  Activity,
  RotateCcw,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[];
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface LoginHistory {
  id: string;
  userId: string;
  email: string;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
}

interface DeletedRecord {
  id: string;
  entity: string;
  entityId: string;
  recordData: Record<string, unknown>;
  deletedByName: string | null;
  deletedAt: string;
  recoverable: boolean;
  purgeAfter: string | null;
}

interface ExportRequest {
  id: string;
  exportType: string;
  status: string;
  progress: number;
  fileUrl: string | null;
  requestedAt: string;
  completedAt: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  RESTORE: "bg-purple-100 text-purple-800",
  LOGIN: "bg-cyan-100 text-cyan-800",
  LOGOUT: "bg-gray-100 text-gray-800",
  EXPORT: "bg-orange-100 text-orange-800",
  IMPORT: "bg-yellow-100 text-yellow-800",
  VIEW: "bg-slate-100 text-slate-800",
  SHARE: "bg-indigo-100 text-indigo-800",
};

const ENTITIES = ["contact", "company", "deal", "quote", "task", "product", "user"];
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "RESTORE", "LOGIN", "LOGOUT", "EXPORT", "IMPORT"];

export default function AuditSettingsPage() {
  const [activeTab, setActiveTab] = useState("audit");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filters
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stats
  const [loginStats, setLoginStats] = useState({ totalLogins: 0, failedAttempts: 0, successRate: 0 });
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({});

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter && entityFilter !== "__all__") params.set("entity", entityFilter);
      if (actionFilter && actionFilter !== "__all__") params.set("action", actionFilter);
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);
      params.set("page", page.toString());

      const response = await fetch(`/api/audit?${params}`);
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [entityFilter, actionFilter, dateFrom, dateTo, page]);

  const fetchLoginHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/login-history?limit=100");
      const data = await response.json();
      if (data.success) {
        setLoginHistory(data.data);
        setLoginStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch login history:", error);
    }
  }, []);

  const fetchDeletedRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("recoverable", "true");
      if (entityFilter && entityFilter !== "__all__") params.set("entity", entityFilter);

      const response = await fetch(`/api/deleted-records?${params}`);
      const data = await response.json();
      if (data.success) {
        setDeletedRecords(data.data);
        setEntityCounts(data.entityCounts);
      }
    } catch (error) {
      console.error("Failed to fetch deleted records:", error);
    }
  }, [entityFilter]);

  const fetchExportRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/audit/export");
      const data = await response.json();
      if (data.success) {
        setExportRequests(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch export requests:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    } else if (activeTab === "logins") {
      fetchLoginHistory();
    } else if (activeTab === "deleted") {
      fetchDeletedRecords();
    } else if (activeTab === "exports") {
      fetchExportRequests();
    }
  }, [activeTab, fetchAuditLogs, fetchLoginHistory, fetchDeletedRecords, fetchExportRequests]);

  const handleRestoreRecord = async (record: DeletedRecord) => {
    try {
      const response = await fetch("/api/deleted-records/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${record.entity} restored successfully`);
        fetchDeletedRecords();
      } else {
        toast.error(data.error?.message || "Failed to restore record");
      }
    } catch (error) {
      console.error("Failed to restore record:", error);
      toast.error("Failed to restore record");
    }
  };

  const handleRequestExport = async (exportType: string) => {
    try {
      const response = await fetch("/api/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "current-user", // In real app, get from session
          userEmail: "user@example.com", // In real app, get from session
          exportType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Export request created. You'll be notified when it's ready.");
        fetchExportRequests();
      } else {
        toast.error(data.error?.message || "Failed to create export request");
      }
    } catch (error) {
      console.error("Failed to request export:", error);
      toast.error("Failed to request export");
    }
  };

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit & Compliance</h1>
        <p className="text-muted-foreground">
          View audit logs, login history, and manage deleted records
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="logins" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Login History
          </TabsTrigger>
          <TabsTrigger value="deleted" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Deleted Records
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Data Exports
          </TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Entity</Label>
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All entities</SelectItem>
                      {ENTITIES.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {entity.charAt(0).toUpperCase() + entity.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All actions</SelectItem>
                      {ACTIONS.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Changed Fields</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={ACTION_COLORS[log.action] || "bg-gray-100"}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium capitalize">{log.entity}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-32">
                              {log.entityId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{log.userName || "System"}</div>
                              <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.changedFields.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.changedFields.slice(0, 3).map((field) => (
                                <Badge key={field} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                              {log.changedFields.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{log.changedFields.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.ipAddress ? (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              {log.ipAddress}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => viewLogDetails(log)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="logins" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{loginStats.totalLogins}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{loginStats.failedAttempts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loginStats.successRate}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Browser / OS</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell>
                        {entry.success ? (
                          <Badge className="bg-green-100 text-green-800">Success</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            Failed: {entry.failureReason || "Unknown"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.browser && entry.os ? `${entry.browser} / ${entry.os}` : "-"}
                      </TableCell>
                      <TableCell className="capitalize">{entry.device || "-"}</TableCell>
                      <TableCell>{entry.ipAddress || "-"}</TableCell>
                      <TableCell>
                        {entry.city && entry.country
                          ? `${entry.city}, ${entry.country}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deleted Records Tab */}
        <TabsContent value="deleted" className="space-y-4">
          <div className="grid grid-cols-6 gap-4">
            {Object.entries(entityCounts).map(([entity, count]) => (
              <Card key={entity}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize">{entity}s</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recoverable Records</CardTitle>
              <CardDescription>
                Records that were soft-deleted and can be restored
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Deleted By</TableHead>
                    <TableHead>Deleted At</TableHead>
                    <TableHead>Purge Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No deleted records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    deletedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="capitalize font-medium">{record.entity}</TableCell>
                        <TableCell className="font-mono text-xs">{record.entityId}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {getRecordPreview(record.recordData)}
                        </TableCell>
                        <TableCell>{record.deletedByName || "Unknown"}</TableCell>
                        <TableCell>
                          {format(new Date(record.deletedAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {record.purgeAfter
                            ? format(new Date(record.purgeAfter), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreRecord(record)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Exports Tab */}
        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Data Export</CardTitle>
              <CardDescription>
                Export your data for compliance purposes (GDPR, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { type: "full", label: "Full Export", desc: "All your data" },
                  { type: "contacts", label: "Contacts", desc: "All contacts" },
                  { type: "audit", label: "Audit Logs", desc: "Activity history" },
                ].map(({ type, label, desc }) => (
                  <Card key={type} className="cursor-pointer hover:border-primary transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{label}</div>
                          <div className="text-sm text-muted-foreground">{desc}</div>
                        </div>
                        <Button size="sm" onClick={() => handleRequestExport(type)}>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No export requests yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    exportRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="capitalize">{request.exportType}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              request.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : request.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${request.progress}%` }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.requestedAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {request.completedAt
                            ? format(new Date(request.completedAt), "MMM d, yyyy HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === "completed" && request.fileUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={request.fileUrl} download>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Log Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Full details of this audit event
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <div>
                    <Badge className={ACTION_COLORS[selectedLog.action] || "bg-gray-100"}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <div>{format(new Date(selectedLog.createdAt), "PPpp")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity</Label>
                  <div className="capitalize">{selectedLog.entity}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity ID</Label>
                  <div className="font-mono text-sm">{selectedLog.entityId}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <div>
                    {selectedLog.userName || "System"}
                    {selectedLog.userEmail && (
                      <div className="text-sm text-muted-foreground">{selectedLog.userEmail}</div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <div>{selectedLog.ipAddress || "-"}</div>
                </div>
              </div>

              {selectedLog.changedFields.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Changed Fields</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLog.changedFields.map((field) => (
                      <Badge key={field} variant="outline">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.previousValues && (
                <div>
                  <Label className="text-muted-foreground">Previous Values</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.previousValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <Label className="text-muted-foreground">New Values</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <Label className="text-muted-foreground">User Agent</Label>
                  <div className="text-sm text-muted-foreground break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to get a preview string for deleted records
function getRecordPreview(data: Record<string, unknown>): string {
  const name = data.name || data.title || data.firstName;
  const email = data.email;

  if (name && email) {
    return `${name} (${email})`;
  }
  if (name) {
    return String(name);
  }
  if (email) {
    return String(email);
  }
  return "Record";
}
