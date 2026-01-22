import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { type: "asc" },
    });

    // Get all notification types and merge with user preferences
    const allTypes = Object.values(NotificationType);
    const preferencesMap = new Map(preferences.map((p) => [p.type, p]));

    const fullPreferences = allTypes.map((type) => {
      const pref = preferencesMap.get(type);
      return (
        pref || {
          id: null,
          userId,
          type,
          inApp: true,
          email: true,
          emailDigest: false,
          emailImmediate: true,
          quietHoursStart: null,
          quietHoursEnd: null,
          quietTimezone: null,
        }
      );
    });

    return NextResponse.json({ success: true, data: fullPreferences });
  } catch (error) {
    console.error("Failed to fetch notification preferences:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch preferences" } },
      { status: 500 }
    );
  }
}

// POST /api/notifications/preferences - Create or update preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.type) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId and type are required" } },
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

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_type: {
          userId: body.userId,
          type: body.type,
        },
      },
      create: {
        userId: body.userId,
        type: body.type,
        inApp: body.inApp ?? true,
        email: body.email ?? true,
        emailDigest: body.emailDigest ?? false,
        emailImmediate: body.emailImmediate ?? true,
        quietHoursStart: body.quietHoursStart,
        quietHoursEnd: body.quietHoursEnd,
        quietTimezone: body.quietTimezone,
      },
      update: {
        inApp: body.inApp,
        email: body.email,
        emailDigest: body.emailDigest,
        emailImmediate: body.emailImmediate,
        quietHoursStart: body.quietHoursStart,
        quietHoursEnd: body.quietHoursEnd,
        quietTimezone: body.quietTimezone,
      },
    });

    return NextResponse.json({ success: true, data: preference });
  } catch (error) {
    console.error("Failed to update notification preference:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update preference" } },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences - Bulk update preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.preferences || !Array.isArray(body.preferences)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId and preferences array are required" } },
        { status: 400 }
      );
    }

    const results = [];

    for (const pref of body.preferences) {
      if (!Object.values(NotificationType).includes(pref.type)) {
        continue;
      }

      const updated = await prisma.notificationPreference.upsert({
        where: {
          userId_type: {
            userId: body.userId,
            type: pref.type,
          },
        },
        create: {
          userId: body.userId,
          type: pref.type,
          inApp: pref.inApp ?? true,
          email: pref.email ?? true,
          emailDigest: pref.emailDigest ?? false,
          emailImmediate: pref.emailImmediate ?? true,
          quietHoursStart: pref.quietHoursStart,
          quietHoursEnd: pref.quietHoursEnd,
          quietTimezone: pref.quietTimezone,
        },
        update: {
          inApp: pref.inApp,
          email: pref.email,
          emailDigest: pref.emailDigest,
          emailImmediate: pref.emailImmediate,
          quietHoursStart: pref.quietHoursStart,
          quietHoursEnd: pref.quietHoursEnd,
          quietTimezone: pref.quietTimezone,
        },
      });

      results.push(updated);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update preferences" } },
      { status: 500 }
    );
  }
}
