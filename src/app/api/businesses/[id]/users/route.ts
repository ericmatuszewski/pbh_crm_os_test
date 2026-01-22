"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/businesses/[id]/users - Get users in a business
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    const userBusinesses = await prisma.userBusiness.findMany({
      where: { businessId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: userBusinesses.map((ub) => ({
        ...ub.user,
        businessRole: ub.role,
        isDefault: ub.isDefault,
        joinedAt: ub.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch business users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch business users" },
      { status: 500 }
    );
  }
}

// POST /api/businesses/[id]/users - Add a user to a business
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const body = await request.json();
    const { userId, role = "REP", isDefault = false } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    // Check if user already has access
    const existing = await prisma.userBusiness.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "User already has access to this business" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await prisma.userBusiness.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const userBusiness = await prisma.userBusiness.create({
      data: {
        userId,
        businessId,
        role,
        isDefault,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        business: true,
      },
    });

    // If this is the user's first business, set it as current
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentBusinessId: true },
    });

    if (!user?.currentBusinessId) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentBusinessId: businessId },
      });
    }

    return NextResponse.json({
      success: true,
      data: userBusiness,
    });
  } catch (error) {
    console.error("Failed to add user to business:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add user to business" },
      { status: 500 }
    );
  }
}

// DELETE /api/businesses/[id]/users - Remove a user from a business
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    await prisma.userBusiness.delete({
      where: {
        userId_businessId: { userId, businessId },
      },
    });

    // If this was the user's current business, clear it
    await prisma.user.updateMany({
      where: { id: userId, currentBusinessId: businessId },
      data: { currentBusinessId: null },
    });

    return NextResponse.json({
      success: true,
      message: "User removed from business",
    });
  } catch (error) {
    console.error("Failed to remove user from business:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove user from business" },
      { status: 500 }
    );
  }
}
