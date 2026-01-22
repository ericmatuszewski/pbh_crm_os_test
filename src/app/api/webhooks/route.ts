import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WEBHOOK_EVENTS } from "@/lib/api/webhooks";

// GET /api/webhooks - List webhooks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const includeDeliveryLogs = searchParams.get("includeDeliveryLogs") === "true";

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      include: includeDeliveryLogs
        ? {
            deliveryLogs: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: webhooks,
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (error) {
    console.error("Failed to fetch webhooks:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch webhooks" } },
      { status: 500 }
    );
  }
}

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.url || !body.userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name, url, and userId are required" } },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid URL format" } },
        { status: 400 }
      );
    }

    // Validate events
    if (body.events && body.events.length > 0) {
      const invalidEvents = body.events.filter(
        (e: string) => !WEBHOOK_EVENTS.includes(e as (typeof WEBHOOK_EVENTS)[number])
      );
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Invalid events: ${invalidEvents.join(", ")}`,
            },
          },
          { status: 400 }
        );
      }
    }

    const webhook = await prisma.webhook.create({
      data: {
        name: body.name,
        description: body.description,
        url: body.url,
        events: body.events || [],
        secret: body.secret,
        headers: body.headers ? JSON.parse(JSON.stringify(body.headers)) : null,
        maxRetries: body.maxRetries || 3,
        retryDelay: body.retryDelay || 60,
        userId: body.userId,
        organizationId: body.organizationId,
      },
    });

    return NextResponse.json({ success: true, data: webhook }, { status: 201 });
  } catch (error) {
    console.error("Failed to create webhook:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create webhook" } },
      { status: 500 }
    );
  }
}

// PUT /api/webhooks - Update webhook
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Validate URL if provided
    if (body.url) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid URL format" } },
          { status: 400 }
        );
      }
    }

    // Validate events if provided
    if (body.events && body.events.length > 0) {
      const invalidEvents = body.events.filter(
        (e: string) => !WEBHOOK_EVENTS.includes(e as (typeof WEBHOOK_EVENTS)[number])
      );
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Invalid events: ${invalidEvents.join(", ")}`,
            },
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.events !== undefined) updateData.events = body.events;
    if (body.secret !== undefined) updateData.secret = body.secret;
    if (body.headers !== undefined) updateData.headers = JSON.parse(JSON.stringify(body.headers));
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isPaused !== undefined) updateData.isPaused = body.isPaused;
    if (body.maxRetries !== undefined) updateData.maxRetries = body.maxRetries;
    if (body.retryDelay !== undefined) updateData.retryDelay = body.retryDelay;

    // Reset failure count if manually unpausing
    if (body.isPaused === false) {
      updateData.failureCount = 0;
    }

    const webhook = await prisma.webhook.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: webhook });
  } catch (error) {
    console.error("Failed to update webhook:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update webhook" } },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks - Delete webhook
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    await prisma.webhook.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: { id: body.id } });
  } catch (error) {
    console.error("Failed to delete webhook:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete webhook" } },
      { status: 500 }
    );
  }
}
