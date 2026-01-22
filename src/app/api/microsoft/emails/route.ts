import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/business";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const emailFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  mailboxId: z.string().optional(),
  direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
  search: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  hasAttachments: z.coerce.boolean().optional(),
  unlinked: z.coerce.boolean().optional(),
});

// GET /api/microsoft/emails - List emails
export async function GET(request: NextRequest) {
  try {
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const filters = emailFiltersSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 25,
      mailboxId: searchParams.get("mailboxId") || undefined,
      direction: searchParams.get("direction") || undefined,
      search: searchParams.get("search") || undefined,
      contactId: searchParams.get("contactId") || undefined,
      companyId: searchParams.get("companyId") || undefined,
      dealId: searchParams.get("dealId") || undefined,
      hasAttachments: searchParams.get("hasAttachments") || undefined,
      unlinked: searchParams.get("unlinked") || undefined,
    });

    const where: Prisma.EmailWhereInput = {
      businessId: business.id,
    };

    if (filters.mailboxId) {
      where.mailboxId = filters.mailboxId;
    }

    if (filters.direction) {
      where.direction = filters.direction;
    }

    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
        { fromEmail: { contains: filters.search, mode: "insensitive" } },
        { fromName: { contains: filters.search, mode: "insensitive" } },
        { bodyPreview: { contains: filters.search, mode: "insensitive" } },
      ];
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

    if (filters.hasAttachments !== undefined) {
      where.hasAttachments = filters.hasAttachments;
    }

    if (filters.unlinked) {
      where.contactId = null;
      where.companyId = null;
      where.dealId = null;
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        select: {
          id: true,
          graphMessageId: true,
          direction: true,
          subject: true,
          bodyPreview: true,
          fromEmail: true,
          fromName: true,
          toEmails: true,
          sentAt: true,
          receivedAt: true,
          hasAttachments: true,
          contactId: true,
          companyId: true,
          dealId: true,
          autoLinked: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
          deal: { select: { id: true, title: true } },
        },
        orderBy: [
          { receivedAt: "desc" },
          { sentAt: "desc" },
        ],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.email.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: emails,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch emails" } },
      { status: 500 }
    );
  }
}
