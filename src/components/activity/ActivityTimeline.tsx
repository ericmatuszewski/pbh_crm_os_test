"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  TrendingUp,
  Clock,
  ChevronDown,
  Plus,
  User,
  Video,
  MapPin,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface TimelineItem {
  id: string;
  type: "activity" | "email" | "meeting" | "call" | "note" | "deal_update";
  title: string;
  description: string | null;
  timestamp: Date;
  user?: { id: string; name: string | null };
  metadata?: Record<string, unknown>;
}

interface ActivityTimelineProps {
  contactId?: string;
  dealId?: string;
  companyId?: string;
  maxHeight?: string;
  showAddButton?: boolean;
  onAddActivity?: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  activity: <TrendingUp className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  deal_update: <TrendingUp className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  activity: "bg-blue-100 text-blue-700 border-blue-200",
  email: "bg-purple-100 text-purple-700 border-purple-200",
  meeting: "bg-green-100 text-green-700 border-green-200",
  call: "bg-orange-100 text-orange-700 border-orange-200",
  note: "bg-gray-100 text-gray-700 border-gray-200",
  deal_update: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const typeBadgeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  activity: "default",
  email: "secondary",
  meeting: "default",
  call: "secondary",
  note: "outline",
  deal_update: "default",
};

export function ActivityTimeline({
  contactId,
  dealId,
  companyId,
  maxHeight = "500px",
  showAddButton = true,
  onAddActivity,
}: ActivityTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchTimeline = useCallback(async (newOffset: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (contactId) params.set("contactId", contactId);
      if (dealId) params.set("dealId", dealId);
      if (companyId) params.set("companyId", companyId);
      params.set("limit", "20");
      params.set("offset", String(newOffset));

      const response = await fetch(`/api/timeline?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        if (newOffset === 0) {
          setItems(data.data.items);
        } else {
          setItems((prev) => [...prev, ...data.data.items]);
        }
        setHasMore(data.data.hasMore);
        setOffset(newOffset);
      }
    } catch (error) {
      console.error("Failed to fetch timeline:", error);
      toast.error("Failed to load activity timeline", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setLoading(false);
    }
  }, [contactId, dealId, companyId]);

  useEffect(() => {
    fetchTimeline(0);
  }, [fetchTimeline]);

  const loadMore = () => {
    fetchTimeline(offset + 20);
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (diffDays < 7) {
      return format(date, "EEEE 'at' h:mm a");
    } else {
      return format(date, "MMM d, yyyy 'at' h:mm a");
    }
  };

  const renderItemContent = (item: TimelineItem) => {
    const metadata = (item.metadata || {}) as Record<string, string | number | boolean | null>;

    switch (item.type) {
      case "meeting":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {metadata.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {String(metadata.location)}
                </span>
              )}
              {metadata.meetingUrl && (
                <span className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Virtual meeting
                </span>
              )}
              {metadata.endTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(item.timestamp), "h:mm a")} -{" "}
                  {format(new Date(String(metadata.endTime)), "h:mm a")}
                </span>
              )}
            </div>
          </div>
        );

      case "call":
        return (
          <div className="space-y-2">
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {metadata.status && (
                <Badge variant="outline" className="text-xs">
                  {String(metadata.status).replace(/_/g, " ")}
                </Badge>
              )}
              {metadata.outcome && (
                <Badge variant="secondary" className="text-xs">
                  {String(metadata.outcome).replace(/_/g, " ")}
                </Badge>
              )}
              {metadata.duration && (
                <span className="text-xs text-muted-foreground">
                  {metadata.duration} min
                </span>
              )}
            </div>
          </div>
        );

      case "email":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <div className="flex flex-wrap gap-2">
              {metadata.status && (
                <Badge
                  variant={metadata.status === "opened" ? "default" : "outline"}
                  className="text-xs"
                >
                  {String(metadata.status)}
                </Badge>
              )}
              {metadata.source && metadata.source !== "manual" && (
                <Badge variant="secondary" className="text-xs">
                  {String(metadata.source)}
                </Badge>
              )}
            </div>
          </div>
        );

      case "note":
        return (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        );

      default:
        return (
          item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )
        );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
        {showAddButton && onAddActivity && (
          <Button size="sm" variant="outline" onClick={onAddActivity}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }} className="pr-4">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={`${item.type}-${item.id}`} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-0 top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center ${typeColors[item.type]}`}
                    >
                      {typeIcons[item.type]}
                    </div>

                    {/* Content */}
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={typeBadgeColors[item.type]} className="text-xs capitalize">
                            {item.type.replace(/_/g, " ")}
                          </Badge>
                          <span className="font-medium text-sm">{item.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>

                      {renderItemContent(item)}

                      {item.user && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {item.user.name || "Unknown user"}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
