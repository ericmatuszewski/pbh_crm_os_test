import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCampaignContactsSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = addCampaignContactsSchema.parse(body);

    const campaign = await prisma.callCampaign.findUnique({
      where: { id: params.id },
      include: { queueItems: { select: { contactId: true } } },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    // Filter out contacts already in the campaign
    const existingContactIds = new Set(campaign.queueItems.map((item) => item.contactId));
    const newContactIds = data.contactIds.filter((id) => !existingContactIds.has(id));

    if (newContactIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_NEW_CONTACTS", message: "All contacts are already in the campaign" } },
        { status: 400 }
      );
    }

    // Get current max position
    const maxPositionResult = await prisma.callQueueItem.aggregate({
      where: { campaignId: params.id },
      _max: { position: true },
    });
    let nextPosition = (maxPositionResult._max.position || 0) + 1;

    // Add contacts to campaign queue
    await prisma.callQueueItem.createMany({
      data: newContactIds.map((contactId) => ({
        campaignId: params.id,
        contactId,
        position: nextPosition++,
      })),
    });

    // Update campaign total
    await prisma.callCampaign.update({
      where: { id: params.id },
      data: {
        totalCalls: { increment: newContactIds.length },
      },
    });

    return NextResponse.json({
      success: true,
      data: { addedCount: newContactIds.length },
    });
  } catch (error) {
    console.error("Error adding contacts to campaign:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "ADD_ERROR", message: "Failed to add contacts to campaign" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = addCampaignContactsSchema.parse(body);

    const campaign = await prisma.callCampaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    // Remove contacts from campaign
    const result = await prisma.callQueueItem.deleteMany({
      where: {
        campaignId: params.id,
        contactId: { in: data.contactIds },
        status: "SCHEDULED", // Only remove unprocessed items
      },
    });

    // Update campaign total
    await prisma.callCampaign.update({
      where: { id: params.id },
      data: {
        totalCalls: { decrement: result.count },
      },
    });

    return NextResponse.json({
      success: true,
      data: { removedCount: result.count },
    });
  } catch (error) {
    console.error("Error removing contacts from campaign:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "REMOVE_ERROR", message: "Failed to remove contacts from campaign" } },
      { status: 500 }
    );
  }
}
