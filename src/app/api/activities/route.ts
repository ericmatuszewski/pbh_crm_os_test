import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

// GET /api/activities - List activities with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const dealId = searchParams.get("dealId");
    const userId = searchParams.get("userId");
    const businessId = searchParams.get("businessId");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (userId) where.userId = userId;
    if (businessId) where.businessId = businessId;
    if (type) where.type = type;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
          deal: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activity.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + activities.length < total,
      },
    });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// POST /api/activities - Create a new activity
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId(request);
    const body = await request.json();

    const {
      type,
      title,
      description,
      contactId,
      dealId,
      businessId,
    } = body;

    if (!type || !title) {
      return NextResponse.json(
        { success: false, error: "Type and title are required" },
        { status: 400 }
      );
    }

    const activity = await prisma.activity.create({
      data: {
        type,
        title,
        description,
        userId: currentUserId,
        contactId,
        dealId,
        businessId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        deal: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Failed to create activity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
