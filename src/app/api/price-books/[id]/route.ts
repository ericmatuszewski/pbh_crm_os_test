import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updatePriceBookSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  companySize: z.enum(["STARTUP", "SMALL", "MEDIUM", "ENTERPRISE"]).optional().nullable(),
  industry: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
});

const priceBookEntrySchema = z.object({
  entries: z.array(z.object({
    id: z.string().optional(),
    productId: z.string().min(1),
    price: z.number().min(0),
    minQuantity: z.number().int().min(1).default(1),
    maxQuantity: z.number().int().optional().nullable(),
  })),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const priceBook = await prisma.priceBook.findUnique({
      where: { id: params.id },
      include: {
        entries: {
          include: {
            product: { select: { id: true, sku: true, name: true, basePrice: true } },
          },
          orderBy: { product: { name: "asc" } },
        },
      },
    });

    if (!priceBook) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Price book not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...priceBook,
        discountPercent: priceBook.discountPercent ? Number(priceBook.discountPercent) : null,
        entries: priceBook.entries.map((entry) => ({
          ...entry,
          price: Number(entry.price),
          product: {
            ...entry.product,
            basePrice: Number(entry.product.basePrice),
          },
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching price book:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch price book" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = updatePriceBookSchema.parse(body);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.priceBook.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      });
    }

    const priceBook = await prisma.priceBook.update({
      where: { id: params.id },
      data,
      include: {
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...priceBook, discountPercent: priceBook.discountPercent ? Number(priceBook.discountPercent) : null },
    });
  } catch (error) {
    console.error("Error updating price book:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update price book" } },
      { status: 500 }
    );
  }
}

// PUT - Update price book entries
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = priceBookEntrySchema.parse(body);

    await prisma.$transaction(async (tx) => {
      // Get existing entries
      const existingEntries = await tx.priceBookEntry.findMany({
        where: { priceBookId: params.id },
        select: { id: true },
      });
      const existingIds = new Set(existingEntries.map((e) => e.id));

      // Separate updates, creates, and deletes
      const entriesToUpdate = data.entries.filter((e) => e.id && existingIds.has(e.id));
      const entriesToCreate = data.entries.filter((e) => !e.id);
      const entryIdsToKeep = new Set(entriesToUpdate.map((e) => e.id));
      const entryIdsToDelete = existingEntries
        .filter((e) => !entryIdsToKeep.has(e.id))
        .map((e) => e.id);

      // Delete removed entries
      if (entryIdsToDelete.length > 0) {
        await tx.priceBookEntry.deleteMany({
          where: { id: { in: entryIdsToDelete } },
        });
      }

      // Update existing entries
      for (const entry of entriesToUpdate) {
        await tx.priceBookEntry.update({
          where: { id: entry.id },
          data: {
            productId: entry.productId,
            price: entry.price,
            minQuantity: entry.minQuantity,
            maxQuantity: entry.maxQuantity,
          },
        });
      }

      // Create new entries
      if (entriesToCreate.length > 0) {
        await tx.priceBookEntry.createMany({
          data: entriesToCreate.map((entry) => ({
            priceBookId: params.id,
            productId: entry.productId,
            price: entry.price,
            minQuantity: entry.minQuantity,
            maxQuantity: entry.maxQuantity,
          })),
        });
      }
    });

    // Fetch updated price book
    const priceBook = await prisma.priceBook.findUnique({
      where: { id: params.id },
      include: {
        entries: {
          include: {
            product: { select: { id: true, sku: true, name: true, basePrice: true } },
          },
          orderBy: { product: { name: "asc" } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...priceBook,
        discountPercent: priceBook?.discountPercent ? Number(priceBook.discountPercent) : null,
        entries: priceBook?.entries.map((entry) => ({
          ...entry,
          price: Number(entry.price),
          product: {
            ...entry.product,
            basePrice: Number(entry.product.basePrice),
          },
        })),
      },
    });
  } catch (error) {
    console.error("Error updating price book entries:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update price book entries" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.priceBook.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    console.error("Error deleting price book:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete price book" } },
      { status: 500 }
    );
  }
}
