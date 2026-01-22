import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export interface BusinessWithAccess {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  primaryColor: string;
  logoUrl: string | null;
  defaultCurrency: string;
  defaultTaxRate: number | null;
  quotePrefix: string;
  invoicePrefix: string;
  quoteNumberSequence: number;
  invoiceNumberSequence: number;
  isActive: boolean;
}

/**
 * Get the current business from the request
 * Looks for businessId in query params or header
 */
export async function getCurrentBusiness(
  request: NextRequest
): Promise<BusinessWithAccess | null> {
  const { searchParams } = new URL(request.url);

  // Try to get businessId from query params
  let businessId = searchParams.get("businessId");

  // Or from header
  if (!businessId) {
    businessId = request.headers.get("x-business-id");
  }

  if (!businessId) {
    // Get default business (PBH)
    const defaultBusiness = await prisma.business.findFirst({
      where: {
        isActive: true,
        parentId: null, // Parent business
      },
      orderBy: { createdAt: "asc" },
    });

    if (defaultBusiness) {
      return {
        id: defaultBusiness.id,
        name: defaultBusiness.name,
        slug: defaultBusiness.slug,
        parentId: defaultBusiness.parentId,
        primaryColor: defaultBusiness.primaryColor,
        logoUrl: defaultBusiness.logoUrl,
        defaultCurrency: defaultBusiness.defaultCurrency,
        defaultTaxRate: defaultBusiness.defaultTaxRate ? Number(defaultBusiness.defaultTaxRate) : null,
        quotePrefix: defaultBusiness.quotePrefix,
        invoicePrefix: defaultBusiness.invoicePrefix,
        quoteNumberSequence: defaultBusiness.quoteNumberSequence,
        invoiceNumberSequence: defaultBusiness.invoiceNumberSequence,
        isActive: defaultBusiness.isActive,
      };
    }
    return null;
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId, isActive: true },
  });

  if (!business) {
    return null;
  }

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    parentId: business.parentId,
    primaryColor: business.primaryColor,
    logoUrl: business.logoUrl,
    defaultCurrency: business.defaultCurrency,
    defaultTaxRate: business.defaultTaxRate ? Number(business.defaultTaxRate) : null,
    quotePrefix: business.quotePrefix,
    invoicePrefix: business.invoicePrefix,
    quoteNumberSequence: business.quoteNumberSequence,
    invoiceNumberSequence: business.invoiceNumberSequence,
    isActive: business.isActive,
  };
}

/**
 * Get all child business IDs for a parent business
 * Used for parent business to see all subsidiary data
 */
export async function getChildBusinessIds(parentBusinessId: string): Promise<string[]> {
  const children = await prisma.business.findMany({
    where: {
      parentId: parentBusinessId,
      isActive: true,
    },
    select: { id: true },
  });

  return children.map((c) => c.id);
}

/**
 * Build a where clause for business scoping
 * If the business is a parent, includes all child businesses
 */
export async function buildBusinessScopeFilter(
  businessId: string,
  isParent: boolean
): Promise<{ businessId: string } | { businessId: { in: string[] } }> {
  if (isParent) {
    const childIds = await getChildBusinessIds(businessId);
    return {
      businessId: {
        in: [businessId, ...childIds],
      },
    };
  }

  return { businessId };
}

/**
 * Get full business details for PDF generation and branding
 */
export async function getBusinessForBranding(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      legalName: true,
      companyNumber: true,
      vatNumber: true,
      registeredAddress: true,
      tradingName: true,
      tradingAddress: true,
      city: true,
      postcode: true,
      country: true,
      phone: true,
      email: true,
      salesEmail: true,
      website: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      quotePrefix: true,
      invoicePrefix: true,
      defaultCurrency: true,
      defaultTaxRate: true,
      defaultPaymentTerms: true,
      termsConditions: true,
    },
  });

  return business;
}

/**
 * Generate a quote number with business prefix
 */
export async function generateQuoteNumber(businessId: string): Promise<string> {
  // Use transaction to safely increment sequence
  const business = await prisma.$transaction(async (tx) => {
    const updated = await tx.business.update({
      where: { id: businessId },
      data: { quoteNumberSequence: { increment: 1 } },
      select: { slug: true, quotePrefix: true, quoteNumberSequence: true },
    });
    return updated;
  });

  const year = new Date().getFullYear();
  const sequence = business.quoteNumberSequence.toString().padStart(4, "0");

  // Format: PBH-QT-2024-0001
  return `${business.slug.toUpperCase()}-${business.quotePrefix}-${year}-${sequence}`;
}

/**
 * Generate an invoice number with business prefix
 */
export async function generateInvoiceNumber(businessId: string): Promise<string> {
  const business = await prisma.$transaction(async (tx) => {
    const updated = await tx.business.update({
      where: { id: businessId },
      data: { invoiceNumberSequence: { increment: 1 } },
      select: { slug: true, invoicePrefix: true, invoiceNumberSequence: true },
    });
    return updated;
  });

  const year = new Date().getFullYear();
  const sequence = business.invoiceNumberSequence.toString().padStart(4, "0");

  // Format: PBH-INV-2024-0001
  return `${business.slug.toUpperCase()}-${business.invoicePrefix}-${year}-${sequence}`;
}
