import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const convertToDealSchema = z.object({
  title: z.string().optional(), // Defaults to quote title
  stage: z.enum([
    "QUALIFICATION",
    "DISCOVERY",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ]).optional().default("CLOSED_WON"),
  probability: z.number().min(0).max(100).optional().default(100),
  ownerId: z.string().optional(),
});

// Convert accepted quote to deal
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = convertToDealSchema.parse(body);

    // Get the quote
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        company: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
        { status: 404 }
      );
    }

    // Check if already converted
    if (quote.convertedToDealId) {
      const existingDeal = await prisma.deal.findUnique({
        where: { id: quote.convertedToDealId },
      });

      if (existingDeal) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ALREADY_CONVERTED",
              message: "This quote has already been converted to a deal",
              dealId: quote.convertedToDealId,
            },
          },
          { status: 400 }
        );
      }
    }

    // Check if quote is accepted
    if (quote.status !== "ACCEPTED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_ACCEPTED",
            message: "Only accepted quotes can be converted to deals",
          },
        },
        { status: 400 }
      );
    }

    // Create the deal
    const deal = await prisma.deal.create({
      data: {
        title: data.title || `Deal from ${quote.title}`,
        value: quote.total,
        currency: quote.currency,
        stage: data.stage,
        probability: data.probability,
        contactId: quote.contactId,
        companyId: quote.companyId,
        ownerId: data.ownerId || quote.createdById,
        closedAt: data.stage === "CLOSED_WON" ? new Date() : null,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Update quote with deal reference
    await prisma.quote.update({
      where: { id: params.id },
      data: {
        convertedToDealId: deal.id,
        dealId: deal.id,
      },
    });

    // Create activity for the conversion
    await prisma.activity.create({
      data: {
        type: "DEAL_UPDATE",
        title: `Deal created from quote ${quote.quoteNumber}`,
        description: `Quote "${quote.title}" was accepted and converted to a deal worth ${quote.currency} ${Number(quote.total).toLocaleString()}`,
        userId: data.ownerId || quote.createdById,
        dealId: deal.id,
        contactId: quote.contactId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...deal,
        value: Number(deal.value),
      },
    });
  } catch (error) {
    console.error("Error converting quote to deal:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CONVERT_ERROR", message: "Failed to convert quote to deal" } },
      { status: 500 }
    );
  }
}
