import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/business";

const createVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().optional(), // If not provided, will be auto-generated from parent + attributes
  basePrice: z.number().min(0).optional(), // If not provided, inherits from parent
  costPrice: z.number().min(0).optional(),
  stockQuantity: z.number().int().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
  variantType: z.string().optional(), // e.g., "size", "color", "size-color"
  attributes: z.array(z.object({
    attributeId: z.string(),
    value: z.any(), // The value of the variant-defining attribute
  })),
});

const generateVariantsSchema = z.object({
  attributeIds: z.array(z.string()).min(1, "At least one attribute is required"),
  skuTemplate: z.string().optional(), // e.g., "{parentSku}-{color}-{size}"
  nameTemplate: z.string().optional(), // e.g., "{parentName} - {color} {size}"
  priceAdjustments: z.record(z.string(), z.number()).optional(), // { "color:gold": 50 } adds $50 for gold
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);

    // Get parent product with its variants
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        name: true,
        businessId: true,
        isVariant: true,
        parentId: true,
        children: {
          where: { isVariant: true },
          include: {
            attributes: {
              include: {
                attribute: {
                  select: {
                    id: true,
                    name: true,
                    label: true,
                    valueType: true,
                    options: true,
                  },
                },
              },
            },
            media: {
              where: { isPrimary: true },
              select: { url: true, thumbnailUrl: true },
              take: 1,
            },
          },
          orderBy: { sku: "asc" },
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

    // If this product is itself a variant, return its parent's variants
    if (product.isVariant && product.parentId) {
      return NextResponse.json({
        success: true,
        data: {
          isVariant: true,
          parentId: product.parentId,
          message: "This product is a variant. Fetch the parent product to see all variants.",
        },
      });
    }

    // Transform variant data
    const variants = product.children.map((variant) => {
      const variantAttributes: Record<string, unknown> = {};
      variant.attributes.forEach((av) => {
        const attrName = av.attribute.name;
        // Get the appropriate value based on type
        if (av.attribute.valueType === "SELECT" || av.attribute.valueType === "MULTI_SELECT") {
          variantAttributes[attrName] = av.jsonValue;
        } else if (av.attribute.valueType === "NUMBER" || av.attribute.valueType === "DECIMAL") {
          variantAttributes[attrName] = av.numberValue ? Number(av.numberValue) : null;
        } else if (av.attribute.valueType === "BOOLEAN") {
          variantAttributes[attrName] = av.booleanValue;
        } else if (av.attribute.valueType === "DATE") {
          variantAttributes[attrName] = av.dateValue;
        } else {
          variantAttributes[attrName] = av.textValue;
        }
      });

      return {
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        basePrice: Number(variant.basePrice),
        costPrice: variant.costPrice ? Number(variant.costPrice) : null,
        stockQuantity: variant.stockQuantity,
        status: variant.status,
        variantType: variant.variantType,
        attributes: variantAttributes,
        image: variant.media[0] || null,
      };
    });

    // Get variant-defining attributes for this product
    const variantAttributes = await prisma.productAttribute.findMany({
      where: {
        isVariantDefining: true,
        businessId: product.businessId,
      },
      select: {
        id: true,
        name: true,
        label: true,
        valueType: true,
        options: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        parentId: id,
        parentSku: product.sku,
        parentName: product.name,
        variantCount: variants.length,
        variants,
        variantDefiningAttributes: variantAttributes,
      },
    });
  } catch (error) {
    console.error("Error fetching product variants:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch product variants" } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = createVariantSchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Get parent product
    const parent = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        name: true,
        businessId: true,
        isVariant: true,
        basePrice: true,
        costPrice: true,
        categoryId: true,
        type: true,
        currency: true,
        pricingType: true,
      },
    });

    if (!parent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Parent product not found" } },
        { status: 404 }
      );
    }

    // Cannot create variant of a variant
    if (parent.isVariant) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PARENT", message: "Cannot create variant of a variant product" } },
        { status: 400 }
      );
    }

    // Verify business scope
    if (parent.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Check for duplicate SKU
    const existingSku = await prisma.product.findFirst({
      where: { sku: data.sku, businessId: business.id },
    });

    if (existingSku) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_SKU", message: "A product with this SKU already exists" } },
        { status: 400 }
      );
    }

    // Build variant name if not provided
    let variantName = data.name;
    if (!variantName && data.attributes.length > 0) {
      // Get attribute labels and values
      const attributeIds = data.attributes.map((a) => a.attributeId);
      const attributes = await prisma.productAttribute.findMany({
        where: { id: { in: attributeIds } },
        select: { id: true, name: true, label: true, options: true },
      });

      const attrMap = new Map(attributes.map((a) => [a.id, a]));
      const parts = data.attributes.map((a) => {
        const attr = attrMap.get(a.attributeId);
        if (!attr) return String(a.value);

        // For SELECT, find the label from options
        if (Array.isArray(attr.options)) {
          const option = (attr.options as { value: string; label: string }[]).find(
            (o) => o.value === a.value
          );
          return option?.label || String(a.value);
        }
        return String(a.value);
      });

      variantName = `${parent.name} - ${parts.join(" / ")}`;
    }

    // Create the variant product
    const variant = await prisma.product.create({
      data: {
        sku: data.sku,
        name: variantName || `${parent.name} Variant`,
        type: parent.type,
        status: data.status || "ACTIVE",
        basePrice: data.basePrice ?? Number(parent.basePrice),
        costPrice: data.costPrice ?? (parent.costPrice ? Number(parent.costPrice) : null),
        currency: parent.currency,
        pricingType: parent.pricingType,
        categoryId: parent.categoryId,
        parentId: id,
        isVariant: true,
        variantType: data.variantType || null,
        stockQuantity: data.stockQuantity ?? null,
        businessId: business.id,
      },
    });

    // Create attribute values for the variant
    if (data.attributes.length > 0) {
      const attributeIds = data.attributes.map((a) => a.attributeId);
      const attributeDefs = await prisma.productAttribute.findMany({
        where: { id: { in: attributeIds } },
        select: { id: true, valueType: true },
      });

      const attrTypeMap = new Map(attributeDefs.map((a) => [a.id, a.valueType]));

      await Promise.all(
        data.attributes.map(async (attr) => {
          const valueType = attrTypeMap.get(attr.attributeId);
          const valueData: {
            textValue?: string | null;
            numberValue?: number | null;
            booleanValue?: boolean | null;
            jsonValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
          } = {};

          switch (valueType) {
            case "TEXT":
            case "RICH_TEXT":
            case "URL":
            case "COLOR":
              valueData.textValue = String(attr.value);
              break;
            case "NUMBER":
            case "DECIMAL":
              valueData.numberValue = Number(attr.value);
              break;
            case "BOOLEAN":
              valueData.booleanValue = Boolean(attr.value);
              break;
            case "SELECT":
            case "MULTI_SELECT":
              valueData.jsonValue = attr.value ? (attr.value as Prisma.InputJsonValue) : Prisma.JsonNull;
              break;
            default:
              valueData.textValue = String(attr.value);
          }

          return prisma.productAttributeValue.create({
            data: {
              productId: variant.id,
              attributeId: attr.attributeId,
              ...valueData,
            },
          });
        })
      );
    }

    // Fetch complete variant with attributes
    const completeVariant = await prisma.product.findUnique({
      where: { id: variant.id },
      include: {
        attributes: {
          include: {
            attribute: {
              select: { id: true, name: true, label: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...completeVariant,
          basePrice: Number(completeVariant!.basePrice),
          costPrice: completeVariant!.costPrice ? Number(completeVariant!.costPrice) : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product variant:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create product variant" } },
      { status: 500 }
    );
  }
}

// Generate all variants from attribute combinations
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = generateVariantsSchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Get parent product
    const parent = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        name: true,
        businessId: true,
        isVariant: true,
        basePrice: true,
        costPrice: true,
        categoryId: true,
        type: true,
        currency: true,
        pricingType: true,
      },
    });

    if (!parent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Parent product not found" } },
        { status: 404 }
      );
    }

    if (parent.isVariant) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PARENT", message: "Cannot generate variants for a variant product" } },
        { status: 400 }
      );
    }

    if (parent.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Get selected attributes with their options
    const attributes = await prisma.productAttribute.findMany({
      where: {
        id: { in: data.attributeIds },
        isVariantDefining: true,
        businessId: business.id,
      },
      select: {
        id: true,
        name: true,
        label: true,
        options: true,
      },
    });

    if (attributes.length !== data.attributeIds.length) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ATTRIBUTES", message: "Some attributes not found or not variant-defining" } },
        { status: 400 }
      );
    }

    // Generate all combinations
    type Option = { value: string; label: string };
    type Combination = { attributeId: string; attrName: string; value: string; label: string }[];

    const generateCombinations = (attrs: typeof attributes): Combination[] => {
      if (attrs.length === 0) return [[]];

      const [first, ...rest] = attrs;
      const restCombinations = generateCombinations(rest);
      const options = (first.options as Option[]) || [];

      if (options.length === 0) return restCombinations;

      const combinations: Combination[] = [];
      for (const option of options) {
        for (const combo of restCombinations) {
          combinations.push([
            { attributeId: first.id, attrName: first.name, value: option.value, label: option.label },
            ...combo,
          ]);
        }
      }
      return combinations;
    };

    const combinations = generateCombinations(attributes);

    // Create variants for each combination
    const createdVariants: unknown[] = [];
    let skipped = 0;

    for (const combo of combinations) {
      // Generate SKU
      let sku = data.skuTemplate || `${parent.sku}-{values}`;
      let name = data.nameTemplate || `${parent.name} - {labels}`;

      const values = combo.map((c) => c.value).join("-");
      const labels = combo.map((c) => c.label).join(" / ");

      sku = sku.replace("{parentSku}", parent.sku).replace("{values}", values);
      combo.forEach((c) => {
        sku = sku.replace(`{${c.attrName}}`, c.value);
      });

      name = name.replace("{parentName}", parent.name).replace("{labels}", labels);
      combo.forEach((c) => {
        name = name.replace(`{${c.attrName}}`, c.label);
      });

      // Check if SKU already exists
      const existing = await prisma.product.findFirst({
        where: { sku, businessId: business.id },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Calculate price adjustment
      let priceAdjustment = 0;
      if (data.priceAdjustments) {
        for (const c of combo) {
          const key = `${c.attrName}:${c.value}`;
          if (data.priceAdjustments[key]) {
            priceAdjustment += data.priceAdjustments[key];
          }
        }
      }

      // Create variant
      const variant = await prisma.product.create({
        data: {
          sku,
          name,
          type: parent.type,
          status: "ACTIVE",
          basePrice: Number(parent.basePrice) + priceAdjustment,
          costPrice: parent.costPrice ? Number(parent.costPrice) : null,
          currency: parent.currency,
          pricingType: parent.pricingType,
          categoryId: parent.categoryId,
          parentId: id,
          isVariant: true,
          variantType: attributes.map((a) => a.name).join("-"),
          businessId: business.id,
        },
      });

      // Create attribute values
      await Promise.all(
        combo.map((c) =>
          prisma.productAttributeValue.create({
            data: {
              productId: variant.id,
              attributeId: c.attributeId,
              jsonValue: c.value,
            },
          })
        )
      );

      createdVariants.push({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        basePrice: Number(variant.basePrice),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCombinations: combinations.length,
        created: createdVariants.length,
        skipped,
        variants: createdVariants,
      },
    });
  } catch (error) {
    console.error("Error generating product variants:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "GENERATE_ERROR", message: "Failed to generate product variants" } },
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
    const variantId = searchParams.get("variantId");

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Verify parent product exists
    const parent = await prisma.product.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!parent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Parent product not found" } },
        { status: 404 }
      );
    }

    if (parent.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    if (variantId) {
      // Delete specific variant
      const variant = await prisma.product.findUnique({
        where: { id: variantId },
        select: { id: true, parentId: true, isVariant: true },
      });

      if (!variant || variant.parentId !== id || !variant.isVariant) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Variant not found" } },
          { status: 404 }
        );
      }

      // Delete attribute values and the product
      await prisma.productAttributeValue.deleteMany({
        where: { productId: variantId },
      });
      await prisma.product.delete({ where: { id: variantId } });

      return NextResponse.json({ success: true, data: { deleted: 1 } });
    } else {
      // Delete all variants
      const variants = await prisma.product.findMany({
        where: { parentId: id, isVariant: true },
        select: { id: true },
      });

      const variantIds = variants.map((v) => v.id);

      await prisma.productAttributeValue.deleteMany({
        where: { productId: { in: variantIds } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: variantIds } },
      });

      return NextResponse.json({ success: true, data: { deleted: variantIds.length } });
    }
  } catch (error) {
    console.error("Error deleting product variants:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete product variants" } },
      { status: 500 }
    );
  }
}
