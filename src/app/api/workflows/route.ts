import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkflowStatus, TriggerType, ActionType } from "@prisma/client";

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const status = searchParams.get("status") as WorkflowStatus | null;
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (entity) where.entity = entity;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        include: {
          triggers: true,
          actions: {
            orderBy: { position: "asc" },
          },
          _count: {
            select: { executions: true },
          },
        },
        orderBy: [{ runOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workflow.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: workflows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch workflows:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch workflows" } },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      entity,
      runOnce = false,
      runOrder = 0,
      triggers = [],
      actions = [],
    } = body;

    if (!name || !entity) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and entity are required" } },
        { status: 400 }
      );
    }

    // Validate entity
    const validEntities = ["contacts", "deals", "companies", "quotes", "tasks"];
    if (!validEntities.includes(entity)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid entity type" } },
        { status: 400 }
      );
    }

    // Validate triggers
    for (const trigger of triggers) {
      if (!Object.values(TriggerType).includes(trigger.type)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid trigger type: ${trigger.type}` } },
          { status: 400 }
        );
      }
    }

    // Validate actions
    for (const action of actions) {
      if (!Object.values(ActionType).includes(action.type)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid action type: ${action.type}` } },
          { status: 400 }
        );
      }
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        entity,
        runOnce,
        runOrder,
        status: WorkflowStatus.DRAFT,
        triggers: {
          create: triggers.map((t: Record<string, unknown>) => ({
            type: t.type as TriggerType,
            field: t.field as string | undefined,
            fromValue: t.fromValue as string | undefined,
            toValue: t.toValue as string | undefined,
            dateField: t.dateField as string | undefined,
            offsetDays: t.offsetDays as number | undefined,
            offsetDirection: t.offsetDirection as string | undefined,
            conditions: t.conditions || [],
          })),
        },
        actions: {
          create: actions.map((a: Record<string, unknown>) => ({
            type: a.type as ActionType,
            position: a.position as number,
            config: a.config || {},
            parentActionId: a.parentActionId as string | undefined,
            branchType: a.branchType as string | undefined,
          })),
        },
      },
      include: {
        triggers: true,
        actions: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: workflow }, { status: 201 });
  } catch (error) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create workflow" } },
      { status: 500 }
    );
  }
}
