import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkflowStatus, TriggerType, ActionType } from "@prisma/client";

// GET /api/workflows/[id] - Get a single workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        triggers: true,
        actions: {
          orderBy: { position: "asc" },
        },
        executions: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
        _count: {
          select: { executions: true },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Workflow not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: workflow });
  } catch (error) {
    console.error("Failed to fetch workflow:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch workflow" } },
      { status: 500 }
    );
  }
}

// PUT /api/workflows/[id] - Update a workflow
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
      status,
      runOnce,
      runOrder,
      triggers,
      actions,
    } = body;

    // Validate status if provided
    if (status && !Object.values(WorkflowStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid workflow status" } },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (runOnce !== undefined) updateData.runOnce = runOnce;
    if (runOrder !== undefined) updateData.runOrder = runOrder;

    // If triggers are provided, replace them all
    if (triggers !== undefined) {
      // Validate triggers
      for (const trigger of triggers) {
        if (!Object.values(TriggerType).includes(trigger.type)) {
          return NextResponse.json(
            { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid trigger type: ${trigger.type}` } },
            { status: 400 }
          );
        }
      }

      // Delete existing triggers and create new ones
      await prisma.workflowTrigger.deleteMany({ where: { workflowId: id } });
      await prisma.workflowTrigger.createMany({
        data: triggers.map((t: Record<string, unknown>) => ({
          workflowId: id,
          type: t.type as TriggerType,
          field: t.field as string | undefined,
          fromValue: t.fromValue as string | undefined,
          toValue: t.toValue as string | undefined,
          dateField: t.dateField as string | undefined,
          offsetDays: t.offsetDays as number | undefined,
          offsetDirection: t.offsetDirection as string | undefined,
          conditions: t.conditions || [],
        })),
      });
    }

    // If actions are provided, replace them all
    if (actions !== undefined) {
      // Validate actions
      for (const action of actions) {
        if (!Object.values(ActionType).includes(action.type)) {
          return NextResponse.json(
            { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid action type: ${action.type}` } },
            { status: 400 }
          );
        }
      }

      // Delete existing actions and create new ones
      await prisma.workflowAction.deleteMany({ where: { workflowId: id } });
      await prisma.workflowAction.createMany({
        data: actions.map((a: Record<string, unknown>) => ({
          workflowId: id,
          type: a.type as ActionType,
          position: a.position as number,
          config: a.config || {},
          parentActionId: a.parentActionId as string | undefined,
          branchType: a.branchType as string | undefined,
        })),
      });
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: updateData,
      include: {
        triggers: true,
        actions: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: workflow });
  } catch (error) {
    console.error("Failed to update workflow:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update workflow" } },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[id] - Delete a workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if workflow exists
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Workflow not found" } },
        { status: 404 }
      );
    }

    // Delete workflow (cascades to triggers, actions, and executions)
    await prisma.workflow.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete workflow" } },
      { status: 500 }
    );
  }
}
