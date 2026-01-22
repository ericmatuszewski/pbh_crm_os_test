import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoleType } from "@prisma/client";

// GET /api/roles/[id] - Get a single role with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, displayName: true } },
        children: { select: { id: true, name: true, displayName: true } },
        permissions: {
          orderBy: [{ entity: "asc" }, { action: "asc" }],
        },
        fieldPermissions: {
          orderBy: [{ entity: "asc" }, { fieldName: "asc" }],
        },
        userRoles: {
          include: {
            role: { select: { id: true, name: true, displayName: true } },
          },
          take: 50,
        },
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error("Failed to fetch role:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch role" } },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[id] - Update a role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if role exists
    const existing = await prisma.role.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    // System roles have limited editability
    if (existing.type === RoleType.SYSTEM) {
      const allowedFields = ["description", "isActive"];
      const attemptedKeys = Object.keys(body);
      const disallowedKeys = attemptedKeys.filter(
        (key) => !allowedFields.includes(key)
      );

      if (disallowedKeys.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "SYSTEM_ROLE_ERROR",
              message: `Cannot modify these properties on system roles: ${disallowedKeys.join(", ")}`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "displayName",
      "description",
      "level",
      "parentId",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: true,
        fieldPermissions: true,
        _count: {
          select: { userRoles: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update role" } },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id] - Delete a role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if role exists
    const existing = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    // Prevent deletion of system roles
    if (existing.type === RoleType.SYSTEM) {
      return NextResponse.json(
        { success: false, error: { code: "SYSTEM_ROLE_ERROR", message: "Cannot delete system roles" } },
        { status: 400 }
      );
    }

    // Prevent deletion if role has users assigned
    if (existing._count.userRoles > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ROLE_IN_USE",
            message: `Cannot delete role with ${existing._count.userRoles} users assigned. Reassign users first.`,
          },
        },
        { status: 400 }
      );
    }

    // Delete role (cascade deletes permissions)
    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete role:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete role" } },
      { status: 500 }
    );
  }
}
