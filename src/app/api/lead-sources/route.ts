import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/lead-sources - List all lead sources
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive === "true";

    const sources = await prisma.leadSource.findMany({
      where,
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
      orderBy: { totalLeads: "desc" },
    });

    return NextResponse.json({ success: true, data: sources });
  } catch (error) {
    console.error("Failed to fetch lead sources:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch lead sources" } },
      { status: 500 }
    );
  }
}

// POST /api/lead-sources - Create a new lead source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, isActive = true, costPerLead, isTrackable = true } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

    const source = await prisma.leadSource.create({
      data: {
        name,
        description,
        category,
        isActive,
        costPerLead,
        isTrackable,
      },
    });

    return NextResponse.json({ success: true, data: source }, { status: 201 });
  } catch (error) {
    console.error("Failed to create lead source:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create lead source" } },
      { status: 500 }
    );
  }
}
