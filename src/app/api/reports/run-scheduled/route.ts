import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// This endpoint can be called by a cron job to run scheduled reports
// For now, it logs the reports that would be sent - actual email sending
// would be added when we implement the notifications system

interface FilterCondition {
  field: string;
  operator: string;
  value: string | number | boolean | string[] | null;
}

function buildWhereClause(filters: FilterCondition[]): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const filter of filters) {
    const { field, operator, value } = filter;

    switch (operator) {
      case "equals":
        where[field] = value;
        break;
      case "contains":
        where[field] = { contains: value, mode: "insensitive" };
        break;
      case "startsWith":
        where[field] = { startsWith: value, mode: "insensitive" };
        break;
      case "endsWith":
        where[field] = { endsWith: value, mode: "insensitive" };
        break;
      case "gt":
        where[field] = { gt: value };
        break;
      case "gte":
        where[field] = { gte: value };
        break;
      case "lt":
        where[field] = { lt: value };
        break;
      case "lte":
        where[field] = { lte: value };
        break;
      case "in":
        where[field] = { in: Array.isArray(value) ? value : [value] };
        break;
      case "notIn":
        where[field] = { notIn: Array.isArray(value) ? value : [value] };
        break;
      case "isNull":
        where[field] = null;
        break;
      case "isNotNull":
        where[field] = { not: null };
        break;
    }
  }

  return where;
}

async function runReport(entity: string, filters: FilterCondition[], sortField?: string, sortDirection?: string) {
  const where = buildWhereClause(filters);
  const orderBy = sortField ? { [sortField]: sortDirection || "asc" } : { createdAt: "desc" as Prisma.SortOrder };

  let data: unknown[];
  let total: number;

  switch (entity) {
    case "contacts":
      [data, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          include: { company: { select: { id: true, name: true } } },
          orderBy,
          take: 1000,
        }),
        prisma.contact.count({ where }),
      ]);
      break;
    case "deals":
      [data, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          include: {
            owner: { select: { id: true, name: true } },
            company: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy,
          take: 1000,
        }),
        prisma.deal.count({ where }),
      ]);
      break;
    case "tasks":
      [data, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: { assignee: { select: { id: true, name: true } } },
          orderBy,
          take: 1000,
        }),
        prisma.task.count({ where }),
      ]);
      break;
    case "companies":
      [data, total] = await Promise.all([
        prisma.company.findMany({
          where,
          orderBy,
          take: 1000,
        }),
        prisma.company.count({ where }),
      ]);
      break;
    case "quotes":
      [data, total] = await Promise.all([
        prisma.quote.findMany({
          where,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
            company: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy,
          take: 1000,
        }),
        prisma.quote.count({ where }),
      ]);
      break;
    default:
      data = [];
      total = 0;
  }

  return { data, total };
}

function shouldRunReport(report: {
  scheduleFrequency: string | null;
  scheduleDay: number | null;
  scheduleTime: string | null;
}): boolean {
  if (!report.scheduleFrequency || !report.scheduleTime) return false;

  const now = new Date();
  const [hours, minutes] = report.scheduleTime.split(":").map(Number);

  // Check if within the schedule time window (within 5 minutes)
  const scheduleMinutes = hours * 60 + minutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (Math.abs(currentMinutes - scheduleMinutes) > 5) return false;

  switch (report.scheduleFrequency) {
    case "daily":
      return true;
    case "weekly":
      // scheduleDay is 0-6 (Sunday-Saturday)
      return now.getDay() === report.scheduleDay;
    case "monthly":
      // scheduleDay is 1-31
      return now.getDate() === report.scheduleDay;
    default:
      return false;
  }
}

export async function POST() {
  try {
    // Find all scheduled reports that need to be run
    const scheduledReports = await prisma.savedReport.findMany({
      where: { isScheduled: true },
    });

    const results = [];

    for (const report of scheduledReports) {
      if (!shouldRunReport(report)) {
        continue;
      }

      try {
        const filters = (report.filters as unknown as FilterCondition[]) || [];
        const { data, total } = await runReport(
          report.entity,
          filters,
          report.sortField || undefined,
          report.sortDirection || undefined
        );

        // Update last run time
        await prisma.savedReport.update({
          where: { id: report.id },
          data: { lastRunAt: new Date() },
        });

        // In a real implementation, this would send emails to report.recipients

        results.push({
          id: report.id,
          name: report.name,
          total,
          recipients: report.recipients,
          success: true,
        });
      } catch (error) {
        console.error(`Failed to run report ${report.name}:`, error);
        results.push({
          id: report.id,
          name: report.name,
          success: false,
          error: String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        checked: scheduledReports.length,
        executed: results.length,
        results,
      },
    });
  } catch (error) {
    console.error("Error running scheduled reports:", error);
    return NextResponse.json(
      { success: false, error: { code: "RUN_ERROR", message: "Failed to run scheduled reports" } },
      { status: 500 }
    );
  }
}
