import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateQuoteSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        company: { select: { id: true, name: true, address: true, city: true, county: true, postcode: true, country: true } },
        deal: { select: { id: true, title: true, value: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: quote });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch quote" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = updateQuoteSchema.parse(body);

    // Check if quote exists
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!existingQuote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
        { status: 404 }
      );
    }

    // Calculate totals if items are provided
    let subtotal = existingQuote.subtotal.toNumber();
    let discountAmount = existingQuote.discountAmount.toNumber();
    let taxAmount = existingQuote.taxAmount.toNumber();
    let total = existingQuote.total.toNumber();

    if (data.items) {
      subtotal = 0;
      const items = data.items.map((item, index) => {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        return {
          name: item.name,
          description: item.description || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: itemTotal,
          sortOrder: index,
        };
      });

      // Calculate discount
      const discountType = data.discountType ?? existingQuote.discountType;
      const discountValue = data.discountValue ?? existingQuote.discountValue?.toNumber();

      discountAmount = 0;
      if (discountValue && discountType) {
        if (discountType === "percentage") {
          discountAmount = subtotal * (discountValue / 100);
        } else {
          discountAmount = discountValue;
        }
      }

      // Calculate tax
      const taxRate = data.taxRate ?? existingQuote.taxRate?.toNumber();
      const taxableAmount = subtotal - discountAmount;
      taxAmount = taxRate ? taxableAmount * (taxRate / 100) : 0;

      // Calculate total
      total = taxableAmount + taxAmount;

      // Delete existing items and create new ones
      await prisma.quoteItem.deleteMany({ where: { quoteId: params.id } });
      await prisma.quoteItem.createMany({
        data: items.map((item) => ({ ...item, quoteId: params.id })),
      });
    }

    // Update quote
    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        title: data.title,
        contactId: data.contactId || undefined,
        companyId: data.companyId || undefined,
        dealId: data.dealId || undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        currency: data.currency,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount,
        taxRate: data.taxRate,
        taxAmount,
        subtotal,
        total,
        termsConditions: data.termsConditions,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        logoUrl: data.logoUrl,
        companyName: data.companyName,
        companyAddress: data.companyAddress,
      },
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
    console.error("Error updating quote:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update quote" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
        { status: 404 }
      );
    }

    await prisma.quote.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    console.error("Error deleting quote:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete quote" } },
      { status: 500 }
    );
  }
}
