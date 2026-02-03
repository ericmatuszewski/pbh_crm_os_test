import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { setBroadcastFunction } from "@/lib/notifications/service";
import {
  broadcastToUser,
  registerConnection,
  removeConnection,
} from "@/lib/notifications/broadcaster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Register the broadcast function with the notification service
setBroadcastFunction(broadcastToUser);

// GET /api/notifications/stream - SSE endpoint for real-time notifications
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Register this connection
      registerConnection(userId, controller);

      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({ type: "connected", userId })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Send current unread count
      prisma.notification
        .count({
          where: { userId, isRead: false, isArchived: false },
        })
        .then((count) => {
          const countMessage = `data: ${JSON.stringify({ type: "count", count })}\n\n`;
          try {
            controller.enqueue(encoder.encode(countMessage));
          } catch {
            // Connection may have closed
          }
        });

      // Set up heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: "ping", timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeConnection(userId, controller);
      });
    },
    cancel() {
      removeConnection(userId, controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
