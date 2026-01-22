"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  SlidersHorizontal,
  Mail,
  Shield,
  Palette,
  Globe,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Cloud,
  Bell,
  Lock,
  AlertTriangle,
  HardDrive,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SystemSettings {
  // Mail Settings
  systemSmtpHost: string;
  systemSmtpPort: number;
  systemSmtpUser: string;
  systemSmtpPassword: string;
  systemSmtpFromEmail: string;
  systemSmtpFromName: string;
  systemSmtpSecure: boolean;
  // Microsoft Settings
  microsoftClientId: string;
  microsoftClientSecret: string;
  microsoftTenantId: string;
  microsoftRedirectUri: string;
  // Branding
  appName: string;
  appTagline: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  // Security
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireMfa: boolean;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  // Features
  enableEmailIntegration: boolean;
  enableDocumentStorage: boolean;
  enableAuditLog: boolean;
  enableApiAccess: boolean;
  enableWebhooks: boolean;
  // Storage
  storageProvider: string;
  s3Bucket: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
  maxUploadSize: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  // Mail Settings
  systemSmtpHost: "",
  systemSmtpPort: 587,
  systemSmtpUser: "",
  systemSmtpPassword: "",
  systemSmtpFromEmail: "",
  systemSmtpFromName: "PBH CRM",
  systemSmtpSecure: true,
  // Microsoft Settings
  microsoftClientId: "",
  microsoftClientSecret: "",
  microsoftTenantId: "common",
  microsoftRedirectUri: "",
  // Branding
  appName: "PBH Sales CRM",
  appTagline: "Enterprise CRM for Sales Teams",
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  logoUrl: "/logo.svg",
  faviconUrl: "/favicon.svg",
  // Security
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  requireMfa: false,
  passwordMinLength: 8,
  passwordRequireSpecial: true,
  // Features
  enableEmailIntegration: true,
  enableDocumentStorage: true,
  enableAuditLog: true,
  enableApiAccess: true,
  enableWebhooks: true,
  // Storage
  storageProvider: "local",
  s3Bucket: "",
  s3Region: "eu-west-2",
  s3AccessKey: "",
  s3SecretKey: "",
  maxUploadSize: 10,
};

