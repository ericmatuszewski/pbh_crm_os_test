import prisma from "@/lib/prisma";
import { processRow, ProcessedRow } from "./validators";
import { checkDuplicate, DuplicateCheckResult } from "./duplicate-detector";
import { ImportResult, ImportError } from "@/types";

const BATCH_SIZE = 100;

export interface ImportOptions {
  skipDuplicates: boolean;
  updateDuplicates: boolean;
  defaultOwnerId?: string;
}

export interface ImportRowResult {
  rowNumber: number;
  action: "imported" | "skipped" | "updated" | "error";
  contactId?: string;
  error?: string;
}

async function getOrCreateCompany(companyName: string): Promise<string> {
  // Try to find existing company
  const existing = await prisma.company.findFirst({
    where: { name: { equals: companyName, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  // Create new company
  const newCompany = await prisma.company.create({
    data: { name: companyName },
    select: { id: true },
  });

  return newCompany.id;
}

async function getOrCreateTags(tagNames: string[]): Promise<string[]> {
  const tagIds: string[] = [];

  for (const tagName of tagNames) {
    const normalizedName = tagName.trim();
    if (!normalizedName) continue;

    let tag = await prisma.tag.findFirst({
      where: { name: { equals: normalizedName, mode: "insensitive" } },
      select: { id: true },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { name: normalizedName },
        select: { id: true },
      });
    }

    tagIds.push(tag.id);
  }

  return tagIds;
}

async function importSingleRow(
  processedRow: ProcessedRow,
  duplicateCheck: DuplicateCheckResult,
  options: ImportOptions
): Promise<ImportRowResult> {
  if (!processedRow.isValid || !processedRow.data) {
    return {
      rowNumber: processedRow.rowNumber,
      action: "error",
      error: processedRow.errors.join("; "),
    };
  }

  const data = processedRow.data;

  // Handle duplicates
  if (duplicateCheck.isDuplicate) {
    if (options.skipDuplicates && !options.updateDuplicates) {
      return {
        rowNumber: processedRow.rowNumber,
        action: "skipped",
        contactId: duplicateCheck.duplicateOf,
      };
    }

    if (options.updateDuplicates && duplicateCheck.duplicateOf) {
      // Update existing contact
      try {
        let companyId: string | undefined;
        if (data.companyName) {
          companyId = await getOrCreateCompany(data.companyName);
        }

        let tagIds: string[] = [];
        if (data.tags && data.tags.length > 0) {
          tagIds = await getOrCreateTags(data.tags);
        }

        await prisma.contact.update({
          where: { id: duplicateCheck.duplicateOf },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || null,
            phone: data.phone || null,
            title: data.title || null,
            companyId: companyId || undefined,
            status: (data.status as "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED" | "PARTNER") || undefined,
            source: data.source || undefined,
            tags: tagIds.length > 0 ? { set: tagIds.map((id) => ({ id })) } : undefined,
          },
        });

        return {
          rowNumber: processedRow.rowNumber,
          action: "updated",
          contactId: duplicateCheck.duplicateOf,
        };
      } catch (error) {
        return {
          rowNumber: processedRow.rowNumber,
          action: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  }

  // Create new contact
  try {
    let companyId: string | undefined;
    if (data.companyName) {
      companyId = await getOrCreateCompany(data.companyName);
    }

    let tagIds: string[] = [];
    if (data.tags && data.tags.length > 0) {
      tagIds = await getOrCreateTags(data.tags);
    }

    const contact = await prisma.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        title: data.title || null,
        companyId: companyId || null,
        status: (data.status as "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED" | "PARTNER") || "LEAD",
        source: data.source || "Import",
        ownerId: options.defaultOwnerId || null,
        tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
      select: { id: true },
    });

    return {
      rowNumber: processedRow.rowNumber,
      action: "imported",
      contactId: contact.id,
    };
  } catch (error) {
    return {
      rowNumber: processedRow.rowNumber,
      action: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function executeImport(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>,
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    updated: 0,
    errors: [],
  };

  // Process in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    // Process and validate each row
    const processedRows: ProcessedRow[] = batch.map((row, index) =>
      processRow(row, columnMapping, i + index + 1)
    );

    // Check duplicates for valid rows
    for (const processedRow of processedRows) {
      if (!processedRow.isValid || !processedRow.data) {
        result.errors.push({
          rowNumber: processedRow.rowNumber,
          message: processedRow.errors.join("; "),
        });
        continue;
      }

      const duplicateCheck = await checkDuplicate({
        email: processedRow.data.email,
        phone: processedRow.data.phone,
        firstName: processedRow.data.firstName,
        lastName: processedRow.data.lastName,
        companyName: processedRow.data.companyName,
      });

      const rowResult = await importSingleRow(processedRow, duplicateCheck, options);

      switch (rowResult.action) {
        case "imported":
          result.imported++;
          break;
        case "skipped":
          result.skipped++;
          break;
        case "updated":
          result.updated++;
          break;
        case "error":
          result.errors.push({
            rowNumber: rowResult.rowNumber,
            message: rowResult.error || "Unknown error",
          });
          break;
      }
    }
  }

  return result;
}
