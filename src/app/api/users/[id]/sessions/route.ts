import { NextRequest, NextResponse } from "next/server";
import { getActiveSessions, revokeAllUserSessions } from "@/lib/sessions/service";
import { getCurrentUserId } from "@/lib/auth/get-current-user";

// GET /api/users/[id]/sessions - Get user's active sessions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessions = await getActiveSessions(id);

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Failed to get user sessions:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to get sessions" } },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/sessions - Revoke all user sessions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason") || "Admin action";

    // Get current user from session
    const revokedById = await getCurrentUserId(request);

    const result = await revokeAllUserSessions(id, revokedById, reason);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Revoked ${result.count} sessions`,
    });
  } catch (error) {
    console.error("Failed to revoke user sessions:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to revoke sessions" } },
      { status: 500 }
    );
  }
}
