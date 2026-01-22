import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createDealSchema, dealFiltersSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = dealFiltersSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      stage: searchParams.get("stage"),
      ownerId: searchParams.get("ownerId"),
      minValue: searchParams.get("minValue"),
      maxValue: searchParams.get("maxValue"),
    });

    // Get current business for scoping
    const business = await getCurrentBusiness(request);

    const where: Prisma.DealWhereInput = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (filters.search) {
      where.title = { contains: filters.search, mode: "insensitive" };
    }

    if (filters.stage) {
      where.stage = filters.stage;
    }

    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.minValue !== undefined || filters.maxValue !== undefined) {
      where.value = {};
      if (filters.minValue !== undefined) {
        where.value.gte = filters.minValue;
      }
      if (filters.maxValue !== undefined) {
        where.value.lte = filters.maxValue;
      }
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, email: true, image: true } },
          pipelineStage: { select: { id: true, name: true, color: true, probability: true } },
          pipeline: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.deal.count({ where }),
    ]);

    // Convert Decimal to number for JSON serialization
    const serializedDeals = deals.map((deal) => ({
      ...deal,
      value: Number(deal.value),
    }));

    return NextResponse.json({
      success: true,
      data: serializedDeals,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch deals" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createDealSchema.parse(body);

    // Get current business
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const deal = await prisma.deal.create({
      data: {
        title: data.title,
        value: data.value,
        currency: data.currency,
        stage: data.stage,
        probability: data.probability,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        contactId: data.contactId || null,
        companyId: data.companyId || null,
        ownerId: data.ownerId,
        pipelineId: data.pipelineId || null,
        stageId: data.stageId || null,
        businessId: business.id,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        pipelineStage: { select: { id: true, name: true, color: true, probability: true } },
        pipeline: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: { ...deal, value: Number(deal.value) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating deal:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create deal" } },
      { status: 500 }
    );
  }
}
