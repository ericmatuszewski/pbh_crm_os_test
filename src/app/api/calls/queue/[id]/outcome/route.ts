import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordQueueOutcomeSchema } from "@/lib/validations";
import { triggerCallAnswered, triggerCallPositiveOutcome } from "@/lib/scoring/trigger";

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

    // Validate that we have a user attribution for the call
    if (!existingItem.assignedToId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "This call has no assigned agent. Please assign an agent before recording the outcome." } },
        { status: 400 }
      );
    }

    // Create activity record for the call
    await prisma.activity.create({
      data: {
        type: "CALL",
        title: `Campaign call with ${existingItem.contact.firstName} ${existingItem.contact.lastName}`,
        description: data.notes || `Call outcome: ${data.outcome}`,
        userId: existingItem.assignedToId,
        contactId: existingItem.contactId,
      },
    });

    // Trigger lead scoring for call outcomes
    const contactName = `${existingItem.contact.firstName} ${existingItem.contact.lastName}`;
    if (isSuccessful) {
      // ANSWERED call - trigger positive scoring
      await triggerCallAnswered(existingItem.contactId, params.id, contactName);
      await triggerCallPositiveOutcome(existingItem.contactId, params.id, contactName);
    }

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
      // Extract specific validation messages
      const zodError = error as { errors?: Array<{ message: string; path: string[] }> };
      const messages = zodError.errors?.map(e => e.message).join(". ") || "Invalid input data";
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: messages } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to record outcome" } },
      { status: 500 }
    );
  }
}
