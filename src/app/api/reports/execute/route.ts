import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface FilterCondition {
  field: string;
  operator: "equals" | "contains" | "gt" | "gte" | "lt" | "lte" | "in" | "notIn" | "startsWith" | "endsWith" | "isNull" | "isNotNull";
  value: string | number | boolean | string[] | null;
}

// Define available fields for each entity
const entityFields: Record<string, { name: string; type: string; label: string }[]> = {
  contacts: [
    { name: "firstName", type: "string", label: "First Name" },
    { name: "lastName", type: "string", label: "Last Name" },
    { name: "email", type: "string", label: "Email" },
    { name: "phone", type: "string", label: "Phone" },
    { name: "title", type: "string", label: "Title" },
    { name: "status", type: "enum", label: "Status" },
    { name: "source", type: "string", label: "Source" },
    { name: "createdAt", type: "date", label: "Created At" },
    { name: "updatedAt", type: "date", label: "Updated At" },
  ],
  deals: [
    { name: "title", type: "string", label: "Title" },
    { name: "value", type: "number", label: "Value" },
    { name: "currency", type: "string", label: "Currency" },
    { name: "stage", type: "enum", label: "Stage" },
    { name: "probability", type: "number", label: "Probability" },
    { name: "expectedCloseDate", type: "date", label: "Expected Close Date" },
    { name: "closedAt", type: "date", label: "Closed At" },
    { name: "createdAt", type: "date", label: "Created At" },
    { name: "updatedAt", type: "date", label: "Updated At" },
  ],
  tasks: [
    { name: "title", type: "string", label: "Title" },
    { name: "description", type: "string", label: "Description" },
    { name: "dueDate", type: "date", label: "Due Date" },
    { name: "priority", type: "enum", label: "Priority" },
    { name: "status", type: "enum", label: "Status" },
    { name: "createdAt", type: "date", label: "Created At" },
  ],
  companies: [
    { name: "name", type: "string", label: "Name" },
    { name: "website", type: "string", label: "Website" },
    { name: "industry", type: "string", label: "Industry" },
    { name: "size", type: "enum", label: "Size" },
    { name: "city", type: "string", label: "City" },
    { name: "state", type: "string", label: "State" },
    { name: "country", type: "string", label: "Country" },
    { name: "createdAt", type: "date", label: "Created At" },
  ],
  quotes: [
    { name: "quoteNumber", type: "string", label: "Quote Number" },
    { name: "title", type: "string", label: "Title" },
    { name: "status", type: "enum", label: "Status" },
    { name: "subtotal", type: "number", label: "Subtotal" },
    { name: "total", type: "number", label: "Total" },
    { name: "currency", type: "string", label: "Currency" },
    { name: "validUntil", type: "date", label: "Valid Until" },
    { name: "createdAt", type: "date", label: "Created At" },
    { name: "sentAt", type: "date", label: "Sent At" },
    { name: "acceptedAt", type: "date", label: "Accepted At" },
  ],
  activities: [
    { name: "type", type: "enum", label: "Type" },
    { name: "title", type: "string", label: "Title" },
    { name: "description", type: "string", label: "Description" },
    { name: "createdAt", type: "date", label: "Created At" },
  ],
};

