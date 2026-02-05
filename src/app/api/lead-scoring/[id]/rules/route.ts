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

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  eventType: z.enum(VALID_EVENT_TYPES),
  points: z.number().int().min(-100).max(100),
  isActive: z.boolean().default(true),
  decayDays: z.number().int().positive().optional(),
  decayPoints: z.number().int().optional(),
  maxOccurrences: z.number().int().positive().optional(),
  cooldownHours: z.number().int().positive().optional(),
  conditions: z.array(z.record(z.unknown())).default([]),
});

// GET /api/lead-scoring/[id]/rules - List rules for a model
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
          orderBy: [{ isActive: "desc" }, { points: "desc" }],
        },
      },
    });

    if (!model) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Model not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: model.rules,
    });
  } catch (error) {
    console.error("Failed to fetch rules:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch rules" } },
      { status: 500 }
    );
  }
}

// POST /api/lead-scoring/[id]/rules - Create a new rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modelId } = await params;
    const body = await request.json();

    // Validate input
    const result = createRuleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid input",
            details: result.error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Check model exists
    const model = await prisma.leadScoringModel.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Model not found" } },
        { status: 404 }
      );
    }

    // Create rule
    const rule = await prisma.scoringRule.create({
      data: {
        modelId,
        name: result.data.name,
        description: result.data.description || null,
        eventType: result.data.eventType,
        points: result.data.points,
        isActive: result.data.isActive,
        decayDays: result.data.decayDays || null,
        decayPoints: result.data.decayPoints || null,
        maxOccurrences: result.data.maxOccurrences || null,
        cooldownHours: result.data.cooldownHours || null,
        conditions: JSON.parse(JSON.stringify(result.data.conditions)),
      },
    });

    return NextResponse.json(
      { success: true, data: rule },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create rule" } },
      { status: 500 }
    );
  }
}
