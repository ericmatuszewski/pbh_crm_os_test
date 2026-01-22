import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { AttributeValueType, Prisma } from "@prisma/client";
import { getCurrentBusiness } from "@/lib/business";

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
}).optional().nullable();

const updateAttributeSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "Name must be lowercase alphanumeric with underscores").optional(),
  label: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  valueType: z.nativeEnum(AttributeValueType).optional(),
  isRequired: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
  showInList: z.boolean().optional(),
  isVariantDefining: z.boolean().optional(),
  position: z.number().int().optional(),
  options: z.array(optionSchema).optional().nullable(),
  validation: validationSchema,
  defaultValue: z.any().optional().nullable(),
  unit: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);

    const attribute = await prisma.productAttribute.findUnique({
      where: { id },
      include: {
        _count: { select: { values: true } },
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Attribute not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (business && attribute.businessId && attribute.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: attribute });
  } catch (error) {
    console.error("Error fetching attribute:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch attribute" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateAttributeSchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Fetch existing attribute
    const existing = await prisma.productAttribute.findUnique({
      where: { id },
      include: { _count: { select: { values: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Attribute not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (existing.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Check for duplicate name if being changed
    if (data.name && data.name !== existing.name) {
      const existingName = await prisma.productAttribute.findFirst({
        where: { name: data.name, businessId: business.id, id: { not: id } },
      });
      if (existingName) {
        return NextResponse.json(
          { success: false, error: { code: "DUPLICATE_NAME", message: "An attribute with this name already exists" } },
          { status: 400 }
        );
      }
    }

    // Warn if changing valueType when values exist
    if (data.valueType && data.valueType !== existing.valueType && existing._count.values > 0) {
      return NextResponse.json(
        { success: false, error: { code: "TYPE_CHANGE_BLOCKED", message: `Cannot change value type when ${existing._count.values} products have values set. Delete values first.` } },
        { status: 400 }
      );
    }

    // Validate that SELECT/MULTI_SELECT have options
    const newValueType = data.valueType || existing.valueType;
    const newOptions = data.options !== undefined ? data.options : existing.options;
    if ((newValueType === "SELECT" || newValueType === "MULTI_SELECT") && (!newOptions || (Array.isArray(newOptions) && newOptions.length === 0))) {
      return NextResponse.json(
        { success: false, error: { code: "OPTIONS_REQUIRED", message: "Options are required for SELECT and MULTI_SELECT attribute types" } },
        { status: 400 }
      );
    }

    const attribute = await prisma.productAttribute.update({
      where: { id },
      data: {
        name: data.name,
        label: data.label,
        description: data.description,
        valueType: data.valueType,
        isRequired: data.isRequired,
        isFilterable: data.isFilterable,
        isSearchable: data.isSearchable,
        showInList: data.showInList,
        isVariantDefining: data.isVariantDefining,
        position: data.position,
        options: data.options === null ? Prisma.JsonNull : data.options as Prisma.InputJsonValue | undefined,
        validation: data.validation === null ? Prisma.JsonNull : data.validation as Prisma.InputJsonValue | undefined,
        defaultValue: data.defaultValue,
        unit: data.unit,
      },
      include: {
        _count: { select: { values: true } },
      },
    });

    return NextResponse.json({ success: true, data: attribute });
  } catch (error) {
    console.error("Error updating attribute:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update attribute" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Check if attribute exists and belongs to business
    const attribute = await prisma.productAttribute.findUnique({
      where: { id },
      include: { _count: { select: { values: true } } },
    });

    if (!attribute) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Attribute not found" } },
        { status: 404 }
      );
    }

    if (attribute.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Deleting will cascade to ProductAttributeValue
    await prisma.productAttribute.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting attribute:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete attribute" } },
      { status: 500 }
    );
  }
}
