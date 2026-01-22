import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/territories - List all territories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parentId = searchParams.get("parentId");
    const isActive = searchParams.get("isActive");
    const includeChildren = searchParams.get("includeChildren") === "true";

    const where: Record<string, unknown> = {};

    if (parentId === "null") {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    if (isActive !== null) where.isActive = isActive === "true";

    const territories = await prisma.territory.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: includeChildren
          ? {
              select: { id: true, name: true, code: true, level: true, isActive: true },
              orderBy: { name: "asc" },
            }
          : false,
        _count: {
          select: { assignments: true, children: true },
        },
      },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, data: territories });
  } catch (error) {
    console.error("Failed to fetch territories:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch territories" } },
      { status: 500 }
    );
  }
}

// POST /api/territories - Create a new territory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name and code are required" } },
        { status: 400 }
      );
    }

    // Normalize code
    const normalizedCode = body.code.toUpperCase().replace(/[^A-Z0-9_-]/g, "_");

    // Check for duplicate code
    const existing = await prisma.territory.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ERROR", message: "A territory with this code already exists" } },
        { status: 400 }
      );
    }

    // Determine level based on parent
    let level = 0;
    if (body.parentId) {
      const parent = await prisma.territory.findUnique({
        where: { id: body.parentId },
        select: { level: true },
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    const territory = await prisma.territory.create({
      data: {
        name: body.name,
        code: normalizedCode,
        description: body.description,
        parentId: body.parentId,
        level,
        criteria: body.criteria || {},
      },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: territory }, { status: 201 });
  } catch (error) {
    console.error("Failed to create territory:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create territory" } },
      { status: 500 }
    );
  }
}

// PUT /api/territories - Update a territory
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Check if territory exists
    const existing = await prisma.territory.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Territory not found" } },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.criteria !== undefined) updateData.criteria = body.criteria;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Handle parent change (recalculate level)
    if (body.parentId !== undefined && body.parentId !== existing.parentId) {
      // Prevent circular reference
      if (body.parentId === body.id) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Territory cannot be its own parent" } },
          { status: 400 }
        );
      }

      updateData.parentId = body.parentId;

      if (body.parentId) {
        const newParent = await prisma.territory.findUnique({
          where: { id: body.parentId },
          select: { level: true },
        });
        if (newParent) {
          updateData.level = newParent.level + 1;
        }
      } else {
        updateData.level = 0;
      }
    }

    const updated = await prisma.territory.update({
      where: { id: body.id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: {
          select: { assignments: true, children: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update territory:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update territory" } },
      { status: 500 }
    );
  }
}

// DELETE /api/territories - Delete a territory
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Check if territory exists
    const existing = await prisma.territory.findUnique({
      where: { id: body.id },
      include: {
        _count: {
          select: { children: true, assignments: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Territory not found" } },
        { status: 404 }
      );
    }

    // Prevent deletion if territory has children
    if (existing._count.children > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "HAS_CHILDREN",
            message: `Cannot delete territory with ${existing._count.children} child territories. Delete children first.`,
          },
        },
        { status: 400 }
      );
    }

    // Delete assignments first (cascade should handle this, but let's be explicit)
    await prisma.territoryAssignment.deleteMany({
      where: { territoryId: body.id },
    });

    await prisma.territory.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: { id: body.id } });
  } catch (error) {
    console.error("Failed to delete territory:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete territory" } },
      { status: 500 }
    );
  }
}
