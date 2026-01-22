import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateQuoteStatusSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = updateQuoteStatusSchema.parse(body);

    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
    });

    if (!existingQuote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
        { status: 404 }
      );
    }

    // Update status with timestamp
    const updateData: {
      status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";
      sentAt?: Date;
      acceptedAt?: Date;
      declinedAt?: Date;
    } = {
      status: data.status,
    };

    switch (data.status) {
      case "SENT":
        updateData.sentAt = new Date();
        break;
      case "ACCEPTED":
        updateData.acceptedAt = new Date();
        break;
      case "DECLINED":
        updateData.declinedAt = new Date();
        break;
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ success: true, data: quote });
  } catch (error) {
    console.error("Error updating quote status:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update quote status" } },
      { status: 500 }
    );
  }
}
