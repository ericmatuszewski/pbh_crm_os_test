import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/lead-sources/[id] - Get a single lead source
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const source = await prisma.leadSource.findUnique({
      where: { id },
      include: {
        campaigns: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!source) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead source not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: source });
  } catch (error) {
    console.error("Failed to fetch lead source:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch lead source" } },
      { status: 500 }
    );
  }
}

// PUT /api/lead-sources/[id] - Update a lead source
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const source = await prisma.leadSource.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true, data: source });
  } catch (error) {
    console.error("Failed to update lead source:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update lead source" } },
      { status: 500 }
    );
  }
}

// DELETE /api/lead-sources/[id] - Delete a lead source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.leadSource.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete lead source:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete lead source" } },
      { status: 500 }
    );
  }
}
