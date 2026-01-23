"use client";

import { useState, useEffect } from "react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>

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
