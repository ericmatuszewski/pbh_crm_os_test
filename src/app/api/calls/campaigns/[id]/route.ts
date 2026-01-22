import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateCampaignSchema, updateCampaignStatusSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.callCampaign.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        queueItems: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                company: { select: { id: true, name: true } },
              },
            },
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: { position: "asc" },
        },
        _count: {
          select: { queueItems: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch campaign" } },
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
    const data = updateCampaignSchema.parse(body);

    const existingCampaign = await prisma.callCampaign.findUnique({
      where: { id: params.id },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const campaign = await prisma.callCampaign.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: {
          select: { queueItems: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("Error updating campaign:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update campaign" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = updateCampaignStatusSchema.parse(body);

    const existingCampaign = await prisma.callCampaign.findUnique({
      where: { id: params.id },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const campaign = await prisma.callCampaign.update({
      where: { id: params.id },
      data: { status: data.status },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: {
          select: { queueItems: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("Error updating campaign status:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update campaign status" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.callCampaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    await prisma.callCampaign.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete campaign" } },
      { status: 500 }
    );
  }
}
