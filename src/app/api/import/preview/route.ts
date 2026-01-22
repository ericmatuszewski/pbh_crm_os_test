import { NextRequest, NextResponse } from "next/server";
import { importSessions } from "../route";
import { processRow, checkDuplicate } from "@/lib/import";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { importId, columnMapping } = body;

    if (!importId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_ID", message: "Import ID is required" } },
        { status: 400 }
      );
    }

    if (!columnMapping || typeof columnMapping !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_MAPPING", message: "Column mapping is required" } },
        { status: 400 }
      );
    }

    const session = importSessions.get(importId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "SESSION_NOT_FOUND", message: "Import session not found or expired" } },
        { status: 404 }
      );
    }

    // Validate required fields are mapped
    if (!Object.values(columnMapping).includes("firstName")) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_MAPPING", message: "First name column must be mapped" } },
        { status: 400 }
      );
    }
    if (!Object.values(columnMapping).includes("lastName")) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_MAPPING", message: "Last name column must be mapped" } },
        { status: 400 }
      );
    }

    // Process and validate all rows
    const validRows: Array<{
      rowNumber: number;
      data: Record<string, unknown>;
    }> = [];
    const invalidRows: Array<{
      rowNumber: number;
      data: Record<string, string>;
      errors: string[];
    }> = [];
    const duplicates: Array<{
      rowNumber: number;
      data: Record<string, unknown>;
      duplicateOf: string;
      matchType: string;
    }> = [];

    // Process in parallel with limit
    const batchSize = 50;
    for (let i = 0; i < session.rows.length; i += batchSize) {
      const batch = session.rows.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (row, index) => {
          const rowNumber = i + index + 1;
          const processed = processRow(row, columnMapping, rowNumber);

          if (!processed.isValid || !processed.data) {
            invalidRows.push({
              rowNumber,
              data: row,
              errors: processed.errors,
            });
            return;
          }

          // Check for duplicates
          const duplicateCheck = await checkDuplicate({
            email: processed.data.email,
            phone: processed.data.phone,
            firstName: processed.data.firstName,
            lastName: processed.data.lastName,
            companyName: processed.data.companyName,
          });

          if (duplicateCheck.isDuplicate) {
            duplicates.push({
              rowNumber,
              data: processed.data,
              duplicateOf: duplicateCheck.duplicateOf!,
              matchType: duplicateCheck.matchType!,
            });
          } else {
            validRows.push({
              rowNumber,
              data: processed.data,
            });
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: session.rowCount,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        duplicateCount: duplicates.length,
        validRows: validRows.slice(0, 20), // Return first 20 for preview
        invalidRows: invalidRows.slice(0, 20),
        duplicates: duplicates.slice(0, 20),
      },
    });
  } catch (error) {
    console.error("Error previewing import:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PREVIEW_ERROR",
          message: error instanceof Error ? error.message : "Failed to preview import",
        },
      },
      { status: 500 }
    );
  }
}
