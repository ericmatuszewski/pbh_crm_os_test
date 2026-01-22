"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/businesses/switch - Switch the current business for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, businessId } = body;

    if (!userId || !businessId) {
      return NextResponse.json(
        { success: false, error: "userId and businessId are required" },
        { status: 400 }
      );
    }

    // Verify the user has access to this business
    const userBusiness = await prisma.userBusiness.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
      include: {
        business: true,
      },
    });

    if (!userBusiness) {
      return NextResponse.json(
        { success: false, error: "User does not have access to this business" },
        { status: 403 }
      );
    }

    // Update the user's current business
    await prisma.user.update({
      where: { id: userId },
      data: { currentBusinessId: businessId },
    });

    return NextResponse.json({
      success: true,
      data: {
        currentBusinessId: businessId,
        business: userBusiness.business,
        role: userBusiness.role,
      },
    });
  } catch (error) {
    console.error("Failed to switch business:", error);
    return NextResponse.json(
      { success: false, error: "Failed to switch business" },
      { status: 500 }
    );
  }
}
