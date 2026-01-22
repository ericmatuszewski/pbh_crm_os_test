import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/business";

const bundleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
  position: z.number().int().optional(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
});

const createBundleItemsSchema = z.object({
  items: z.array(bundleItemSchema),
});

const updateBundleItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  position: z.number().int().optional(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);

    // Verify product exists and is a bundle type
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        businessId: true,
        type: true,
        bundleItems: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
                currency: true,
                status: true,
                media: {
                  where: { isPrimary: true },
                  select: { url: true, thumbnailUrl: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { position: "asc" },
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

    // Calculate bundle totals
    const bundleItems = product.bundleItems.map((item) => {
      const basePrice = Number(item.product.basePrice);
      const discountPercent = item.discountPercent ? Number(item.discountPercent) : 0;
      const unitPrice = basePrice * (1 - discountPercent / 100);
      const lineTotal = unitPrice * item.quantity;

      return {
        id: item.id,
        bundleId: item.bundleId,
        productId: item.productId,
        quantity: item.quantity,
        position: item.position,
        discountPercent: item.discountPercent ? Number(item.discountPercent) : null,
        product: {
          ...item.product,
          basePrice: basePrice,
          image: item.product.media[0] || null,
        },
        calculated: {
          unitPrice,
          lineTotal,
        },
      };
    });

    const bundleTotal = bundleItems.reduce((sum, item) => sum + item.calculated.lineTotal, 0);
    const originalTotal = bundleItems.reduce(
      (sum, item) => sum + Number(item.product.basePrice) * item.quantity,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        bundleId: id,
        items: bundleItems,
        summary: {
          itemCount: bundleItems.length,
          totalQuantity: bundleItems.reduce((sum, item) => sum + item.quantity, 0),
          originalTotal,
          bundleTotal,
          savings: originalTotal - bundleTotal,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching bundle items:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch bundle items" } },
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
    const data = createBundleItemsSchema.parse(body);

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
      select: { id: true, businessId: true, type: true },
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

    // Validate all products exist and are not the bundle itself
    const productIds = data.items.map((item) => item.productId);
    if (productIds.includes(id)) {
      return NextResponse.json(
        { success: false, error: { code: "SELF_REFERENCE", message: "A bundle cannot contain itself" } },
        { status: 400 }
      );
    }

    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId: business.id },
      select: { id: true },
    });

    const existingProductIds = new Set(existingProducts.map((p) => p.id));
    const missingProducts = productIds.filter((pid) => !existingProductIds.has(pid));
    if (missingProducts.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PRODUCTS", message: `Products not found: ${missingProducts.join(", ")}` } },
        { status: 400 }
      );
    }

    // Check for circular references (products that are themselves bundles containing this product)
    const bundlesContainingThis = await prisma.bundleItem.findMany({
      where: {
        bundleId: { in: productIds },
        productId: id,
      },
    });

    if (bundlesContainingThis.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: "CIRCULAR_REFERENCE", message: "Cannot add products that already bundle this product" } },
        { status: 400 }
      );
    }

    // Get max position
    const maxPosition = await prisma.bundleItem.aggregate({
      where: { bundleId: id },
      _max: { position: true },
    });
    let nextPosition = (maxPosition._max.position ?? -1) + 1;

    // Create bundle items (upsert to handle duplicates)
    const results = await Promise.all(
      data.items.map(async (item) => {
        const position = item.position ?? nextPosition++;

        return prisma.bundleItem.upsert({
          where: {
            bundleId_productId: {
              bundleId: id,
              productId: item.productId,
            },
          },
          update: {
            quantity: item.quantity,
            position,
            discountPercent: item.discountPercent ?? null,
          },
          create: {
            bundleId: id,
            productId: item.productId,
            quantity: item.quantity,
            position,
            discountPercent: item.discountPercent ?? null,
          },
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
              },
            },
          },
        });
      })
    );

    return NextResponse.json({ success: true, data: results }, { status: 201 });
  } catch (error) {
    console.error("Error creating bundle items:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create bundle items" } },
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
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get("itemId");
    const body = await request.json();
    const data = updateBundleItemSchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAM", message: "itemId query parameter is required" } },
        { status: 400 }
      );
    }

    // Verify product exists and item belongs to bundle
    const bundleItem = await prisma.bundleItem.findUnique({
      where: { id: itemId },
      include: {
        bundle: {
          select: { id: true, businessId: true },
        },
      },
    });

    if (!bundleItem || bundleItem.bundleId !== id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Bundle item not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (bundleItem.bundle.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const updated = await prisma.bundleItem.update({
      where: { id: itemId },
      data: {
        quantity: data.quantity,
        position: data.position,
        discountPercent: data.discountPercent,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            basePrice: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating bundle item:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update bundle item" } },
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
    const itemId = searchParams.get("itemId");
    const productId = searchParams.get("productId");

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Verify bundle product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Bundle not found" } },
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

    if (itemId) {
      // Delete by item ID
      await prisma.bundleItem.delete({
        where: { id: itemId, bundleId: id },
      });
    } else if (productId) {
      // Delete by product ID
      await prisma.bundleItem.delete({
        where: {
          bundleId_productId: {
            bundleId: id,
            productId: productId,
          },
        },
      });
    } else {
      // Delete all items from bundle
      await prisma.bundleItem.deleteMany({
        where: { bundleId: id },
      });
    }

    return NextResponse.json({ success: true, data: { bundleId: id, itemId, productId } });
  } catch (error) {
    console.error("Error deleting bundle item:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete bundle item" } },
      { status: 500 }
    );
  }
}
