import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { completeCallSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = completeCallSchema.parse(body);

    const existingCall = await prisma.scheduledCall.findUnique({
      where: { id: params.id },
      include: { contact: true },
    });

    if (!existingCall) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scheduled call not found" } },
        { status: 404 }
      );
    }

    // Create an Activity record for the completed call
    const activity = await prisma.activity.create({
      data: {
        type: "CALL",
        title: `Call with ${existingCall.contact.firstName} ${existingCall.contact.lastName}`,
        description: data.notes || `Call outcome: ${data.outcome}`,
        userId: existingCall.assignedToId,
        contactId: existingCall.contactId,
      },
    });

    // Update the scheduled call
    const call = await prisma.scheduledCall.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        outcome: data.outcome,
        notes: data.notes || existingCall.notes,
        duration: data.duration,
        completedAt: new Date(),
        activityId: activity.id,
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
        assignedTo: { select: { id: true, name: true } },
        activity: true,
      },
    });

    // If callback requested, create a new scheduled call
    if (data.outcome === "CALLBACK_REQUESTED" && data.callbackAt) {
      await prisma.scheduledCall.create({
        data: {
          contactId: existingCall.contactId,
          scheduledAt: new Date(data.callbackAt),
          assignedToId: existingCall.assignedToId,
          notes: `Callback from ${existingCall.id}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: call });
  } catch (error) {
    console.error("Error completing call:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "COMPLETE_ERROR", message: "Failed to complete call" } },
      { status: 500 }
    );
  }
}
