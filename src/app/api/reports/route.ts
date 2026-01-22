import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const reports = await prisma.savedReport.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    console.error("Error fetching saved reports:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch reports" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, entity, filters, columns, sortField, sortDirection, isPublic, createdById } = body;

    if (!name || !entity) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and entity are required" } },
        { status: 400 }
      );
    }

    // Use provided createdById or a placeholder
    const userId = createdById || "system";

    const report = await prisma.savedReport.create({
      data: {
        name,
        description,
        entity,
        filters: filters || [],
        columns: columns || [],
        sortField,
        sortDirection,
        isPublic: isPublic || false,
        createdById: userId,
      },
    });

    return NextResponse.json({ success: true, data: report }, { status: 201 });
  } catch (error) {
    console.error("Error creating saved report:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create report" } },
      { status: 500 }
    );
  }
}
