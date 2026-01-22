import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/marketing-campaigns/[id]/contacts - Add contacts to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { contactIds } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "contactIds array is required" } },
        { status: 400 }
      );
    }

    // Check if campaign exists
    const campaign = await prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    // Add contacts (skip duplicates)
    const results = await Promise.allSettled(
      contactIds.map(async (contactId: string) => {
        const existing = await prisma.campaignContact.findUnique({
          where: {
            campaignId_contactId: {
              campaignId: id,
              contactId,
            },
          },
        });

        if (existing) {
          // Update touch count
          return prisma.campaignContact.update({
            where: { id: existing.id },
            data: {
              touchCount: { increment: 1 },
              lastTouchAt: new Date(),
            },
          });
        }

        return prisma.campaignContact.create({
          data: {
            campaignId: id,
            contactId,
          },
        });
      })
    );

    const added = results.filter((r) => r.status === "fulfilled").length;

    // Update campaign stats
    await prisma.marketingCampaign.update({
      where: { id },
      data: {
        totalLeads: { increment: added },
      },
    });

    return NextResponse.json({
      success: true,
      data: { added, total: contactIds.length },
    });
  } catch (error) {
    console.error("Failed to add contacts to campaign:", error);
    return NextResponse.json(
      { success: false, error: { code: "ADD_ERROR", message: "Failed to add contacts to campaign" } },
      { status: 500 }
    );
  }
}

// DELETE /api/marketing-campaigns/[id]/contacts - Remove contacts from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { contactIds } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "contactIds array is required" } },
        { status: 400 }
      );
    }

    // Remove contacts
    const deleted = await prisma.campaignContact.deleteMany({
      where: {
        campaignId: id,
        contactId: { in: contactIds },
      },
    });

    // Update campaign stats
    if (deleted.count > 0) {
      await prisma.marketingCampaign.update({
        where: { id },
        data: {
          totalLeads: { decrement: deleted.count },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { removed: deleted.count },
    });
  } catch (error) {
    console.error("Failed to remove contacts from campaign:", error);
    return NextResponse.json(
      { success: false, error: { code: "REMOVE_ERROR", message: "Failed to remove contacts from campaign" } },
      { status: 500 }
    );
  }
}
