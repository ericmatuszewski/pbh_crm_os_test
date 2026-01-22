import { NextRequest, NextResponse } from "next/server";
import { createInvitation } from "@/lib/users/invitation";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// POST /api/users/invite - Send user invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, businessId, teamId, roleIds } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: { message: "Email is required" } },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid email format" } },
        { status: 400 }
      );
    }

    // Get current user from session
    const currentUser = await getCurrentUser(request);
    const invitedById = currentUser.id;
    const invitedByName = currentUser.name;

    const invitation = await createInvitation({
      email,
      name,
      businessId,
      teamId,
      roleIds,
      invitedById,
      invitedByName,
    });

    return NextResponse.json({
      success: true,
      data: invitation,
      message: `Invitation sent to ${email}`,
    });
  } catch (error) {
    console.error("Failed to send invitation:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to send invitation" } },
      { status: 500 }
    );
  }
}
