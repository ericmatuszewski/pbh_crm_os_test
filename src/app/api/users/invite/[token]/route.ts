import { NextRequest, NextResponse } from "next/server";
import { validateInviteToken, acceptInvitation, resendInvitation } from "@/lib/users/invitation";

// GET /api/users/invite/[token] - Validate invitation token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await validateInviteToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: { message: result.error } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: result.invitation?.email,
        name: result.invitation?.name,
        business: result.invitation?.business,
        expiresAt: result.invitation?.expiresAt,
      },
    });
  } catch (error) {
    console.error("Failed to validate invitation:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to validate invitation" } },
      { status: 500 }
    );
  }
}

// POST /api/users/invite/[token] - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { name, acceptingUserId } = body;

    const user = await acceptInvitation(token, { name }, acceptingUserId);

    return NextResponse.json({
      success: true,
      data: user,
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to accept invitation" } },
      { status: 500 }
    );
  }
}
