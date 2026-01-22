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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Type,
  Layout,
  Sidebar,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  sidebarCollapsed: boolean;
  showAvatars: boolean;
  animationsEnabled: boolean;
  highContrastMode: boolean;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  weekStartsOn: "sunday" | "monday";
}

const defaultSettings: AppearanceSettings = {
  theme: "system",
  accentColor: "#3b82f6",
  fontSize: "medium",
  compactMode: false,
  sidebarCollapsed: false,
  showAvatars: true,
  animationsEnabled: true,
  highContrastMode: false,
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  weekStartsOn: "monday",
};

const ACCENT_COLORS = [
  { value: "#3b82f6", label: "Blue", class: "bg-blue-500" },
  { value: "#8b5cf6", label: "Purple", class: "bg-purple-500" },
  { value: "#10b981", label: "Green", class: "bg-emerald-500" },
  { value: "#f59e0b", label: "Amber", class: "bg-amber-500" },
  { value: "#ef4444", label: "Red", class: "bg-red-500" },
  { value: "#ec4899", label: "Pink", class: "bg-pink-500" },
  { value: "#6366f1", label: "Indigo", class: "bg-indigo-500" },
  { value: "#14b8a6", label: "Teal", class: "bg-teal-500" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "22/01/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "01/22/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-01-22" },
  { value: "D MMM YYYY", label: "D MMM YYYY", example: "22 Jan 2026" },
  { value: "MMM D, YYYY", label: "MMM D, YYYY", example: "Jan 22, 2026" },
];

export default function AppearanceSettingsPage() {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/appearance");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      }
    } catch (error) {
      console.error("Failed to fetch appearance settings:", error);
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
      const response = await fetch("/api/settings/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Appearance settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save appearance settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
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
            <Palette className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Appearance Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Customize the look and feel of your CRM
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

      {/* Theme */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            <CardTitle>Theme</CardTitle>
          </div>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.theme}
            onValueChange={(value: "light" | "dark" | "system") =>
              updateSetting("theme", value)
            }
            className="grid grid-cols-3 gap-4"
          >
            <Label
              htmlFor="theme-light"
              className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                settings.theme === "light"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="light" id="theme-light" className="sr-only" />
              <div className="rounded-lg border bg-white p-3 shadow-sm">
                <Sun className="h-6 w-6 text-amber-500" />
              </div>
              <span className="font-medium">Light</span>
            </Label>
            <Label
              htmlFor="theme-dark"
              className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                settings.theme === "dark"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
              <div className="rounded-lg border bg-slate-900 p-3 shadow-sm">
                <Moon className="h-6 w-6 text-slate-300" />
              </div>
              <span className="font-medium">Dark</span>
            </Label>
            <Label
              htmlFor="theme-system"
              className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                settings.theme === "system"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="system" id="theme-system" className="sr-only" />
              <div className="rounded-lg border bg-gradient-to-br from-white to-slate-900 p-3 shadow-sm">
                <Monitor className="h-6 w-6 text-slate-500" />
              </div>
              <span className="font-medium">System</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>Accent Color</CardTitle>
          </div>
          <CardDescription>
            Choose the primary accent color for buttons and highlights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => updateSetting("accentColor", color.value)}
                className={`relative w-12 h-12 rounded-full ${color.class} transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                title={color.label}
              >
                {settings.accentColor === color.value && (
                  <Check className="absolute inset-0 m-auto h-6 w-6 text-white" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography & Layout */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            <CardTitle>Typography & Layout</CardTitle>
          </div>
          <CardDescription>Adjust text size and layout density</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Font Size</Label>
            <RadioGroup
              value={settings.fontSize}
              onValueChange={(value: "small" | "medium" | "large") =>
                updateSetting("fontSize", value)
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="font-small" />
                <Label htmlFor="font-small" className="font-normal text-sm">
                  Small
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="font-medium" />
                <Label htmlFor="font-medium" className="font-normal">
                  Medium
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="font-large" />
                <Label htmlFor="font-large" className="font-normal text-lg">
                  Large
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compactMode" className="font-normal">
                Compact Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing and padding for more content on screen
              </p>
            </div>
            <Switch
              id="compactMode"
              checked={settings.compactMode}
              onCheckedChange={(checked) => updateSetting("compactMode", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showAvatars" className="font-normal">
                Show User Avatars
              </Label>
              <p className="text-sm text-muted-foreground">
                Display profile pictures in lists and tables
              </p>
            </div>
            <Switch
              id="showAvatars"
              checked={settings.showAvatars}
              onCheckedChange={(checked) => updateSetting("showAvatars", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="animationsEnabled" className="font-normal">
                Enable Animations
              </Label>
              <p className="text-sm text-muted-foreground">
                Show smooth transitions and animations
              </p>
            </div>
            <Switch
              id="animationsEnabled"
              checked={settings.animationsEnabled}
              onCheckedChange={(checked) => updateSetting("animationsEnabled", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <CardTitle>Accessibility</CardTitle>
          </div>
          <CardDescription>
            Settings to improve accessibility and readability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="highContrastMode" className="font-normal">
                High Contrast Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase color contrast for better visibility
              </p>
            </div>
            <Switch
              id="highContrastMode"
              checked={settings.highContrastMode}
              onCheckedChange={(checked) => updateSetting("highContrastMode", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sidebar className="h-5 w-5 text-primary" />
            <CardTitle>Sidebar</CardTitle>
          </div>
          <CardDescription>Configure the navigation sidebar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sidebarCollapsed" className="font-normal">
                Collapsed by Default
              </Label>
              <p className="text-sm text-muted-foreground">
                Start with the sidebar minimized to icon-only view
              </p>
            </div>
            <Switch
              id="sidebarCollapsed"
              checked={settings.sidebarCollapsed}
              onCheckedChange={(checked) => updateSetting("sidebarCollapsed", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle>Date & Time Format</CardTitle>
          <CardDescription>
            Configure how dates and times are displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value) => updateSetting("dateFormat", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label} ({format.example})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time Format</Label>
              <Select
                value={settings.timeFormat}
                onValueChange={(value: "12h" | "24h") =>
                  updateSetting("timeFormat", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Week Starts On</Label>
            <Select
              value={settings.weekStartsOn}
              onValueChange={(value: "sunday" | "monday") =>
                updateSetting("weekStartsOn", value)
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
