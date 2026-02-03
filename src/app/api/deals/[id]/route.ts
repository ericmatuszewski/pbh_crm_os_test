import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateDealSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
            status: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            website: true,
            industry: true,
          },
        },
        owner: { select: { id: true, name: true, email: true, image: true } },
        pipeline: { select: { id: true, name: true } },
        pipelineStage: { select: { id: true, name: true, probability: true, color: true } },
        activities: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        quotes: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Deal not found" } },
        { status: 404 }
      );
    }

    // Fetch related tasks using polymorphic pattern
    const tasks = await prisma.task.findMany({
      where: {
        relatedType: "deal",
        relatedId: params.id,
      },
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Combine deal data with tasks
    const dealWithTasks = {
      ...deal,
      value: Number(deal.value),
      tasks,
    };

    return NextResponse.json({
      success: true,
      data: dealWithTasks,
    });
  } catch (error) {
    console.error("Error fetching deal:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch deal" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = updateDealSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (data.title) updateData.title = data.title;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.currency) updateData.currency = data.currency;
    if (data.stage) {
      updateData.stage = data.stage;
      if (data.stage === "CLOSED_WON" || data.stage === "CLOSED_LOST") {
        updateData.closedAt = new Date();
      }
    }
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = data.expectedCloseDate ? new Date(data.expectedCloseDate) : null;
    }
    if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
    if (data.companyId !== undefined) updateData.companyId = data.companyId || null;
    if (data.ownerId) updateData.ownerId = data.ownerId;
    if (data.pipelineId !== undefined) updateData.pipelineId = data.pipelineId || null;
    if (data.stageId !== undefined) updateData.stageId = data.stageId || null;

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...deal, value: Number(deal.value) },
    });
  } catch (error) {
    console.error("Error updating deal:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update deal" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.deal.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("Error deleting deal:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete deal" } },
      { status: 500 }
    );
  }
}
