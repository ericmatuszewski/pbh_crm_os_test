import { NextRequest, NextResponse } from "next/server";
import { triggerBackup, listBackups } from "@/lib/data-management/backup";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET /api/admin/data/backup - List backups
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const backups = await listBackups(limit);

    return NextResponse.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    console.error("Failed to list backups:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to list backups" } },
      { status: 500 }
    );
  }
}

// POST /api/admin/data/backup - Trigger new backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { backupType = "full", expiresInDays = 30 } = body;

    // Get current user from session
    const currentUser = await getCurrentUser(request);
    const triggeredById = currentUser.id;
    const triggeredByName = currentUser.name;

    const backup = await triggerBackup({
      triggeredById,
      triggeredByName,
      backupType,
      expiresInDays,
    });

    return NextResponse.json({
      success: true,
      data: backup,
      message: "Backup started",
    });
  } catch (error) {
    console.error("Failed to trigger backup:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to trigger backup" } },
      { status: 500 }
    );
  }
}
