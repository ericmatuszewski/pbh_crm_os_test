import { NextRequest, NextResponse } from "next/server";
import { getActiveSessions, revokeAllUserSessions } from "@/lib/sessions/service";

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

    // TODO: Get actual user ID from session
    const revokedById = "system";

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
