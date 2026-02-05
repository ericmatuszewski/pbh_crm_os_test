import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ConsentStatus, ConsentType } from "@prisma/client";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/contacts/[id]/consent - Get consent history for a contact
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        consentStatus: true,
        consentDate: true,
        consentMethod: true,
        doNotContact: true,
        doNotEmail: true,
        doNotCall: true,
        doNotSms: true,
        privacyNotes: true,
        dataRetentionDate: true,
        erasureRequestedAt: true,
        consentEvents: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    console.error("Failed to fetch consent data:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch consent data" } },
      { status: 500 }
    );
  }
}

// POST /api/contacts/[id]/consent - Record a new consent event
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.consentType || !body.newStatus || !body.method) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "consentType, newStatus, and method are required",
          },
        },
        { status: 400 }
      );
    }

    // Validate consent type
    if (!Object.values(ConsentType).includes(body.consentType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid consentType. Must be one of: ${Object.values(ConsentType).join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate consent status
    if (!Object.values(ConsentStatus).includes(body.newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid newStatus. Must be one of: ${Object.values(ConsentStatus).join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    // Get current contact
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { consentStatus: true },
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    // Get IP address from headers
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const userAgent = request.headers.get("user-agent") || undefined;

    // Create consent event and update contact in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create consent event
      const consentEvent = await tx.consentEvent.create({
        data: {
          contactId: id,
          consentType: body.consentType,
          previousStatus: contact.consentStatus,
          newStatus: body.newStatus,
          method: body.method,
          source: body.source,
          ipAddress,
          userAgent,
          documentUrl: body.documentUrl,
          languageCode: body.languageCode,
          recordedById: body.recordedById,
          recordedByName: body.recordedByName,
          notes: body.notes,
        },
      });

      // Update contact consent status
      const updateData: Record<string, unknown> = {
        consentStatus: body.newStatus,
        consentDate: new Date(),
        consentMethod: body.method,
        consentIpAddress: ipAddress,
      };

      // Handle do-not-contact flags for marketing withdrawals
      if (body.newStatus === ConsentStatus.WITHDRAWN) {
        if (body.consentType === ConsentType.EMAIL_MARKETING) {
          updateData.doNotEmail = true;
        } else if (body.consentType === ConsentType.PHONE_MARKETING) {
          updateData.doNotCall = true;
        } else if (body.consentType === ConsentType.SMS_MARKETING) {
          updateData.doNotSms = true;
        } else if (body.consentType === ConsentType.DATA_PROCESSING) {
          // Withdrawal of data processing consent triggers do-not-contact
          updateData.doNotContact = true;
        }
      }

      // Set retention date if consent granted with expiry
      if (body.retentionDays && body.newStatus === ConsentStatus.GRANTED) {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() + body.retentionDays);
        updateData.dataRetentionDate = retentionDate;
      }

      const updatedContact = await tx.contact.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          consentStatus: true,
          consentDate: true,
          doNotContact: true,
          doNotEmail: true,
          doNotCall: true,
          doNotSms: true,
          dataRetentionDate: true,
        },
      });

      return { consentEvent, contact: updatedContact };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("Failed to record consent:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to record consent" } },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/[id]/consent - Update contact preferences
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const contact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    // Update contact preferences
    if (body.doNotContact !== undefined) updateData.doNotContact = body.doNotContact;
    if (body.doNotEmail !== undefined) updateData.doNotEmail = body.doNotEmail;
    if (body.doNotCall !== undefined) updateData.doNotCall = body.doNotCall;
    if (body.doNotSms !== undefined) updateData.doNotSms = body.doNotSms;
    if (body.privacyNotes !== undefined) updateData.privacyNotes = body.privacyNotes;

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        doNotContact: true,
        doNotEmail: true,
        doNotCall: true,
        doNotSms: true,
        privacyNotes: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedContact });
  } catch (error) {
    console.error("Failed to update consent preferences:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update preferences" } },
      { status: 500 }
    );
  }
}
