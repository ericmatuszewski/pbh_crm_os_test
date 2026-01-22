import { NextRequest, NextResponse } from "next/server";
import { getCleanupConfigurations, createCleanupConfiguration, CleanupEntity } from "@/lib/data-management/cleanup";

// GET /api/admin/data/cleanup - Get cleanup configurations
export async function GET() {
  try {
    const configs = await getCleanupConfigurations();

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error("Failed to get cleanup configurations:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to get configurations" } },
      { status: 500 }
    );
  }
}

// POST /api/admin/data/cleanup - Create or update cleanup configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, retentionDays, isActive = true, description } = body;

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { message: "Entity is required" } },
        { status: 400 }
      );
    }

    if (!retentionDays || retentionDays < 1) {
      return NextResponse.json(
        { success: false, error: { message: "Retention days must be at least 1" } },
        { status: 400 }
      );
    }

    const config = await createCleanupConfiguration(
      entity as CleanupEntity,
      retentionDays,
      isActive,
      description
    );

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Failed to create cleanup configuration:", error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Failed to create configuration" } },
      { status: 500 }
    );
  }
}
