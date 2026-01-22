import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Process merge fields in a template
function processMergeFields(
  text: string,
  data: {
    contact?: { firstName?: string; lastName?: string; email?: string; title?: string };
    company?: { name?: string };
    deal?: { title?: string; value?: number };
    user?: { name?: string; email?: string };
  }
): string {
  let result = text;

  // Contact fields
  if (data.contact) {
    result = result.replace(/\{\{contact\.firstName\}\}/g, data.contact.firstName || "");
    result = result.replace(/\{\{contact\.lastName\}\}/g, data.contact.lastName || "");
    result = result.replace(/\{\{contact\.email\}\}/g, data.contact.email || "");
    result = result.replace(/\{\{contact\.title\}\}/g, data.contact.title || "");
    result = result.replace(/\{\{contact\.fullName\}\}/g,
      `${data.contact.firstName || ""} ${data.contact.lastName || ""}`.trim()
    );
  }

  // Company fields
  if (data.company) {
    result = result.replace(/\{\{company\.name\}\}/g, data.company.name || "");
  }

  // Deal fields
  if (data.deal) {
    result = result.replace(/\{\{deal\.title\}\}/g, data.deal.title || "");
    result = result.replace(/\{\{deal\.value\}\}/g,
      data.deal.value
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data.deal.value)
        : ""
    );
  }

  // User fields
  if (data.user) {
    result = result.replace(/\{\{user\.name\}\}/g, data.user.name || "");
    result = result.replace(/\{\{user\.email\}\}/g, data.user.email || "");
  }

  // Clean up any remaining unprocessed merge fields
  result = result.replace(/\{\{[^}]+\}\}/g, "");

  return result;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { contactId, dealId, userId } = body;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    // Fetch related data for merge fields
    const [contact, deal, user] = await Promise.all([
      contactId
        ? prisma.contact.findUnique({
            where: { id: contactId },
            include: { company: true },
          })
        : null,
      dealId
        ? prisma.deal.findUnique({
            where: { id: dealId },
          })
        : null,
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
          })
        : null,
    ]);

    const mergeData = {
      contact: contact
        ? {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || undefined,
            title: contact.title || undefined,
          }
        : undefined,
      company: contact?.company ? { name: contact.company.name } : undefined,
      deal: deal
        ? {
            title: deal.title,
            value: Number(deal.value),
          }
        : undefined,
      user: user
        ? {
            name: user.name || undefined,
            email: user.email || undefined,
          }
        : undefined,
    };

    const processedSubject = processMergeFields(template.subject, mergeData);
    const processedBody = processMergeFields(template.body, mergeData);

    return NextResponse.json({
      success: true,
      data: {
        subject: processedSubject,
        body: processedBody,
      },
    });
  } catch (error) {
    console.error("Error previewing email template:", error);
    return NextResponse.json(
      { success: false, error: { code: "PREVIEW_ERROR", message: "Failed to preview email template" } },
      { status: 500 }
    );
  }
}
