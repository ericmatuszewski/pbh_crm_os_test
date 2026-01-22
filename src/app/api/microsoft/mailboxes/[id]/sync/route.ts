import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/business";
import { createEmailService, autoLinkEmail, EmailService } from "@/lib/microsoft-graph/emails";

// POST /api/microsoft/mailboxes/[id]/sync - Trigger manual sync
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    // Get mailbox with credential
    const mailbox = await prisma.microsoftMailbox.findFirst({
      where: { id, businessId: business.id },
    });

    if (!mailbox) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Mailbox not found" } },
        { status: 404 }
      );
    }

    // Create email service
    const emailService = await createEmailService(mailbox.id);

    // Get folders to sync
    const folders = await emailService.getFolders();
    const foldersToSync = folders.filter((f) =>
      mailbox.syncFolders.some(
        (sf) => sf.toLowerCase() === f.displayName.toLowerCase()
      )
    );

    let importedCount = 0;
    let skippedCount = 0;

    // Sync each folder
    for (const folder of foldersToSync) {
      // Use delta sync if available
      const deltaToken = mailbox.deltaSyncToken;

      try {
        if (deltaToken) {
          // Incremental sync
          const delta = await emailService.deltaSync(folder.id, deltaToken);

          for (const message of delta.messages) {
            const result = await syncSingleEmail(
              emailService,
              message,
              mailbox.id,
              mailbox.mailboxEmail,
              business.id
            );
            if (result.imported) importedCount++;
            else skippedCount++;
          }

          // Update delta token
          await prisma.microsoftMailbox.update({
            where: { id: mailbox.id },
            data: { deltaSyncToken: delta.deltaToken },
          });
        } else {
          // Full sync - get recent messages
          const messages = await emailService.getMessages(folder.id, { top: 100 });

          for (const message of messages) {
            const result = await syncSingleEmail(
              emailService,
              message,
              mailbox.id,
              mailbox.mailboxEmail,
              business.id
            );
            if (result.imported) importedCount++;
            else skippedCount++;
          }
        }
      } catch (folderError) {
        console.error(`Error syncing folder ${folder.displayName}:`, folderError);
      }
    }

    // Update last sync time
    await prisma.microsoftMailbox.update({
      where: { id: mailbox.id },
      data: { lastSyncAt: new Date(), syncStatus: "ACTIVE" },
    });

    return NextResponse.json({
      success: true,
      data: {
        imported: importedCount,
        skipped: skippedCount,
        folders: foldersToSync.map((f) => f.displayName),
      },
    });
  } catch (error) {
    console.error("Failed to sync mailbox:", error);

    // Update mailbox status to error
    const { id } = await params;
    await prisma.microsoftMailbox.update({
      where: { id },
      data: { syncStatus: "ERROR" },
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: { code: "SYNC_ERROR", message: "Failed to sync mailbox" } },
      { status: 500 }
    );
  }
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject: string;
  bodyPreview?: string;
  body?: { content: string; contentType: string };
  from?: { emailAddress: { address: string; name?: string } };
  toRecipients?: { emailAddress: { address: string } }[];
  ccRecipients?: { emailAddress: { address: string } }[];
  hasAttachments: boolean;
  sentDateTime?: string;
  receivedDateTime?: string;
}

async function syncSingleEmail(
  emailService: EmailService,
  message: GraphMessage,
  mailboxId: string,
  mailboxEmail: string,
  businessId: string
): Promise<{ imported: boolean }> {
  // Check if email already exists
  const existing = await prisma.email.findFirst({
    where: { graphMessageId: message.id },
  });

  if (existing) {
    return { imported: false };
  }

  // Process the email
  const processed = EmailService.processMessage(message as Parameters<typeof EmailService.processMessage>[0], mailboxEmail);

  // Auto-link to CRM records
  const links = await autoLinkEmail(businessId, processed);

  // Save to database
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

  return { imported: true };
}
