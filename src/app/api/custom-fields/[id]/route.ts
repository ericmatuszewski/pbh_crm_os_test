import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/custom-fields/[id] - Get a single custom field definition
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const field = await prisma.customFieldDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    if (!field) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Custom field not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: field });
  } catch (error) {
    console.error("Failed to fetch custom field:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch custom field" } },
      { status: 500 }
    );
  }
}

// PUT /api/custom-fields/[id] - Update a custom field definition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if field exists
    const existing = await prisma.customFieldDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Custom field not found" } },
        { status: 404 }
      );
    }

    // System fields have limited editability
    if (existing.isSystem) {
      // Only allow updating: label, description, showInList, position, groupName, groupPosition
      const allowedSystemUpdates = [
        "label",
        "description",
        "showInList",
        "position",
        "groupName",
        "groupPosition",
      ];

      const attemptedKeys = Object.keys(body);
      const disallowedKeys = attemptedKeys.filter(
        (key) => !allowedSystemUpdates.includes(key)
      );

      if (disallowedKeys.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "SYSTEM_FIELD_ERROR",
              message: `Cannot modify these properties on system fields: ${disallowedKeys.join(", ")}`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Build update data (exclude immutable fields)
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "label",
      "description",
      "isRequired",
      "isSearchable",
      "isFilterable",
      "showInList",
      "position",
      "defaultValue",
      "options",
      "validation",
      "viewRoles",
      "editRoles",
      "groupName",
      "groupPosition",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.customFieldDefinition.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update custom field:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update custom field" } },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-fields/[id] - Delete a custom field definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if field exists
    const existing = await prisma.customFieldDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Custom field not found" } },
        { status: 404 }
      );
    }

    // Prevent deletion of system fields
    if (existing.isSystem) {
      return NextResponse.json(
        { success: false, error: { code: "SYSTEM_FIELD_ERROR", message: "Cannot delete system fields" } },
        { status: 400 }
      );
    }

    // Delete field and all associated values (cascade delete is set in schema)
    await prisma.customFieldDefinition.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id, valuesDeleted: existing._count.values },
    });
  } catch (error) {
    console.error("Failed to delete custom field:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete custom field" } },
      { status: 500 }
    );
  }
}
