import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createTaskSchema, taskFiltersSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";
import { getCurrentUserId } from "@/lib/auth/get-current-user";
import { handleApiError, noBusinessError } from "@/lib/api/errors";
import { apiPaginated, apiCreated } from "@/lib/api/response";

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

    // Fetch dependency info for tasks that have dependencies
    const taskIds = tasks.filter(t => t.dependsOnId).map(t => t.dependsOnId as string);
    const dependencies = taskIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, title: true, status: true },
        })
      : [];

    const dependencyMap = new Map(dependencies.map(d => [d.id, d]));

    // Enrich tasks with dependency info
    const enrichedTasks = tasks.map(task => ({
      ...task,
      dependsOn: task.dependsOnId ? dependencyMap.get(task.dependsOnId) : null,
    }));

    return apiPaginated(enrichedTasks, {
      page: filters.page,
      limit: filters.limit,
      total,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return handleApiError(error, "fetch", "Task");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get current user to use as default assignee
    const currentUserId = await getCurrentUserId(request);

    // Default assigneeId to current user if not provided
    const dataWithAssignee = {
      ...body,
      assigneeId: body.assigneeId || currentUserId,
    };

    const data = createTaskSchema.parse(dataWithAssignee);

    // Get current business
    const business = await getCurrentBusiness(request);
    if (!business) {
      return noBusinessError();
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
        dependsOnId: data.dependsOnId || null,
        isRecurring: data.isRecurring || false,
        recurrencePattern: data.recurrencePattern || null,
        recurrenceInterval: data.recurrenceInterval || null,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
        businessId: business.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return apiCreated(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return handleApiError(error, "create", "Task");
  }
}
