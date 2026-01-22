import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/business";
import { z } from "zod";

const updateMailboxSchema = z.object({
  syncInbound: z.boolean().optional(),
  syncOutbound: z.boolean().optional(),
  syncFolders: z.array(z.string()).optional(),
});

// GET /api/microsoft/mailboxes/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const mailbox = await prisma.microsoftMailbox.findFirst({
      where: { id, businessId: business.id },
      include: {
        _count: { select: { emails: true } },
      },
    });

    if (!mailbox) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Mailbox not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: mailbox });
  } catch (error) {
    console.error("Failed to fetch mailbox:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch mailbox" } },
      { status: 500 }
    );
  }
}

// PUT /api/microsoft/mailboxes/[id] - Update mailbox settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = updateMailboxSchema.parse(body);

    // Verify mailbox belongs to business
    const existing = await prisma.microsoftMailbox.findFirst({
      where: { id, businessId: business.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Mailbox not found" } },
        { status: 404 }
      );
    }

    const mailbox = await prisma.microsoftMailbox.update({
      where: { id },
      data: {
        ...(data.syncInbound !== undefined && { syncInbound: data.syncInbound }),
        ...(data.syncOutbound !== undefined && { syncOutbound: data.syncOutbound }),
        ...(data.syncFolders && { syncFolders: data.syncFolders }),
      },
    });

    return NextResponse.json({ success: true, data: mailbox });
  } catch (error) {
    console.error("Failed to update mailbox:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update mailbox" } },
      { status: 500 }
    );
  }
}

// DELETE /api/microsoft/mailboxes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Verify mailbox belongs to business
    const existing = await prisma.microsoftMailbox.findFirst({
      where: { id, businessId: business.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Mailbox not found" } },
        { status: 404 }
      );
    }

    // Delete the mailbox (emails will be preserved due to cascade setting)
    await prisma.microsoftMailbox.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete mailbox:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete mailbox" } },
      { status: 500 }
    );
  }
}
