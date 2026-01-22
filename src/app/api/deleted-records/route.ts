import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/deleted-records - List deleted records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const recoverable = searchParams.get("recoverable");
    const deletedById = searchParams.get("deletedById");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};

    if (entity) where.entity = entity;
    if (recoverable !== null) where.recoverable = recoverable === "true";
    if (deletedById) where.deletedById = deletedById;

    // Date range filtering
    if (startDate || endDate) {
      where.deletedAt = {};
      if (startDate) {
        (where.deletedAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.deletedAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      prisma.deletedRecord.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.deletedRecord.count({ where }),
    ]);

    // Get counts by entity
    const entityCounts = await prisma.deletedRecord.groupBy({
      by: ["entity"],
      where: { recoverable: true },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: records,
      entityCounts: entityCounts.reduce(
        (acc, item) => ({ ...acc, [item.entity]: item._count }),
        {} as Record<string, number>
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch deleted records:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch deleted records" } },
      { status: 500 }
    );
  }
}

// DELETE /api/deleted-records - Permanently delete (purge) records
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ids array is required" } },
        { status: 400 }
      );
    }

    // Permanently delete the records
    const result = await prisma.deletedRecord.deleteMany({
      where: {
        id: { in: body.ids },
      },
    });

    return NextResponse.json({
      success: true,
      data: { purged: result.count },
      message: `Permanently deleted ${result.count} records`,
    });
  } catch (error) {
    console.error("Failed to purge records:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to purge records" } },
      { status: 500 }
    );
  }
}
