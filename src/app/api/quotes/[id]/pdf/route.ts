import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Force Node.js runtime for PDF generation
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        contact: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
        items: { orderBy: { sortOrder: "asc" } },
        business: {
          select: {
            name: true,
            legalName: true,
            tradingAddress: true,
            city: true,
            postcode: true,
            country: true,
            phone: true,
            email: true,
            website: true,
            vatNumber: true,
            companyNumber: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
        { status: 404 }
      );
    }

    // Dynamically import to avoid bundling issues
    const { renderPDFToBuffer } = await import("@/lib/pdf/render-pdf");
    const { QuotePDF } = await import("@/lib/pdf/quote-template");

    // Generate PDF
    const pdfBuffer = await renderPDFToBuffer(QuotePDF, {
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      companyName: quote.companyName,
      companyAddress: quote.companyAddress,
      contactName: quote.contact
        ? `${quote.contact.firstName} ${quote.contact.lastName}`
        : null,
      contactEmail: quote.contact?.email,
      clientCompanyName: quote.company?.name,
      items: quote.items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        total: item.total.toNumber(),
      })),
      subtotal: quote.subtotal.toNumber(),
      discountType: quote.discountType,
      discountValue: quote.discountValue?.toNumber(),
      discountAmount: quote.discountAmount.toNumber(),
      taxRate: quote.taxRate?.toNumber(),
      taxAmount: quote.taxAmount.toNumber(),
      total: quote.total.toNumber(),
      currency: quote.currency,
      termsConditions: quote.termsConditions,
      paymentTerms: quote.paymentTerms,
      notes: quote.notes,
      business: quote.business,
    });

    // Check if download is requested
    const download = request.nextUrl.searchParams.get("download") === "true";

    const headers: HeadersInit = {
      "Content-Type": "application/pdf",
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${quote.quoteNumber}.pdf"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${quote.quoteNumber}.pdf"`;
    }

    return new NextResponse(new Uint8Array(pdfBuffer), { headers });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { success: false, error: { code: "PDF_ERROR", message: "Failed to generate PDF" } },
      { status: 500 }
    );
  }
}
