import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActionType } from "@prisma/client";

// GET /api/sla-policies - List all SLA policies
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (isActive !== null) where.isActive = isActive === "true";

    const policies = await prisma.sLAPolicy.findMany({
      where,
      include: {
        escalations: {
          orderBy: { level: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    console.error("Failed to fetch SLA policies:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch SLA policies" } },
      { status: 500 }
    );
  }
}

// POST /api/sla-policies - Create a new SLA policy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      entity,
      isActive = true,
      targetDateField,
      conditions = [],
      escalations = [],
    } = body;

    if (!name || !entity || !targetDateField) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name, entity, and targetDateField are required" } },
        { status: 400 }
      );
    }

    // Validate escalations
    for (const escalation of escalations) {
      if (!Object.values(ActionType).includes(escalation.actionType)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid action type: ${escalation.actionType}` } },
          { status: 400 }
        );
      }
    }

    const policy = await prisma.sLAPolicy.create({
      data: {
        name,
        description,
        entity,
        isActive,
        targetDateField,
        conditions,
        escalations: {
          create: escalations.map((e: Record<string, unknown>) => ({
            level: e.level as number,
            thresholdHours: e.thresholdHours as number,
            thresholdType: e.thresholdType as string,
            actionType: e.actionType as ActionType,
            actionConfig: e.actionConfig || {},
            notifyUserIds: (e.notifyUserIds as string[]) || [],
            notifyRoles: (e.notifyRoles as string[]) || [],
          })),
        },
      },
      include: {
        escalations: {
          orderBy: { level: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: policy }, { status: 201 });
  } catch (error) {
    console.error("Failed to create SLA policy:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create SLA policy" } },
      { status: 500 }
    );
  }
}
