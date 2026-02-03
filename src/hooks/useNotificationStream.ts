"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface NotificationEvent {
  type: "connected" | "count" | "notification" | "ping";
  count?: number;
  notification?: {
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    link?: string;
    createdAt: string;
  };
  userId?: string;
  timestamp?: number;
}

interface UseNotificationStreamOptions {
  enabled?: boolean;
  onNotification?: (notification: NonNullable<NotificationEvent["notification"]>) => void;
  onCountUpdate?: (count: number) => void;
}

export function useNotificationStream(options: UseNotificationStreamOptions = {}) {
  const { enabled = true, onNotification, onCountUpdate } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<NotificationEvent["notification"]>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/notifications/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data: NotificationEvent = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            setIsConnected(true);
            break;

          case "count":
            if (data.count !== undefined) {
              setUnreadCount(data.count);
              onCountUpdate?.(data.count);
            }
            break;

          case "notification":
            if (data.notification) {
              setLastNotification(data.notification);
              onNotification?.(data.notification);
              // Increment unread count
              setUnreadCount((prev) => prev + 1);
            }
            break;

          case "ping":
            // Keep-alive, no action needed
            break;
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [enabled, onNotification, onCountUpdate]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
  }, []);

  // Manually refresh the unread count
  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count");
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.data.count);
        onCountUpdate?.(data.data.count);
      }
    } catch (error) {
      console.error("Failed to refresh notification count:", error);
    }
  }, [onCountUpdate]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    unreadCount,
    lastNotification,
    refreshCount,
    disconnect,
    reconnect: connect,
  };
}

export default useNotificationStream;
