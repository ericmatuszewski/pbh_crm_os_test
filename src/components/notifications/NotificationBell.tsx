"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Check,
  Archive,
  X,
  ExternalLink,
  Target,
  CheckSquare,
  FileText,
  Phone,
  Zap,
  AtSign,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNotificationStream } from "@/hooks/useNotificationStream";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
  fromUserName: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  DEAL_STAGE_CHANGE: Target,
  TASK_ASSIGNED: CheckSquare,
  TASK_DUE_SOON: CheckSquare,
  TASK_OVERDUE: AlertCircle,
  MENTION: AtSign,
  QUOTE_STATUS_CHANGE: FileText,
  CALL_REMINDER: Phone,
  LEAD_SCORE_CHANGE: Target,
  WORKFLOW_TRIGGERED: Zap,
  SYSTEM: Bell,
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "border-l-gray-300",
  NORMAL: "border-l-blue-400",
  HIGH: "border-l-orange-400",
  URGENT: "border-l-red-500",
};

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, byType: {} });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time notification stream
  const {
    isConnected,
    unreadCount: streamUnreadCount,
    lastNotification,
  } = useNotificationStream({
    enabled: !!userId,
    onNotification: (notification) => {
      // Add new notification to the top of the list
      setNotifications((prev) => [
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          entityType: null,
          entityId: null,
          link: notification.link || null,
          fromUserName: null,
          isRead: false,
          createdAt: notification.createdAt,
        },
        ...prev.slice(0, 9), // Keep only 10 notifications
      ]);

      // Show toast for new notifications
      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? {
              label: "View",
              onClick: () => {
                window.location.href = notification.link!;
              },
            }
          : undefined,
      });
    },
    onCountUpdate: (count) => {
      setStats((prev) => ({ ...prev, unread: count }));
    },
  });

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?userId=${userId}&limit=10`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch and fallback polling (only when not connected to stream)
  useEffect(() => {
    fetchNotifications();

    // Only poll if not connected to real-time stream
    if (!isConnected) {
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, isConnected]);

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ids, isRead: true }),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to update notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, markAllRead: true }),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ids: [id], isArchived: true }),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to archive notification:", error);
      toast.error("Failed to archive notification");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead([notification.id]);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {stats.unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {stats.unread > 99 ? "99+" : stats.unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">Notifications</h4>
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.unread} unread
              {!isConnected && " • Polling"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Bell;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative p-4 hover:bg-muted/50 transition-colors border-l-4",
                      PRIORITY_COLORS[notification.priority] || PRIORITY_COLORS.NORMAL,
                      !notification.isRead && "bg-muted/30"
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          notification.isRead ? "bg-muted" : "bg-primary/10"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            notification.isRead ? "text-muted-foreground" : "text-primary"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium truncate",
                                !notification.isRead && "font-semibold"
                              )}
                            >
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead([notification.id]);
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveNotification(notification.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {notification.link && (
                          <Link
                            href={notification.link}
                            onClick={() => handleNotificationClick(notification)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                          >
                            View details
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="absolute top-4 right-3 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t">
          <Link href="/notifications" onClick={() => setIsOpen(false)}>
            <Button variant="outline" className="w-full" size="sm">
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
