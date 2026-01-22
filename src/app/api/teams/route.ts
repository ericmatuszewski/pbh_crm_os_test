import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit/logger";

// GET /api/teams - List teams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId") || undefined;
    const includeMembers = searchParams.get("includeMembers") === "true";

    const teams = await prisma.team.findMany({
      where: {
        ...(businessId && { businessId }),
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            teamMembers: true,
            members: true,
          },
        },
        ...(includeMembers && {
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
          },
        }),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error("Failed to list teams:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to list teams" } },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, ownerId, businessId } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { message: "Team name is required" } },
        { status: 400 }
      );
    }

    // Check for duplicate name in business
    const existing = await prisma.team.findFirst({
      where: {
        name,
        businessId: businessId || null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { message: "A team with this name already exists" } },
        { status: 400 }
      );
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerId,
        businessId,
      },
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

    // Add owner as team member if specified
    if (ownerId) {
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: ownerId,
          role: "owner",
        },
      });
    }

    // Log creation
    await logAudit(
      {
        action: "CREATE",
        entity: "team",
        entityId: team.id,
        newValues: { name, businessId },
      },
      { userId: ownerId || "system" }
    );

    return NextResponse.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("Failed to create team:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to create team" } },
      { status: 500 }
    );
  }
}
