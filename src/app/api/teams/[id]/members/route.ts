import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit/logger";
import { getCurrentUserId } from "@/lib/auth/get-current-user";

// GET /api/teams/[id]/members - List team members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
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
    });

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error("Failed to list team members:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to list members" } },
      { status: 500 }
    );
  }
}

// POST /api/teams/[id]/members - Add member to team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, role = "member" } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: "User ID is required" } },
        { status: 400 }
      );
    }

    // Check if team exists
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json(
        { success: false, error: { message: "Team not found" } },
        { status: 404 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "User not found" } },
        { status: 404 }
      );
    }

    // Check if already a member
    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { message: "User is already a member of this team" } },
        { status: 400 }
      );
    }

    // Get current user from session
    const addedById = await getCurrentUserId(request);

    const member = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId,
        role,
        addedById,
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
      },
    });

    // Log addition
    await logAudit(
      {
        action: "CREATE",
        entity: "team_member",
        entityId: member.id,
        newValues: { teamId: id, userId, role },
      },
      { userId: addedById }
    );

    return NextResponse.json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error("Failed to add team member:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to add member" } },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id]/members - Remove member from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: "User ID is required" } },
        { status: 400 }
      );
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId },
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: { message: "Member not found" } },
        { status: 404 }
      );
    }

    await prisma.teamMember.delete({
      where: { id: member.id },
    });

    // Log removal
    const deletedById = await getCurrentUserId(request);
    await logAudit(
      {
        action: "DELETE",
        entity: "team_member",
        entityId: member.id,
        previousValues: member as Record<string, unknown>,
      },
      { userId: deletedById }
    );

    return NextResponse.json({
      success: true,
      message: "Member removed from team",
    });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to remove member" } },
      { status: 500 }
    );
  }
}
