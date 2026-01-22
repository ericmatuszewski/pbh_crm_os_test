import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit, logUpdate } from "@/lib/audit/logger";

// GET /api/teams/[id] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                status: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: {
            teamMembers: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { success: false, error: { message: "Team not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("Failed to get team:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to get team" } },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json(
        { success: false, error: { message: "Team not found" } },
        { status: 404 }
      );
    }

    // Only allow certain fields to be updated
    const allowedFields = ["name", "description", "ownerId", "isActive"];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.team.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log update
    await logUpdate(
      "team",
      id,
      team as Record<string, unknown>,
      updated as Record<string, unknown>,
      { userId: "system" }
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Failed to update team:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to update team" } },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json(
        { success: false, error: { message: "Team not found" } },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.team.update({
      where: { id },
      data: { isActive: false },
    });

    // Log deletion
    await logAudit(
      {
        action: "DELETE",
        entity: "team",
        entityId: id,
        previousValues: team as Record<string, unknown>,
      },
      { userId: "system" }
    );

    return NextResponse.json({
      success: true,
      message: "Team deleted",
    });
  } catch (error) {
    console.error("Failed to delete team:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to delete team" } },
      { status: 500 }
    );
  }
}
