import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssignmentMethod } from "@prisma/client";

// GET /api/assignment-rules/[id] - Get a single assignment rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rule = await prisma.assignmentRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Assignment rule not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error("Failed to fetch assignment rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch assignment rule" } },
      { status: 500 }
    );
  }
}

// PUT /api/assignment-rules/[id] - Update an assignment rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate method if provided
    if (body.method && !Object.values(AssignmentMethod).includes(body.method)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid assignment method" } },
        { status: 400 }
      );
    }

    const rule = await prisma.assignmentRule.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error("Failed to update assignment rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update assignment rule" } },
      { status: 500 }
    );
  }
}

// DELETE /api/assignment-rules/[id] - Delete an assignment rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.assignmentRule.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete assignment rule:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete assignment rule" } },
      { status: 500 }
    );
  }
}
