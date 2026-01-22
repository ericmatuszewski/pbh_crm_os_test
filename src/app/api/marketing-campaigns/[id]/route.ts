import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MarketingCampaignStatus, MarketingCampaignType } from "@prisma/client";

// GET /api/marketing-campaigns/[id] - Get a single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id },
      include: {
        source: true,
        contacts: {
          include: {
            // We can't include contact directly due to schema design
            // Would need to add Contact relation to CampaignContact
          },
          orderBy: { lastTouchAt: "desc" },
          take: 50,
        },
        _count: {
          select: { contacts: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("Failed to fetch campaign:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch campaign" } },
      { status: 500 }
    );
  }
}

// PUT /api/marketing-campaigns/[id] - Update a campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate status if provided
    if (body.status && !Object.values(MarketingCampaignStatus).includes(body.status)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid campaign status" } },
        { status: 400 }
      );
    }

    // Validate type if provided
    if (body.type && !Object.values(MarketingCampaignType).includes(body.type)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid campaign type" } },
        { status: 400 }
      );
    }

    // Handle date conversions
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);

    const campaign = await prisma.marketingCampaign.update({
      where: { id },
      data: body,
      include: {
        source: true,
        _count: {
          select: { contacts: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("Failed to update campaign:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update campaign" } },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing-campaigns/[id] - Delete a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.marketingCampaign.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete campaign:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete campaign" } },
      { status: 500 }
    );
  }
}
