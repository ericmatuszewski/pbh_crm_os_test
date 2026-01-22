import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SequenceStatus, ActionType } from "@prisma/client";

// GET /api/sequences - List all follow-up sequences
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const status = searchParams.get("status") as SequenceStatus | null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (status) where.status = status;

    const [sequences, total] = await Promise.all([
      prisma.followUpSequence.findMany({
        where,
        include: {
          steps: {
            orderBy: { position: "asc" },
          },
          _count: {
            select: { enrollments: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.followUpSequence.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: sequences,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch sequences:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch sequences" } },
      { status: 500 }
    );
  }
}

// POST /api/sequences - Create a new follow-up sequence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      entity,
      entryCriteria = [],
      exitCriteria = [],
      steps = [],
    } = body;

    if (!name || !entity) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and entity are required" } },
        { status: 400 }
      );
    }

    // Validate steps
    for (const step of steps) {
      if (!Object.values(ActionType).includes(step.actionType)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid action type: ${step.actionType}` } },
          { status: 400 }
        );
      }
    }

    const sequence = await prisma.followUpSequence.create({
      data: {
        name,
        description,
        entity,
        status: SequenceStatus.DRAFT,
        entryCriteria,
        exitCriteria,
        steps: {
          create: steps.map((s: Record<string, unknown>) => ({
            position: s.position as number,
            name: s.name as string,
            delayDays: (s.delayDays as number) || 0,
            delayHours: (s.delayHours as number) || 0,
            actionType: s.actionType as ActionType,
            actionConfig: s.actionConfig || {},
            skipConditions: s.skipConditions || [],
          })),
        },
      },
      include: {
        steps: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: sequence }, { status: 201 });
  } catch (error) {
    console.error("Failed to create sequence:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create sequence" } },
      { status: 500 }
    );
  }
}
