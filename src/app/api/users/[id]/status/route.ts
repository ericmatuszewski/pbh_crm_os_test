import { NextRequest, NextResponse } from "next/server";
import { changeUserStatus } from "@/lib/users/service";
import { UserStatus } from "@prisma/client";

// PATCH /api/users/[id]/status - Change user status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reason } = body;

    if (!status || !["ACTIVE", "INACTIVE", "LOCKED"].includes(status)) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid status. Must be ACTIVE, INACTIVE, or LOCKED" } },
        { status: 400 }
      );
    }

    // TODO: Get actual user ID from session
    const changedById = "system";

    const user = await changeUserStatus(
      id,
      status as UserStatus,
      reason || null,
      changedById
    );

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to change user status:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to change status" } },
      { status: 500 }
    );
  }
}
