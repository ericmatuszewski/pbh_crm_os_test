import { NextRequest, NextResponse } from "next/server";
import { parseFile, suggestFieldMapping } from "@/lib/import";
import crypto from "crypto";

// In-memory storage for import sessions (in production, use Redis or database)
const importSessions = new Map<
  string,
  {
    id: string;
    fileName: string;
    columns: string[];
    rows: Record<string, string>[];
    rowCount: number;
    suggestedMapping: Record<string, string>;
    createdAt: Date;
  }
>();

// Clean up old sessions every hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, session] of importSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      importSessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILE", message: "No file uploaded" } },
        { status: 400 }
      );
    }

    // Check file size (10MB max)
    const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE || "10485760");
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FILE_TOO_LARGE", message: `File size exceeds ${maxSize / 1024 / 1024}MB limit` },
        },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const fileName = file.name.toLowerCase();
    const isValidType =
      allowedTypes.includes(file.type) ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls");

    if (!isValidType) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_FILE_TYPE", message: "Only CSV and Excel files are allowed" },
        },
        { status: 400 }
      );
    }

    // Parse the file
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseFile(buffer, file.name);

    if (parsed.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: { code: "EMPTY_FILE", message: "File contains no data" } },
        { status: 400 }
      );
    }

    // Generate import session ID
    const importId = crypto.randomUUID();

    // Get suggested column mapping
    const suggestedMapping = suggestFieldMapping(parsed.columns);

    // Store session
    importSessions.set(importId, {
      id: importId,
      fileName: file.name,
      columns: parsed.columns,
      rows: parsed.rows,
      rowCount: parsed.rowCount,
      suggestedMapping,
      createdAt: new Date(),
    });

    // Return preview (first 10 rows)
    const preview = parsed.rows.slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        importId,
        fileName: file.name,
        columns: parsed.columns,
        rowCount: parsed.rowCount,
        suggestedMapping,
        preview,
      },
    });
  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: error instanceof Error ? error.message : "Failed to parse file",
        },
      },
      { status: 500 }
    );
  }
}

// Export for use in other route handlers
export { importSessions };
