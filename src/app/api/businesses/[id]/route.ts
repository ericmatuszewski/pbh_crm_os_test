"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/businesses/[id] - Get a single business
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            users: true,
            contacts: true,
            companies: true,
            deals: true,
            quotes: true,
            products: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: business,
    });
  } catch (error) {
    console.error("Failed to fetch business:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch business" },
      { status: 500 }
    );
  }
}

// PUT /api/businesses/[id] - Update a business
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const { id: _, createdAt, updatedAt, parent, children, _count, ...updateData } = body;

    const business = await prisma.business.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: business,
    });
  } catch (error) {
    console.error("Failed to update business:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update business" },
      { status: 500 }
    );
  }
}

// DELETE /api/businesses/[id] - Deactivate a business
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete - just mark as inactive
    const business = await prisma.business.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      data: business,
    });
  } catch (error) {
    console.error("Failed to delete business:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete business" },
      { status: 500 }
    );
  }
}
