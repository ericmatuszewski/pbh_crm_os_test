import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/business";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Recursively update paths for children when parent changes
async function updateChildPaths(categoryId: string, newPath: string): Promise<void> {
  const children = await prisma.productCategory.findMany({
    where: { parentId: categoryId },
    select: { id: true, slug: true },
  });

  for (const child of children) {
    const childPath = `${newPath}/${child.slug}`;
    await prisma.productCategory.update({
      where: { id: child.id },
      data: { path: childPath },
    });
    await updateChildPaths(child.id, childPath);
  }
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

// Recursively update levels for children
async function updateChildLevels(categoryId: string, parentLevel: number): Promise<void> {
  const children = await prisma.productCategory.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });

  for (const child of children) {
    const newLevel = parentLevel + 1;
    await prisma.productCategory.update({
      where: { id: child.id },
      data: { level: newLevel },
    });
    await updateChildLevels(child.id, newLevel);
  }
}

// Check if moving would create circular reference
async function wouldCreateCircle(categoryId: string, newParentId: string): Promise<boolean> {
  let currentId: string | null = newParentId;

  while (currentId) {
    if (currentId === categoryId) return true;

    const parent: { parentId: string | null } | null = await prisma.productCategory.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    currentId = parent?.parentId ?? null;
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);

    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true, path: true } },
        children: {
          select: { id: true, name: true, slug: true, isActive: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (business && category.businessId && category.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch category" } },
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
    const body = await request.json();
    const data = updateCategorySchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Fetch existing category
    const existing = await prisma.productCategory.findUnique({
      where: { id },
      include: { parent: { select: { path: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (existing.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Check for duplicate slug if being changed
    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await prisma.productCategory.findFirst({
        where: { slug: data.slug, businessId: business.id, id: { not: id } },
      });
      if (existingSlug) {
        return NextResponse.json(
          { success: false, error: { code: "DUPLICATE_SLUG", message: "A category with this slug already exists" } },
          { status: 400 }
        );
      }
    }

    // Handle parent change
    let newLevel = existing.level;
    let newPath = existing.path;
    const parentChanged = data.parentId !== undefined && data.parentId !== existing.parentId;
    const slugChanged = data.slug !== undefined && data.slug !== existing.slug;

    if (parentChanged) {
      // Cannot set self as parent
      if (data.parentId === id) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_PARENT", message: "Category cannot be its own parent" } },
          { status: 400 }
        );
      }

      // Check for circular reference
      if (data.parentId && await wouldCreateCircle(id, data.parentId)) {
        return NextResponse.json(
          { success: false, error: { code: "CIRCULAR_REFERENCE", message: "This would create a circular reference" } },
          { status: 400 }
        );
      }

      // Validate new parent exists
      if (data.parentId) {
        const newParent = await prisma.productCategory.findUnique({
          where: { id: data.parentId },
          select: { path: true, level: true },
        });
        if (!newParent) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_PARENT", message: "Parent category not found" } },
            { status: 400 }
          );
        }
        newLevel = newParent.level + 1;
        newPath = `${newParent.path}/${data.slug || existing.slug}`;
      } else {
        newLevel = 0;
        newPath = data.slug || existing.slug;
      }
    } else if (slugChanged) {
      // Just slug changed, rebuild path with parent path
      if (existing.parentId && existing.parent?.path) {
        const parentParts = existing.parent.path.split("/");
        parentParts.pop(); // Remove old slug
        const parentPath = parentParts.join("/") || existing.parent.path.replace(`/${existing.slug}`, "");
        newPath = parentPath ? `${parentPath}/${data.slug}` : data.slug!;
      } else {
        newPath = data.slug!;
      }
    }

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId,
        level: parentChanged ? newLevel : undefined,
        path: (parentChanged || slugChanged) ? newPath : undefined,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    // Update children paths and levels if necessary
    if (parentChanged || slugChanged) {
      await updateChildPaths(id, newPath);
      if (parentChanged) {
        await updateChildLevels(id, newLevel);
      }
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Error updating category:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update category" } },
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
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Check if category exists and belongs to business
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
        { status: 404 }
      );
    }

    if (category.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Prevent deletion if has children
    if (category._count.children > 0) {
      return NextResponse.json(
        { success: false, error: { code: "HAS_CHILDREN", message: "Cannot delete category with subcategories. Delete or move subcategories first." } },
        { status: 400 }
      );
    }

    // Prevent deletion if has products (or offer to unassign them)
    if (category._count.products > 0) {
      return NextResponse.json(
        { success: false, error: { code: "HAS_PRODUCTS", message: `Cannot delete category with ${category._count.products} products. Reassign products first.` } },
        { status: 400 }
      );
    }

    await prisma.productCategory.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete category" } },
      { status: 500 }
    );
  }
}
