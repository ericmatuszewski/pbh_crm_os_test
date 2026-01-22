"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/businesses - List businesses (for current user)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const includeChildren = searchParams.get("includeChildren") === "true";

    // If userId provided, get businesses the user has access to
    if (userId) {
      const userBusinesses = await prisma.userBusiness.findMany({
        where: { userId },
        include: {
          business: {
            include: includeChildren ? { children: true } : undefined,
          },
        },
        orderBy: [{ isDefault: "desc" }, { joinedAt: "asc" }],
      });

      return NextResponse.json({
        success: true,
        data: userBusinesses.map((ub) => ({
          ...ub.business,
          userRole: ub.role,
          isDefault: ub.isDefault,
        })),
      });
    }

    // Otherwise, list all businesses (admin view)
    const showAll = searchParams.get("all") === "true";
    const businesses = await prisma.business.findMany({
      where: showAll ? {} : { isActive: true },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            users: true,
            contacts: true,
            companies: true,
            deals: true,
            quotes: true,
            products: true,
          },
        },
      },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: businesses,
    });
  } catch (error) {
    console.error("Failed to fetch businesses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch businesses" },
      { status: 500 }
    );
  }
}

// POST /api/businesses - Create a new business
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      slug,
      parentId,
      legalName,
      companyNumber,
      vatNumber,
      registeredAddress,
      tradingName,
      tradingAddress,
      city,
      postcode,
      country = "United Kingdom",
      phone,
      email,
      salesEmail,
      website,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpFromEmail,
      smtpFromName,
      logoUrl,
      primaryColor = "#2563eb",
      secondaryColor,
      quotePrefix = "QT",
      invoicePrefix = "INV",
      defaultCurrency = "GBP",
      defaultTaxRate,
      defaultPaymentTerms = "Net 30",
      termsConditions,
      timezone = "Europe/London",
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existingBusiness = await prisma.business.findUnique({
      where: { slug },
    });
    if (existingBusiness) {
      return NextResponse.json(
        { success: false, error: "A business with this slug already exists" },
        { status: 400 }
      );
    }

    const business = await prisma.business.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        parentId,
        legalName,
        companyNumber,
        vatNumber,
        registeredAddress,
        tradingName,
        tradingAddress,
        city,
        postcode,
        country,
        phone,
        email,
        salesEmail,
        website,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        smtpFromEmail,
        smtpFromName,
        logoUrl,
        primaryColor,
        secondaryColor,
        quotePrefix,
        invoicePrefix,
        defaultCurrency,
        defaultTaxRate,
        defaultPaymentTerms,
        termsConditions,
        timezone,
      },
    });

    return NextResponse.json({
      success: true,
      data: business,
    });
  } catch (error) {
    console.error("Failed to create business:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create business" },
      { status: 500 }
    );
  }
}
