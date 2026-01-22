import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createScheduledCallSchema, scheduledCallFiltersSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = scheduledCallFiltersSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      assignedToId: searchParams.get("assignedToId"),
      status: searchParams.get("status"),
      date: searchParams.get("date"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    const where: Prisma.ScheduledCallWhereInput = {};

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Filter by specific date
    if (filters.date) {
      const date = parseISO(filters.date);
      where.scheduledAt = {
        gte: startOfDay(date),
        lte: endOfDay(date),
      };
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      where.scheduledAt = {
        ...(filters.startDate && { gte: parseISO(filters.startDate) }),
        ...(filters.endDate && { lte: parseISO(filters.endDate) }),
      };
    }

    const [calls, total] = await Promise.all([
      prisma.scheduledCall.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              company: { select: { id: true, name: true } },
            },
          },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { scheduledAt: "asc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.scheduledCall.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: calls,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching scheduled calls:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch scheduled calls" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createScheduledCallSchema.parse(body);

    // Validate that assignedToId is provided - no system fallback allowed
    if (!data.assignedToId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Assigned agent is required. Please select who will make this call." } },
        { status: 400 }
      );
    }

    const call = await prisma.scheduledCall.create({
      data: {
        contactId: data.contactId,
        scheduledAt: new Date(data.scheduledAt),
        assignedToId: data.assignedToId,
        reminderMinutes: data.reminderMinutes || null,
        notes: data.notes || null,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: { select: { id: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: call }, { status: 201 });
  } catch (error) {
    console.error("Error creating scheduled call:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input data" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create scheduled call" } },
      { status: 500 }
    );
  }
}
