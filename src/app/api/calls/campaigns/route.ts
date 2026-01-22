import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createCampaignSchema, campaignFiltersSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = campaignFiltersSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      createdById: searchParams.get("createdById"),
      search: searchParams.get("search"),
    });

    const where: Prisma.CallCampaignWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.callCampaign.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: {
            select: { queueItems: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.callCampaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: campaigns,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch campaigns" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCampaignSchema.parse(body);

    const campaign = await prisma.callCampaign.create({
      data: {
        name: data.name,
        description: data.description || null,
        priority: data.priority || "MEDIUM",
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdById: "system", // TODO: Get from auth session
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: {
          select: { queueItems: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create campaign" } },
      { status: 500 }
    );
  }
}
