import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

// GET /api/tags/:id - Get single tag with contacts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
          take: 100,
        },
        _count: {
          select: { contacts: true },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Tag not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error("Error fetching tag:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch tag" } },
      { status: 500 }
    );
  }
}

// PUT /api/tags/:id - Update tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check for duplicate name if changing name
    if (body.name) {
      const existing = await prisma.tag.findFirst({
        where: {
          name: body.name,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "DUPLICATE", message: "A tag with this name already exists" },
          },
          { status: 409 }
        );
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name: body.name,
        color: body.color,
      },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update tag" } },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/:id - Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete tag" } },
      { status: 500 }
    );
  }
}
