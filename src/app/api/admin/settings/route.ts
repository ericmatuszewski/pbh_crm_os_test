import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/admin/settings - Get system settings
export async function GET() {
  try {
    // Get or create the singleton settings record
    let settings = await prisma.systemSettings.findUnique({
      where: { id: "system" },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.systemSettings.create({
        data: { id: "system" },
      });
    }

    // Mask sensitive fields
    const safeSettings = {
      ...settings,
      smtpPassword: settings.smtpPassword ? "••••••••" : null,
      microsoftClientSecret: settings.microsoftClientSecret ? "••••••••" : null,
      s3AccessKey: settings.s3AccessKey ? "••••••••" : null,
      s3SecretKey: settings.s3SecretKey ? "••••••••" : null,
    };

    return NextResponse.json({
      success: true,
      data: safeSettings,
    });
  } catch (error) {
    console.error("Failed to fetch system settings:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch settings" } },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update system settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const { id, createdAt, updatedAt, ...updateData } = body;

    // Handle password fields - don't update if they're masked
    if (updateData.smtpPassword === "••••••••") {
      delete updateData.smtpPassword;
    }
    if (updateData.microsoftClientSecret === "••••••••") {
      delete updateData.microsoftClientSecret;
    }
    if (updateData.s3AccessKey === "••••••••") {
      delete updateData.s3AccessKey;
    }
    if (updateData.s3SecretKey === "••••••••") {
      delete updateData.s3SecretKey;
    }

    // Update or create settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: "system" },
      create: {
        id: "system",
        ...updateData,
      },
      update: updateData,
    });

    // Mask sensitive fields in response
    const safeSettings = {
      ...settings,
      smtpPassword: settings.smtpPassword ? "••••••••" : null,
      microsoftClientSecret: settings.microsoftClientSecret ? "••••••••" : null,
      s3AccessKey: settings.s3AccessKey ? "••••••••" : null,
      s3SecretKey: settings.s3SecretKey ? "••••••••" : null,
    };

    return NextResponse.json({
      success: true,
      data: safeSettings,
    });
  } catch (error) {
    console.error("Failed to update system settings:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to update settings" } },
      { status: 500 }
    );
  }
}
