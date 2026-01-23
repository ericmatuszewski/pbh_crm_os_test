import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAuthenticated } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

// GET /api/notifications/count - Get unread notification count for current user
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated(request);
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: { message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const currentUser = await getCurrentUser(request);

    const [total, unread] = await Promise.all([
      prisma.notification.count({
        where: { userId: currentUser.id, isArchived: false },
      }),
      prisma.notification.count({
        where: { userId: currentUser.id, isRead: false, isArchived: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        unread,
      },
    });
  } catch (error) {
    console.error("Failed to fetch notification count:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch notification count" } },
      { status: 500 }
    );
  }
}
