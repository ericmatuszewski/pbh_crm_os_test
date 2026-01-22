import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, getFileType, validateFile } from "@/lib/storage";

// GET /api/documents/[id] - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        versions: {
          orderBy: { version: "desc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error("Failed to fetch document:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch document" } },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update document metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const existing = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.tags !== undefined) updateData.tags = body.tags;

    const document = await prisma.document.update({
      where: { id: params.id },
      data: updateData,
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error("Failed to update document:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update document" } },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: { versions: true },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    // Delete files from storage
    const storage = getStorageProvider();

    // Delete all version files
    for (const version of document.versions) {
      try {
        await storage.delete(version.storageKey);
      } catch (e) {
        console.error(`Failed to delete version file ${version.storageKey}:`, e);
      }
    }

    // Delete main file if different from versions
    if (!document.versions.some((v) => v.storageKey === document.storageKey)) {
      try {
        await storage.delete(document.storageKey);
      } catch (e) {
        console.error(`Failed to delete main file ${document.storageKey}:`, e);
      }
    }

    // Delete document record (cascade will delete versions)
    await prisma.document.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete document" } },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Upload new version
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const changeNote = formData.get("changeNote") as string | null;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "File and userId are required" } },
        { status: 400 }
      );
    }

    const existing = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
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

    // Upload new version
    const storage = getStorageProvider();
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload(buffer, file.name, file.type);

    const newVersion = existing.currentVersion + 1;

    // Create version record
    await prisma.documentVersion.create({
      data: {
        documentId: params.id,
        version: newVersion,
        filename: file.name,
        mimeType: file.type,
        size: result.size,
        storageKey: result.storageKey,
        url: result.url,
        changeNote,
        uploadedById: userId,
      },
    });

    // Update document with new current version
    const document = await prisma.document.update({
      where: { id: params.id },
      data: {
        currentVersion: newVersion,
        filename: file.name,
        mimeType: file.type,
        size: result.size,
        fileType: getFileType(file.type),
        storageKey: result.storageKey,
        url: result.url,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        versions: {
          orderBy: { version: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error("Failed to upload new version:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload new version" } },
      { status: 500 }
    );
  }
}
