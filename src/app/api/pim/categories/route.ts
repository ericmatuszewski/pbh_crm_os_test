import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";

const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const categoryFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
  parentId: z.string().optional().nullable(),
  isActive: z.enum(["true", "false"]).optional(),
  tree: z.enum(["true", "false"]).optional(), // Return as tree structure
});

// Build category path recursively
async function buildCategoryPath(parentId: string | null): Promise<string> {
  if (!parentId) return "";

  const parent = await prisma.productCategory.findUnique({
    where: { id: parentId },
    select: { slug: true, path: true },
  });

  if (!parent) return "";
  return parent.path ? `${parent.path}` : parent.slug;
}

// Calculate level based on parent
async function calculateLevel(parentId: string | null): Promise<number> {
  if (!parentId) return 0;

  const parent = await prisma.productCategory.findUnique({
    where: { id: parentId },
    select: { level: true },
  });

  return parent ? parent.level + 1 : 0;
}

// Transform flat list to tree structure
interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  level: number;
  path: string;
  imageUrl: string | null;
  isActive: boolean;
  businessId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { products: number };
  children?: CategoryWithChildren[];
}

function buildTree(categories: CategoryWithChildren[], parentId: string | null = null): CategoryWithChildren[] {
  return categories
    .filter(cat => cat.parentId === parentId)
    .map(cat => ({
      ...cat,
      children: buildTree(categories, cat.id),
    }));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = categoryFiltersSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 50,
      search: searchParams.get("search") || undefined,
      parentId: searchParams.get("parentId"),
      isActive: searchParams.get("isActive") || undefined,
      tree: searchParams.get("tree") || undefined,
    });

    const business = await getCurrentBusiness(request);

    const where: Record<string, unknown> = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { slug: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Handle parentId filter - null means root categories
    if (filters.parentId === "null" || filters.parentId === "") {
      where.parentId = null;
    } else if (filters.parentId) {
      where.parentId = filters.parentId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === "true";
    }

    // If tree view requested, fetch all categories and build tree
    if (filters.tree === "true") {
      const allCategories = await prisma.productCategory.findMany({
        where: {
          ...where,
          parentId: undefined, // Remove parentId filter for tree view
        },
        include: {
          _count: { select: { products: true } },
        },
        orderBy: [{ level: "asc" }, { name: "asc" }],
      });

      const tree = buildTree(allCategories as CategoryWithChildren[]);

      return NextResponse.json({
        success: true,
        data: tree,
        meta: { total: allCategories.length },
      });
    }

    const [categories, total] = await Promise.all([
      prisma.productCategory.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { products: true, children: true } },
        },
        orderBy: [{ level: "asc" }, { name: "asc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.productCategory.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: categories,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching product categories:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch product categories" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCategorySchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Check for duplicate slug within business
    const existingSlug = await prisma.productCategory.findFirst({
      where: { slug: data.slug, businessId: business.id },
    });

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_SLUG", message: "A category with this slug already exists" } },
        { status: 400 }
      );
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await prisma.productCategory.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_PARENT", message: "Parent category not found" } },
          { status: 400 }
        );
      }
    }

    // Build path and calculate level
    const parentPath = await buildCategoryPath(data.parentId || null);
    const level = await calculateLevel(data.parentId || null);
    const path = parentPath ? `${parentPath}/${data.slug}` : data.slug;

    const category = await prisma.productCategory.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        parentId: data.parentId || null,
        level,
        path,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
        businessId: business.id,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error("Error creating product category:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create product category" } },
      { status: 500 }
    );
  }
}
