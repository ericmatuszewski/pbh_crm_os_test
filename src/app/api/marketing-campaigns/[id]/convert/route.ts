import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/marketing-campaigns/[id]/convert - Mark contacts as converted
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { contactId, dealId, revenue } = body;

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "contactId is required" } },
        { status: 400 }
      );
    }

    // Find the campaign contact
    const campaignContact = await prisma.campaignContact.findUnique({
      where: {
        campaignId_contactId: {
          campaignId: id,
          contactId,
        },
      },
    });

    if (!campaignContact) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found in campaign" } },
        { status: 404 }
      );
    }

    if (campaignContact.converted) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_CONVERTED", message: "Contact already converted" } },
        { status: 400 }
      );
    }

    // Update campaign contact
    const updated = await prisma.campaignContact.update({
      where: { id: campaignContact.id },
      data: {
        converted: true,
        convertedAt: new Date(),
        convertedDealId: dealId,
      },
    });

    // Update campaign stats
    const campaign = await prisma.marketingCampaign.update({
      where: { id },
      data: {
        totalConversions: { increment: 1 },
        totalRevenue: revenue ? { increment: revenue } : undefined,
      },
    });

    // Recalculate conversion rate and ROI
    const conversionRate = campaign.totalLeads > 0
      ? (campaign.totalConversions / campaign.totalLeads) * 100
      : 0;

    const actualCost = campaign.actualCost ? Number(campaign.actualCost) : 0;
    const totalRevenue = Number(campaign.totalRevenue);
    const roi = actualCost > 0 ? ((totalRevenue - actualCost) / actualCost) * 100 : 0;

    await prisma.marketingCampaign.update({
      where: { id },
      data: {
        conversionRate,
        roi,
      },
    });

    // Update lead source stats if applicable
    if (campaign.sourceId) {
      await prisma.leadSource.update({
        where: { id: campaign.sourceId },
        data: {
          totalConverted: { increment: 1 },
          totalRevenue: revenue ? { increment: revenue } : undefined,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to convert contact:", error);
    return NextResponse.json(
      { success: false, error: { code: "CONVERT_ERROR", message: "Failed to convert contact" } },
      { status: 500 }
    );
  }
}
