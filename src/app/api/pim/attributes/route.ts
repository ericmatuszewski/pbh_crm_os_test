import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { AttributeValueType, Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

const validationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  customMessage: z.string().optional(),
}).optional();

const createAttributeSchema = z.object({
  name: z.string().min(1, "Name is required").max(50).regex(/^[a-z0-9_]+$/, "Name must be lowercase alphanumeric with underscores"),
  label: z.string().min(1, "Label is required").max(100),
  description: z.string().optional(),
  valueType: z.nativeEnum(AttributeValueType),
  isRequired: z.boolean().optional().default(false),
  isFilterable: z.boolean().optional().default(true),
  isSearchable: z.boolean().optional().default(true),
  showInList: z.boolean().optional().default(false),
  isVariantDefining: z.boolean().optional().default(false),
  position: z.number().int().optional().default(0),
  options: z.array(optionSchema).optional(),
  validation: validationSchema,
  defaultValue: z.any().optional(),
  unit: z.string().optional(),
});

const attributeFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
  valueType: z.nativeEnum(AttributeValueType).optional(),
  isFilterable: z.enum(["true", "false"]).optional(),
  isVariantDefining: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = attributeFiltersSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 50,
      search: searchParams.get("search") || undefined,
      valueType: searchParams.get("valueType") || undefined,
      isFilterable: searchParams.get("isFilterable") || undefined,
      isVariantDefining: searchParams.get("isVariantDefining") || undefined,
    });

    const business = await getCurrentBusiness(request);

    const where: Record<string, unknown> = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { label: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.valueType) {
      where.valueType = filters.valueType;
    }

    if (filters.isFilterable !== undefined) {
      where.isFilterable = filters.isFilterable === "true";
    }

    if (filters.isVariantDefining !== undefined) {
      where.isVariantDefining = filters.isVariantDefining === "true";
    }

    const [attributes, total] = await Promise.all([
      prisma.productAttribute.findMany({
        where,
        include: {
          _count: { select: { values: true } },
        },
        orderBy: [{ position: "asc" }, { label: "asc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.productAttribute.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: attributes,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching product attributes:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch product attributes" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createAttributeSchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Check for duplicate name within business
    const existingName = await prisma.productAttribute.findFirst({
      where: { name: data.name, businessId: business.id },
    });

    if (existingName) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_NAME", message: "An attribute with this name already exists" } },
        { status: 400 }
      );
    }

    // Validate that SELECT/MULTI_SELECT have options
    if ((data.valueType === "SELECT" || data.valueType === "MULTI_SELECT") && (!data.options || data.options.length === 0)) {
      return NextResponse.json(
        { success: false, error: { code: "OPTIONS_REQUIRED", message: "Options are required for SELECT and MULTI_SELECT attribute types" } },
        { status: 400 }
      );
    }

    const attribute = await prisma.productAttribute.create({
      data: {
        name: data.name,
        label: data.label,
        description: data.description || null,
        valueType: data.valueType,
        isRequired: data.isRequired,
        isFilterable: data.isFilterable,
        isSearchable: data.isSearchable,
        showInList: data.showInList,
        isVariantDefining: data.isVariantDefining,
        position: data.position,
        options: data.options ? (data.options as Prisma.InputJsonValue) : Prisma.JsonNull,
        validation: data.validation ? (data.validation as Prisma.InputJsonValue) : Prisma.JsonNull,
        defaultValue: data.defaultValue || null,
        unit: data.unit || null,
        businessId: business.id,
      },
      include: {
        _count: { select: { values: true } },
      },
    });

    return NextResponse.json({ success: true, data: attribute }, { status: 201 });
  } catch (error) {
    console.error("Error creating product attribute:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create product attribute" } },
      { status: 500 }
    );
  }
}
