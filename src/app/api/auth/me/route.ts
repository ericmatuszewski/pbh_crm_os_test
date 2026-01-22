import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAuthenticated } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated(request);

    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: { message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const user = await getCurrentUser(request);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to get user info" } },
      { status: 500 }
    );
  }
}
