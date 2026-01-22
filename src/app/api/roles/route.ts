import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoleType } from "@prisma/client";

// GET /api/roles - List all roles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as RoleType | null;
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const roles = await prisma.role.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true, displayName: true } },
        _count: {
          select: {
            permissions: true,
            fieldPermissions: true,
            userRoles: true,
            children: true,
          },
        },
      },
      orderBy: [{ level: "desc" }, { displayName: "asc" }],
    });

    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch roles" } },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create a new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.displayName) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name and displayName are required" } },
        { status: 400 }
      );
    }

    // Normalize role name
    const normalizedName = body.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Check for duplicate name
    const existing = await prisma.role.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ERROR", message: "A role with this name already exists" } },
        { status: 400 }
      );
    }

    // Create role with permissions if provided
    const role = await prisma.role.create({
      data: {
        name: normalizedName,
        displayName: body.displayName,
        description: body.description,
        type: RoleType.CUSTOM,
        level: body.level ?? 0,
        parentId: body.parentId,
        permissions: body.permissions
          ? {
              create: body.permissions.map((p: { entity: string; action: string; recordAccess?: string; conditions?: unknown }) => ({
                entity: p.entity,
                action: p.action,
                recordAccess: p.recordAccess || "OWN",
                conditions: p.conditions || [],
              })),
            }
          : undefined,
        fieldPermissions: body.fieldPermissions
          ? {
              create: body.fieldPermissions.map((fp: { entity: string; fieldName: string; canView?: boolean; canEdit?: boolean; maskValue?: boolean; maskPattern?: string }) => ({
                entity: fp.entity,
                fieldName: fp.fieldName,
                canView: fp.canView ?? true,
                canEdit: fp.canEdit ?? true,
                maskValue: fp.maskValue ?? false,
                maskPattern: fp.maskPattern,
              })),
            }
          : undefined,
      },
      include: {
        permissions: true,
        fieldPermissions: true,
        _count: {
          select: { userRoles: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    console.error("Failed to create role:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create role" } },
      { status: 500 }
    );
  }
}
