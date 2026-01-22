import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/business";
import { z } from "zod";

const addMailboxSchema = z.object({
  mailboxEmail: z.string().email("Valid email required"),
});

// GET /api/microsoft/mailboxes - List mailboxes for current business
export async function GET(request: NextRequest) {
  try {
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const mailboxes = await prisma.microsoftMailbox.findMany({
      where: { businessId: business.id },
      select: {
        id: true,
        mailboxEmail: true,
        mailboxId: true,
        syncInbound: true,
        syncOutbound: true,
        syncFolders: true,
        syncStatus: true,
        lastSyncAt: true,
        _count: {
          select: { emails: true },
        },
      },
      orderBy: { mailboxEmail: "asc" },
    });

    return NextResponse.json({ success: true, data: mailboxes });
  } catch (error) {
    console.error("Failed to fetch mailboxes:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch mailboxes" } },
      { status: 500 }
    );
  }
}

// POST /api/microsoft/mailboxes - Add a mailbox to sync
export async function POST(request: NextRequest) {
  try {
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = addMailboxSchema.parse(body);

    // Check for existing credential for this business
    const credential = await prisma.microsoftCredential.findFirst({
      where: { businessId: business.id, isActive: true },
    });

    if (!credential) {
      return NextResponse.json(
        { success: false, error: { code: "NO_CREDENTIAL", message: "Connect Microsoft 365 first" } },
        { status: 400 }
      );
    }

    // Check if mailbox already exists
    const existing = await prisma.microsoftMailbox.findFirst({
      where: { businessId: business.id, mailboxEmail: data.mailboxEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "Mailbox already exists" } },
        { status: 400 }
      );
    }

    // Create the mailbox
    const mailbox = await prisma.microsoftMailbox.create({
      data: {
        credentialId: credential.id,
        businessId: business.id,
        mailboxEmail: data.mailboxEmail,
        syncInbound: true,
        syncOutbound: true,
        syncFolders: ["Inbox", "Sent Items"],
        syncStatus: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, data: mailbox }, { status: 201 });
  } catch (error) {
    console.error("Failed to add mailbox:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to add mailbox" } },
      { status: 500 }
    );
  }
}
