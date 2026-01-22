import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    if (sessionToken) {
      // Invalidate session in database
      await prisma.userSession.updateMany({
        where: { sessionToken },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: "User logout",
        },
      });

      // Clear the cookie
      cookieStore.delete("session-token");
    }

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Logout failed" } },
      { status: 500 }
    );
  }
}
