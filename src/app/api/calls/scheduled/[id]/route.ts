import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateScheduledCallSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const call = await prisma.scheduledCall.findUnique({
      where: { id: params.id },
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

    if (!call) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scheduled call not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: call });
  } catch (error) {
    console.error("Error fetching scheduled call:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch scheduled call" } },
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
    const data = updateScheduledCallSchema.parse(body);

    const existingCall = await prisma.scheduledCall.findUnique({
      where: { id: params.id },
    });

    if (!existingCall) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scheduled call not found" } },
        { status: 404 }
      );
    }

    const call = await prisma.scheduledCall.update({
      where: { id: params.id },
      data: {
        contactId: data.contactId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        assignedToId: data.assignedToId,
        reminderMinutes: data.reminderMinutes,
        notes: data.notes,
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
      },
    });

    return NextResponse.json({ success: true, data: call });
  } catch (error) {
    console.error("Error updating scheduled call:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update scheduled call" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const call = await prisma.scheduledCall.findUnique({
      where: { id: params.id },
    });

    if (!call) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scheduled call not found" } },
        { status: 404 }
      );
    }

    await prisma.scheduledCall.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    console.error("Error deleting scheduled call:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete scheduled call" } },
      { status: 500 }
    );
  }
}
