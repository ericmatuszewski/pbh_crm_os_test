import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/business";

const attributeValueSchema = z.object({
  attributeId: z.string(),
  textValue: z.string().optional().nullable(),
  numberValue: z.number().optional().nullable(),
  booleanValue: z.boolean().optional().nullable(),
  dateValue: z.string().datetime().optional().nullable(),
  jsonValue: z.any().optional().nullable(),
});

const setAttributesSchema = z.object({
  attributes: z.array(attributeValueSchema),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);

    // Verify product exists and get its attributes
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        businessId: true,
        attributes: {
          include: {
            attribute: {
              select: {
                id: true,
                name: true,
                label: true,
                valueType: true,
                isRequired: true,
                options: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (business && product.businessId && product.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Transform to a more usable format
    const attributeValues = product.attributes.map((av) => ({
      id: av.id,
      attributeId: av.attributeId,
      attributeName: av.attribute.name,
      attributeLabel: av.attribute.label,
      valueType: av.attribute.valueType,
      unit: av.attribute.unit,
      options: av.attribute.options,
      isRequired: av.attribute.isRequired,
      value: getValueByType(av),
    }));

    return NextResponse.json({ success: true, data: attributeValues });
  } catch (error) {
    console.error("Error fetching product attributes:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch product attributes" } },
      { status: 500 }
    );
  }
}

function getValueByType(av: {
  textValue: string | null;
  numberValue: unknown;
  booleanValue: boolean | null;
  dateValue: Date | null;
  jsonValue: unknown;
  attribute: { valueType: string };
}): unknown {
  switch (av.attribute.valueType) {
    case "TEXT":
    case "RICH_TEXT":
    case "URL":
    case "COLOR":
      return av.textValue;
    case "NUMBER":
    case "DECIMAL":
    case "DIMENSION":
    case "WEIGHT":
      return av.numberValue ? Number(av.numberValue) : null;
    case "BOOLEAN":
      return av.booleanValue;
    case "DATE":
      return av.dateValue;
    case "SELECT":
    case "MULTI_SELECT":
      return av.jsonValue;
    default:
      return av.textValue || av.jsonValue;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = setAttributesSchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (product.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Validate all attributes exist
    const attributeIds = data.attributes.map((a) => a.attributeId);
    const existingAttributes = await prisma.productAttribute.findMany({
      where: { id: { in: attributeIds } },
      select: { id: true, valueType: true, isRequired: true, name: true },
    });

    const existingAttrMap = new Map(existingAttributes.map((a) => [a.id, a]));
    for (const attr of data.attributes) {
      if (!existingAttrMap.has(attr.attributeId)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_ATTRIBUTE", message: `Attribute ${attr.attributeId} not found` } },
          { status: 400 }
        );
      }
    }

    // Upsert each attribute value
    const results = await Promise.all(
      data.attributes.map(async (attr) => {
        const attributeDef = existingAttrMap.get(attr.attributeId)!;

        // Prepare value fields based on attribute type
        const valueData: {
          textValue?: string | null;
          numberValue?: number | null;
          booleanValue?: boolean | null;
          dateValue?: Date | null;
          jsonValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
        } = {};

        switch (attributeDef.valueType) {
          case "TEXT":
          case "RICH_TEXT":
          case "URL":
          case "COLOR":
            valueData.textValue = attr.textValue ?? null;
            break;
          case "NUMBER":
          case "DECIMAL":
          case "DIMENSION":
          case "WEIGHT":
            valueData.numberValue = attr.numberValue ?? null;
            break;
          case "BOOLEAN":
            valueData.booleanValue = attr.booleanValue ?? null;
            break;
          case "DATE":
            valueData.dateValue = attr.dateValue ? new Date(attr.dateValue) : null;
            break;
          case "SELECT":
          case "MULTI_SELECT":
            valueData.jsonValue = attr.jsonValue ? (attr.jsonValue as Prisma.InputJsonValue) : Prisma.JsonNull;
            break;
          default:
            valueData.textValue = attr.textValue ?? null;
        }

        return prisma.productAttributeValue.upsert({
          where: {
            productId_attributeId: {
              productId: id,
              attributeId: attr.attributeId,
            },
          },
          update: valueData,
          create: {
            productId: id,
            attributeId: attr.attributeId,
            ...valueData,
          },
          include: {
            attribute: {
              select: {
                id: true,
                name: true,
                label: true,
                valueType: true,
              },
            },
          },
        });
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error setting product attributes:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to set product attributes" } },
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
    const searchParams = request.nextUrl.searchParams;
    const attributeId = searchParams.get("attributeId");

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (product.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    if (attributeId) {
      // Delete specific attribute value
      await prisma.productAttributeValue.deleteMany({
        where: {
          productId: id,
          attributeId: attributeId,
        },
      });
    } else {
      // Delete all attribute values for product
      await prisma.productAttributeValue.deleteMany({
        where: { productId: id },
      });
    }

    return NextResponse.json({ success: true, data: { productId: id, attributeId } });
  } catch (error) {
    console.error("Error deleting product attributes:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete product attributes" } },
      { status: 500 }
    );
  }
}
