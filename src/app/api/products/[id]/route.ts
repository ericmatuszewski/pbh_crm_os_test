import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateProductSchema = z.object({
  sku: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(["PRODUCT", "SERVICE", "SUBSCRIPTION"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
  basePrice: z.number().min(0).optional(),
  currency: z.string().optional(),
  pricingType: z.enum(["ONE_TIME", "RECURRING_MONTHLY", "RECURRING_YEARLY", "USAGE_BASED"]).optional(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  trackInventory: z.boolean().optional(),
  stockQuantity: z.number().int().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        priceBookEntries: {
          include: {
            priceBook: { select: { id: true, name: true } },
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

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        basePrice: Number(product.basePrice),
        priceBookEntries: product.priceBookEntries.map((entry) => ({
          ...entry,
          price: Number(entry.price),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch product" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = updateProductSchema.parse(body);

    // If SKU is being updated, check for duplicates
    if (data.sku) {
      const existingSku = await prisma.product.findFirst({
        where: { sku: data.sku, id: { not: params.id } },
      });

      if (existingSku) {
        return NextResponse.json(
          { success: false, error: { code: "DUPLICATE_SKU", message: "A product with this SKU already exists" } },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: { ...product, basePrice: Number(product.basePrice) },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update product" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if product is used in any quotes
    const quoteItemCount = await prisma.quoteItem.count({
      where: { productId: params.id },
    });

    if (quoteItemCount > 0) {
      return NextResponse.json(
        { success: false, error: { code: "IN_USE", message: `Cannot delete product used in ${quoteItemCount} quotes` } },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete product" } },
      { status: 500 }
    );
  }
}
