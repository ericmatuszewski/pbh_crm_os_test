import { NextRequest, NextResponse } from "next/server";
import { listInvitations, revokeInvitation } from "@/lib/users/invitation";

// GET /api/users/invitations - List pending invitations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId") || undefined;

    const invitations = await listInvitations(businessId);

    return NextResponse.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    console.error("Failed to list invitations:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to list invitations" } },
      { status: 500 }
    );
  }
}

// DELETE /api/users/invitations - Revoke invitation by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: { message: "Invitation ID is required" } },
        { status: 400 }
      );
    }

    // TODO: Get actual user ID from session
    const revokedById = "system";

    const invitation = await revokeInvitation(invitationId, revokedById);

    return NextResponse.json({
      success: true,
      data: invitation,
      message: "Invitation revoked",
    });
  } catch (error) {
    console.error("Failed to revoke invitation:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to revoke invitation" } },
      { status: 500 }
    );
  }
}
