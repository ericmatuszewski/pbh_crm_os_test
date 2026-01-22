import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api/keys";

// GET /api/api-keys - List API keys
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        allowedIps: true,
        rateLimit: true,
        lastUsedAt: true,
        usageCount: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: apiKeys });
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch API keys" } },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - Create API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name and userId are required" } },
        { status: 400 }
      );
    }

    // Generate new API key
    const { key, prefix, hash } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        name: body.name,
        description: body.description,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: body.scopes || ["read"],
        allowedIps: body.allowedIps || [],
        rateLimit: body.rateLimit || 1000,
        rateLimitWindow: body.rateLimitWindow || 3600,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        userId: body.userId,
        organizationId: body.organizationId,
      },
    });

    // Return the key only this once
    return NextResponse.json(
      {
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          description: apiKey.description,
          key, // The actual key - shown only once!
          keyPrefix: apiKey.keyPrefix,
          scopes: apiKey.scopes,
          allowedIps: apiKey.allowedIps,
          rateLimit: apiKey.rateLimit,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create API key" } },
      { status: 500 }
    );
  }
}

// PUT /api/api-keys - Update API key
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.scopes !== undefined) updateData.scopes = body.scopes;
    if (body.allowedIps !== undefined) updateData.allowedIps = body.allowedIps;
    if (body.rateLimit !== undefined) updateData.rateLimit = body.rateLimit;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const apiKey = await prisma.apiKey.update({
      where: { id: body.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        allowedIps: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: apiKey });
  } catch (error) {
    console.error("Failed to update API key:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update API key" } },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys - Delete (revoke) API key
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    await prisma.apiKey.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: { id: body.id } });
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete API key" } },
      { status: 500 }
    );
  }
}
