import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createContactSchema, contactFiltersSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";
import { handleApiError, noBusinessError } from "@/lib/api/errors";
import { apiPaginated, apiCreated } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = contactFiltersSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      status: searchParams.get("status"),
      companyId: searchParams.get("companyId"),
      ownerId: searchParams.get("ownerId"),
      tagId: searchParams.get("tagId"),
      source: searchParams.get("source"),
      createdAfter: searchParams.get("createdAfter"),
      createdBefore: searchParams.get("createdBefore"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    // Get current business for scoping
    const business = await getCurrentBusiness(request);

    const where: Prisma.ContactWhereInput = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.tagId) {
      where.tags = {
        some: { id: filters.tagId },
      };
    }

    if (filters.source) {
      where.source = { contains: filters.source, mode: "insensitive" };
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

    // Build sort order
    const sortField = filters.sortBy || "createdAt";
    const sortDirection = filters.sortOrder || "desc";
    const orderBy: Prisma.ContactOrderByWithRelationInput = { [sortField]: sortDirection };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          tags: true,
        },
        orderBy,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return apiPaginated(contacts, {
      page: filters.page,
      limit: filters.limit,
      total,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return handleApiError(error, "fetch", "Contact");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createContactSchema.parse(body);

    // Get current business
    const business = await getCurrentBusiness(request);
    if (!business) {
      return noBusinessError();
    }

    const contact = await prisma.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        title: data.title || null,
        companyId: data.companyId || null,
        status: data.status,
        source: data.source || null,
        ownerId: data.ownerId || null,
        businessId: business.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        tags: true,
      },
    });

    return apiCreated(contact);
  } catch (error) {
    console.error("Error creating contact:", error);
    return handleApiError(error, "create", "Contact");
  }
}
