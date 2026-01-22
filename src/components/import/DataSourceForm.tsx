"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ImportSourceType =
  | "ORACLE_DB"
  | "MYSQL_DB"
  | "POSTGRESQL_DB"
  | "MSSQL_DB"
  | "CSV_FILE"
  | "JSON_FILE"
  | "XML_FILE"
  | "REST_API";

interface DataSource {
  id?: string;
  name: string;
  sourceType: ImportSourceType;
  connectionConfig: Record<string, unknown>;
  isActive: boolean;
}

interface DataSourceFormProps {
  dataSource?: DataSource | null;
  onSave: (data: DataSource) => Promise<void>;
  onCancel: () => void;
  onTestConnection?: (data: DataSource) => Promise<{ success: boolean; message?: string }>;
}

const SOURCE_TYPE_CONFIG = {
  ORACLE_DB: {
    label: "Oracle Database",
    icon: Database,
    color: "text-red-600",
    fields: ["host", "port", "sid", "user", "password"],
  },
  MYSQL_DB: {
    label: "MySQL Database",
    icon: Database,
    color: "text-blue-600",
    fields: ["host", "port", "database", "user", "password"],
  },
  POSTGRESQL_DB: {
    label: "PostgreSQL Database",
    icon: Database,
    color: "text-sky-600",
    fields: ["host", "port", "database", "user", "password", "ssl"],
  },
  MSSQL_DB: {
    label: "SQL Server",
    icon: Database,
    color: "text-purple-600",
    fields: ["host", "port", "database", "user", "password", "encrypt"],
  },
  CSV_FILE: {
    label: "CSV File",
    icon: FileSpreadsheet,
    color: "text-green-600",
    fields: ["delimiter", "hasHeader", "encoding"],
  },
  JSON_FILE: {
    label: "JSON File",
    icon: FileJson,
    color: "text-yellow-600",
    fields: ["rootPath"],
  },
  XML_FILE: {
    label: "XML File",
    icon: FileCode,
    color: "text-orange-600",
    fields: ["rootElement", "rowElement"],
  },
  REST_API: {
    label: "REST API",
    icon: Globe,
    color: "text-indigo-600",
    fields: ["baseUrl", "authType", "authConfig", "headers"],
  },
};

const FIELD_LABELS: Record<string, string> = {
  host: "Host",
  port: "Port",
  database: "Database Name",
  sid: "SID/Service Name",
  user: "Username",
  password: "Password",
  ssl: "Use SSL",
  encrypt: "Encrypt Connection",
  delimiter: "Delimiter",
  hasHeader: "Has Header Row",
  encoding: "File Encoding",
  rootPath: "Root JSON Path",
  rootElement: "Root Element",
  rowElement: "Row Element",
  baseUrl: "Base URL",
  authType: "Authentication Type",
  authConfig: "Auth Configuration",
  headers: "Custom Headers",
};

const DEFAULT_PORTS: Record<string, number> = {
  ORACLE_DB: 1521,
  MYSQL_DB: 3306,
  POSTGRESQL_DB: 5432,
  MSSQL_DB: 1433,
};