// Build Prisma where clause from filters
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, filters = [], columns = [], sortField, sortDirection = "asc", page = 1, limit = 50 } = body;

    if (!entity || !entityFields[entity]) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ENTITY", message: "Invalid entity type" } },
        { status: 400 }
      );
    }

    const where = buildWhereClause(filters);
    const skip = (page - 1) * limit;
    const orderBy = sortField ? { [sortField]: sortDirection } : { createdAt: "desc" as Prisma.SortOrder };

    // Get the available fields for the entity
    const availableFields = entityFields[entity];

    // Build select clause from columns or use all fields
    const selectFields = columns.length > 0
      ? columns.reduce((acc: Record<string, boolean>, col: string) => {
          if (availableFields.some(f => f.name === col)) {
            acc[col] = true;
          }
          return acc;
        }, { id: true, createdAt: true })
      : availableFields.reduce((acc: Record<string, boolean>, f) => {
          acc[f.name] = true;
          return acc;
        }, { id: true });

    // Add relationship includes based on entity
    const includes: Record<string, unknown> = {};
    if (entity === "contacts") {
      includes.company = { select: { id: true, name: true } };
    } else if (entity === "deals") {
      includes.owner = { select: { id: true, name: true } };
      includes.company = { select: { id: true, name: true } };
      includes.contact = { select: { id: true, firstName: true, lastName: true } };
    } else if (entity === "tasks") {
      includes.assignee = { select: { id: true, name: true } };
    } else if (entity === "quotes") {
      includes.contact = { select: { id: true, firstName: true, lastName: true } };
      includes.company = { select: { id: true, name: true } };
      includes.createdBy = { select: { id: true, name: true } };
    } else if (entity === "activities") {
      includes.user = { select: { id: true, name: true } };
      includes.contact = { select: { id: true, firstName: true, lastName: true } };
    }

    // Execute query based on entity
    let data: unknown[];
    let total: number;

    switch (entity) {
      case "contacts":
        [data, total] = await Promise.all([
          prisma.contact.findMany({
            where,
            select: { ...selectFields, ...includes },
            orderBy,
            skip,
            take: limit,
          }),
          prisma.contact.count({ where }),
        ]);
        break;
      case "deals":
        [data, total] = await Promise.all([
          prisma.deal.findMany({
            where,
            select: { ...selectFields, ...includes },
            orderBy,
            skip,
            take: limit,
          }),
          prisma.deal.count({ where }),
        ]);
        break;
      case "tasks":
        [data, total] = await Promise.all([
          prisma.task.findMany({
            where,
            select: { ...selectFields, ...includes },
            orderBy,
            skip,
            take: limit,
          }),
          prisma.task.count({ where }),
        ]);
        break;
      case "companies":
        [data, total] = await Promise.all([
          prisma.company.findMany({
            where,
            select: selectFields,
            orderBy,
            skip,
            take: limit,
          }),
          prisma.company.count({ where }),
        ]);
        break;
      case "quotes":
        [data, total] = await Promise.all([
          prisma.quote.findMany({
            where,
            select: { ...selectFields, ...includes },
            orderBy,
            skip,
            take: limit,
          }),
          prisma.quote.count({ where }),
        ]);
        break;
      case "activities":
        [data, total] = await Promise.all([
          prisma.activity.findMany({
            where,
            select: { ...selectFields, ...includes },
            orderBy,
            skip,
            take: limit,
          }),
          prisma.activity.count({ where }),
        ]);
        break;
      default:
        return NextResponse.json(
          { success: false, error: { code: "INVALID_ENTITY", message: "Invalid entity type" } },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        records: data,
        fields: availableFields,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error executing report:", error);
    return NextResponse.json(
      { success: false, error: { code: "EXECUTE_ERROR", message: "Failed to execute report" } },
      { status: 500 }
    );
  }
}

// Get available fields for an entity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity");

    if (!entity) {
      // Return all entities and their fields
      return NextResponse.json({
        success: true,
        data: {
          entities: Object.keys(entityFields).map(key => ({
            name: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            fields: entityFields[key],
          })),
        },
      });
    }

    if (!entityFields[entity]) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ENTITY", message: "Invalid entity type" } },
        { status: 400 }
      );
    }

    // Get enum values for the entity
    const enumValues: Record<string, string[]> = {};

    if (entity === "contacts") {
      enumValues.status = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "PARTNER"];
    } else if (entity === "deals") {
      enumValues.stage = ["QUALIFICATION", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];
    } else if (entity === "tasks") {
      enumValues.status = ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      enumValues.priority = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    } else if (entity === "companies") {
      enumValues.size = ["STARTUP", "SMALL", "MEDIUM", "ENTERPRISE"];
    } else if (entity === "quotes") {
      enumValues.status = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"];
    } else if (entity === "activities") {
      enumValues.type = ["CALL", "EMAIL", "MEETING", "NOTE", "TASK", "DEAL_UPDATE"];
    }

    return NextResponse.json({
      success: true,
      data: {
        entity,
        fields: entityFields[entity],
        enumValues,
      },
    });
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch fields" } },
      { status: 500 }
    );
  }
}
