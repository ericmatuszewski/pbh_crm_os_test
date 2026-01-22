import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/bulk-actions - Execute a bulk action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.entity || !body.action || !body.recordIds || !Array.isArray(body.recordIds)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId, entity, action, and recordIds are required" } },
        { status: 400 }
      );
    }

    const { userId, entity, action, recordIds, updateData } = body;

    // Create bulk action record
    const bulkAction = await prisma.bulkAction.create({
      data: {
        userId,
        entity,
        action,
        recordIds,
        recordCount: recordIds.length,
        status: "processing",
        actionData: updateData ? JSON.parse(JSON.stringify(updateData)) : undefined,
      },
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: { id: string; error: string }[] = [];

    // Process based on action type
    switch (action) {
      case "delete":
        for (const id of recordIds) {
          try {
            await deleteEntity(entity, id);
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push({ id, error: error instanceof Error ? error.message : "Unknown error" });
          }
        }
        break;

      case "update":
        if (!updateData) {
          return NextResponse.json(
            { success: false, error: { code: "VALIDATION_ERROR", message: "updateData is required for update action" } },
            { status: 400 }
          );
        }
        for (const id of recordIds) {
          try {
            await updateEntity(entity, id, updateData);
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push({ id, error: error instanceof Error ? error.message : "Unknown error" });
          }
        }
        break;

      case "assign":
        if (!body.assigneeId) {
          return NextResponse.json(
            { success: false, error: { code: "VALIDATION_ERROR", message: "assigneeId is required for assign action" } },
            { status: 400 }
          );
        }
        for (const id of recordIds) {
          try {
            await assignEntity(entity, id, body.assigneeId);
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push({ id, error: error instanceof Error ? error.message : "Unknown error" });
          }
        }
        break;

      case "tag":
        if (!body.tags || !Array.isArray(body.tags)) {
          return NextResponse.json(
            { success: false, error: { code: "VALIDATION_ERROR", message: "tags array is required for tag action" } },
            { status: 400 }
          );
        }
        for (const id of recordIds) {
          try {
            await addTagsToEntity(entity, id, body.tags);
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push({ id, error: error instanceof Error ? error.message : "Unknown error" });
          }
        }
        break;

      case "export":
        // For export, we'll just collect the data
        const exportData = await exportEntities(entity, recordIds);
        await prisma.bulkAction.update({
          where: { id: bulkAction.id },
          data: {
            status: "completed",
            progress: 100,
            completedAt: new Date(),
          },
        });
        return NextResponse.json({
          success: true,
          data: {
            bulkActionId: bulkAction.id,
            action,
            exportData,
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: `Unknown action: ${action}` } },
          { status: 400 }
        );
    }

    // Calculate progress percentage
    const progress = Math.round((successCount / recordIds.length) * 100);
    const status = errorCount === recordIds.length ? "failed" : "completed";
    const errorMessage = errors.length > 0 ? `${errorCount} record(s) failed` : null;

    // Update bulk action record
    await prisma.bulkAction.update({
      where: { id: bulkAction.id },
      data: {
        status,
        progress,
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        bulkActionId: bulkAction.id,
        action,
        totalCount: recordIds.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      },
    });
  } catch (error) {
    console.error("Bulk action failed:", error);
    return NextResponse.json(
      { success: false, error: { code: "BULK_ACTION_ERROR", message: "Bulk action failed" } },
      { status: 500 }
    );
  }
}

// GET /api/bulk-actions - Get bulk action history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const entity = searchParams.get("entity");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { userId };
    if (entity) {
      where.entity = entity;
    }

    const actions = await prisma.bulkAction.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: actions });
  } catch (error) {
    console.error("Failed to fetch bulk actions:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch bulk actions" } },
      { status: 500 }
    );
  }
}

// Helper functions for entity operations
async function deleteEntity(entity: string, id: string) {
  switch (entity) {
    case "contacts":
      await prisma.contact.delete({ where: { id } });
      break;
    case "companies":
      await prisma.company.delete({ where: { id } });
      break;
    case "deals":
      await prisma.deal.delete({ where: { id } });
      break;
    case "tasks":
      await prisma.task.delete({ where: { id } });
      break;
    case "products":
      await prisma.product.delete({ where: { id } });
      break;
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}

async function updateEntity(entity: string, id: string, data: Record<string, unknown>) {
  switch (entity) {
    case "contacts":
      await prisma.contact.update({ where: { id }, data });
      break;
    case "companies":
      await prisma.company.update({ where: { id }, data });
      break;
    case "deals":
      await prisma.deal.update({ where: { id }, data });
      break;
    case "tasks":
      await prisma.task.update({ where: { id }, data });
      break;
    case "products":
      await prisma.product.update({ where: { id }, data });
      break;
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}

async function assignEntity(entity: string, id: string, assigneeId: string) {
  switch (entity) {
    case "contacts":
      await prisma.contact.update({ where: { id }, data: { ownerId: assigneeId } });
      break;
    case "deals":
      await prisma.deal.update({ where: { id }, data: { ownerId: assigneeId } });
      break;
    case "tasks":
      await prisma.task.update({ where: { id }, data: { assigneeId } });
      break;
    default:
      throw new Error(`Entity ${entity} does not support assignment`);
  }
}

async function addTagsToEntity(entity: string, id: string, newTags: string[]) {
  switch (entity) {
    case "contacts": {
      // Contacts use Tag relation - we need to connect existing tags or create new ones
      const tagConnects = [];
      for (const tagName of newTags) {
        // Find or create the tag
        let tag = await prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await prisma.tag.create({ data: { name: tagName } });
        }
        tagConnects.push({ id: tag.id });
      }
      await prisma.contact.update({
        where: { id },
        data: { tags: { connect: tagConnects } }
      });
      break;
    }
    case "products": {
      const product = await prisma.product.findUnique({ where: { id }, select: { tags: true } });
      const existingTags = product?.tags || [];
      const mergedTags = [...new Set([...existingTags, ...newTags])];
      await prisma.product.update({ where: { id }, data: { tags: mergedTags } });
      break;
    }
    default:
      throw new Error(`Entity ${entity} does not support tagging`);
  }
}

async function exportEntities(entity: string, ids: string[]) {
  switch (entity) {
    case "contacts":
      return await prisma.contact.findMany({
        where: { id: { in: ids } },
        include: { company: { select: { name: true } } },
      });
    case "companies":
      return await prisma.company.findMany({
        where: { id: { in: ids } },
        include: { _count: { select: { contacts: true, deals: true } } },
      });
    case "deals":
      return await prisma.deal.findMany({
        where: { id: { in: ids } },
        include: {
          company: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
        },
      });
    case "tasks":
      return await prisma.task.findMany({
        where: { id: { in: ids } },
      });
    case "products":
      return await prisma.product.findMany({
        where: { id: { in: ids } },
      });
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}
