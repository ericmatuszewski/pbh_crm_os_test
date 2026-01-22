import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScoringEventType } from "@prisma/client";

// GET /api/lead-scoring - List all scoring models
export async function GET() {
  try {
    const models = await prisma.leadScoringModel.findMany({
      include: {
        rules: {
          orderBy: { points: "desc" },
        },
        _count: {
          select: { rules: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: models });
  } catch (error) {
    console.error("Failed to fetch scoring models:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch scoring models" } },
      { status: 500 }
    );
  }
}

// POST /api/lead-scoring - Create a new scoring model
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      isActive = true,
      isDefault = false,
      qualifiedThreshold = 50,
      customerThreshold = 100,
      rules = [],
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

    // Validate rules
    for (const rule of rules) {
      if (!Object.values(ScoringEventType).includes(rule.eventType)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid event type: ${rule.eventType}` } },
          { status: 400 }
        );
      }
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.leadScoringModel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const model = await prisma.leadScoringModel.create({
      data: {
        name,
        description,
        isActive,
        isDefault,
        qualifiedThreshold,
        customerThreshold,
        rules: {
          create: rules.map((r: Record<string, unknown>) => ({
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
        },
      },
      include: {
        rules: true,
      },
    });

    return NextResponse.json({ success: true, data: model }, { status: 201 });
  } catch (error) {
    console.error("Failed to create scoring model:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create scoring model" } },
      { status: 500 }
    );
  }
}
