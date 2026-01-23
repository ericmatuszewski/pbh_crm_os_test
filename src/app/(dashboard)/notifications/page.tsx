"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Check,
  Archive,
  Trash2,
  Target,
  CheckSquare,
  FileText,
  Phone,
  Zap,
  AtSign,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Settings,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  isArchived: boolean;
  emailSent: boolean;
  createdAt: string;
}

interface NotificationPreference {
  id: string | null;
  userId: string;
  type: string;
  inApp: boolean;
  email: boolean;
  emailDigest: boolean;
  emailImmediate: boolean;
}

const NOTIFICATION_TYPES = [
  { value: "DEAL_STAGE_CHANGE", label: "Deal Stage Changes", icon: Target },
  { value: "TASK_ASSIGNED", label: "Task Assignments", icon: CheckSquare },
  { value: "TASK_DUE_SOON", label: "Task Reminders", icon: CheckSquare },
  { value: "TASK_OVERDUE", label: "Overdue Tasks", icon: AlertCircle },
  { value: "MENTION", label: "Mentions", icon: AtSign },
  { value: "QUOTE_STATUS_CHANGE", label: "Quote Updates", icon: FileText },
  { value: "CALL_REMINDER", label: "Call Reminders", icon: Phone },
  { value: "LEAD_SCORE_CHANGE", label: "Lead Score Changes", icon: Target },
  { value: "WORKFLOW_TRIGGERED", label: "Workflow Triggers", icon: Zap },
  { value: "SYSTEM", label: "System Notifications", icon: Bell },
];

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

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState("__all__");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, unread: 0, byType: {} as Record<string, number> });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.success && data.data?.user?.id) {
          setCurrentUserId(data.data.user.id);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchNotifications = useCallback(async (showArchived: boolean = false) => {
    if (!currentUserId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("userId", currentUserId);
      params.set("isArchived", showArchived.toString());
      if (typeFilter && typeFilter !== "__all__") params.set("type", typeFilter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, page, currentUserId]);

  const fetchPreferences = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/notifications/preferences?userId=${currentUserId}`);
      const data = await response.json();
      if (data.success) {
        setPreferences(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    if (activeTab === "inbox" || activeTab === "archived") {
      fetchNotifications(activeTab === "archived");
    } else if (activeTab === "settings") {
      fetchPreferences();
    }
  }, [activeTab, fetchNotifications, fetchPreferences, currentUserId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, page]);

  const handleMarkAsRead = async (ids?: string[]) => {
    if (!currentUserId) return;
    const toMark = ids || Array.from(selectedIds);
    if (toMark.length === 0) return;

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, ids: toMark, isRead: true }),
      });
      toast.success(`Marked ${toMark.length} notification(s) as read`);
      fetchNotifications(activeTab === "archived");
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUserId) return;
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, markAllRead: true }),
      });
      toast.success("All notifications marked as read");
      fetchNotifications(activeTab === "archived");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleArchive = async (ids?: string[]) => {
    if (!currentUserId) return;
    const toArchive = ids || Array.from(selectedIds);
    if (toArchive.length === 0) return;

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, ids: toArchive, isArchived: true }),
      });
      toast.success(`Archived ${toArchive.length} notification(s)`);
      fetchNotifications(activeTab === "archived");
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to archive:", error);
      toast.error("Failed to archive");
    }
  };

  const handleDelete = async (ids?: string[]) => {
    if (!currentUserId) return;
    const toDelete = ids || Array.from(selectedIds);
    if (toDelete.length === 0) return;

    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, ids: toDelete }),
      });
      toast.success(`Deleted ${toDelete.length} notification(s)`);
      fetchNotifications(activeTab === "archived");
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete");
    }
  };

  const handlePreferenceChange = async (type: string, field: string, value: boolean) => {
    if (!currentUserId) return;
    try {
      await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          type,
          [field]: value,
        }),
      });
      toast.success("Preference updated");
      fetchPreferences();
    } catch (error) {
      console.error("Failed to update preference:", error);
      toast.error("Failed to update preference");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.unread > 0 && activeTab === "inbox" && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Inbox
            {stats.unread > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archived
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === notifications.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleMarkAsRead()}>
                        <Check className="mr-2 h-4 w-4" />
                        Mark Read
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleArchive()}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </Button>
                    </div>
                  )}
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All types</SelectItem>
                    {NOTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
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
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedIds.has(notification.id)}
                            onCheckedChange={() => toggleSelect(notification.id)}
                          />
                          <div
                            className={cn(
                              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                              notification.isRead ? "bg-muted" : "bg-primary/10"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5",
                                notification.isRead ? "text-muted-foreground" : "text-primary"
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p
                                    className={cn(
                                      "font-medium",
                                      !notification.isRead && "font-semibold"
                                    )}
                                  >
                                    {notification.title}
                                  </p>
                                  {notification.emailSent && (
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                {notification.fromUserName && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    From: {notification.fromUserName}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.createdAt), {
                                      addSuffix: true,
                                    })}
                                  </p>
                                  {notification.link && (
                                    <Link
                                      href={notification.link}
                                      className="text-xs text-primary hover:underline"
                                      onClick={() => {
                                        if (!notification.isRead) {
                                          handleMarkAsRead([notification.id]);
                                        }
                                      }}
                                    >
                                      View details
                                    </Link>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMarkAsRead([notification.id])}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleArchive([notification.id])}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Archived Tab */}
        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === notifications.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  {selectedIds.size > 0 && (
                    <Button variant="outline" size="sm" onClick={() => handleDelete()}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Archive className="h-12 w-12 mb-4 opacity-50" />
                  <p>No archived notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const Icon = TYPE_ICONS[notification.type] || Bell;
                    return (
                      <div key={notification.id} className="p-4 hover:bg-muted/50">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedIds.has(notification.id)}
                            onCheckedChange={() => toggleSelect(notification.id)}
                          />
                          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-muted-foreground">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(notification.createdAt), "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete([notification.id])}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified for different types of events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {NOTIFICATION_TYPES.map((type) => {
                  const pref = preferences.find((p) => p.type === type.value) || {
                    inApp: true,
                    email: true,
                    emailDigest: false,
                    emailImmediate: true,
                  };
                  const Icon = type.icon;

                  return (
                    <div
                      key={type.value}
                      className="flex items-center justify-between py-4 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {type.value.replace(/_/g, " ").toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`${type.value}-inapp`}
                            checked={pref.inApp}
                            onCheckedChange={(checked) =>
                              handlePreferenceChange(type.value, "inApp", checked)
                            }
                          />
                          <Label htmlFor={`${type.value}-inapp`} className="text-sm">
                            In-app
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`${type.value}-email`}
                            checked={pref.email}
                            onCheckedChange={(checked) =>
                              handlePreferenceChange(type.value, "email", checked)
                            }
                          />
                          <Label htmlFor={`${type.value}-email`} className="text-sm">
                            Email
                          </Label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
