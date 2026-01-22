import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch email templates" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subject, body: templateBody, category, isActive, createdById } = body;

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name, subject, and body are required" } },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body: templateBody,
        category,
        isActive: isActive ?? true,
        createdById,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error("Error creating email template:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create email template" } },
      { status: 500 }
    );
  }
}