export function DataSourceForm({
  dataSource,
  onSave,
  onCancel,
  onTestConnection,
}: DataSourceFormProps) {
  const [name, setName] = useState(dataSource?.name || "");
  const [sourceType, setSourceType] = useState<ImportSourceType>(
    dataSource?.sourceType || "POSTGRESQL_DB"
  );
  const [config, setConfig] = useState<Record<string, unknown>>(
    dataSource?.connectionConfig || {}
  );
  const [isActive, setIsActive] = useState(dataSource?.isActive ?? true);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset config when source type changes
  useEffect(() => {
    if (!dataSource) {
      const defaults: Record<string, unknown> = {};
      if (["ORACLE_DB", "MYSQL_DB", "POSTGRESQL_DB", "MSSQL_DB"].includes(sourceType)) {
        defaults.port = DEFAULT_PORTS[sourceType];
      }
      if (sourceType === "CSV_FILE") {
        defaults.delimiter = ",";
        defaults.hasHeader = true;
        defaults.encoding = "utf-8";
      }
      if (sourceType === "REST_API") {
        defaults.authType = "none";
      }
      setConfig(defaults);
    }
  }, [sourceType, dataSource]);

  const handleConfigChange = (field: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!onTestConnection) return;

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await onTestConnection({
        name,
        sourceType,
        connectionConfig: config,
        isActive,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: dataSource?.id,
        name,
        sourceType,
        connectionConfig: config,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const renderConfigField = (field: string) => {
    const label = FIELD_LABELS[field] || field;
    const value = config[field];

    // Password field
    if (field === "password") {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <div className="relative">
            <Input
              id={field}
              type={showPassword ? "text" : "password"}
              value={(value as string) || ""}
              onChange={(e) => handleConfigChange(field, e.target.value)}
              placeholder="Enter password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      );
    }

    // Boolean fields
    if (["ssl", "encrypt", "hasHeader"].includes(field)) {
      return (
        <div key={field} className="flex items-center justify-between py-2">
          <Label htmlFor={field}>{label}</Label>
          <Switch
            id={field}
            checked={value as boolean || false}
            onCheckedChange={(checked) => handleConfigChange(field, checked)}
          />
        </div>
      );
    }

    // Port field
    if (field === "port") {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input
            id={field}
            type="number"
            value={(value as number) || ""}
            onChange={(e) => handleConfigChange(field, parseInt(e.target.value) || "")}
            placeholder={`Default: ${DEFAULT_PORTS[sourceType] || ""}`}
          />
        </div>
      );
    }

    // Auth type for REST API
    if (field === "authType") {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Select
            value={(value as string) || "none"}
            onValueChange={(val) => handleConfigChange(field, val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Authentication</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="api_key">API Key</SelectItem>
              <SelectItem value="oauth2">OAuth 2.0</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Delimiter select
    if (field === "delimiter") {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Select
            value={(value as string) || ","}
            onValueChange={(val) => handleConfigChange(field, val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=",">Comma (,)</SelectItem>
              <SelectItem value=";">Semicolon (;)</SelectItem>
              <SelectItem value="\t">Tab</SelectItem>
              <SelectItem value="|">Pipe (|)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Headers/authConfig as JSON textarea
    if (["headers", "authConfig"].includes(field)) {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Textarea
            id={field}
            value={typeof value === "object" ? JSON.stringify(value, null, 2) : (value as string) || ""}
            onChange={(e) => {
              try {
                handleConfigChange(field, JSON.parse(e.target.value));
              } catch {
                // Keep as string if not valid JSON
              }
            }}
            placeholder={`{"key": "value"}`}
            className="font-mono text-sm"
            rows={3}
          />
        </div>
      );
    }

    // Default text input
    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <Input
          id={field}
          value={(value as string) || ""}
          onChange={(e) => handleConfigChange(field, e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    );
  };

  const sourceConfig = SOURCE_TYPE_CONFIG[sourceType];
  const Icon = sourceConfig.icon;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Source Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Oracle DB"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Source Type *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(SOURCE_TYPE_CONFIG).map(([type, config]) => {
                const TypeIcon = config.icon;
                const isSelected = sourceType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSourceType(type as ImportSourceType)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:border-slate-300"
                    )}
                  >
                    <TypeIcon className={cn("h-6 w-6", config.color)} />
                    <span className="text-xs text-center">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-xs text-muted-foreground">
                Enable this data source for imports
              </p>
            </div>
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      {/* Connection Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className={cn("h-5 w-5", sourceConfig.color)} />
            {sourceConfig.label} Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sourceConfig.fields.map((field) => renderConfigField(field))}
        </CardContent>
      </Card>

      {/* Test Connection */}
      {onTestConnection && ["ORACLE_DB", "MYSQL_DB", "POSTGRESQL_DB", "MSSQL_DB", "REST_API"].includes(sourceType) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Test Connection</h4>
                <p className="text-sm text-muted-foreground">
                  Verify the connection before saving
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>

            {testResult && (
              <div
                className={cn(
                  "mt-4 p-3 rounded-lg flex items-center gap-2",
                  testResult.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                )}
              >
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="text-sm">
                  {testResult.message || (testResult.success ? "Connection successful!" : "Connection failed")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !name}>
          {saving ? "Saving..." : dataSource?.id ? "Update" : "Create"} Data Source
        </Button>
      </div>
    </form>
  );
}

export default DataSourceForm;
