import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/business";
import { z } from "zod";

const linkEmailSchema = z.object({
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
});

// POST /api/microsoft/emails/[id]/link - Link email to CRM records
export async function POST(
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
    const data = linkEmailSchema.parse(body);

    // Verify email belongs to business
    const existing = await prisma.email.findFirst({
      where: { id, businessId: business.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Email not found" } },
        { status: 404 }
      );
    }

    // Validate that linked records exist and belong to business
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, businessId: business.id },
      });
      if (!contact) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_CONTACT", message: "Contact not found" } },
          { status: 400 }
        );
      }
    }

    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, businessId: business.id },
      });
      if (!company) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_COMPANY", message: "Company not found" } },
          { status: 400 }
        );
      }
    }

    if (data.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: data.dealId, businessId: business.id },
      });
      if (!deal) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_DEAL", message: "Deal not found" } },
          { status: 400 }
        );
      }
    }

    // Update email links
    const email = await prisma.email.update({
      where: { id },
      data: {
        ...(data.contactId !== undefined && { contactId: data.contactId }),
        ...(data.companyId !== undefined && { companyId: data.companyId }),
        ...(data.dealId !== undefined && { dealId: data.dealId }),
        autoLinked: false, // Manual link overrides auto-link
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: email });
  } catch (error) {
    console.error("Failed to link email:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "LINK_ERROR", message: "Failed to link email" } },
      { status: 500 }
    );
  }
}
