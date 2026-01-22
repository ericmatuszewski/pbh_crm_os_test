import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
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

    // Find next contact in queue (scheduled, ordered by position)
    // Also include callbacks that are due
    const now = new Date();

    const nextItem = await prisma.callQueueItem.findFirst({
      where: {
        campaignId: params.id,
        status: "SCHEDULED",
        OR: [
          { callbackAt: null },
          { callbackAt: { lte: now } },
        ],
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
            company: { select: { id: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [
        { callbackAt: "asc" }, // Callbacks first
        { position: "asc" },
      ],
    });

    if (!nextItem) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No more contacts in queue",
      });
    }

    return NextResponse.json({ success: true, data: nextItem });
  } catch (error) {
    console.error("Error fetching next contact:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch next contact" } },
      { status: 500 }
    );
  }
}
