"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Mail,
  MessageSquare,
  Calendar,
  Target,
  Users,
  FileText,
  AlertCircle,
  Save,
  Loader2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

interface NotificationSettings {
  // Email notifications
  emailEnabled: boolean;
  emailDealAssigned: boolean;
  emailDealStageChanged: boolean;
  emailDealWon: boolean;
  emailDealLost: boolean;
  emailTaskAssigned: boolean;
  emailTaskDueSoon: boolean;
  emailTaskOverdue: boolean;
  emailMeetingReminder: boolean;
  emailQuoteAccepted: boolean;
  emailQuoteRejected: boolean;
  emailNewContact: boolean;
  emailWeeklyDigest: boolean;
  // In-app notifications
  inAppEnabled: boolean;
  inAppDealUpdates: boolean;
  inAppTaskUpdates: boolean;
  inAppMentions: boolean;
  inAppSystemAlerts: boolean;
  // Digest settings
  digestFrequency: "daily" | "weekly" | "never";
}

const defaultSettings: NotificationSettings = {
  emailEnabled: true,
  emailDealAssigned: true,
  emailDealStageChanged: true,
  emailDealWon: true,
  emailDealLost: true,
  emailTaskAssigned: true,
  emailTaskDueSoon: true,
  emailTaskOverdue: true,
  emailMeetingReminder: true,
  emailQuoteAccepted: true,
  emailQuoteRejected: true,
  emailNewContact: false,
  emailWeeklyDigest: true,
  inAppEnabled: true,
  inAppDealUpdates: true,
  inAppTaskUpdates: true,
  inAppMentions: true,
  inAppSystemAlerts: true,
  digestFrequency: "weekly",
};

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/notifications");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      }
    } catch (error) {
      console.error("Failed to fetch notification settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Notification settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
            <Bell className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Notification Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Configure how and when you receive notifications
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

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email Notifications</CardTitle>
            </div>
            <Switch
              checked={settings.emailEnabled}
              onCheckedChange={(checked) => updateSetting("emailEnabled", checked)}
            />
          </div>
          <CardDescription>
            Receive email notifications for important updates
          </CardDescription>
        </CardHeader>
        {settings.emailEnabled && (
          <CardContent className="space-y-6">
            {/* Deals */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Deals</h4>
              </div>
              <div className="grid gap-3 ml-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailDealAssigned" className="font-normal">
                    Deal assigned to me
                  </Label>
                  <Switch
                    id="emailDealAssigned"
                    checked={settings.emailDealAssigned}
                    onCheckedChange={(checked) => updateSetting("emailDealAssigned", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailDealStageChanged" className="font-normal">
                    Deal stage changed
                  </Label>
                  <Switch
                    id="emailDealStageChanged"
                    checked={settings.emailDealStageChanged}
                    onCheckedChange={(checked) => updateSetting("emailDealStageChanged", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailDealWon" className="font-normal">
                    Deal won
                  </Label>
                  <Switch
                    id="emailDealWon"
                    checked={settings.emailDealWon}
                    onCheckedChange={(checked) => updateSetting("emailDealWon", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailDealLost" className="font-normal">
                    Deal lost
                  </Label>
                  <Switch
                    id="emailDealLost"
                    checked={settings.emailDealLost}
                    onCheckedChange={(checked) => updateSetting("emailDealLost", checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tasks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Tasks & Meetings</h4>
              </div>
              <div className="grid gap-3 ml-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailTaskAssigned" className="font-normal">
                    Task assigned to me
                  </Label>
                  <Switch
                    id="emailTaskAssigned"
                    checked={settings.emailTaskAssigned}
                    onCheckedChange={(checked) => updateSetting("emailTaskAssigned", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailTaskDueSoon" className="font-normal">
                    Task due soon (24 hours)
                  </Label>
                  <Switch
                    id="emailTaskDueSoon"
                    checked={settings.emailTaskDueSoon}
                    onCheckedChange={(checked) => updateSetting("emailTaskDueSoon", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailTaskOverdue" className="font-normal">
                    Task overdue
                  </Label>
                  <Switch
                    id="emailTaskOverdue"
                    checked={settings.emailTaskOverdue}
                    onCheckedChange={(checked) => updateSetting("emailTaskOverdue", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailMeetingReminder" className="font-normal">
                    Meeting reminders
                  </Label>
                  <Switch
                    id="emailMeetingReminder"
                    checked={settings.emailMeetingReminder}
                    onCheckedChange={(checked) => updateSetting("emailMeetingReminder", checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Quotes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Quotes</h4>
              </div>
              <div className="grid gap-3 ml-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailQuoteAccepted" className="font-normal">
                    Quote accepted by customer
                  </Label>
                  <Switch
                    id="emailQuoteAccepted"
                    checked={settings.emailQuoteAccepted}
                    onCheckedChange={(checked) => updateSetting("emailQuoteAccepted", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailQuoteRejected" className="font-normal">
                    Quote rejected by customer
                  </Label>
                  <Switch
                    id="emailQuoteRejected"
                    checked={settings.emailQuoteRejected}
                    onCheckedChange={(checked) => updateSetting("emailQuoteRejected", checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contacts */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Contacts</h4>
              </div>
              <div className="grid gap-3 ml-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailNewContact" className="font-normal">
                    New contact added to my accounts
                  </Label>
                  <Switch
                    id="emailNewContact"
                    checked={settings.emailNewContact}
                    onCheckedChange={(checked) => updateSetting("emailNewContact", checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Digest */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Summary Digest</h4>
              </div>
              <div className="grid gap-3 ml-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailWeeklyDigest" className="font-normal">
                    Weekly activity summary
                  </Label>
                  <Switch
                    id="emailWeeklyDigest"
                    checked={settings.emailWeeklyDigest}
                    onCheckedChange={(checked) => updateSetting("emailWeeklyDigest", checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle>In-App Notifications</CardTitle>
            </div>
            <Switch
              checked={settings.inAppEnabled}
              onCheckedChange={(checked) => updateSetting("inAppEnabled", checked)}
            />
          </div>
          <CardDescription>
            See notifications within the CRM application
          </CardDescription>
        </CardHeader>
        {settings.inAppEnabled && (
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppDealUpdates" className="font-normal">
                  Deal updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Stage changes, assignments, and closures
                </p>
              </div>
              <Switch
                id="inAppDealUpdates"
                checked={settings.inAppDealUpdates}
                onCheckedChange={(checked) => updateSetting("inAppDealUpdates", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppTaskUpdates" className="font-normal">
                  Task updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  New assignments, due dates, and completions
                </p>
              </div>
              <Switch
                id="inAppTaskUpdates"
                checked={settings.inAppTaskUpdates}
                onCheckedChange={(checked) => updateSetting("inAppTaskUpdates", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppMentions" className="font-normal">
                  Mentions
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone @mentions you in notes or comments
                </p>
              </div>
              <Switch
                id="inAppMentions"
                checked={settings.inAppMentions}
                onCheckedChange={(checked) => updateSetting("inAppMentions", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppSystemAlerts" className="font-normal flex items-center gap-2">
                  System alerts
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </Label>
                <p className="text-sm text-muted-foreground">
                  Important system notifications and maintenance alerts
                </p>
              </div>
              <Switch
                id="inAppSystemAlerts"
                checked={settings.inAppSystemAlerts}
                onCheckedChange={(checked) => updateSetting("inAppSystemAlerts", checked)}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
