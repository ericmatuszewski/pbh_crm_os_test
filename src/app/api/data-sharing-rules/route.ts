import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PermissionAction, RecordAccess } from "@prisma/client";

// GET /api/data-sharing-rules - List all data sharing rules
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (entity) where.entity = entity;
    if (isActive !== null) where.isActive = isActive === "true";

    const rules = await prisma.dataSharingRule.findMany({
      where,
      orderBy: [{ entity: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("Failed to fetch data sharing rules:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch data sharing rules" } },
      { status: 500 }
    );
  }
}

// POST /api/data-sharing-rules - Create a new data sharing rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.entity || !body.shareWithType) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name, entity, and shareWithType are required" } },
        { status: 400 }
      );
    }

    // Validate shareWithType
    const validShareTypes = ["role", "team", "user", "public"];
    if (!validShareTypes.includes(body.shareWithType)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid shareWithType" } },
        { status: 400 }
      );
    }

    // Validate access level
    if (body.accessLevel && !Object.values(RecordAccess).includes(body.accessLevel)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid accessLevel" } },
        { status: 400 }
      );
    }

    // Validate actions
    let actions = [PermissionAction.VIEW];
    if (body.actions && Array.isArray(body.actions)) {
      actions = body.actions.filter((a: string) =>
        Object.values(PermissionAction).includes(a as PermissionAction)
      );
    }

    const rule = await prisma.dataSharingRule.create({
      data: {
        name: body.name,
        description: body.description,
        entity: body.entity,
        isActive: body.isActive ?? true,
        shareConditions: body.shareConditions || [],
        shareWithType: body.shareWithType,
        shareWithId: body.shareWithId,
        accessLevel: body.accessLevel || RecordAccess.ALL,
        actions,
      },
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    console.error("Failed to create data sharing rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create data sharing rule" } },
      { status: 500 }
    );
  }
}

// PUT /api/data-sharing-rules - Update a data sharing rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Check if rule exists
    const existing = await prisma.dataSharingRule.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Data sharing rule not found" } },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.shareConditions !== undefined) updateData.shareConditions = body.shareConditions;
    if (body.shareWithType !== undefined) updateData.shareWithType = body.shareWithType;
    if (body.shareWithId !== undefined) updateData.shareWithId = body.shareWithId;
    if (body.accessLevel !== undefined) updateData.accessLevel = body.accessLevel;
    if (body.actions !== undefined) {
      updateData.actions = body.actions.filter((a: string) =>
        Object.values(PermissionAction).includes(a as PermissionAction)
      );
    }

    const updated = await prisma.dataSharingRule.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update data sharing rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update data sharing rule" } },
      { status: 500 }
    );
  }
}

// DELETE /api/data-sharing-rules - Delete a data sharing rule
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Check if rule exists
    const existing = await prisma.dataSharingRule.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Data sharing rule not found" } },
        { status: 404 }
      );
    }

    await prisma.dataSharingRule.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: { id: body.id } });
  } catch (error) {
    console.error("Failed to delete data sharing rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete data sharing rule" } },
      { status: 500 }
    );
  }
}
