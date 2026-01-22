import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { ImportSourceType } from "@prisma/client";
import { getCurrentBusiness } from "@/lib/business";
import {
  ConnectorFactory,
  decryptConnectionConfig,
  encryptConnectionConfig,
  validateConnectionConfig,
  ConnectionConfig,
} from "@/lib/connectors";

const updateDataSourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  sourceType: z.nativeEnum(ImportSourceType).optional(),
  connectionConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);

    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
      include: {
        _count: { select: { importConfigs: true } },
      },
    });

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Data source not found" } },
        { status: 404 }
      );
    }

    // Verify business scope
    if (business && dataSource.businessId && dataSource.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Mask sensitive fields in connection config
    const config = dataSource.connectionConfig as Record<string, unknown>;
    const maskedConfig = { ...config };
    if (maskedConfig.password) maskedConfig.password = "***";
    if (maskedConfig.apiKey) maskedConfig.apiKey = "***";
    if (maskedConfig.token) maskedConfig.token = "***";
    if (maskedConfig.authConfig && typeof maskedConfig.authConfig === "object") {
      maskedConfig.authConfig = { ...(maskedConfig.authConfig as object) };
      const authConfig = maskedConfig.authConfig as Record<string, unknown>;
      if (authConfig.password) authConfig.password = "***";
      if (authConfig.apiKey) authConfig.apiKey = "***";
      if (authConfig.token) authConfig.token = "***";
    }

    return NextResponse.json({
      success: true,
      data: {
        ...dataSource,
        connectionConfig: maskedConfig,
      },
    });
  } catch (error) {
    console.error("Error fetching data source:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch data source" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateDataSourceSchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Fetch existing
    const existing = await prisma.dataSource.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Data source not found" } },
        { status: 404 }
      );
    }

    if (existing.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Validate new config if provided
    if (data.connectionConfig) {
      const sourceType = data.sourceType || existing.sourceType;
      const validation = validateConnectionConfig(
        sourceType,
        data.connectionConfig as ConnectionConfig
      );

      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_CONFIG",
              message: "Invalid connection configuration",
              details: validation.errors,
            },
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.connectionConfig !== undefined) {
      updateData.connectionConfig = encryptConnectionConfig(data.connectionConfig as ConnectionConfig);
    }

    const dataSource = await prisma.dataSource.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        sourceType: true,
        isActive: true,
        lastTestedAt: true,
        lastTestResult: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: dataSource });
  } catch (error) {
    console.error("Error updating data source:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update data source" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
      include: { _count: { select: { importConfigs: true } } },
    });

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Data source not found" } },
        { status: 404 }
      );
    }

    if (dataSource.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Warn if has configurations
    if (dataSource._count.importConfigs > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "HAS_CONFIGS",
            message: `Cannot delete data source with ${dataSource._count.importConfigs} import configurations. Delete configurations first.`,
          },
        },
        { status: 400 }
      );
    }

    await prisma.dataSource.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting data source:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete data source" } },
      { status: 500 }
    );
  }
}

// POST /api/import/data-sources/[id]/test - Test connection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const dataSource = await prisma.dataSource.findUnique({ where: { id } });

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Data source not found" } },
        { status: 404 }
      );
    }

    if (dataSource.businessId !== business.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Check if connector package is installed
    const isInstalled = await ConnectorFactory.isDependencyInstalled(dataSource.sourceType);
    if (!isInstalled) {
      const packageName = ConnectorFactory.requiresExternalPackage(dataSource.sourceType);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_DEPENDENCY",
            message: `${dataSource.sourceType} connector requires '${packageName}' package to be installed`,
          },
        },
        { status: 400 }
      );
    }

    // Decrypt config and create connector
    const config = decryptConnectionConfig(dataSource.connectionConfig);
    const connector = ConnectorFactory.create(dataSource.sourceType, config);

    // Test connection
    const result = await connector.testConnection();

    // Update data source with test result
    await prisma.dataSource.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: result.success ? "success" : result.error || "failed",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        connected: result.success,
        message: result.message || result.error,
        details: result.details,
      },
    });
  } catch (error) {
    console.error("Error testing data source:", error);

    // Update test result as failed
    const { id } = await params;
    await prisma.dataSource.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: error instanceof Error ? error.message : "Unknown error",
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TEST_FAILED",
          message: error instanceof Error ? error.message : "Connection test failed",
        },
      },
      { status: 500 }
    );
  }
}
