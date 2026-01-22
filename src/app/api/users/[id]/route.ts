import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUser, deactivateUser, getUserActivitySummary } from "@/lib/users/service";

// GET /api/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeActivity = searchParams.get("includeActivity") === "true";

    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "User not found" } },
        { status: 404 }
      );
    }

    let activity = null;
    if (includeActivity) {
      activity = await getUserActivitySummary(id);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        activity,
      },
    });
  } catch (error) {
    console.error("Failed to get user:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to get user" } },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // TODO: Get actual user ID from session
    const updatedById = "system";

    // Only allow certain fields to be updated
    const allowedFields = ["name", "email", "phoneNumber", "timezone"];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const user = await updateUser(id, updateData, updatedById);

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to update user" } },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // TODO: Get actual user ID from session
    const deletedById = "system";

    const user = await deactivateUser(id, deletedById);

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to delete user" } },
      { status: 500 }
    );
  }
}
