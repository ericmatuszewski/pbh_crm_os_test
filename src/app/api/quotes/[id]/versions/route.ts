import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const versions = await prisma.quoteVersion.findMany({
      where: { quoteId: params.id },
      orderBy: { version: "desc" },
    });

    // Convert Decimal fields
    const serializedVersions = versions.map((v) => ({
      ...v,
      subtotal: Number(v.subtotal),
      discountAmount: Number(v.discountAmount),
      taxAmount: Number(v.taxAmount),
      total: Number(v.total),
    }));

    return NextResponse.json({
      success: true,
      data: serializedVersions,
    });
  } catch (error) {
    console.error("Error fetching quote versions:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch quote versions" } },
      { status: 500 }
    );
  }
}

// Create a new version (snapshot current quote state)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { changeNotes, changedBy } = body;

    // Get current quote with items
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
        { status: 404 }
      );
    }

    // Get the latest version number
    const latestVersion = await prisma.quoteVersion.findFirst({
      where: { quoteId: params.id },
      orderBy: { version: "desc" },
    });

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    // Create version snapshot
    const version = await prisma.quoteVersion.create({
      data: {
        quoteId: params.id,
        version: newVersionNumber,
        title: quote.title,
        status: quote.status,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        taxAmount: quote.taxAmount,
        total: quote.total,
        items: quote.items.map((item) => ({
          name: item.name,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          total: Number(item.total),
        })),
        changeNotes,
        changedBy,
      },
    });

    // Update quote version number
    await prisma.quote.update({
      where: { id: params.id },
      data: { version: newVersionNumber },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...version,
        subtotal: Number(version.subtotal),
        discountAmount: Number(version.discountAmount),
        taxAmount: Number(version.taxAmount),
        total: Number(version.total),
      },
    });
  } catch (error) {
    console.error("Error creating quote version:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create quote version" } },
      { status: 500 }
    );
  }
}
