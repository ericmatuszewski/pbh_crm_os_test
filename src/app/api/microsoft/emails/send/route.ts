import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/business";
import { createEmailService } from "@/lib/microsoft-graph/emails";
import { z } from "zod";

const sendEmailSchema = z.object({
  mailboxId: z.string().min(1, "Mailbox is required"),
  to: z.array(z.string().email()).min(1, "At least one recipient required"),
  cc: z.array(z.string().email()).optional().default([]),
  bcc: z.array(z.string().email()).optional().default([]),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  bodyType: z.enum(["text", "html"]).default("html"),
  // For replies/forwards
  replyToMessageId: z.string().optional(),
  forwardMessageId: z.string().optional(),
  // Link to CRM records
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
});

// POST /api/microsoft/emails/send - Send email via Microsoft Graph
export async function POST(request: NextRequest) {
  try {
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = sendEmailSchema.parse(body);

    // Verify mailbox belongs to business
    const mailbox = await prisma.microsoftMailbox.findFirst({
      where: { id: data.mailboxId, businessId: business.id },
    });

    if (!mailbox) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Mailbox not found" } },
        { status: 404 }
      );
    }

    // Create email service
    const emailService = await createEmailService(mailbox.id);

    // Handle reply
    if (data.replyToMessageId) {
      await emailService.replyToEmail(
        data.replyToMessageId,
        data.body,
        data.bodyType,
        data.cc && data.cc.length > 0 // replyAll if CC recipients
      );
    }
    // Handle forward
    else if (data.forwardMessageId) {
      await emailService.forwardEmail(
        data.forwardMessageId,
        data.to,
        data.body
      );
    }
    // Send new email
    else {
      await emailService.sendEmail({
        toRecipients: data.to,
        ccRecipients: data.cc,
        bccRecipients: data.bcc,
        subject: data.subject,
        body: data.body,
        bodyType: data.bodyType,
        saveToSentItems: true,
      });
    }

    // Create a record in our database for tracking
    // Note: The actual email will be synced back from Sent Items folder
    const emailRecord = await prisma.email.create({
      data: {
        graphMessageId: `pending_${Date.now()}`, // Temporary ID until synced
        mailboxId: mailbox.id,
        businessId: business.id,
        direction: "OUTBOUND",
        subject: data.subject,
        bodyPreview: data.body.substring(0, 500),
        bodyHtml: data.bodyType === "html" ? data.body : null,
        fromEmail: mailbox.mailboxEmail,
        fromName: null,
        toEmails: data.to,
        ccEmails: data.cc || [],
        sentAt: new Date(),
        hasAttachments: false,
        contactId: data.contactId || null,
        companyId: data.companyId || null,
        dealId: data.dealId || null,
        autoLinked: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: emailRecord.id,
        message: "Email sent successfully",
      },
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SEND_ERROR", message: "Failed to send email" } },
      { status: 500 }
    );
  }
}
