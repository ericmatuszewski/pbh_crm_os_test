import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createEmailService, autoLinkEmail, EmailService } from "@/lib/microsoft-graph/emails";

interface GraphNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: "created" | "updated" | "deleted";
  resource: string;
  resourceData?: {
    "@odata.type"?: string;
    "@odata.id"?: string;
    "@odata.etag"?: string;
    id?: string;
  };
  clientState?: string;
  tenantId?: string;
}

interface GraphNotificationPayload {
  value: GraphNotification[];
}

// GET /api/webhooks/microsoft/notifications - Validation endpoint for subscription
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const validationToken = searchParams.get("validationToken");

  if (validationToken) {
    // Microsoft Graph subscription validation
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ status: "ok" });
}

// POST /api/webhooks/microsoft/notifications - Handle notifications
export async function POST(request: NextRequest) {
  try {
    // Check for validation token (subscription creation)
    const searchParams = request.nextUrl.searchParams;
    const validationToken = searchParams.get("validationToken");

    if (validationToken) {
      return new NextResponse(validationToken, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const payload: GraphNotificationPayload = await request.json();

    // Process each notification
    for (const notification of payload.value) {
      await processNotification(notification);
    }

    // Microsoft requires 202 Accepted response
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Still return 202 to prevent Microsoft from retrying
    return new NextResponse(null, { status: 202 });
  }
}

async function processNotification(notification: GraphNotification): Promise<void> {
  try {
    // Find mailbox by subscription ID
    const mailbox = await prisma.microsoftMailbox.findFirst({
      where: { webhookSubscriptionId: notification.subscriptionId },
    });

    if (!mailbox) {
      console.warn(`No mailbox found for subscription ${notification.subscriptionId}`);
      return;
    }

    // Extract message ID from resource path
    // Resource format: Users/{userId}/Messages/{messageId}
    const resourceMatch = notification.resource.match(/Messages\/([^/]+)/i);
    const messageId = resourceMatch?.[1] || notification.resourceData?.id;

    if (!messageId) {
      console.warn("Could not extract message ID from notification");
      return;
    }

    switch (notification.changeType) {
      case "created":
        await handleNewMessage(mailbox.id, mailbox.mailboxEmail, mailbox.businessId, messageId);
        break;

      case "updated":
        // Could handle read status changes, etc.
        break;

      case "deleted":
        await handleDeletedMessage(messageId);
        break;
    }
  } catch (error) {
    console.error("Failed to process notification:", error);
  }
}

async function handleNewMessage(
  mailboxId: string,
  mailboxEmail: string,
  businessId: string,
  messageId: string
): Promise<void> {
  // Check if already synced
  const existing = await prisma.email.findFirst({
    where: { graphMessageId: messageId },
  });

  if (existing) {
    return;
  }

  try {
    // Fetch the message from Graph
    const emailService = await createEmailService(mailboxId);
    const message = await emailService.getMessage(messageId);

    // Process and save
    const processed = EmailService.processMessage(message, mailboxEmail);
    const links = await autoLinkEmail(businessId, processed);

    await prisma.email.create({
      data: {
        graphMessageId: processed.graphMessageId,
        graphConversationId: processed.graphConversationId,
        mailboxId,
        businessId,
        direction: processed.direction,
        subject: processed.subject,
        bodyPreview: processed.bodyPreview,
        bodyHtml: processed.bodyHtml,
        fromEmail: processed.fromEmail,
        fromName: processed.fromName,
        toEmails: processed.toEmails,
        ccEmails: processed.ccEmails,
        sentAt: processed.sentAt,
        receivedAt: processed.receivedAt,
        hasAttachments: processed.hasAttachments,
        contactId: links.contactId,
        companyId: links.companyId,
        dealId: links.dealId,
        autoLinked: !!(links.contactId || links.companyId || links.dealId),
      },
    });
  } catch (error) {
    console.error(`Failed to sync message ${messageId}:`, error);
  }
}

async function handleDeletedMessage(messageId: string): Promise<void> {
  // Optionally delete from our database
  // Or just mark as deleted
  await prisma.email.deleteMany({
    where: { graphMessageId: messageId },
  });
}
