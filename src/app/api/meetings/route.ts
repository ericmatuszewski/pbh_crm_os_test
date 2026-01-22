import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerMeetingBooked } from "@/lib/scoring/trigger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const dealId = searchParams.get("dealId");
    const organizerId = searchParams.get("organizerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (contactId) {
      where.contactId = contactId;
    }

    if (dealId) {
      where.dealId = dealId;
    }

    if (organizerId) {
      where.organizerId = organizerId;
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        (where.startTime as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.startTime as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ success: true, data: meetings });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch meetings" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      organizerId,
      attendees,
    } = body;

    if (!title || !startTime || !endTime || !organizerId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Title, start time, end time, and organizer are required" } },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        location,
        meetingUrl,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        timezone: timezone || "UTC",
        reminderMinutes,
        contactId,
        dealId,
        organizerId,
        attendees: attendees || [],
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    // Create an activity for the meeting
    await prisma.activity.create({
      data: {
        type: "MEETING",
        title: `Meeting scheduled: ${title}`,
        description: description || `Meeting with ${meeting.contact ? `${meeting.contact.firstName} ${meeting.contact.lastName}` : "contact"}`,
        userId: organizerId,
        contactId,
        dealId,
      },
    });

    // Trigger lead scoring for MEETING_BOOKED event
    if (contactId) {
      await triggerMeetingBooked(contactId, meeting.id, title);
    }

    return NextResponse.json({ success: true, data: meeting }, { status: 201 });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create meeting" } },
      { status: 500 }
    );
  }
}
