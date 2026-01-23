import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAuthenticated } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

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

    // Get full user details with businesses
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        authProvider: true,
        externalId: true,
        lastLoginAt: true,
        createdAt: true,
        businesses: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "User not found" } },
        { status: 404 }
      );
    }

    // Count active sessions
    const activeSessions = await prisma.userSession.count({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    // Format response
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      authProvider: user.authProvider,
      externalId: user.externalId,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      businesses: user.businesses.map((ub) => ({
        id: ub.business.id,
        name: ub.business.name,
        isDefault: ub.isDefault,
        role: ub.role,
      })),
      activeSessions,
    };

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch profile" } },
      { status: 500 }
    );
  }
}
