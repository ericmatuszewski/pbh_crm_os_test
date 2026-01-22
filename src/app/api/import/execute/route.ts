import { NextRequest, NextResponse } from "next/server";
import { importSessions } from "../route";
import { executeImport } from "@/lib/import";
import { executeImportSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = executeImportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validationResult.error.errors.map((e) => e.message).join(", "),
          },
        },
        { status: 400 }
      );
    }

    const { importId, columnMapping, skipDuplicates, updateDuplicates } = validationResult.data;

    // Get session
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

    // Execute import
    const result = await executeImport(session.rows, columnMapping, {
      skipDuplicates,
      updateDuplicates,
    });

    // Clean up session after successful import
    importSessions.delete(importId);

    return NextResponse.json({
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        updated: result.updated,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 50), // Return first 50 errors
        totalProcessed: result.imported + result.skipped + result.updated + result.errors.length,
      },
    });
  } catch (error) {
    console.error("Error executing import:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "IMPORT_ERROR",
          message: error instanceof Error ? error.message : "Failed to execute import",
        },
      },
      { status: 500 }
    );
  }
}
