import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const VALID_EVENT_TYPES = [
  "EMAIL_OPENED",
  "EMAIL_CLICKED",
  "EMAIL_REPLIED",
  "MEETING_BOOKED",
  "MEETING_ATTENDED",
  "CALL_ANSWERED",
  "CALL_POSITIVE_OUTCOME",
  "FORM_SUBMITTED",
  "PAGE_VISITED",
  "DOCUMENT_VIEWED",
  "DEMO_REQUESTED",
  "TRIAL_STARTED",
  "QUOTE_REQUESTED",
  "DEAL_CREATED",
  "STAGE_ADVANCED",
  "CUSTOM",
] as const;

const updateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  eventType: z.enum(VALID_EVENT_TYPES).optional(),
  points: z.number().int().min(-100).max(100).optional(),
  isActive: z.boolean().optional(),
  decayDays: z.number().int().positive().optional().nullable(),
  decayPoints: z.number().int().optional().nullable(),
  maxOccurrences: z.number().int().positive().optional().nullable(),
  cooldownHours: z.number().int().positive().optional().nullable(),
  conditions: z.array(z.record(z.unknown())).optional(),
});

type RouteParams = { params: Promise<{ id: string; ruleId: string }> };

// GET /api/lead-scoring/[id]/rules/[ruleId] - Get a specific rule
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: modelId, ruleId } = await params;

    const rule = await prisma.scoringRule.findFirst({
      where: { id: ruleId, modelId },
    });

    if (!rule) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Rule not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error("Failed to fetch rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch rule" } },
      { status: 500 }
    );
  }
}

// PUT /api/lead-scoring/[id]/rules/[ruleId] - Update a rule
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: modelId, ruleId } = await params;
    const body = await request.json();

    // Validate input
    const result = updateRuleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid input",
          },
        },
        { status: 400 }
      );
    }

    // Check rule exists and belongs to model
    const existing = await prisma.scoringRule.findFirst({
      where: { id: ruleId, modelId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Rule not found" } },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (result.data.name !== undefined) updateData.name = result.data.name;
    if (result.data.description !== undefined) updateData.description = result.data.description;
    if (result.data.eventType !== undefined) updateData.eventType = result.data.eventType;
    if (result.data.points !== undefined) updateData.points = result.data.points;
    if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;
    if (result.data.decayDays !== undefined) updateData.decayDays = result.data.decayDays;
    if (result.data.decayPoints !== undefined) updateData.decayPoints = result.data.decayPoints;
    if (result.data.maxOccurrences !== undefined) updateData.maxOccurrences = result.data.maxOccurrences;
    if (result.data.cooldownHours !== undefined) updateData.cooldownHours = result.data.cooldownHours;
    if (result.data.conditions !== undefined) {
      updateData.conditions = JSON.parse(JSON.stringify(result.data.conditions));
    }

    const rule = await prisma.scoringRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error("Failed to update rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update rule" } },
      { status: 500 }
    );
  }
}

// DELETE /api/lead-scoring/[id]/rules/[ruleId] - Delete a rule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: modelId, ruleId } = await params;

    // Check rule exists and belongs to model
    const existing = await prisma.scoringRule.findFirst({
      where: { id: ruleId, modelId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Rule not found" } },
        { status: 404 }
      );
    }

    await prisma.scoringRule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json({
      success: true,
      data: { id: ruleId, deleted: true },
    });
  } catch (error) {
    console.error("Failed to delete rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete rule" } },
      { status: 500 }
    );
  }
}
