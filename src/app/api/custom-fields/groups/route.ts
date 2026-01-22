import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/custom-fields/groups - List custom field groups
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (entity) where.entity = entity;
    if (isActive !== null) where.isActive = isActive === "true";

    const groups = await prisma.customFieldGroup.findMany({
      where,
      orderBy: [
        { entity: "asc" },
        { position: "asc" },
      ],
    });

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error("Failed to fetch custom field groups:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch custom field groups" } },
      { status: 500 }
    );
  }
}

// POST /api/custom-fields/groups - Create a custom field group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.label || !body.entity) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name, label, and entity are required" } },
        { status: 400 }
      );
    }

    // Validate entity
    const validEntities = ["contacts", "companies", "deals", "quotes", "tasks"];
    if (!validEntities.includes(body.entity)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid entity" } },
        { status: 400 }
      );
    }

    // Normalize group name
    const normalizedName = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    // Check for duplicate group name on same entity
    const existing = await prisma.customFieldGroup.findUnique({
      where: {
        entity_name: {
          entity: body.entity,
          name: normalizedName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ERROR", message: "A group with this name already exists for this entity" } },
        { status: 400 }
      );
    }

    // Get the highest position for this entity
    const maxPosition = await prisma.customFieldGroup.findFirst({
      where: { entity: body.entity },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const group = await prisma.customFieldGroup.create({
      data: {
        name: normalizedName,
        label: body.label,
        description: body.description,
        entity: body.entity,
        position: body.position ?? (maxPosition?.position ?? 0) + 1,
        isCollapsible: body.isCollapsible ?? true,
        isCollapsed: body.isCollapsed ?? false,
      },
    });

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (error) {
    console.error("Failed to create custom field group:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create custom field group" } },
      { status: 500 }
    );
  }
}

// PUT /api/custom-fields/groups - Update a custom field group
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Check if group exists
    const existing = await prisma.customFieldGroup.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Group not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "label",
      "description",
      "position",
      "isCollapsible",
      "isCollapsed",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.customFieldGroup.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update custom field group:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update custom field group" } },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-fields/groups - Delete a custom field group
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Check if group exists
    const existing = await prisma.customFieldGroup.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Group not found" } },
        { status: 404 }
      );
    }

    // Remove group name from all fields that use it
    await prisma.customFieldDefinition.updateMany({
      where: {
        entity: existing.entity,
        groupName: existing.name,
      },
      data: {
        groupName: null,
      },
    });

    // Delete the group
    await prisma.customFieldGroup.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: { id: body.id } });
  } catch (error) {
    console.error("Failed to delete custom field group:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete custom field group" } },
      { status: 500 }
    );
  }
}
