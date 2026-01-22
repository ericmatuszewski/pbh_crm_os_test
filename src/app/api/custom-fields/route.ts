import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CustomFieldType } from "@prisma/client";

// GET /api/custom-fields - List custom field definitions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const fieldType = searchParams.get("fieldType") as CustomFieldType | null;
    const isActive = searchParams.get("isActive");
    const groupName = searchParams.get("groupName");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (entity) where.entity = entity;
    if (fieldType) where.fieldType = fieldType;
    if (isActive !== null) where.isActive = isActive === "true";
    if (groupName) where.groupName = groupName;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { label: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const fields = await prisma.customFieldDefinition.findMany({
      where,
      orderBy: [
        { entity: "asc" },
        { groupPosition: "asc" },
        { position: "asc" },
      ],
    });

    return NextResponse.json({ success: true, data: fields });
  } catch (error) {
    console.error("Failed to fetch custom fields:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch custom fields" } },
      { status: 500 }
    );
  }
}

// POST /api/custom-fields - Create a custom field definition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.label || !body.entity || !body.fieldType) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name, label, entity, and fieldType are required" } },
        { status: 400 }
      );
    }

    // Validate field type
    if (!Object.values(CustomFieldType).includes(body.fieldType)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid field type" } },
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

    // Normalize field name (snake_case)
    const normalizedName = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    // Check for duplicate field name on same entity
    const existing = await prisma.customFieldDefinition.findUnique({
      where: {
        entity_name: {
          entity: body.entity,
          name: normalizedName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ERROR", message: "A field with this name already exists for this entity" } },
        { status: 400 }
      );
    }

    // Validate options for dropdown/multi-select fields
    if (
      (body.fieldType === "DROPDOWN" || body.fieldType === "MULTI_SELECT") &&
      (!body.options || !Array.isArray(body.options) || body.options.length === 0)
    ) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Options are required for dropdown and multi-select fields" } },
        { status: 400 }
      );
    }

    // Validate lookup fields
    if (body.fieldType === "LOOKUP" && !body.lookupEntity) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "lookupEntity is required for lookup fields" } },
        { status: 400 }
      );
    }

    // Get the highest position for this entity
    const maxPosition = await prisma.customFieldDefinition.findFirst({
      where: { entity: body.entity },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const field = await prisma.customFieldDefinition.create({
      data: {
        name: normalizedName,
        label: body.label,
        description: body.description,
        entity: body.entity,
        fieldType: body.fieldType,
        isRequired: body.isRequired ?? false,
        isUnique: body.isUnique ?? false,
        isSearchable: body.isSearchable ?? true,
        isFilterable: body.isFilterable ?? true,
        showInList: body.showInList ?? false,
        position: body.position ?? (maxPosition?.position ?? 0) + 1,
        defaultValue: body.defaultValue,
        options: body.options,
        lookupEntity: body.lookupEntity,
        lookupDisplayField: body.lookupDisplayField,
        formula: body.formula,
        validation: body.validation,
        viewRoles: body.viewRoles ?? [],
        editRoles: body.editRoles ?? [],
        groupName: body.groupName,
        groupPosition: body.groupPosition ?? 0,
        createdById: body.createdById,
      },
    });

    return NextResponse.json({ success: true, data: field }, { status: 201 });
  } catch (error) {
    console.error("Failed to create custom field:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create custom field" } },
      { status: 500 }
    );
  }
}
