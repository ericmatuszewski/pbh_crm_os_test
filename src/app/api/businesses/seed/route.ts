"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/businesses/seed - Create default PBH business and migrate existing data
export async function POST(request: NextRequest) {
  try {
    // Check if PBH business already exists
    let pbhBusiness = await prisma.business.findUnique({
      where: { slug: "pbh" },
    });

    if (!pbhBusiness) {
      // Create PBH as the parent business
      pbhBusiness = await prisma.business.create({
        data: {
          name: "PBH",
          slug: "pbh",
          legalName: "PBH Ltd",
          country: "United Kingdom",
          primaryColor: "#2563eb",
          quotePrefix: "QT",
          invoicePrefix: "INV",
          defaultCurrency: "GBP",
          defaultTaxRate: 20.00, // UK VAT
          defaultPaymentTerms: "Net 30",
          timezone: "Europe/London",
          isActive: true,
        },
      });
    }

    // Assign all existing users to PBH with ADMIN role
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    let usersAssigned = 0;
    for (const user of users) {
      const existing = await prisma.userBusiness.findUnique({
        where: {
          userId_businessId: {
            userId: user.id,
            businessId: pbhBusiness.id,
          },
        },
      });

      if (!existing) {
        await prisma.userBusiness.create({
          data: {
            userId: user.id,
            businessId: pbhBusiness.id,
            role: "ADMIN",
            isDefault: true,
          },
        });

        // Set as current business
        await prisma.user.update({
          where: { id: user.id },
          data: { currentBusinessId: pbhBusiness.id },
        });

        usersAssigned++;
      }
    }

    // Migrate existing entities to PBH business
    const migrateResults = {
      contacts: 0,
      companies: 0,
      deals: 0,
      quotes: 0,
      products: 0,
      pipelines: 0,
      tasks: 0,
      activities: 0,
      scheduledCalls: 0,
      documents: 0,
      quoteTemplates: 0,
      campaigns: 0,
    };

    // Migrate contacts
    const contactsResult = await prisma.contact.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.contacts = contactsResult.count;

    // Migrate companies
    const companiesResult = await prisma.company.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.companies = companiesResult.count;

    // Migrate deals
    const dealsResult = await prisma.deal.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.deals = dealsResult.count;

    // Migrate quotes
    const quotesResult = await prisma.quote.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.quotes = quotesResult.count;

    // Migrate products
    const productsResult = await prisma.product.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.products = productsResult.count;

    // Migrate pipelines
    const pipelinesResult = await prisma.pipeline.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.pipelines = pipelinesResult.count;

    // Migrate tasks
    const tasksResult = await prisma.task.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.tasks = tasksResult.count;

    // Migrate activities
    const activitiesResult = await prisma.activity.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.activities = activitiesResult.count;

    // Migrate scheduled calls
    const scheduledCallsResult = await prisma.scheduledCall.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.scheduledCalls = scheduledCallsResult.count;

    // Migrate documents
    const documentsResult = await prisma.document.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.documents = documentsResult.count;

    // Migrate quote templates
    const quoteTemplatesResult = await prisma.quoteTemplate.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.quoteTemplates = quoteTemplatesResult.count;

    // Migrate call campaigns
    const campaignsResult = await prisma.callCampaign.updateMany({
      where: { businessId: null },
      data: { businessId: pbhBusiness.id },
    });
    migrateResults.campaigns = campaignsResult.count;

    return NextResponse.json({
      success: true,
      data: {
        business: pbhBusiness,
        usersAssigned,
        migratedRecords: migrateResults,
      },
    });
  } catch (error) {
    console.error("Failed to seed business:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed business" },
      { status: 500 }
    );
  }
}
