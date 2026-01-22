import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional().or(z.literal("")),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  headerHtml: z.string().optional().or(z.literal("")),
  footerHtml: z.string().optional().or(z.literal("")),
  termsConditions: z.string().optional().or(z.literal("")),
  paymentTerms: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().optional().default("#6366f1"),
  defaultDiscountPercent: z.number().min(0).max(100).optional().nullable(),
  defaultTaxRate: z.number().min(0).max(100).optional().nullable(),
});

const templateFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = templateFiltersSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      isActive: searchParams.get("isActive") || undefined,
    });

    const where: Prisma.QuoteTemplateWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [templates, total] = await Promise.all([
      prisma.quoteTemplate.findMany({
        where,
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.quoteTemplate.count({ where }),
    ]);

    // Convert Decimal to number
    const serializedTemplates = templates.map((t) => ({
      ...t,
      defaultDiscountPercent: t.defaultDiscountPercent ? Number(t.defaultDiscountPercent) : null,
      defaultTaxRate: t.defaultTaxRate ? Number(t.defaultTaxRate) : null,
    }));

    return NextResponse.json({
      success: true,
      data: serializedTemplates,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching quote templates:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch quote templates" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createTemplateSchema.parse(body);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.quoteTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.quoteTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        isDefault: data.isDefault,
        isActive: data.isActive,
        headerHtml: data.headerHtml || null,
        footerHtml: data.footerHtml || null,
        termsConditions: data.termsConditions || null,
        paymentTerms: data.paymentTerms || null,
        notes: data.notes || null,
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor,
        defaultDiscountPercent: data.defaultDiscountPercent,
        defaultTaxRate: data.defaultTaxRate,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...template,
          defaultDiscountPercent: template.defaultDiscountPercent ? Number(template.defaultDiscountPercent) : null,
          defaultTaxRate: template.defaultTaxRate ? Number(template.defaultTaxRate) : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating quote template:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create quote template" } },
      { status: 500 }
    );
  }
}
