import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PermissionAction, RecordAccess, RoleType } from "@prisma/client";

// GET /api/roles/[id]/permissions - Get permissions for a role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    const permissions = await prisma.rolePermission.findMany({
      where: { roleId: id },
      orderBy: [{ entity: "asc" }, { action: "asc" }],
    });

    const fieldPermissions = await prisma.fieldPermission.findMany({
      where: { roleId: id },
      orderBy: [{ entity: "asc" }, { fieldName: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: { permissions, fieldPermissions },
    });
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch permissions" } },
      { status: 500 }
    );
  }
}

// POST /api/roles/[id]/permissions - Add or update permissions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { permissions, fieldPermissions } = body;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    // System roles have limited editability
    if (role.type === RoleType.SYSTEM) {
      return NextResponse.json(
        { success: false, error: { code: "SYSTEM_ROLE_ERROR", message: "Cannot modify permissions on system roles" } },
        { status: 400 }
      );
    }

    const results = { permissions: 0, fieldPermissions: 0 };

    // Add/update object permissions
    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        // Validate action
        if (!Object.values(PermissionAction).includes(p.action)) {
          continue;
        }

        // Validate record access
        const recordAccess = p.recordAccess && Object.values(RecordAccess).includes(p.recordAccess)
          ? p.recordAccess
          : RecordAccess.OWN;

        await prisma.rolePermission.upsert({
          where: {
            roleId_entity_action: {
              roleId: id,
              entity: p.entity,
              action: p.action,
            },
          },
          create: {
            role: { connect: { id } },
            entity: p.entity,
            action: p.action,
            recordAccess,
            conditions: p.conditions || [],
          },
          update: {
            recordAccess,
            conditions: p.conditions || [],
          },
        });

        results.permissions++;
      }
    }

    // Add/update field permissions
    if (Array.isArray(fieldPermissions)) {
      for (const fp of fieldPermissions) {
        await prisma.fieldPermission.upsert({
          where: {
            roleId_entity_fieldName: {
              roleId: id,
              entity: fp.entity,
              fieldName: fp.fieldName,
            },
          },
          create: {
            role: { connect: { id } },
            entity: fp.entity,
            fieldName: fp.fieldName,
            canView: fp.canView ?? true,
            canEdit: fp.canEdit ?? true,
            maskValue: fp.maskValue ?? false,
            maskPattern: fp.maskPattern,
          },
          update: {
            canView: fp.canView ?? true,
            canEdit: fp.canEdit ?? true,
            maskValue: fp.maskValue ?? false,
            maskPattern: fp.maskPattern,
          },
        });

        results.fieldPermissions++;
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Failed to update permissions:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update permissions" } },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id]/permissions - Remove permissions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { permissionIds, fieldPermissionIds } = body;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    // System roles have limited editability
    if (role.type === RoleType.SYSTEM) {
      return NextResponse.json(
        { success: false, error: { code: "SYSTEM_ROLE_ERROR", message: "Cannot modify permissions on system roles" } },
        { status: 400 }
      );
    }

    const results = { permissions: 0, fieldPermissions: 0 };

    // Delete object permissions
    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      const deleted = await prisma.rolePermission.deleteMany({
        where: {
          id: { in: permissionIds },
          roleId: id,
        },
      });
      results.permissions = deleted.count;
    }

    // Delete field permissions
    if (Array.isArray(fieldPermissionIds) && fieldPermissionIds.length > 0) {
      const deleted = await prisma.fieldPermission.deleteMany({
        where: {
          id: { in: fieldPermissionIds },
          roleId: id,
        },
      });
      results.fieldPermissions = deleted.count;
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Failed to delete permissions:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete permissions" } },
      { status: 500 }
    );
  }
}
