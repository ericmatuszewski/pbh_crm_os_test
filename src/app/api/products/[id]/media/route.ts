import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { MediaType, Prisma } from "@prisma/client";
import { getCurrentBusiness } from "@/lib/business";

const createMediaSchema = z.object({
  mediaType: z.nativeEnum(MediaType),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  storageKey: z.string().min(1, "Storage key is required"),
  storageProvider: z.string().optional().default("local"),
  url: z.string().url("Invalid URL"),
  thumbnailUrl: z.string().url().optional().nullable(),
  filename: z.string().min(1, "Filename is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().int().positive("Size must be positive"),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  position: z.number().int().optional().default(0),
  isPrimary: z.boolean().optional().default(false),
  altText: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  variantValues: z.record(z.string()).optional().nullable(),
});

const updateMediaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  position: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
  altText: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  variantValues: z.record(z.string()).optional().nullable(),
});

const reorderMediaSchema = z.object({
  mediaIds: z.array(z.string()),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const mediaType = searchParams.get("mediaType") as MediaType | null;
    const business = await getCurrentBusiness(request);

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
    if (business && product.businessId && product.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const where: { productId: string; mediaType?: MediaType } = { productId: id };
    if (mediaType) {
      where.mediaType = mediaType;
    }

    const media = await prisma.productMedia.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, data: media });
  } catch (error) {
    console.error("Error fetching product media:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch product media" } },
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
    const data = createMediaSchema.parse(body);

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

    // If this is set as primary, unset other primaries
    if (data.isPrimary) {
      await prisma.productMedia.updateMany({
        where: { productId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Get next position if not specified
    let position = data.position;
    if (position === 0) {
      const maxPosition = await prisma.productMedia.aggregate({
        where: { productId: id },
        _max: { position: true },
      });
      position = (maxPosition._max.position ?? -1) + 1;
    }

    const media = await prisma.productMedia.create({
      data: {
        productId: id,
        mediaType: data.mediaType,
        name: data.name,
        description: data.description || null,
        storageKey: data.storageKey,
        storageProvider: data.storageProvider,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || null,
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        width: data.width || null,
        height: data.height || null,
        duration: data.duration || null,
        position,
        isPrimary: data.isPrimary,
        altText: data.altText || null,
        tags: data.tags ?? [],
        variantValues: data.variantValues ? (data.variantValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ success: true, data: media }, { status: 201 });
  } catch (error) {
    console.error("Error creating product media:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create product media" } },
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
    const mediaId = searchParams.get("mediaId");
    const body = await request.json();

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

    // Check if this is a reorder operation
    if (!mediaId && body.mediaIds) {
      const reorderData = reorderMediaSchema.parse(body);

      // Update positions based on array order
      await Promise.all(
        reorderData.mediaIds.map((mediaIdItem, index) =>
          prisma.productMedia.update({
            where: { id: mediaIdItem, productId: id },
            data: { position: index },
          })
        )
      );

      return NextResponse.json({ success: true, data: { reordered: reorderData.mediaIds.length } });
    }

    // Single media update
    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAM", message: "mediaId query parameter is required" } },
        { status: 400 }
      );
    }

    const data = updateMediaSchema.parse(body);

    // If setting as primary, unset others
    if (data.isPrimary) {
      await prisma.productMedia.updateMany({
        where: { productId: id, isPrimary: true, id: { not: mediaId } },
        data: { isPrimary: false },
      });
    }

    const media = await prisma.productMedia.update({
      where: { id: mediaId, productId: id },
      data: {
        name: data.name,
        description: data.description,
        position: data.position,
        isPrimary: data.isPrimary,
        altText: data.altText,
        tags: data.tags,
        variantValues: data.variantValues ? (data.variantValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ success: true, data: media });
  } catch (error) {
    console.error("Error updating product media:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update product media" } },
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
    const mediaId = searchParams.get("mediaId");

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

    if (mediaId) {
      // Delete specific media
      const media = await prisma.productMedia.findUnique({
        where: { id: mediaId, productId: id },
      });

      if (!media) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Media not found" } },
          { status: 404 }
        );
      }

      await prisma.productMedia.delete({ where: { id: mediaId } });

      // If deleted was primary, make next one primary
      if (media.isPrimary) {
        const nextMedia = await prisma.productMedia.findFirst({
          where: { productId: id },
          orderBy: { position: "asc" },
        });
        if (nextMedia) {
          await prisma.productMedia.update({
            where: { id: nextMedia.id },
            data: { isPrimary: true },
          });
        }
      }
    } else {
      // Delete all media for product
      await prisma.productMedia.deleteMany({
        where: { productId: id },
      });
    }

    return NextResponse.json({ success: true, data: { productId: id, mediaId } });
  } catch (error) {
    console.error("Error deleting product media:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete product media" } },
      { status: 500 }
    );
  }
}
