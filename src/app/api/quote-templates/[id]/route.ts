import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  headerHtml: z.string().optional().nullable(),
  footerHtml: z.string().optional().nullable(),
  termsConditions: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  primaryColor: z.string().optional(),
  defaultDiscountPercent: z.number().min(0).max(100).optional().nullable(),
  defaultTaxRate: z.number().min(0).max(100).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.quoteTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote template not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        defaultDiscountPercent: template.defaultDiscountPercent ? Number(template.defaultDiscountPercent) : null,
        defaultTaxRate: template.defaultTaxRate ? Number(template.defaultTaxRate) : null,
      },
    });
  } catch (error) {
    console.error("Error fetching quote template:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch quote template" } },
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
    const data = updateTemplateSchema.parse(body);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.quoteTemplate.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      });
    }

    // Handle empty logoUrl as null
    if (data.logoUrl === "") {
      data.logoUrl = null;
    }

    const template = await prisma.quoteTemplate.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        defaultDiscountPercent: template.defaultDiscountPercent ? Number(template.defaultDiscountPercent) : null,
        defaultTaxRate: template.defaultTaxRate ? Number(template.defaultTaxRate) : null,
      },
    });
  } catch (error) {
    console.error("Error updating quote template:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update quote template" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.quoteTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    console.error("Error deleting quote template:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete quote template" } },
      { status: 500 }
    );
  }
}
