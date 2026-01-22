import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MarketingCampaignStatus, MarketingCampaignType } from "@prisma/client";
import { randomBytes } from "crypto";

// GET /api/marketing-campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as MarketingCampaignStatus | null;
    const type = searchParams.get("type") as MarketingCampaignType | null;
    const sourceId = searchParams.get("sourceId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (sourceId) where.sourceId = sourceId;

    const [campaigns, total] = await Promise.all([
      prisma.marketingCampaign.findMany({
        where,
        include: {
          source: true,
          _count: {
            select: { contacts: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketingCampaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: campaigns,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch campaigns" } },
      { status: 500 }
    );
  }
}

// POST /api/marketing-campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      type,
      status = MarketingCampaignStatus.DRAFT,
      startDate,
      endDate,
      budget,
      trackingCode,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      sourceId,
      targetLeads,
      targetConversions,
      targetRevenue,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and type are required" } },
        { status: 400 }
      );
    }

    // Validate type
    if (!Object.values(MarketingCampaignType).includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid campaign type" } },
        { status: 400 }
      );
    }

    // Generate tracking code if not provided
    const finalTrackingCode = trackingCode || `MKT-${randomBytes(4).toString("hex").toUpperCase()}`;

    const campaign = await prisma.marketingCampaign.create({
      data: {
        name,
        description,
        type,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget,
        trackingCode: finalTrackingCode,
        utmSource,
        utmMedium,
        utmCampaign: utmCampaign || name.toLowerCase().replace(/\s+/g, "-"),
        utmTerm,
        utmContent,
        sourceId,
        targetLeads,
        targetConversions,
        targetRevenue,
      },
      include: {
        source: true,
      },
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create campaign" } },
      { status: 500 }
    );
  }
}
