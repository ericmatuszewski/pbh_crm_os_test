import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface TimelineItem {
  id: string;
  type: "activity" | "email" | "meeting" | "call" | "note" | "deal_update";
  title: string;
  description: string | null;
  timestamp: Date;
  user?: { id: string; name: string | null };
  metadata?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const dealId = searchParams.get("dealId");
    const companyId = searchParams.get("companyId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!contactId && !dealId && !companyId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "contactId, dealId, or companyId is required" } },
        { status: 400 }
      );
    }

    const timeline: TimelineItem[] = [];

    // Fetch activities
    const activityWhere: Record<string, unknown> = {};
    if (contactId) activityWhere.contactId = contactId;
    if (dealId) activityWhere.dealId = dealId;

    const activities = await prisma.activity.findMany({
      where: activityWhere,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    activities.forEach((activity) => {
      timeline.push({
        id: activity.id,
        type: "activity",
        title: activity.title,
        description: activity.description,
        timestamp: activity.createdAt,
        user: activity.user ? { id: activity.user.id, name: activity.user.name } : undefined,
        metadata: { activityType: activity.type },
      });
    });

    // Fetch email logs
    const emailWhere: Record<string, unknown> = {};
    if (contactId) emailWhere.contactId = contactId;
    if (dealId) emailWhere.dealId = dealId;

    const emails = await prisma.emailLog.findMany({
      where: emailWhere,
      orderBy: { sentAt: "desc" },
      take: limit,
    });

    emails.forEach((email) => {
      timeline.push({
        id: email.id,
        type: "email",
        title: email.subject,
        description: `Email to ${email.toEmails.join(", ")}`,
        timestamp: email.sentAt || email.receivedAt || email.createdAt,
        metadata: { status: email.status, source: email.source },
      });
    });

    // Fetch meetings
    const meetingWhere: Record<string, unknown> = {};
    if (contactId) meetingWhere.contactId = contactId;
    if (dealId) meetingWhere.dealId = dealId;

    const meetings = await prisma.meeting.findMany({
      where: meetingWhere,
      orderBy: { startTime: "desc" },
      take: limit,
    });

    meetings.forEach((meeting) => {
      timeline.push({
        id: meeting.id,
        type: "meeting",
        title: meeting.title,
        description: meeting.description,
        timestamp: meeting.startTime,
        metadata: {
          location: meeting.location,
          meetingUrl: meeting.meetingUrl,
          endTime: meeting.endTime,
        },
      });
    });

    // Fetch scheduled calls
    const callWhere: Record<string, unknown> = {};
    if (contactId) callWhere.contactId = contactId;

    const calls = await prisma.scheduledCall.findMany({
      where: callWhere,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });

    calls.forEach((call) => {
      timeline.push({
        id: call.id,
        type: "call",
        title: `Call ${call.status === "COMPLETED" ? "completed" : "scheduled"}`,
        description: call.notes,
        timestamp: call.completedAt || call.scheduledAt,
        user: call.assignedTo ? { id: call.assignedTo.id, name: call.assignedTo.name } : undefined,
        metadata: {
          status: call.status,
          outcome: call.outcome,
          duration: call.duration,
        },
      });
    });

    // Fetch notes
    const noteWhere: Record<string, unknown> = {};
    if (contactId) noteWhere.contactId = contactId;
    if (dealId) noteWhere.dealId = dealId;
    if (companyId) noteWhere.companyId = companyId;

    const notes = await prisma.note.findMany({
      where: noteWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    notes.forEach((note) => {
      timeline.push({
        id: note.id,
        type: "note",
        title: "Note added",
        description: note.content.length > 200 ? note.content.substring(0, 200) + "..." : note.content,
        timestamp: note.createdAt,
        metadata: { fullContent: note.content },
      });
    });

    // Sort all items by timestamp (most recent first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const paginatedTimeline = timeline.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedTimeline,
        total: timeline.length,
        hasMore: offset + limit < timeline.length,
      },
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch timeline" } },
      { status: 500 }
    );
  }
}
