import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/audit-logs - List audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");
    const userIdFilter = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Prisma.AuditLogWhereInput = {};

    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action as Prisma.EnumAuditActionFilter<"AuditLog">;
    if (userIdFilter) where.userId = userIdFilter;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      meta: { total, limit, offset },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch audit logs" } },
      { status: 500 }
    );
  }
}

// POST /api/audit-logs - Create audit log entry (internal use)
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.entity || !body.entityId || !body.action) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "entity, entityId, and action are required",
          },
        },
        { status: 400 }
      );
    }

    // Get user details for audit log
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const log = await prisma.auditLog.create({
      data: {
        entity: body.entity,
        entityId: body.entityId,
        action: body.action,
        userId,
        userName: user?.name,
        userEmail: user?.email,
        previousValues: body.previousValues,
        newValues: body.newValues,
        changedFields: body.changedFields || [],
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
        userAgent: request.headers.get("user-agent") || null,
        metadata: body.metadata,
      },
    });

    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (error) {
    console.error("Error creating audit log:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create audit log" } },
      { status: 500 }
    );
  }
}
