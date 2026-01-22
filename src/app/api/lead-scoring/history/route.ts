import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/lead-scoring/history - Get score history for a contact
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contactId = searchParams.get("contactId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "contactId is required" } },
        { status: 400 }
      );
    }

    const history = await prisma.leadScoreHistory.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error("Failed to fetch score history:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch score history" } },
      { status: 500 }
    );
  }
}
