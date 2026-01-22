import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/integrations - List integrations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const provider = searchParams.get("provider");
    const includeSyncLogs = searchParams.get("includeSyncLogs") === "true";

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { userId };
    if (provider) where.provider = provider;

    const integrations = await prisma.integration.findMany({
      where,
      include: includeSyncLogs
        ? {
            syncLogs: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: integrations });
  } catch (error) {
    console.error("Failed to fetch integrations:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch integrations" } },
      { status: 500 }
    );
  }
}

// POST /api/integrations - Create integration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.provider || !body.userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name, provider, and userId are required" } },
        { status: 400 }
      );
    }

    const validProviders = ["zapier", "make", "n8n", "custom"];
    if (!validProviders.includes(body.provider)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid provider. Must be one of: ${validProviders.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    const integration = await prisma.integration.create({
      data: {
        name: body.name,
        provider: body.provider,
        description: body.description,
        config: body.config ? JSON.parse(JSON.stringify(body.config)) : null,
        credentials: body.credentials ? JSON.parse(JSON.stringify(body.credentials)) : null,
        isActive: body.isActive ?? true,
        userId: body.userId,
      },
    });

    return NextResponse.json({ success: true, data: integration }, { status: 201 });
  } catch (error) {
    console.error("Failed to create integration:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create integration" } },
      { status: 500 }
    );
  }
}

// PUT /api/integrations - Update integration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.config !== undefined) updateData.config = JSON.parse(JSON.stringify(body.config));
    if (body.credentials !== undefined) updateData.credentials = JSON.parse(JSON.stringify(body.credentials));
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isConnected !== undefined) updateData.isConnected = body.isConnected;
    if (body.lastSyncAt !== undefined) updateData.lastSyncAt = new Date(body.lastSyncAt);
    if (body.lastError !== undefined) updateData.lastError = body.lastError;

    const integration = await prisma.integration.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: integration });
  } catch (error) {
    console.error("Failed to update integration:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update integration" } },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations - Delete integration
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    await prisma.integration.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: { id: body.id } });
  } catch (error) {
    console.error("Failed to delete integration:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete integration" } },
      { status: 500 }
    );
  }
}

// PATCH /api/integrations - Test integration connection
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    const integration = await prisma.integration.findUnique({
      where: { id: body.id },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Integration not found" } },
        { status: 404 }
      );
    }

    // Test the connection based on provider
    // This is a placeholder - actual implementation would depend on the provider
    let isConnected = false;
    let lastError: string | null = null;

    try {
      switch (integration.provider) {
        case "zapier":
        case "make":
        case "n8n":
          // For webhook-based integrations, we just verify config exists
          isConnected = !!integration.config;
          break;
        case "custom":
          // Custom integrations need their own test logic
          isConnected = true;
          break;
      }
    } catch (error) {
      isConnected = false;
      lastError = error instanceof Error ? error.message : "Connection test failed";
    }

    // Update integration status
    const updated = await prisma.integration.update({
      where: { id: body.id },
      data: {
        isConnected,
        lastError,
        lastSyncAt: isConnected ? new Date() : integration.lastSyncAt,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      connectionTest: {
        success: isConnected,
        error: lastError,
      },
    });
  } catch (error) {
    console.error("Failed to test integration:", error);
    return NextResponse.json(
      { success: false, error: { code: "TEST_ERROR", message: "Failed to test integration" } },
      { status: 500 }
    );
  }
}
