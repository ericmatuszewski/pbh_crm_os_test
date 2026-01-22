"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  Play,
  Download,
  Save,
  Filter,
  Columns,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  BookOpen,
  Clock,
  Mail,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { format } from "date-fns";

interface Field {
  name: string;
  type: string;
  label: string;
}

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | string[];
}

interface ReportResult {
  records: Record<string, unknown>[];
  fields: Field[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const operators: Record<string, { label: string; value: string }[]> = {
  string: [
    { label: "Equals", value: "equals" },
    { label: "Contains", value: "contains" },
    { label: "Starts with", value: "startsWith" },
    { label: "Ends with", value: "endsWith" },
    { label: "Is empty", value: "isNull" },
    { label: "Is not empty", value: "isNotNull" },
  ],
  number: [
    { label: "Equals", value: "equals" },
    { label: "Greater than", value: "gt" },
    { label: "Greater or equal", value: "gte" },
    { label: "Less than", value: "lt" },
    { label: "Less or equal", value: "lte" },
  ],
  date: [
    { label: "Equals", value: "equals" },
    { label: "After", value: "gt" },
    { label: "On or after", value: "gte" },
    { label: "Before", value: "lt" },
    { label: "On or before", value: "lte" },
    { label: "Is empty", value: "isNull" },
    { label: "Is not empty", value: "isNotNull" },
  ],
  enum: [
    { label: "Equals", value: "equals" },
    { label: "One of", value: "in" },
    { label: "Not one of", value: "notIn" },
  ],
};

const entityLabels: Record<string, string> = {
  contacts: "Contacts",
  deals: "Deals",
  tasks: "Tasks",
  companies: "Companies",
  quotes: "Quotes",
  activities: "Activities",
};

export default function ReportBuilderPage() {
  const [entity, setEntity] = useState<string>("contacts");
  const [fields, setFields] = useState<Field[]>([]);
  const [enumValues, setEnumValues] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<string>("desc");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [reportName, setReportName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedReports, setSavedReports] = useState<{ id: string; name: string; entity: string }[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("daily");
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleTime, setScheduleTime] = useState<string>("09:00");
  const [recipients, setRecipients] = useState<string>("");

  // Fetch fields for selected entity
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch(`/api/reports/execute?entity=${entity}`);
        const data = await response.json();
        if (data.success) {
          setFields(data.data.fields);
          setEnumValues(data.data.enumValues || {});
          // Select all columns by default
          setSelectedColumns(data.data.fields.map((f: Field) => f.name));
          setFilters([]);
          setResult(null);
        }
      } catch (error) {
        console.error("Failed to fetch fields:", error);
      }
    };
    fetchFields();
  }, [entity]);

  // Fetch saved reports
  useEffect(() => {
    const fetchSavedReports = async () => {
      try {
        const response = await fetch("/api/reports");
        const data = await response.json();
        if (data.success) {
          setSavedReports(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch saved reports:", error);
      }
    };
    fetchSavedReports();
  }, []);

  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: crypto.randomUUID(),
        field: fields[0]?.name || "",
        operator: "equals",
        value: "",
      },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    setFilters(
      filters.map((f) =>
        f.id === id
          ? { ...f, ...updates }
          : f
      )
    );
  };

  const toggleColumn = (columnName: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((c) => c !== columnName)
        : [...prev, columnName]
    );
  };

  const runReport = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      // Build filter conditions - only include filters with values (or null operators)
      const validFilters = filters
        .filter((f) => f.field && (f.value || f.operator === "isNull" || f.operator === "isNotNull"))
        .map((f) => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
        }));

      const response = await fetch("/api/reports/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          filters: validFilters,
          columns: selectedColumns,
          sortField,
          sortDirection,
          page: pageNum,
          limit: 25,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to run report:", error);
    } finally {
      setLoading(false);
    }
  }, [entity, filters, selectedColumns, sortField, sortDirection]);

  const exportToCSV = () => {
    if (!result || result.records.length === 0) return;

    const headers = selectedColumns;
    const rows = result.records.map((record) =>
      headers.map((h) => {
        const value = record[h];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") {
          // Handle nested objects like company, contact, etc.
          return (value as { name?: string; firstName?: string; lastName?: string }).name
            || `${(value as { firstName?: string }).firstName || ""} ${(value as { lastName?: string }).lastName || ""}`.trim()
            || JSON.stringify(value);
        }
        if (value instanceof Date || (typeof value === "string" && !isNaN(Date.parse(value)))) {
          return format(new Date(value as string), "yyyy-MM-dd HH:mm:ss");
        }
        return String(value);
      })
    );

    const csv = [
      headers.map((h) => fields.find((f) => f.name === h)?.label || h).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}_report_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveReport = async () => {
    if (!reportName.trim()) return;

    try {
      const validFilters = filters
        .filter((f) => f.field && (f.value || f.operator === "isNull" || f.operator === "isNotNull"))
        .map((f) => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
        }));

      const recipientList = recipients
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportName,
          entity,
          filters: validFilters,
          columns: selectedColumns,
          sortField,
          sortDirection,
          isScheduled,
          scheduleFrequency: isScheduled ? scheduleFrequency : null,
          scheduleDay: isScheduled ? scheduleDay : null,
          scheduleTime: isScheduled ? scheduleTime : null,
          recipients: recipientList,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedReports([data.data, ...savedReports]);
        setReportName("");
        setIsScheduled(false);
        setRecipients("");
        setShowSaveDialog(false);
      }
    } catch (error) {
      console.error("Failed to save report:", error);
    }
  };

  const loadReport = async (report: { id: string; name: string; entity: string }) => {
    try {
      const response = await fetch(`/api/reports/${report.id}`);
      const data = await response.json();
      if (data.success) {
        const r = data.data;
        setEntity(r.entity);
        setSelectedColumns(r.columns || []);
        setSortField(r.sortField || "createdAt");
        setSortDirection(r.sortDirection || "desc");

        // Load filters
        const loadedFilters = (r.filters || []).map((f: { field: string; operator: string; value: string | string[] }) => ({
          id: crypto.randomUUID(),
          ...f,
        }));
        setFilters(loadedFilters);
      }
    } catch (error) {
      console.error("Failed to load report:", error);
    }
  };

  const renderCellValue = (record: Record<string, unknown>, field: string) => {
    const value = record[field];

    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }

    if (typeof value === "object" && value !== null) {
      // Handle nested objects
      const obj = value as Record<string, unknown>;
      if ("firstName" in obj && "lastName" in obj) {
        return `${obj.firstName} ${obj.lastName}`;
      }
      if ("name" in obj) {
        return String(obj.name);
      }
      return JSON.stringify(value);
    }

    // Handle dates
    if (field.includes("At") || field.includes("Date")) {
      try {
        return format(new Date(value as string), "MMM d, yyyy");
      } catch {
        return String(value);
      }
    }

    // Handle currency values
    if (field === "value" || field === "total" || field === "subtotal") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(Number(value));
    }

    // Handle enums with badges
    const fieldDef = fields.find((f) => f.name === field);
    if (fieldDef?.type === "enum") {
      return <Badge variant="secondary">{String(value).replace(/_/g, " ")}</Badge>;
    }

    return String(value);
  };

  const getFieldType = (fieldName: string) => {
    return fields.find((f) => f.name === fieldName)?.type || "string";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Report Builder</h1>
          <p className="text-muted-foreground">
            Build custom reports by filtering any entity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reports">
            <Button variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar with saved reports */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Saved Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved reports yet</p>
              ) : (
                savedReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => loadReport(report)}
                    className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entityLabels[report.entity]}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="col-span-9 space-y-6">
          {/* Entity Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Entity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(entityLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={entity === key ? "default" : "outline"}
                    onClick={() => setEntity(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addFilter}>
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </CardHeader>
            <CardContent>
              {filters.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No filters added. Click &quot;Add Filter&quot; to narrow down results.
                </p>
              ) : (
                <div className="space-y-3">
                  {filters.map((filter) => {
                    const fieldType = getFieldType(filter.field);
                    const availableOperators = operators[fieldType] || operators.string;
                    const isNullOperator = filter.operator === "isNull" || filter.operator === "isNotNull";
                    const showEnumSelect = fieldType === "enum" && enumValues[filter.field];

                    return (
                      <div key={filter.id} className="flex items-center gap-2">
                        <Select
                          value={filter.field}
                          onValueChange={(v) => updateFilter(filter.id, { field: v, value: "" })}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map((f) => (
                              <SelectItem key={f.name} value={f.name}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={filter.operator}
                          onValueChange={(v) => updateFilter(filter.id, { operator: v })}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOperators.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!isNullOperator && (
                          showEnumSelect ? (
                            <Select
                              value={filter.value as string}
                              onValueChange={(v) => updateFilter(filter.id, { value: v })}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select value..." />
                              </SelectTrigger>
                              <SelectContent>
                                {enumValues[filter.field].map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {val.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : fieldType === "date" ? (
                            <Input
                              type="date"
                              value={filter.value as string}
                              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                              className="w-[180px]"
                            />
                          ) : fieldType === "number" ? (
                            <Input
                              type="number"
                              value={filter.value as string}
                              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                              placeholder="Enter value..."
                              className="w-[180px]"
                            />
                          ) : (
                            <Input
                              value={filter.value as string}
                              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                              placeholder="Enter value..."
                              className="w-[180px]"
                            />
                          )
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFilter(filter.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Columns & Sorting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Columns className="h-5 w-5" />
                Columns & Sorting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Select Columns to Display
                  </Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                    {fields.map((field) => (
                      <div key={field.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.name}
                          checked={selectedColumns.includes(field.name)}
                          onCheckedChange={() => toggleColumn(field.name)}
                        />
                        <label
                          htmlFor={field.name}
                          className="text-sm cursor-pointer"
                        >
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Sort By
                    </Label>
                    <div className="flex gap-2">
                      <Select value={sortField} onValueChange={setSortField}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map((f) => (
                            <SelectItem key={f.name} value={f.name}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={sortDirection} onValueChange={setSortDirection}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => runReport(1)} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              {loading ? "Running..." : "Run Report"}
            </Button>
            {result && result.records.length > 0 && (
              <>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(!showSaveDialog)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Report
                </Button>
              </>
            )}
          </div>

          {/* Save Dialog */}
          {showSaveDialog && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Save Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Report Name</Label>
                  <Input
                    placeholder="e.g., Monthly Sales Summary"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Schedule Report</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically run and email this report
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isScheduled}
                    onCheckedChange={setIsScheduled}
                  />
                </div>

                {isScheduled && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Frequency</Label>
                        <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {scheduleFrequency === "weekly" && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Day of Week</Label>
                          <Select
                            value={String(scheduleDay)}
                            onValueChange={(v) => setScheduleDay(Number(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {scheduleFrequency === "monthly" && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Day of Month</Label>
                          <Select
                            value={String(scheduleDay)}
                            onValueChange={(v) => setScheduleDay(Number(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Time</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Recipients (comma-separated emails)
                      </Label>
                      <Input
                        placeholder="john@example.com, jane@example.com"
                        value={recipients}
                        onChange={(e) => setRecipients(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveReport} disabled={!reportName.trim()}>
                    Save Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Results ({result.meta.total} records)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runReport(page - 1)}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {result.meta.page} of {result.meta.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runReport(page + 1)}
                    disabled={page >= result.meta.totalPages || loading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {result.records.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No records found matching your criteria
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {selectedColumns.map((col) => (
                            <TableHead
                              key={col}
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => {
                                if (sortField === col) {
                                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                                } else {
                                  setSortField(col);
                                  setSortDirection("asc");
                                }
                              }}
                            >
                              <div className="flex items-center gap-1">
                                {fields.find((f) => f.name === col)?.label || col}
                                {sortField === col && (
                                  <ArrowUpDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.records.map((record, idx) => (
                          <TableRow key={record.id as string || idx}>
                            {selectedColumns.map((col) => (
                              <TableCell key={col}>
                                {renderCellValue(record, col)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
