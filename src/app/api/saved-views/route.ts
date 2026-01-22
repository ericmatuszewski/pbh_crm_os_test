import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/saved-views - List saved views
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const entity = searchParams.get("entity");
    const includeShared = searchParams.get("includeShared") === "true";

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {
      OR: [{ userId }, ...(includeShared ? [{ isShared: true }] : [])],
    };

    if (entity) {
      where.entity = entity;
    }

    const views = await prisma.savedView.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: views });
  } catch (error) {
    console.error("Failed to fetch saved views:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch saved views" } },
      { status: 500 }
    );
  }
}

// POST /api/saved-views - Create a saved view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.name || !body.entity) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId, name, and entity are required" } },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await prisma.savedView.updateMany({
        where: {
          userId: body.userId,
          entity: body.entity,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const view = await prisma.savedView.create({
      data: {
        userId: body.userId,
        name: body.name,
        description: body.description,
        entity: body.entity,
        filters: body.filters ? JSON.parse(JSON.stringify(body.filters)) : [],
        filterLogic: body.filterLogic || "AND",
        sortField: body.sortField,
        sortDirection: body.sortDirection || "asc",
        columns: body.columns || [],
        isDefault: body.isDefault || false,
        isShared: body.isShared || false,
        isPinned: body.isPinned || false,
      },
    });

    return NextResponse.json({ success: true, data: view }, { status: 201 });
  } catch (error) {
    console.error("Failed to create saved view:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create saved view" } },
      { status: 500 }
    );
  }
}

// PUT /api/saved-views - Update a saved view
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    const existing = await prisma.savedView.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Saved view not found" } },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults
    if (body.isDefault && !existing.isDefault) {
      await prisma.savedView.updateMany({
        where: {
          userId: existing.userId,
          entity: existing.entity,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.filters !== undefined) updateData.filters = JSON.parse(JSON.stringify(body.filters));
    if (body.filterLogic !== undefined) updateData.filterLogic = body.filterLogic;
    if (body.sortField !== undefined) updateData.sortField = body.sortField;
    if (body.sortDirection !== undefined) updateData.sortDirection = body.sortDirection;
    if (body.columns !== undefined) updateData.columns = body.columns;
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;
    if (body.isShared !== undefined) updateData.isShared = body.isShared;
    if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;

    const updated = await prisma.savedView.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update saved view:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update saved view" } },
      { status: 500 }
    );
  }
}

// DELETE /api/saved-views - Delete a saved view
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    await prisma.savedView.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: { id: body.id } });
  } catch (error) {
    console.error("Failed to delete saved view:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete saved view" } },
      { status: 500 }
    );
  }
}
