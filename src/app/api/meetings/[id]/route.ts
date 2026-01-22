import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Meeting not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch meeting" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Meeting not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      location,
      meetingUrl,
      startTime,
      endTime,
      timezone,
      reminderMinutes,
      contactId,
      dealId,
      attendees,
    } = body;

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        title,
        description,
        location,
        meetingUrl,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        timezone,
        reminderMinutes,
        contactId,
        dealId,
        attendees,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    console.error("Error updating meeting:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update meeting" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Meeting not found" } },
        { status: 404 }
      );
    }

    await prisma.meeting.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete meeting" } },
      { status: 500 }
    );
  }
}
