import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createPriceBookSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional().or(z.literal("")),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  companySize: z.enum(["STARTUP", "SMALL", "MEDIUM", "ENTERPRISE"]).optional().nullable(),
  industry: z.string().optional().or(z.literal("")),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
});

const priceBookFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  companySize: z.enum(["STARTUP", "SMALL", "MEDIUM", "ENTERPRISE"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = priceBookFiltersSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      isActive: searchParams.get("isActive") || undefined,
      companySize: searchParams.get("companySize") || undefined,
    });

    const where: Prisma.PriceBookWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.companySize) {
      where.companySize = filters.companySize;
    }

    const [priceBooks, total] = await Promise.all([
      prisma.priceBook.findMany({
        where,
        include: {
          _count: { select: { entries: true } },
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.priceBook.count({ where }),
    ]);

    // Convert Decimal to number
    const serializedPriceBooks = priceBooks.map((pb) => ({
      ...pb,
      discountPercent: pb.discountPercent ? Number(pb.discountPercent) : null,
    }));

    return NextResponse.json({
      success: true,
      data: serializedPriceBooks,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching price books:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch price books" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createPriceBookSchema.parse(body);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.priceBook.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const priceBook = await prisma.priceBook.create({
      data: {
        name: data.name,
        description: data.description || null,
        isDefault: data.isDefault,
        isActive: data.isActive,
        companySize: data.companySize,
        industry: data.industry || null,
        discountPercent: data.discountPercent,
      },
      include: {
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: { ...priceBook, discountPercent: priceBook.discountPercent ? Number(priceBook.discountPercent) : null } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating price book:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create price book" } },
      { status: 500 }
    );
  }
}
