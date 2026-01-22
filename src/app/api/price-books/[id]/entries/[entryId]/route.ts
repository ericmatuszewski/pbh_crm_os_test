import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateEntrySchema = z.object({
  productId: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  minQuantity: z.number().int().min(1).optional(),
  maxQuantity: z.number().int().min(1).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

// Get a specific entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const entry = await prisma.priceBookEntry.findFirst({
      where: {
        id: params.entryId,
        priceBookId: params.id,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            basePrice: true,
            currency: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Entry not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...entry,
        price: Number(entry.price),
        discountPercent: entry.discountPercent ? Number(entry.discountPercent) : null,
        product: entry.product
          ? {
              ...entry.product,
              basePrice: Number(entry.product.basePrice),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching price book entry:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch entry" } },
      { status: 500 }
    );
  }
}

// Update an entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const body = await request.json();
    const data = updateEntrySchema.parse(body);

    // Verify entry exists and belongs to this price book
    const existingEntry = await prisma.priceBookEntry.findFirst({
      where: {
        id: params.entryId,
        priceBookId: params.id,
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Entry not found" } },
        { status: 404 }
      );
    }

    // If changing product, check for duplicates
    if (data.productId && data.productId !== existingEntry.productId) {
      const duplicateEntry = await prisma.priceBookEntry.findFirst({
        where: {
          priceBookId: params.id,
          productId: data.productId,
          id: { not: params.entryId },
        },
      });

      if (duplicateEntry) {
        return NextResponse.json(
          { success: false, error: { code: "DUPLICATE", message: "Product already exists in this price book" } },
          { status: 400 }
        );
      }
    }

    const entry = await prisma.priceBookEntry.update({
      where: { id: params.entryId },
      data,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            basePrice: true,
            currency: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...entry,
        price: Number(entry.price),
        discountPercent: entry.discountPercent ? Number(entry.discountPercent) : null,
        product: entry.product
          ? {
              ...entry.product,
              basePrice: Number(entry.product.basePrice),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error updating price book entry:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update entry" } },
      { status: 500 }
    );
  }
}

// Delete an entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    // Verify entry exists and belongs to this price book
    const existingEntry = await prisma.priceBookEntry.findFirst({
      where: {
        id: params.entryId,
        priceBookId: params.id,
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Entry not found" } },
        { status: 404 }
      );
    }

    await prisma.priceBookEntry.delete({
      where: { id: params.entryId },
    });

    return NextResponse.json({
      success: true,
      data: { id: params.entryId },
    });
  } catch (error) {
    console.error("Error deleting price book entry:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete entry" } },
      { status: 500 }
    );
  }
}
