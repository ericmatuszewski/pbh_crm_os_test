import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logRestore } from "@/lib/audit/logger";
import { Prisma } from "@prisma/client";

// POST /api/deleted-records/restore - Restore deleted records
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Find the deleted record
    const deleted = await prisma.deletedRecord.findUnique({
      where: { id: body.id },
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Deleted record not found" } },
        { status: 404 }
      );
    }

    if (!deleted.recoverable) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_RECOVERABLE", message: "This record has already been recovered or is no longer recoverable" } },
        { status: 400 }
      );
    }

    // Restore the record to its original table
    const recordData = deleted.recordData as Record<string, unknown>;
    let restoredId: string | null = null;

    try {
      switch (deleted.entity) {
        case "contact":
          const contact = await prisma.contact.create({
            data: sanitizeRecordForRestore(recordData, ["company", "deals", "tasks", "activities", "scheduledCalls", "callQueueItems", "quotes", "sequenceEnrollments", "leadScoreHistories", "customFieldValues"]) as Prisma.ContactUncheckedCreateInput,
          });
          restoredId = contact.id;
          break;

        case "company":
          const company = await prisma.company.create({
            data: sanitizeRecordForRestore(recordData, ["contacts", "deals", "quotes", "activities", "customFieldValues"]) as Prisma.CompanyUncheckedCreateInput,
          });
          restoredId = company.id;
          break;

        case "deal":
          const deal = await prisma.deal.create({
            data: sanitizeRecordForRestore(recordData, ["contact", "company", "owner", "pipeline", "stage", "quotes", "activities", "tasks", "customFieldValues"]) as Prisma.DealUncheckedCreateInput,
          });
          restoredId = deal.id;
          break;

        case "task":
          const task = await prisma.task.create({
            data: sanitizeRecordForRestore(recordData, ["contact", "deal", "owner"]) as Prisma.TaskUncheckedCreateInput,
          });
          restoredId = task.id;
          break;

        case "quote":
          const quote = await prisma.quote.create({
            data: sanitizeRecordForRestore(recordData, ["deal", "contact", "company", "createdBy", "items", "versions", "signatureRequests"]) as Prisma.QuoteUncheckedCreateInput,
          });
          restoredId = quote.id;
          break;

        case "product":
          const product = await prisma.product.create({
            data: sanitizeRecordForRestore(recordData, ["quoteItems", "priceBookEntries"]) as Prisma.ProductUncheckedCreateInput,
          });
          restoredId = product.id;
          break;

        default:
          return NextResponse.json(
            { success: false, error: { code: "UNSUPPORTED_ENTITY", message: `Restore not supported for entity type: ${deleted.entity}` } },
            { status: 400 }
          );
      }

      // Mark as recovered
      await prisma.deletedRecord.update({
        where: { id: deleted.id },
        data: {
          recoverable: false,
          recoveredAt: new Date(),
          recoveredById: body.userId,
        },
      });

      // Log the restore
      await logRestore(deleted.entity, deleted.entityId, recordData, {
        userId: body.userId,
        userName: body.userName,
      });

      return NextResponse.json({
        success: true,
        data: {
          entity: deleted.entity,
          originalId: deleted.entityId,
          restoredId,
        },
        message: `Record restored successfully`,
      });
    } catch (restoreError) {
      console.error("Failed to restore record to database:", restoreError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RESTORE_FAILED",
            message: "Failed to restore record. There may be conflicts with existing data.",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to restore record:", error);
    return NextResponse.json(
      { success: false, error: { code: "RESTORE_ERROR", message: "Failed to restore record" } },
      { status: 500 }
    );
  }
}

// Remove relation fields and internal fields that shouldn't be included in create
function sanitizeRecordForRestore(
  data: Record<string, unknown>,
  relationFields: string[]
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip internal fields
    if (key === "id" || key === "_count") {
      continue;
    }

    // Skip relation fields
    if (relationFields.includes(key)) {
      continue;
    }

    // Handle dates
    if (key.endsWith("At") || key.endsWith("Date")) {
      if (value && typeof value === "string") {
        sanitized[key] = new Date(value);
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
