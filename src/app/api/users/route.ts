import { NextRequest, NextResponse } from "next/server";
import { listUsers } from "@/lib/users/service";
import { UserStatus } from "@prisma/client";

// GET /api/users - List users with search and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") as UserStatus | undefined;
    const businessId = searchParams.get("businessId") || undefined;
    const teamId = searchParams.get("teamId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await listUsers({
      search,
      status,
      businessId,
      teamId,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Failed to list users:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to list users" } },
      { status: 500 }
    );
  }
}
