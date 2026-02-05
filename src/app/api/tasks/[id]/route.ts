import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validations";
import { handleApiError, notFoundError, validationError } from "@/lib/api/errors";
import { apiSuccess, apiDeleted } from "@/lib/api/response";
import { addDays, addWeeks, addMonths } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!task) {
      return notFoundError("Task");
    }

    // Fetch dependency if exists
    let dependsOn = null;
    if (task.dependsOnId) {
      dependsOn = await prisma.task.findUnique({
        where: { id: task.dependsOnId },
        select: { id: true, title: true, status: true },
      });
    }

    return apiSuccess({ ...task, dependsOn });
  } catch (error) {
    console.error("Error fetching task:", error);
    return handleApiError(error, "fetch", "Task");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateTaskSchema.parse(body);

    // Check if trying to complete a task that has an incomplete dependency
    if (data.status === "COMPLETED") {
      const existingTask = await prisma.task.findUnique({
        where: { id },
        select: { dependsOnId: true },
      });

      if (existingTask?.dependsOnId) {
        const dependency = await prisma.task.findUnique({
          where: { id: existingTask.dependsOnId },
          select: { status: true, title: true },
        });

        if (dependency && dependency.status !== "COMPLETED") {
          return validationError(
            `Cannot complete this task until "${dependency.title}" is completed`,
            { blockedBy: existingTask.dependsOnId }
          );
        }
      }
    }

    // Prevent circular dependencies
    if (data.dependsOnId) {
      // Check if the target task depends on this task (direct circular)
      const targetTask = await prisma.task.findUnique({
        where: { id: data.dependsOnId },
        select: { dependsOnId: true },
      });

      if (targetTask?.dependsOnId === id) {
        return validationError("Circular dependency detected");
      }

      // Prevent self-dependency
      if (data.dependsOnId === id) {
        return validationError("A task cannot depend on itself");
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.priority) updateData.priority = data.priority;
    if (data.status) updateData.status = data.status;
    if (data.assigneeId) updateData.assigneeId = data.assigneeId;
    if (data.dependsOnId !== undefined) updateData.dependsOnId = data.dependsOnId || null;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.recurrencePattern !== undefined) updateData.recurrencePattern = data.recurrencePattern || null;
    if (data.recurrenceInterval !== undefined) updateData.recurrenceInterval = data.recurrenceInterval || null;
    if (data.recurrenceEndDate !== undefined) {
      updateData.recurrenceEndDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // Handle recurring task: create next occurrence when completed
    if (data.status === "COMPLETED" && task.isRecurring && task.recurrencePattern) {
      const now = new Date();
      const baseDate = task.dueDate || now;
      const interval = task.recurrenceInterval || 1;

      // Calculate next due date based on pattern
      let nextDueDate: Date;
      switch (task.recurrencePattern) {
        case "daily":
          nextDueDate = addDays(baseDate, interval);
          break;
        case "weekly":
          nextDueDate = addWeeks(baseDate, interval);
          break;
        case "monthly":
          nextDueDate = addMonths(baseDate, interval);
          break;
        default:
          nextDueDate = addDays(baseDate, interval);
      }

      // Only create next occurrence if end date hasn't passed
      const shouldCreate = !task.recurrenceEndDate || nextDueDate <= task.recurrenceEndDate;

      if (shouldCreate) {
        await prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            dueDate: nextDueDate,
            priority: task.priority,
            status: "TODO",
            assigneeId: task.assigneeId,
            businessId: task.businessId,
            isRecurring: true,
            recurrencePattern: task.recurrencePattern,
            recurrenceInterval: task.recurrenceInterval,
            recurrenceEndDate: task.recurrenceEndDate,
            parentTaskId: task.id,
          },
        });
      }
    }

    // Fetch dependency if exists
    let dependsOn = null;
    if (task.dependsOnId) {
      dependsOn = await prisma.task.findUnique({
        where: { id: task.dependsOnId },
        select: { id: true, title: true, status: true },
      });
    }

    return apiSuccess({ ...task, dependsOn });
  } catch (error) {
    console.error("Error updating task:", error);
    return handleApiError(error, "update", "Task");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if any tasks depend on this one
    const dependentTasks = await prisma.task.findMany({
      where: { dependsOnId: id },
      select: { id: true, title: true },
    });

    if (dependentTasks.length > 0) {
      return validationError(
        `Cannot delete this task. ${dependentTasks.length} task(s) depend on it.`,
        { dependentTasks: dependentTasks.map(t => t.title) }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return apiDeleted(id);
  } catch (error) {
    console.error("Error deleting task:", error);
    return handleApiError(error, "delete", "Task");
  }
}
