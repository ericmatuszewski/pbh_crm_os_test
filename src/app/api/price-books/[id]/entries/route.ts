import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createEntrySchema = z.object({
  productId: z.string().min(1, "Product is required"),
  price: z.number().min(0, "Price must be positive"),
  minQuantity: z.number().int().min(1).optional().default(1),
  maxQuantity: z.number().int().min(1).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

// Get all entries for a price book
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entries = await prisma.priceBookEntry.findMany({
      where: { priceBookId: params.id },
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
      orderBy: { product: { name: "asc" } },
    });

    const serializedEntries = entries.map((entry) => ({
      ...entry,
      price: Number(entry.price),
      discountPercent: entry.discountPercent ? Number(entry.discountPercent) : null,
      product: entry.product
        ? {
            ...entry.product,
            basePrice: Number(entry.product.basePrice),
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: serializedEntries,
    });
  } catch (error) {
    console.error("Error fetching price book entries:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch entries" } },
      { status: 500 }
    );
  }
}

// Add a new entry to a price book
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = createEntrySchema.parse(body);

    // Check if price book exists
    const priceBook = await prisma.priceBook.findUnique({
      where: { id: params.id },
    });

    if (!priceBook) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Price book not found" } },
        { status: 404 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
        { status: 404 }
      );
    }

    // Check for duplicate entry
    const existingEntry = await prisma.priceBookEntry.findFirst({
      where: {
        priceBookId: params.id,
        productId: data.productId,
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "Product already exists in this price book" } },
        { status: 400 }
      );
    }

    const entry = await prisma.priceBookEntry.create({
      data: {
        priceBookId: params.id,
        productId: data.productId,
        price: data.price,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity,
        discountPercent: data.discountPercent,
        isActive: data.isActive,
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
    console.error("Error creating price book entry:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create entry" } },
      { status: 500 }
    );
  }
}