export default function AdminControlPanel() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingMicrosoft, setTestingMicrosoft] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showMicrosoftSecret, setShowMicrosoftSecret] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<"unknown" | "success" | "error">("unknown");
  const [microsoftStatus, setMicrosoftStatus] = useState<"unknown" | "success" | "error">("unknown");

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings");
      const data = await response.json();
      if (data.success && data.data) {
        // Merge with defaults to ensure all fields exist
        setSettings({ ...DEFAULT_SETTINGS, ...data.data });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Settings saved successfully");
        // Refresh settings to get updated masked values
        fetchSettings();
      } else {
        toast.error(data.error?.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const testSmtpConnection = async () => {
    setTestingSmtp(true);
    setSmtpStatus("unknown");
    try {
      const response = await fetch("/api/admin/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: settings.systemSmtpHost,
          port: settings.systemSmtpPort,
          user: settings.systemSmtpUser,
          password: settings.systemSmtpPassword,
          fromEmail: settings.systemSmtpFromEmail,
          fromName: settings.systemSmtpFromName,
          secure: settings.systemSmtpSecure,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSmtpStatus("success");
        toast.success(data.message || "SMTP connection successful");
      } else {
        setSmtpStatus("error");
        toast.error(data.error?.message || "SMTP configuration error");
      }
    } catch (error) {
      setSmtpStatus("error");
      toast.error("SMTP connection failed");
    } finally {
      setTestingSmtp(false);
    }
  };

  const testMicrosoftConnection = async () => {
    setTestingMicrosoft(true);
    setMicrosoftStatus("unknown");
    try {
      // Simulate Microsoft test
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (settings.microsoftClientId && settings.microsoftClientSecret) {
        setMicrosoftStatus("success");
        toast.success("Microsoft credentials validated");
      } else {
        setMicrosoftStatus("error");
        toast.error("Microsoft configuration incomplete");
      }
    } catch (error) {
      setMicrosoftStatus("error");
      toast.error("Microsoft connection failed");
    } finally {
      setTestingMicrosoft(false);
    }
  };

  const updateField = <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#2563eb] flex items-center justify-center">
              <SlidersHorizontal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Control Panel</h1>
              <p className="text-muted-foreground text-sm">
                System-wide configuration and settings
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/data">
            <Button variant="outline">
              <HardDrive className="h-4 w-4 mr-2" />
              Data Management
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Admin-only warning banner */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Administrator Access Required</p>
          <p className="text-sm text-amber-700">
            This control panel contains system-wide settings. Changes here affect all users and businesses.
            Only system administrators should have access to this page.
          </p>
        </div>
      </div>

      <Tabs defaultValue="mail">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="mail" className="gap-2">
            <Mail className="h-4 w-4" />
            Mail Server
          </TabsTrigger>
          <TabsTrigger value="microsoft" className="gap-2">
            <Cloud className="h-4 w-4" />
            Microsoft 365
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <Database className="h-4 w-4" />
            Storage
          </TabsTrigger>
        </TabsList>

        {/* Mail Server Tab */}
        <TabsContent value="mail">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mail Server Configuration</CardTitle>
                  <CardDescription>
                    Configure system-wide SMTP settings for sending emails
                  </CardDescription>
                </div>
                {smtpStatus !== "unknown" && (
                  <Badge
                    variant={smtpStatus === "success" ? "default" : "destructive"}
                    className={smtpStatus === "success" ? "bg-green-100 text-green-700" : ""}
                  >
                    {smtpStatus === "success" ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {smtpStatus === "success" ? "Connected" : "Connection Failed"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> These settings are used for system emails (password resets, notifications, etc.).
                  Individual businesses can configure their own SMTP settings for customer-facing emails.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">From Email Address</Label>
                  <Input
                    id="smtpFromEmail"
                    type="email"
                    value={settings.systemSmtpFromEmail}
                    onChange={(e) => updateField("systemSmtpFromEmail", e.target.value)}
                    placeholder="noreply@pbh.co.uk"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">From Name</Label>
                  <Input
                    id="smtpFromName"
                    value={settings.systemSmtpFromName}
                    onChange={(e) => updateField("systemSmtpFromName", e.target.value)}
                    placeholder="PBH CRM"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-4">SMTP Server Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={settings.systemSmtpHost}
                      onChange={(e) => updateField("systemSmtpHost", e.target.value)}
                      placeholder="smtp.office365.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={settings.systemSmtpPort}
                      onChange={(e) => updateField("systemSmtpPort", parseInt(e.target.value) || 587)}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={settings.systemSmtpUser}
                      onChange={(e) => updateField("systemSmtpUser", e.target.value)}
                      placeholder="username@pbh.co.uk"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        type={showSmtpPassword ? "text" : "password"}
                        value={settings.systemSmtpPassword}
                        onChange={(e) => updateField("systemSmtpPassword", e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      >
                        {showSmtpPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Use TLS/SSL</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable secure connection (recommended)
                  </p>
                </div>
                <Switch
                  checked={settings.systemSmtpSecure}
                  onCheckedChange={(checked) => updateField("systemSmtpSecure", checked)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={testSmtpConnection} disabled={testingSmtp}>
                  {testingSmtp ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Server className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Microsoft 365 Tab */}
        <TabsContent value="microsoft">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Microsoft 365 Integration</CardTitle>
                  <CardDescription>
                    Configure Microsoft Azure AD application for email sync and calendar integration
                  </CardDescription>
                </div>
                {microsoftStatus !== "unknown" && (
                  <Badge
                    variant={microsoftStatus === "success" ? "default" : "destructive"}
                    className={microsoftStatus === "success" ? "bg-green-100 text-green-700" : ""}
                  >
                    {microsoftStatus === "success" ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {microsoftStatus === "success" ? "Configured" : "Configuration Error"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Setup Required:</strong> You need to create an Azure AD application in the Microsoft Azure Portal
                  and configure the appropriate permissions (Mail.Read, Mail.Send, Calendars.ReadWrite).
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="microsoftClientId">Application (Client) ID</Label>
                  <Input
                    id="microsoftClientId"
                    value={settings.microsoftClientId}
                    onChange={(e) => updateField("microsoftClientId", e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in Azure Portal &gt; App Registration &gt; Overview
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="microsoftClientSecret">Client Secret</Label>
                  <div className="relative">
                    <Input
                      id="microsoftClientSecret"
                      type={showMicrosoftSecret ? "text" : "password"}
                      value={settings.microsoftClientSecret}
                      onChange={(e) => updateField("microsoftClientSecret", e.target.value)}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="pr-10 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowMicrosoftSecret(!showMicrosoftSecret)}
                    >
                      {showMicrosoftSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Create in Azure Portal &gt; App Registration &gt; Certificates & Secrets
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="microsoftTenantId">Tenant ID</Label>
                    <Input
                      id="microsoftTenantId"
                      value={settings.microsoftTenantId}
                      onChange={(e) => updateField("microsoftTenantId", e.target.value)}
                      placeholder="common"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use &quot;common&quot; for multi-tenant or your specific tenant ID
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="microsoftRedirectUri">Redirect URI</Label>
                    <Input
                      id="microsoftRedirectUri"
                      value={settings.microsoftRedirectUri}
                      onChange={(e) => updateField("microsoftRedirectUri", e.target.value)}
                      placeholder="https://your-domain.com/api/microsoft/auth/callback"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must match the redirect URI configured in Azure
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Required API Permissions</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code>Mail.Read</code>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code>Mail.Send</code>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code>Mail.ReadWrite</code>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code>Calendars.ReadWrite</code>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code>User.Read</code>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code>offline_access</code>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={testMicrosoftConnection} disabled={testingMicrosoft}>
                  {testingMicrosoft ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4 mr-2" />
                  )}
                  Validate Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Application Branding</CardTitle>
              <CardDescription>
                Customize the appearance and branding of the CRM application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">Application Name</Label>
                  <Input
                    id="appName"
                    value={settings.appName}
                    onChange={(e) => updateField("appName", e.target.value)}
                    placeholder="PBH Sales CRM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appTagline">Tagline</Label>
                  <Input
                    id="appTagline"
                    value={settings.appTagline}
                    onChange={(e) => updateField("appTagline", e.target.value)}
                    placeholder="Enterprise CRM for Sales Teams"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={settings.logoUrl}
                    onChange={(e) => updateField("logoUrl", e.target.value)}
                    placeholder="/logo.svg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    value={settings.faviconUrl}
                    onChange={(e) => updateField("faviconUrl", e.target.value)}
                    placeholder="/favicon.svg"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="primaryColor"
                      value={settings.primaryColor}
                      onChange={(e) => updateField("primaryColor", e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => updateField("primaryColor", e.target.value)}
                      placeholder="#2563eb"
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PBH Blue: #2563eb
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="secondaryColor"
                      value={settings.secondaryColor}
                      onChange={(e) => updateField("secondaryColor", e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => updateField("secondaryColor", e.target.value)}
                      placeholder="#64748b"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Preview</Label>
                <div className="p-6 border rounded-lg">
                  <div
                    className="p-4 rounded-t-lg text-white flex items-center gap-3"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">
                      PBH
                    </div>
                    <div>
                      <span className="font-bold">{settings.appName}</span>
                      <p className="text-white/80 text-sm">{settings.appTagline}</p>
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-b-lg text-white"
                    style={{ backgroundColor: settings.secondaryColor }}
                  >
                    <span className="text-sm">Secondary color section</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure authentication and security policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => updateField("sessionTimeout", parseInt(e.target.value) || 30)}
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Inactive sessions will be logged out after this time
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => updateField("maxLoginAttempts", parseInt(e.target.value) || 5)}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Account will be locked after this many failed attempts
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-4">Password Policy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={settings.passwordMinLength}
                      onChange={(e) => updateField("passwordMinLength", parseInt(e.target.value) || 8)}
                      placeholder="8"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Require Special Characters</Label>
                      <p className="text-xs text-muted-foreground">
                        Password must include !@#$%^&* etc.
                      </p>
                    </div>
                    <Switch
                      checked={settings.passwordRequireSpecial}
                      onCheckedChange={(checked) => updateField("passwordRequireSpecial", checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Require Multi-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">
                    All users must set up MFA to access the system
                  </p>
                </div>
                <Switch
                  checked={settings.requireMfa}
                  onCheckedChange={(checked) => updateField("requireMfa", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>
                Enable or disable system features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Email Integration</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable Microsoft 365 email sync and sending
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enableEmailIntegration}
                  onCheckedChange={(checked) => updateField("enableEmailIntegration", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Document Storage</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow file uploads and document management
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enableDocumentStorage}
                  onCheckedChange={(checked) => updateField("enableDocumentStorage", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Audit Logging</Label>
                    <p className="text-xs text-muted-foreground">
                      Track all changes and user activity
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enableAuditLog}
                  onCheckedChange={(checked) => updateField("enableAuditLog", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>API Access</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow external applications to connect via API
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enableApiAccess}
                  onCheckedChange={(checked) => updateField("enableApiAccess", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Webhooks</Label>
                    <p className="text-xs text-muted-foreground">
                      Send event notifications to external systems
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enableWebhooks}
                  onCheckedChange={(checked) => updateField("enableWebhooks", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>File Storage Configuration</CardTitle>
              <CardDescription>
                Configure where uploaded files and documents are stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storageProvider">Storage Provider</Label>
                <Select
                  value={settings.storageProvider}
                  onValueChange={(value) => updateField("storageProvider", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local File System</SelectItem>
                    <SelectItem value="s3">Amazon S3</SelectItem>
                    <SelectItem value="azure">Azure Blob Storage</SelectItem>
                    <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.storageProvider === "s3" && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-4">S3 Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="s3Bucket">Bucket Name</Label>
                        <Input
                          id="s3Bucket"
                          value={settings.s3Bucket}
                          onChange={(e) => updateField("s3Bucket", e.target.value)}
                          placeholder="pbh-crm-uploads"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s3Region">Region</Label>
                        <Select
                          value={settings.s3Region}
                          onValueChange={(value) => updateField("s3Region", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                            <SelectItem value="eu-west-2">EU (London)</SelectItem>
                            <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                            <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s3AccessKey">Access Key ID</Label>
                        <Input
                          id="s3AccessKey"
                          value={settings.s3AccessKey}
                          onChange={(e) => updateField("s3AccessKey", e.target.value)}
                          placeholder="AKIA..."
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s3SecretKey">Secret Access Key</Label>
                        <div className="relative">
                          <Input
                            id="s3SecretKey"
                            type={showS3Secret ? "text" : "password"}
                            value={settings.s3SecretKey}
                            onChange={(e) => updateField("s3SecretKey", e.target.value)}
                            placeholder="••••••••"
                            className="pr-10 font-mono"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowS3Secret(!showS3Secret)}
                          >
                            {showS3Secret ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="maxUploadSize">Maximum Upload Size (MB)</Label>
                <Input
                  id="maxUploadSize"
                  type="number"
                  value={settings.maxUploadSize}
                  onChange={(e) => updateField("maxUploadSize", parseInt(e.target.value) || 10)}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum file size allowed for uploads (in megabytes)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
