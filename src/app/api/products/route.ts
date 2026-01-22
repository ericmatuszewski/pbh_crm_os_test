import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";

const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["PRODUCT", "SERVICE", "SUBSCRIPTION"]).default("PRODUCT"),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).default("ACTIVE"),
  basePrice: z.number().min(0, "Price must be positive"),
  currency: z.string().default("USD"),
  pricingType: z.enum(["ONE_TIME", "RECURRING_MONTHLY", "RECURRING_YEARLY", "USAGE_BASED"]).default("ONE_TIME"),
  category: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional().default([]),
  trackInventory: z.boolean().optional().default(false),
  stockQuantity: z.number().int().optional().nullable(),
});

const productFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
  type: z.enum(["PRODUCT", "SERVICE", "SUBSCRIPTION"]).optional(),
  category: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = productFiltersSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      category: searchParams.get("category") || undefined,
    });

    // Get current business for scoping
    const business = await getCurrentBusiness(request);

    const where: Prisma.ProductWhereInput = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.categoryId = filters.category;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Convert Decimal to number
    const serializedProducts = products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
    }));

    return NextResponse.json({
      success: true,
      data: serializedProducts,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch products" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createProductSchema.parse(body);

    // Get current business
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Check for duplicate SKU within the business
    const existingSku = await prisma.product.findFirst({
      where: { sku: data.sku, businessId: business.id },
    });

    if (existingSku) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_SKU", message: "A product with this SKU already exists" } },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        type: data.type,
        status: data.status,
        basePrice: data.basePrice,
        currency: data.currency,
        pricingType: data.pricingType,
        categoryId: data.category || null,
        tags: data.tags,
        trackInventory: data.trackInventory,
        stockQuantity: data.stockQuantity,
        businessId: business.id,
      },
    });

    return NextResponse.json(
      { success: true, data: { ...product, basePrice: Number(product.basePrice) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create product" } },
      { status: 500 }
    );
  }
}
