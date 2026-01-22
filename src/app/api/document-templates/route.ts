import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/document-templates - List templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive === "true";

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const templates = await prisma.documentTemplate.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("Failed to fetch document templates:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch templates" } },
      { status: 500 }
    );
  }
}

// POST /api/document-templates - Create template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.category || !body.content || !body.createdById) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name, category, content, and createdById are required" } },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults in same category
    if (body.isDefault) {
      await prisma.documentTemplate.updateMany({
        where: {
          category: body.category,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        content: body.content,
        format: body.format || "html",
        mergeFields: body.mergeFields ? JSON.parse(JSON.stringify(body.mergeFields)) : null,
        thumbnailUrl: body.thumbnailUrl,
        isActive: body.isActive ?? true,
        isDefault: body.isDefault ?? false,
        createdById: body.createdById,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error("Failed to create document template:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create template" } },
      { status: 500 }
    );
  }
}

// PUT /api/document-templates - Update template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    const existing = await prisma.documentTemplate.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults in same category
    if (body.isDefault && !existing.isDefault) {
      await prisma.documentTemplate.updateMany({
        where: {
          category: body.category || existing.category,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.mergeFields !== undefined) updateData.mergeFields = JSON.parse(JSON.stringify(body.mergeFields));
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;

    const template = await prisma.documentTemplate.update({
      where: { id: body.id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("Failed to update document template:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update template" } },
      { status: 500 }
    );
  }
}

// DELETE /api/document-templates - Delete template
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    await prisma.documentTemplate.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: { id: body.id } });
  } catch (error) {
    console.error("Failed to delete document template:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete template" } },
      { status: 500 }
    );
  }
}
