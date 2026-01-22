import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordQueueOutcomeSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = recordQueueOutcomeSchema.parse(body);

    const existingItem = await prisma.callQueueItem.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        campaign: true,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Queue item not found" } },
        { status: 404 }
      );
    }

    // Determine if this was a successful call (answered)
    const isSuccessful = data.outcome === "ANSWERED";

    // Update the queue item
    const queueItem = await prisma.callQueueItem.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        outcome: data.outcome,
        lastAttempt: new Date(),
        attempts: { increment: 1 },
      },
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
      },
    });

    // Update campaign statistics
    await prisma.callCampaign.update({
      where: { id: existingItem.campaignId },
      data: {
        completedCalls: { increment: 1 },
        successfulCalls: isSuccessful ? { increment: 1 } : undefined,
      },
    });

    // Create activity record for the call
    await prisma.activity.create({
      data: {
        type: "CALL",
        title: `Campaign call with ${existingItem.contact.firstName} ${existingItem.contact.lastName}`,
        description: data.notes || `Call outcome: ${data.outcome}`,
        userId: existingItem.assignedToId || "system",
        contactId: existingItem.contactId,
      },
    });

    // Handle callback scheduling
    if (data.outcome === "CALLBACK_REQUESTED" && data.callbackAt) {
      // Create a new queue item for callback
      const maxPositionResult = await prisma.callQueueItem.aggregate({
        where: { campaignId: existingItem.campaignId },
        _max: { position: true },
      });

      await prisma.callQueueItem.create({
        data: {
          campaignId: existingItem.campaignId,
          contactId: existingItem.contactId,
          assignedToId: existingItem.assignedToId,
          position: (maxPositionResult._max.position || 0) + 1,
          callbackAt: new Date(data.callbackAt),
        },
      });

      // Update campaign total
      await prisma.callCampaign.update({
        where: { id: existingItem.campaignId },
        data: {
          totalCalls: { increment: 1 },
        },
      });
    }

    return NextResponse.json({ success: true, data: queueItem });
  } catch (error) {
    console.error("Error recording outcome:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to record outcome" } },
      { status: 500 }
    );
  }
}
