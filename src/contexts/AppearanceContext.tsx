"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AppearanceSettings {
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

interface AppearanceContextType {
  settings: AppearanceSettings;
  updateSettings: (newSettings: Partial<AppearanceSettings>) => void;
  resetSettings: () => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

const STORAGE_KEY = "pbh-crm-appearance";

// Map accent colors to CSS variable values
const accentColorMap: Record<string, { primary: string; primaryForeground: string }> = {
  "#3b82f6": { primary: "217.2 91.2% 59.8%", primaryForeground: "0 0% 100%" }, // Blue
  "#8b5cf6": { primary: "262.1 83.3% 57.8%", primaryForeground: "0 0% 100%" }, // Purple
  "#10b981": { primary: "160.1 84.1% 39.4%", primaryForeground: "0 0% 100%" }, // Green
  "#f59e0b": { primary: "37.7 92.1% 50.2%", primaryForeground: "0 0% 0%" }, // Amber
  "#ef4444": { primary: "0 84.2% 60.2%", primaryForeground: "0 0% 100%" }, // Red
  "#ec4899": { primary: "330.4 81.2% 60.4%", primaryForeground: "0 0% 100%" }, // Pink
  "#6366f1": { primary: "238.7 83.5% 66.7%", primaryForeground: "0 0% 100%" }, // Indigo
  "#14b8a6": { primary: "173.4 80.4% 40%", primaryForeground: "0 0% 100%" }, // Teal
};

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setMounted(true);
  }, []);

  // Apply settings to document
  const applySettings = useCallback((s: AppearanceSettings) => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    // Theme
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = s.theme === "dark" || (s.theme === "system" && systemDark);

    root.classList.remove("light", "dark");
    root.classList.add(isDark ? "dark" : "light");

    // Accent color
    const accent = accentColorMap[s.accentColor] || accentColorMap["#3b82f6"];
    root.style.setProperty("--primary", accent.primary);
    root.style.setProperty("--primary-foreground", accent.primaryForeground);

    // Font size
    root.classList.remove("text-sm", "text-base", "text-lg");
    if (s.fontSize === "small") {
      root.style.fontSize = "14px";
    } else if (s.fontSize === "large") {
      root.style.fontSize = "18px";
    } else {
      root.style.fontSize = "16px";
    }

    // Compact mode
    if (s.compactMode) {
      body.classList.add("compact-mode");
    } else {
      body.classList.remove("compact-mode");
    }

    // Animations
    if (!s.animationsEnabled) {
      root.style.setProperty("--transition-duration", "0ms");
      body.classList.add("no-animations");
    } else {
      root.style.removeProperty("--transition-duration");
      body.classList.remove("no-animations");
    }

    // High contrast
    if (s.highContrastMode) {
      body.classList.add("high-contrast");
    } else {
      body.classList.remove("high-contrast");
    }
  }, []);

  // Apply settings whenever they change
  useEffect(() => {
    if (mounted) {
      applySettings(settings);
    }
  }, [settings, mounted, applySettings]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (settings.theme === "system") {
        applySettings(settings);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings, mounted, applySettings]);

  const updateSettings = useCallback((newSettings: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(defaultSettings);
  }, []);

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <AppearanceContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}

export { defaultSettings };
