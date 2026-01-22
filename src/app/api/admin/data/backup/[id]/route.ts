import { NextRequest, NextResponse } from "next/server";
import { getBackupStatus, getBackupForDownload } from "@/lib/data-management/backup";

// GET /api/admin/data/backup/[id] - Get backup status or download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";

    if (download) {
      // TODO: Get actual user ID from session
      const userId = "system";
      const backup = await getBackupForDownload(id, userId);

      // In production, this would stream the actual backup file
      // For now, return the backup info with the download URL
      return NextResponse.json({
        success: true,
        data: {
          ...backup,
          downloadUrl: backup.fileUrl,
        },
      });
    }

    const backup = await getBackupStatus(id);

    if (!backup) {
      return NextResponse.json(
        { success: false, error: { message: "Backup not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    console.error("Failed to get backup:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to get backup" } },
      { status: 500 }
    );
  }
}
