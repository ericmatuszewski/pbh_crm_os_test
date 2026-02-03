import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createDealSchema, dealFiltersSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";
import { triggerDealCreated } from "@/lib/scoring/trigger";
import { getCurrentUserId } from "@/lib/auth/get-current-user";
import { handleApiError, noBusinessError } from "@/lib/api/errors";
import { apiPaginated, apiCreated } from "@/lib/api/response";

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
      pipelineId: searchParams.get("pipelineId"),
      stageId: searchParams.get("stageId"),
      companyId: searchParams.get("companyId"),
      contactId: searchParams.get("contactId"),
      status: searchParams.get("status"),
      createdAfter: searchParams.get("createdAfter"),
      createdBefore: searchParams.get("createdBefore"),
      expectedCloseAfter: searchParams.get("expectedCloseAfter"),
      expectedCloseBefore: searchParams.get("expectedCloseBefore"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
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
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { contact: { firstName: { contains: filters.search, mode: "insensitive" } } },
        { contact: { lastName: { contains: filters.search, mode: "insensitive" } } },
        { company: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
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

    if (filters.pipelineId) {
      where.pipelineId = filters.pipelineId;
    }

    if (filters.stageId) {
      where.stageId = filters.stageId;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters.status) {
      // Map status to stage values
      if (filters.status === "OPEN") {
        where.stage = { in: ["QUALIFICATION", "DISCOVERY", "PROPOSAL", "NEGOTIATION"] };
      } else if (filters.status === "WON") {
        where.stage = "CLOSED_WON";
      } else if (filters.status === "LOST") {
        where.stage = "CLOSED_LOST";
      }
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = new Date(filters.createdAfter);
      }
      if (filters.createdBefore) {
        where.createdAt.lte = new Date(filters.createdBefore);
      }
    }

    if (filters.expectedCloseAfter || filters.expectedCloseBefore) {
      where.expectedCloseDate = {};
      if (filters.expectedCloseAfter) {
        where.expectedCloseDate.gte = new Date(filters.expectedCloseAfter);
      }
      if (filters.expectedCloseBefore) {
        where.expectedCloseDate.lte = new Date(filters.expectedCloseBefore);
      }
    }

    // Build sort order
    const sortField = filters.sortBy || "createdAt";
    const sortDirection = filters.sortOrder || "desc";
    const orderBy: Prisma.DealOrderByWithRelationInput = { [sortField]: sortDirection };

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
        orderBy,
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

    return apiPaginated(serializedDeals, {
      page: filters.page,
      limit: filters.limit,
      total,
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return handleApiError(error, "fetch", "Deal");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get current user to use as default owner
    const currentUserId = await getCurrentUserId(request);

    // Default ownerId to current user if not provided
    const dataWithOwner = {
      ...body,
      ownerId: body.ownerId || currentUserId,
    };

    const data = createDealSchema.parse(dataWithOwner);

    // Get current business
    const business = await getCurrentBusiness(request);
    if (!business) {
      return noBusinessError();
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

    // Trigger lead scoring for DEAL_CREATED event
    if (deal.contactId) {
      await triggerDealCreated(deal.contactId, deal.id, deal.title);
    }

    return apiCreated({ ...deal, value: Number(deal.value) });
  } catch (error) {
    console.error("Error creating deal:", error);
    return handleApiError(error, "create", "Deal");
  }
}
