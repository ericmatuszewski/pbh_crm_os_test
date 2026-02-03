"use client";

import { useState, useEffect } from "react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessSwitcher } from "./BusinessSwitcher";
import Link from "next/link";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotificationCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch("/api/notifications/count");
      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.data.unread || 0);
      }
    } catch (error) {
      // Silently fail - notification count is not critical
    }
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Business Switcher */}
        <BusinessSwitcher />

        {/* Search - Opens Command Palette */}
        <button
          onClick={() => {
            // Trigger Cmd+K programmatically
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              ctrlKey: true,
              bubbles: true,
            });
            document.dispatchEvent(event);
          }}
          className="relative w-64 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Notifications */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-xs font-medium flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* Custom actions */}
        {actions}
      </div>
    </header>
  );
}
