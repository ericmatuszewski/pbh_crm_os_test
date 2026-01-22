import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssignmentMethod } from "@prisma/client";

// GET /api/assignment-rules - List all assignment rules
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (isActive !== null) where.isActive = isActive === "true";

    const rules = await prisma.assignmentRule.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("Failed to fetch assignment rules:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch assignment rules" } },
      { status: 500 }
    );
  }
}

// POST /api/assignment-rules - Create a new assignment rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      entity,
      isActive = true,
      priority = 0,
      method,
      conditions = [],
      assignToUserId,
      teamId,
      userIds = [],
      territoryField,
      territoryMap = {},
    } = body;

    if (!name || !entity || !method) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name, entity, and method are required" } },
        { status: 400 }
      );
    }

    // Validate method
    if (!Object.values(AssignmentMethod).includes(method)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid assignment method" } },
        { status: 400 }
      );
    }

    const rule = await prisma.assignmentRule.create({
      data: {
        name,
        description,
        entity,
        isActive,
        priority,
        method,
        conditions,
        assignToUserId,
        teamId,
        userIds,
        territoryField,
        territoryMap,
      },
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    console.error("Failed to create assignment rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create assignment rule" } },
      { status: 500 }
    );
  }
}
