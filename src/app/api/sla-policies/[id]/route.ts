import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActionType } from "@prisma/client";

// GET /api/sla-policies/[id] - Get a single SLA policy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const policy = await prisma.sLAPolicy.findUnique({
      where: { id },
      include: {
        escalations: {
          orderBy: { level: "asc" },
        },
      },
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "SLA policy not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    console.error("Failed to fetch SLA policy:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch SLA policy" } },
      { status: 500 }
    );
  }
}

// PUT /api/sla-policies/[id] - Update an SLA policy
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive, targetDateField, conditions, escalations } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (targetDateField !== undefined) updateData.targetDateField = targetDateField;
    if (conditions !== undefined) updateData.conditions = conditions;

    // If escalations are provided, replace them all
    if (escalations !== undefined) {
      // Validate escalations
      for (const escalation of escalations) {
        if (!Object.values(ActionType).includes(escalation.actionType)) {
          return NextResponse.json(
            { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid action type: ${escalation.actionType}` } },
            { status: 400 }
          );
        }
      }

      // Delete existing escalations and create new ones
      await prisma.sLAEscalation.deleteMany({ where: { policyId: id } });
      await prisma.sLAEscalation.createMany({
        data: escalations.map((e: Record<string, unknown>) => ({
          policyId: id,
          level: e.level as number,
          thresholdHours: e.thresholdHours as number,
          thresholdType: e.thresholdType as string,
          actionType: e.actionType as ActionType,
          actionConfig: e.actionConfig || {},
          notifyUserIds: (e.notifyUserIds as string[]) || [],
          notifyRoles: (e.notifyRoles as string[]) || [],
        })),
      });
    }

    const policy = await prisma.sLAPolicy.update({
      where: { id },
      data: updateData,
      include: {
        escalations: {
          orderBy: { level: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    console.error("Failed to update SLA policy:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update SLA policy" } },
      { status: 500 }
    );
  }
}

// DELETE /api/sla-policies/[id] - Delete an SLA policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.sLAPolicy.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete SLA policy:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete SLA policy" } },
      { status: 500 }
    );
  }
}
