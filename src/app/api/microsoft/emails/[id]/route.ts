import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/business";

// GET /api/microsoft/emails/[id] - Get single email with full body
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

    const email = await prisma.email.findFirst({
      where: { id, businessId: business.id },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        attachments: {
          select: {
            id: true,
            name: true,
            contentType: true,
            size: true,
          },
        },
      },
    });

    if (!email) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Email not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: email });
  } catch (error) {
    console.error("Failed to fetch email:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch email" } },
      { status: 500 }
    );
  }
}

// DELETE /api/microsoft/emails/[id] - Delete email from database
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

    await prisma.email.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete email:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete email" } },
      { status: 500 }
    );
  }
}
