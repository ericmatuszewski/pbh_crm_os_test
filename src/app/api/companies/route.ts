import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createCompanySchema, paginationSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";
import { handleApiError, noBusinessError } from "@/lib/api/errors";
import { apiPaginated, apiCreated } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const pagination = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    // Get current business for scoping
    const business = await getCurrentBusiness(request);

    const where: Prisma.CompanyWhereInput = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { industry: { contains: search, mode: "insensitive" } },
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: {
            select: { contacts: true, deals: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.company.count({ where }),
    ]);

    return apiPaginated(companies, {
      page: pagination.page,
      limit: pagination.limit,
      total,
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return handleApiError(error, "fetch", "Company");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCompanySchema.parse(body);

    // Get current business
    const business = await getCurrentBusiness(request);
    if (!business) {
      return noBusinessError();
    }

    const company = await prisma.company.create({
      data: {
        name: data.name,
        website: data.website || null,
        industry: data.industry || null,
        size: data.size || null,
        address: data.address || null,
        city: data.city || null,
        county: data.county || null,
        postcode: data.postcode || null,
        country: data.country || null,
        businessId: business.id,
      },
    });

    return apiCreated(company);
  } catch (error) {
    console.error("Error creating company:", error);
    return handleApiError(error, "create", "Company");
  }
}
