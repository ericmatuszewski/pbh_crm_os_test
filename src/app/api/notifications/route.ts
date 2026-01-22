import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationPriority } from "@prisma/client";
import { getNotificationStats, markAllAsRead } from "@/lib/notifications/service";

// GET /api/notifications - List notifications for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const isRead = searchParams.get("isRead");
    const isArchived = searchParams.get("isArchived");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { userId };

    if (type && Object.values(NotificationType).includes(type as NotificationType)) {
      where.type = type;
    }
    if (isRead !== null) where.isRead = isRead === "true";
    if (isArchived !== null) {
      where.isArchived = isArchived === "true";
    } else {
      where.isArchived = false; // Default to non-archived
    }

    const [notifications, total, stats] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.notification.count({ where }),
      getNotificationStats(userId),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch notifications" } },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.type || !body.title || !body.message) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId, type, title, and message are required" } },
        { status: 400 }
      );
    }

    // Validate type
    if (!Object.values(NotificationType).includes(body.type)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid notification type" } },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (body.priority && !Object.values(NotificationPriority).includes(body.priority)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid notification priority" } },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId: body.userId,
        type: body.type,
        title: body.title,
        message: body.message,
        priority: body.priority || NotificationPriority.NORMAL,
        entityType: body.entityType,
        entityId: body.entityId,
        link: body.link,
        fromUserId: body.fromUserId,
        fromUserName: body.fromUserName,
        metadata: body.metadata ? JSON.parse(JSON.stringify(body.metadata)) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: notification }, { status: 201 });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create notification" } },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Update notifications (mark as read, archive)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    // Mark all as read
    if (body.markAllRead) {
      const count = await markAllAsRead(body.userId);
      return NextResponse.json({ success: true, data: { updated: count } });
    }

    // Mark specific notifications as read or archived
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ids array is required" } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.isRead !== undefined) {
      updateData.isRead = body.isRead;
      if (body.isRead) {
        updateData.readAt = new Date();
      }
    }

    if (body.isArchived !== undefined) {
      updateData.isArchived = body.isArchived;
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: body.ids },
        userId: body.userId,
      },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    console.error("Failed to update notifications:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update notifications" } },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    // Delete all archived
    if (body.deleteAllArchived) {
      const result = await prisma.notification.deleteMany({
        where: {
          userId: body.userId,
          isArchived: true,
        },
      });
      return NextResponse.json({ success: true, data: { deleted: result.count } });
    }

    // Delete specific notifications
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ids array is required" } },
        { status: 400 }
      );
    }

    const result = await prisma.notification.deleteMany({
      where: {
        id: { in: body.ids },
        userId: body.userId,
      },
    });

    return NextResponse.json({ success: true, data: { deleted: result.count } });
  } catch (error) {
    console.error("Failed to delete notifications:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete notifications" } },
      { status: 500 }
    );
  }
}
