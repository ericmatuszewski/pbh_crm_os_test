import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createExportRequest, updateExportProgress, completeExportRequest } from "@/lib/audit/logger";

// GET /api/audit/export - List export requests
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const requests = await prisma.dataExportRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error("Failed to fetch export requests:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch export requests" } },
      { status: 500 }
    );
  }
}

// POST /api/audit/export - Create a new data export request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.userEmail || !body.exportType) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId, userEmail, and exportType are required" } },
        { status: 400 }
      );
    }

    // Valid export types
    const validExportTypes = ["full", "contacts", "companies", "deals", "activity", "audit"];
    if (!validExportTypes.includes(body.exportType)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid export type" } },
        { status: 400 }
      );
    }

    // Create export request
    const requestId = await createExportRequest(body.userId, body.userEmail, body.exportType, {
      entity: body.entity,
      filters: body.filters,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    // In a real implementation, this would trigger a background job
    // For now, we'll simulate processing
    processExportRequest(requestId, body.exportType, body.entity);

    return NextResponse.json(
      {
        success: true,
        data: { requestId },
        message: "Export request created. You will receive a notification when it's ready.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create export request:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create export request" } },
      { status: 500 }
    );
  }
}

// Simulate processing an export request (in production, this would be a background job)
async function processExportRequest(requestId: string, exportType: string, entity?: string) {
  try {
    await updateExportProgress(requestId, 10, "processing");

    // Simulate gathering data
    let data: Record<string, unknown>[] = [];

    switch (exportType) {
      case "contacts":
        data = await prisma.contact.findMany({
          include: {
            company: { select: { name: true } },
            deals: { select: { id: true, title: true, value: true } },
          },
        });
        break;
      case "companies":
        data = await prisma.company.findMany({
          include: {
            contacts: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        });
        break;
      case "deals":
        data = await prisma.deal.findMany({
          include: {
            contact: { select: { firstName: true, lastName: true, email: true } },
            company: { select: { name: true } },
          },
        });
        break;
      case "activity":
        data = await prisma.activity.findMany({
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        break;
      case "audit":
        data = await prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        break;
      case "full":
        // Full export includes all user-related data
        const [contacts, companies, deals, activities] = await Promise.all([
          prisma.contact.findMany(),
          prisma.company.findMany(),
          prisma.deal.findMany(),
          prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 10000 }),
        ]);
        data = [
          { type: "contacts", records: contacts },
          { type: "companies", records: companies },
          { type: "deals", records: deals },
          { type: "activities", records: activities },
        ];
        break;
    }

    await updateExportProgress(requestId, 80, "processing");

    // In production, we'd upload to S3 and generate a signed URL
    // For now, we'll create a mock URL
    const jsonData = JSON.stringify(data, null, 2);
    const fileSize = new Blob([jsonData]).size;

    // Simulate file URL (in production this would be an S3 signed URL)
    const fileUrl = `/api/audit/export/${requestId}/download`;

    await completeExportRequest(requestId, fileUrl, fileSize, 24);
  } catch (error) {
    console.error("Export processing failed:", error);
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Export failed",
      },
    });
  }
}
