import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScoringEventType } from "@prisma/client";

// GET /api/lead-scoring/[id] - Get a single scoring model
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const model = await prisma.leadScoringModel.findUnique({
      where: { id },
      include: {
        rules: {
          orderBy: { points: "desc" },
        },
      },
    });

    if (!model) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scoring model not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: model });
  } catch (error) {
    console.error("Failed to fetch scoring model:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch scoring model" } },
      { status: 500 }
    );
  }
}

// PUT /api/lead-scoring/[id] - Update a scoring model
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      isActive,
      isDefault,
      qualifiedThreshold,
      customerThreshold,
      rules,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (qualifiedThreshold !== undefined) updateData.qualifiedThreshold = qualifiedThreshold;
    if (customerThreshold !== undefined) updateData.customerThreshold = customerThreshold;

    // Handle default flag
    if (isDefault === true) {
      await prisma.leadScoringModel.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    } else if (isDefault === false) {
      updateData.isDefault = false;
    }

    // If rules are provided, replace them all
    if (rules !== undefined) {
      // Validate rules
      for (const rule of rules) {
        if (!Object.values(ScoringEventType).includes(rule.eventType)) {
          return NextResponse.json(
            { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid event type: ${rule.eventType}` } },
            { status: 400 }
          );
        }
      }

      // Delete existing rules and create new ones
      await prisma.scoringRule.deleteMany({ where: { modelId: id } });
      await prisma.scoringRule.createMany({
        data: rules.map((r: Record<string, unknown>) => ({
          modelId: id,
          name: r.name as string,
          description: r.description as string | undefined,
          eventType: r.eventType as ScoringEventType,
          isActive: (r.isActive as boolean) ?? true,
          points: r.points as number,
          decayDays: r.decayDays as number | undefined,
          decayPoints: r.decayPoints as number | undefined,
          conditions: r.conditions || [],
          maxOccurrences: r.maxOccurrences as number | undefined,
          cooldownHours: r.cooldownHours as number | undefined,
        })),
      });
    }

    const model = await prisma.leadScoringModel.update({
      where: { id },
      data: updateData,
      include: {
        rules: {
          orderBy: { points: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: model });
  } catch (error) {
    console.error("Failed to update scoring model:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update scoring model" } },
      { status: 500 }
    );
  }
}

// DELETE /api/lead-scoring/[id] - Delete a scoring model
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.leadScoringModel.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete scoring model:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete scoring model" } },
      { status: 500 }
    );
  }
}
