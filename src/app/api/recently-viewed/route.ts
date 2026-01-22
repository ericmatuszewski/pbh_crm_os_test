import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/recently-viewed - List recently viewed records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const entity = searchParams.get("entity");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { userId };
    if (entity) {
      where.entity = entity;
    }

    const records = await prisma.recentlyViewed.findMany({
      where,
      orderBy: { viewedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Failed to fetch recently viewed:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch recently viewed" } },
      { status: 500 }
    );
  }
}

// POST /api/recently-viewed - Track a viewed record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.entity || !body.entityId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId, entity, and entityId are required" } },
        { status: 400 }
      );
    }

    // Upsert the recently viewed record
    const record = await prisma.recentlyViewed.upsert({
      where: {
        userId_entity_entityId: {
          userId: body.userId,
          entity: body.entity,
          entityId: body.entityId,
        },
      },
      create: {
        userId: body.userId,
        entity: body.entity,
        entityId: body.entityId,
        entityName: body.entityName,
      },
      update: {
        entityName: body.entityName,
        viewedAt: new Date(),
      },
    });

    // Clean up old records (keep only last 100)
    const count = await prisma.recentlyViewed.count({
      where: { userId: body.userId },
    });

    if (count > 100) {
      const oldest = await prisma.recentlyViewed.findMany({
        where: { userId: body.userId },
        orderBy: { viewedAt: "desc" },
        skip: 100,
        select: { id: true },
      });

      if (oldest.length > 0) {
        await prisma.recentlyViewed.deleteMany({
          where: { id: { in: oldest.map((r) => r.id) } },
        });
      }
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("Failed to track recently viewed:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to track recently viewed" } },
      { status: 500 }
    );
  }
}

// DELETE /api/recently-viewed - Clear recently viewed records
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { userId: body.userId };
    if (body.entity) {
      where.entity = body.entity;
    }

    const result = await prisma.recentlyViewed.deleteMany({ where });

    return NextResponse.json({ success: true, data: { deleted: result.count } });
  } catch (error) {
    console.error("Failed to clear recently viewed:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to clear recently viewed" } },
      { status: 500 }
    );
  }
}
