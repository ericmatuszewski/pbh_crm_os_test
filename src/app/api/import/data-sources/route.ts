import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { ImportSourceType, Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";
import { validateConnectionConfig, encryptConnectionConfig } from "@/lib/connectors";

const createDataSourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  sourceType: z.nativeEnum(ImportSourceType),
  connectionConfig: z.record(z.unknown()),
  isActive: z.boolean().optional().default(true),
});

const dataSourceFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sourceType: z.nativeEnum(ImportSourceType).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = dataSourceFiltersSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      sourceType: searchParams.get("sourceType") || undefined,
      isActive: searchParams.get("isActive") || undefined,
    });

    const business = await getCurrentBusiness(request);

    const where: Record<string, unknown> = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.sourceType) {
      where.sourceType = filters.sourceType;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === "true";
    }

    const [dataSources, total] = await Promise.all([
      prisma.dataSource.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          sourceType: true,
          isActive: true,
          lastTestedAt: true,
          lastTestResult: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { importConfigs: true },
          },
        },
        orderBy: { name: "asc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.dataSource.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: dataSources,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch data sources" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createDataSourceSchema.parse(body);

    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Validate connection configuration
    const validation = validateConnectionConfig(
      data.sourceType,
      data.connectionConfig as Parameters<typeof validateConnectionConfig>[1]
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

    // Encrypt sensitive configuration
    const encryptedConfig = encryptConnectionConfig(
      data.connectionConfig as Parameters<typeof encryptConnectionConfig>[0]
    );

    const dataSource = await prisma.dataSource.create({
      data: {
        name: data.name,
        description: data.description || null,
        sourceType: data.sourceType,
        connectionConfig: encryptedConfig as Prisma.InputJsonValue,
        isActive: data.isActive,
        businessId: business.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        sourceType: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: dataSource }, { status: 201 });
  } catch (error) {
    console.error("Error creating data source:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create data source" } },
      { status: 500 }
    );
  }
}
