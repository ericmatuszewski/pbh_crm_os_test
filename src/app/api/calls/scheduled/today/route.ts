import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const assignedToId = searchParams.get("assignedToId");

    const today = new Date();

    const calls = await prisma.scheduledCall.findMany({
      where: {
        scheduledAt: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
        status: "SCHEDULED",
        ...(assignedToId && { assignedToId }),
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
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: calls,
    });
  } catch (error) {
    console.error("Error fetching today's calls:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch today's calls" } },
      { status: 500 }
    );
  }
}
