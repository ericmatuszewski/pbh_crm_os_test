import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createTaskSchema, taskFiltersSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = taskFiltersSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      priority: searchParams.get("priority"),
      assigneeId: searchParams.get("assigneeId"),
    });

    // Get current business for scoping
    const business = await getCurrentBusiness(request);

    const where: Prisma.TaskWhereInput = {};

    // Add business scoping
    if (business) {
      const isParent = !business.parentId;
      const businessScope = await buildBusinessScopeFilter(business.id, isParent);
      Object.assign(where, businessScope);
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: tasks,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch tasks" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createTaskSchema.parse(body);

    // Get current business
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority,
        status: data.status,
        assigneeId: data.assigneeId,
        relatedType: data.relatedType || null,
        relatedId: data.relatedId || null,
        businessId: business.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create task" } },
      { status: 500 }
    );
  }
}
