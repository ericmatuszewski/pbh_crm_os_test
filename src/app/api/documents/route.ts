import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, getFileType, validateFile } from "@/lib/storage";

// GET /api/documents - List documents
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const fileType = searchParams.get("fileType");
    const status = searchParams.get("status");
    const uploadedById = searchParams.get("uploadedById");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (fileType) where.fileType = fileType;
    if (status) where.status = status;
    if (uploadedById) where.uploadedById = uploadedById;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { filename: { contains: search, mode: "insensitive" } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true, image: true },
          },
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: documents,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch documents" } },
      { status: 500 }
    );
  }
}

// POST /api/documents - Upload a document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const entityType = formData.get("entityType") as string;
    const entityId = formData.get("entityId") as string;
    const userId = formData.get("userId") as string;
    const tags = formData.get("tags") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "File is required" } },
        { status: 400 }
      );
    }

    if (!name || !entityType || !entityId || !userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name, entityType, entityId, and userId are required" } },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile({ size: file.size, type: file.type });
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validation.error } },
        { status: 400 }
      );
    }

    // Upload file
    const storage = getStorageProvider();
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload(buffer, file.name, file.type);

    // Determine file type
    const fileType = getFileType(file.type);

    // Create document record
    const document = await prisma.document.create({
      data: {
        name,
        description,
        filename: file.name,
        mimeType: file.type,
        size: result.size,
        fileType,
        storageKey: result.storageKey,
        storageProvider: process.env.STORAGE_PROVIDER || "local",
        url: result.url,
        entityType,
        entityId,
        status: "ACTIVE",
        tags: tags ? JSON.parse(tags) : [],
        currentVersion: 1,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Create initial version record
    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        filename: file.name,
        mimeType: file.type,
        size: result.size,
        storageKey: result.storageKey,
        url: result.url,
        changeNote: "Initial upload",
        uploadedById: userId,
      },
    });

    return NextResponse.json({ success: true, data: document }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload document:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload document" } },
      { status: 500 }
    );
  }
}
