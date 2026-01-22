import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TriggerType } from "@prisma/client";
import { executeWorkflow } from "@/lib/workflows/engine";

// POST /api/workflows/[id]/execute - Manually execute a workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { entityId, userId } = body;

    if (!entityId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "entityId is required" } },
        { status: 400 }
      );
    }

    // Get workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        triggers: true,
        actions: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Workflow not found" } },
        { status: 404 }
      );
    }

    // Fetch the entity
    let entity: Record<string, unknown> | null = null;

    switch (workflow.entity) {
      case "contacts":
        entity = await prisma.contact.findUnique({
          where: { id: entityId },
          include: { company: true, tags: true },
        }) as Record<string, unknown> | null;
        break;
      case "deals":
        entity = await prisma.deal.findUnique({
          where: { id: entityId },
          include: { contact: true, company: true, owner: true },
        }) as Record<string, unknown> | null;
        break;
      case "companies":
        entity = await prisma.company.findUnique({
          where: { id: entityId },
        }) as Record<string, unknown> | null;
        break;
      case "tasks":
        entity = await prisma.task.findUnique({
          where: { id: entityId },
          include: { assignee: true },
        }) as Record<string, unknown> | null;
        break;
      case "quotes":
        entity = await prisma.quote.findUnique({
          where: { id: entityId },
          include: { contact: true, company: true, items: true },
        }) as Record<string, unknown> | null;
        break;
    }

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Entity not found" } },
        { status: 404 }
      );
    }

    // Execute workflow
    const executionId = await executeWorkflow(
      id,
      TriggerType.MANUAL,
      {
        entityType: workflow.entity,
        entityId,
        entity,
        userId,
      },
      userId
    );

    // Get execution result
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    return NextResponse.json({
      success: true,
      data: execution,
    });
  } catch (error) {
    console.error("Failed to execute workflow:", error);
    return NextResponse.json(
      { success: false, error: { code: "EXECUTION_ERROR", message: "Failed to execute workflow" } },
      { status: 500 }
    );
  }
}
