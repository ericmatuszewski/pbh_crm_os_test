import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runCleanup, CleanupEntity, CLEANUP_ENTITIES } from "@/lib/data-management/cleanup";
import { getCurrentUserId } from "@/lib/auth/get-current-user";

// GET /api/admin/data/cleanup/[id] - Get cleanup configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Handle "run" action
    const { searchParams } = new URL(request.url);
    if (searchParams.get("action") === "run") {
      // Get config to determine entity
      const config = await prisma.cleanupConfiguration.findUnique({
        where: { id },
      });

      if (!config) {
        return NextResponse.json(
          { success: false, error: { message: "Configuration not found" } },
          { status: 404 }
        );
      }

      // Get current user from session
      const userId = await getCurrentUserId(request);
      const result = await runCleanup(config.entity as CleanupEntity, userId);

      return NextResponse.json({
        success: true,
        data: result,
        message: `Cleaned up ${result.deletedCount} ${result.entity} records`,
      });
    }

    const config = await prisma.cleanupConfiguration.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: { message: "Configuration not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Failed to get cleanup configuration:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to get configuration" } },
      { status: 500 }
    );
  }
}

// PUT /api/admin/data/cleanup/[id] - Update cleanup configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const config = await prisma.cleanupConfiguration.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: { message: "Configuration not found" } },
        { status: 404 }
      );
    }

    const allowedFields = ["retentionDays", "isActive", "description"];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.cleanupConfiguration.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Failed to update cleanup configuration:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to update configuration" } },
      { status: 500 }
    );
  }
}

// POST /api/admin/data/cleanup/[id] - Run cleanup
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if this is an entity name (for direct cleanup) or config ID
    const entityNames = Object.keys(CLEANUP_ENTITIES);
    const entity = entityNames.includes(id) ? id as CleanupEntity : null;

    if (entity) {
      // Direct cleanup by entity name
      const userId = await getCurrentUserId(request);
      const result = await runCleanup(entity, userId);

      return NextResponse.json({
        success: true,
        data: result,
        message: `Cleaned up ${result.deletedCount} ${result.entity} records`,
      });
    }

    // Cleanup by config ID
    const config = await prisma.cleanupConfiguration.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: { message: "Configuration not found" } },
        { status: 404 }
      );
    }

    // Get current user from session
    const userId = await getCurrentUserId(request);
    const result = await runCleanup(config.entity as CleanupEntity, userId);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Cleaned up ${result.deletedCount} ${result.entity} records`,
    });
  } catch (error) {
    console.error("Failed to run cleanup:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to run cleanup" } },
      { status: 500 }
    );
  }
}
