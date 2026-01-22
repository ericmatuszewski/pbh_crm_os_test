import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createQuoteSchema, quoteFiltersSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import {
  getCurrentBusiness,
  buildBusinessScopeFilter,
  generateQuoteNumber,
} from "@/lib/business";
import { getCurrentUserId } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = quoteFiltersSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      status: searchParams.get("status"),
      contactId: searchParams.get("contactId"),
      companyId: searchParams.get("companyId"),
      dealId: searchParams.get("dealId"),
    });

    // Get current business for scoping
    const business = await getCurrentBusiness(request);

    const where: Prisma.QuoteWhereInput = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { quoteNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.dealId) {
      where.dealId = filters.dealId;
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true } },
          deal: { select: { id: true, title: true } },
          createdBy: { select: { id: true, name: true } },
          business: { select: { id: true, name: true, slug: true, primaryColor: true } },
          items: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: quotes,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch quotes" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createQuoteSchema.parse(body);

    // Get current business
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = 0;
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
    let discountAmount = 0;
    if (data.discountValue && data.discountType) {
      if (data.discountType === "percentage") {
        discountAmount = subtotal * (data.discountValue / 100);
      } else {
        discountAmount = data.discountValue;
      }
    }

    // Calculate tax - use business default if not provided
    const taxRate = data.taxRate ?? business.defaultTaxRate ?? 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxRate ? taxableAmount * (taxRate / 100) : 0;

    // Calculate total
    const total = taxableAmount + taxAmount;

    // Generate quote number with business prefix (e.g., PBH-QT-2024-0001)
    const quoteNumber = await generateQuoteNumber(business.id);

    // Create quote with items
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        title: data.title,
        businessId: business.id,
        contactId: data.contactId || null,
        companyId: data.companyId || null,
        dealId: data.dealId || null,
        validUntil: new Date(data.validUntil),
        currency: data.currency || business.defaultCurrency || "GBP",
        discountType: data.discountType || null,
        discountValue: data.discountValue || null,
        discountAmount,
        taxRate: taxRate || null,
        taxAmount,
        subtotal,
        total,
        termsConditions: data.termsConditions || null,
        paymentTerms: data.paymentTerms || null,
        notes: data.notes || null,
        logoUrl: data.logoUrl || null,
        companyName: data.companyName || null,
        companyAddress: data.companyAddress || null,
        createdById: await getCurrentUserId(request),
        items: {
          create: items,
        },
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        business: { select: { id: true, name: true, slug: true, primaryColor: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ success: true, data: quote }, { status: 201 });
  } catch (error) {
    console.error("Error creating quote:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create quote" } },
      { status: 500 }
    );
  }
}
