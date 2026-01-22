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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  Globe,
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Save,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expiryDays: number;
  preventReuse: number;
}

interface Session {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface SecuritySettings {
  mfaEnabled: boolean;
  mfaMethod: "app" | "sms" | "email";
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  allowRememberMe: boolean;
  passwordPolicy: PasswordPolicy;
}

const defaultSettings: SecuritySettings = {
  mfaEnabled: false,
  mfaMethod: "app",
  sessionTimeoutMinutes: 480,
  maxConcurrentSessions: 5,
  allowRememberMe: true,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    expiryDays: 90,
    preventReuse: 5,
  },
};

const demoSessions: Session[] = [
  {
    id: "1",
    deviceName: "MacBook Pro",
    deviceType: "desktop",
    browser: "Chrome 120",
    ipAddress: "192.168.1.100",
    location: "London, UK",
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: "2",
    deviceName: "iPhone 15",
    deviceType: "mobile",
    browser: "Safari",
    ipAddress: "192.168.1.101",
    location: "London, UK",
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    isCurrent: false,
  },
];

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
  const [sessions, setSessions] = useState<Session[]>(demoSessions);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/security");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      }
    } catch (error) {
      console.error("Failed to fetch security settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/users/me/sessions");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSessions(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchSessions();
  }, [fetchSettings, fetchSessions]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Security settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save security settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeSession = async () => {
    if (!selectedSession) return;

    try {
      const response = await fetch(`/api/users/me/sessions/${selectedSession.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Session revoked");
        setSessions((prev) => prev.filter((s) => s.id !== selectedSession.id));
      } else {
        toast.error("Failed to revoke session");
      }
    } catch (error) {
      console.error("Failed to revoke session:", error);
      toast.error("Failed to revoke session");
    } finally {
      setShowRevokeDialog(false);
      setSelectedSession(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      const response = await fetch("/api/users/me/sessions", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("All other sessions revoked");
        setSessions((prev) => prev.filter((s) => s.isCurrent));
      } else {
        toast.error("Failed to revoke sessions");
      }
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
      toast.error("Failed to revoke sessions");
    }
  };

  const updateSetting = <K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updatePasswordPolicy = <K extends keyof PasswordPolicy>(
    key: K,
    value: PasswordPolicy[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      passwordPolicy: { ...prev.passwordPolicy, [key]: value },
    }));
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "desktop":
        return <Monitor className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Security Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage password policies, authentication, and session security
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {settings.mfaEnabled ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Disabled
                </Badge>
              )}
              <Switch
                checked={settings.mfaEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setShowMfaDialog(true);
                  } else {
                    updateSetting("mfaEnabled", false);
                  }
                }}
              />
            </div>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        {settings.mfaEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <Select
                value={settings.mfaMethod}
                onValueChange={(value: "app" | "sms" | "email") =>
                  updateSetting("mfaMethod", value)
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">Authenticator App (Recommended)</SelectItem>
                  <SelectItem value="sms">SMS Text Message</SelectItem>
                  <SelectItem value="email">Email Code</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {settings.mfaMethod === "app" &&
                  "Use an authenticator app like Google Authenticator or Authy"}
                {settings.mfaMethod === "sms" &&
                  "Receive verification codes via SMS"}
                {settings.mfaMethod === "email" &&
                  "Receive verification codes via email"}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Password Policy</CardTitle>
          </div>
          <CardDescription>
            Configure password requirements for all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minLength">Minimum Password Length</Label>
              <Select
                value={settings.passwordPolicy.minLength.toString()}
                onValueChange={(value) =>
                  updatePasswordPolicy("minLength", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 8, 10, 12, 14, 16].map((len) => (
                    <SelectItem key={len} value={len.toString()}>
                      {len} characters
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDays">Password Expiry</Label>
              <Select
                value={settings.passwordPolicy.expiryDays.toString()}
                onValueChange={(value) =>
                  updatePasswordPolicy("expiryDays", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Never</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="mb-3 block">Password Requirements</Label>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="requireUppercase" className="font-normal">
                  Require uppercase letter (A-Z)
                </Label>
                <Switch
                  id="requireUppercase"
                  checked={settings.passwordPolicy.requireUppercase}
                  onCheckedChange={(checked) =>
                    updatePasswordPolicy("requireUppercase", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requireLowercase" className="font-normal">
                  Require lowercase letter (a-z)
                </Label>
                <Switch
                  id="requireLowercase"
                  checked={settings.passwordPolicy.requireLowercase}
                  onCheckedChange={(checked) =>
                    updatePasswordPolicy("requireLowercase", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requireNumbers" className="font-normal">
                  Require number (0-9)
                </Label>
                <Switch
                  id="requireNumbers"
                  checked={settings.passwordPolicy.requireNumbers}
                  onCheckedChange={(checked) =>
                    updatePasswordPolicy("requireNumbers", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requireSpecialChars" className="font-normal">
                  Require special character (!@#$%^&*)
                </Label>
                <Switch
                  id="requireSpecialChars"
                  checked={settings.passwordPolicy.requireSpecialChars}
                  onCheckedChange={(checked) =>
                    updatePasswordPolicy("requireSpecialChars", checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Prevent Password Reuse</Label>
            <Select
              value={settings.passwordPolicy.preventReuse.toString()}
              onValueChange={(value) =>
                updatePasswordPolicy("preventReuse", parseInt(value))
              }
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No restriction</SelectItem>
                <SelectItem value="3">Last 3 passwords</SelectItem>
                <SelectItem value="5">Last 5 passwords</SelectItem>
                <SelectItem value="10">Last 10 passwords</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Users cannot reuse recent passwords
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Session Settings</CardTitle>
          </div>
          <CardDescription>Configure session timeout and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Session Timeout</Label>
              <Select
                value={settings.sessionTimeoutMinutes.toString()}
                onValueChange={(value) =>
                  updateSetting("sessionTimeoutMinutes", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Concurrent Sessions</Label>
              <Select
                value={settings.maxConcurrentSessions.toString()}
                onValueChange={(value) =>
                  updateSetting("maxConcurrentSessions", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 session</SelectItem>
                  <SelectItem value="3">3 sessions</SelectItem>
                  <SelectItem value="5">5 sessions</SelectItem>
                  <SelectItem value="10">10 sessions</SelectItem>
                  <SelectItem value="0">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allowRememberMe" className="font-normal">
                Allow &quot;Remember Me&quot; option
              </Label>
              <p className="text-sm text-muted-foreground">
                Users can stay logged in for longer periods
              </p>
            </div>
            <Switch
              id="allowRememberMe"
              checked={settings.allowRememberMe}
              onCheckedChange={(checked) => updateSetting("allowRememberMe", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <CardTitle>Active Sessions</CardTitle>
            </div>
            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <Button variant="outline" size="sm" onClick={handleRevokeAllSessions}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out All Other Devices
              </Button>
            )}
          </div>
          <CardDescription>
            Manage your active sessions across devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(session.deviceType)}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {session.deviceName}
                          {session.isCurrent && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.browser}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      {session.location}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.ipAddress}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(session.lastActiveAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setShowRevokeDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MFA Setup Dialog */}
      <Dialog open={showMfaDialog} onOpenChange={setShowMfaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Two-factor authentication adds an extra layer of security to your
              account. You&apos;ll need to enter a verification code in addition to your
              password when signing in.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              After enabling, you&apos;ll be guided through the setup process for your
              chosen authentication method.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMfaDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateSetting("mfaEnabled", true);
                setShowMfaDialog(false);
                toast.success("Two-factor authentication enabled");
              }}
            >
              Enable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Session Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out this device? The user will need to
              sign in again.
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="py-4">
              <div className="flex items-center gap-2">
                {getDeviceIcon(selectedSession.deviceType)}
                <span className="font-medium">{selectedSession.deviceName}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedSession.location} • {selectedSession.ipAddress}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevokeSession}>
              Revoke Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
