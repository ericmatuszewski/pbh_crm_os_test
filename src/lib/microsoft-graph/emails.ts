/**
 * Microsoft Graph Email Service
 * Handles email operations: list, get, send, sync
 */

import prisma from "@/lib/prisma";
import { GraphClient, createGraphClient } from "./client";
import {
  GraphMessage,
  GraphAttachment,
  GraphMailFolder,
  DeltaSyncResult,
  SendEmailRequest,
} from "./types";

export interface EmailSyncOptions {
  folders?: string[];     // Folder names to sync (default: Inbox, Sent Items)
  maxMessages?: number;   // Max messages per folder
  useDeltaSync?: boolean; // Use delta queries for incremental sync
}

export interface ProcessedEmail {
  graphMessageId: string;
  graphConversationId: string | null;
  direction: "INBOUND" | "OUTBOUND";
  subject: string;
  bodyPreview: string | null;
  bodyHtml: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  sentAt: Date | null;
  receivedAt: Date | null;
  hasAttachments: boolean;
}

/**
 * Email Service for Microsoft Graph
 */
export class EmailService {
  private client: GraphClient;
  private mailboxEmail: string;

  constructor(client: GraphClient, mailboxEmail: string) {
    this.client = client;
    this.mailboxEmail = mailboxEmail;
  }

  /**
   * Get mail folders for the mailbox
   */
  async getFolders(): Promise<GraphMailFolder[]> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/mailFolders`
      : "/me/mailFolders";

    return this.client.getAllPages<GraphMailFolder>(endpoint, {
      params: {
        $select: "id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount",
      },
    });
  }

  /**
   * Get messages from a folder
   */
  async getMessages(
    folderId: string,
    options?: { top?: number; skip?: number; filter?: string }
  ): Promise<GraphMessage[]> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/mailFolders/${folderId}/messages`
      : `/me/mailFolders/${folderId}/messages`;

    const params: Record<string, string> = {
      $select: "id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,hasAttachments,sentDateTime,receivedDateTime,isRead,isDraft,internetMessageId,parentFolderId",
      $orderby: "receivedDateTime desc",
    };

    if (options?.top) params.$top = options.top.toString();
    if (options?.skip) params.$skip = options.skip.toString();
    if (options?.filter) params.$filter = options.filter;

    return this.client.getAllPages<GraphMessage>(endpoint, { params });
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string): Promise<GraphMessage> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/messages/${messageId}`
      : `/me/messages/${messageId}`;

    return this.client.request<GraphMessage>(endpoint, {
      params: {
        $select: "id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,hasAttachments,sentDateTime,receivedDateTime,isRead,isDraft,internetMessageId,parentFolderId",
      },
    });
  }

  /**
   * Get message attachments
   */
  async getAttachments(messageId: string): Promise<GraphAttachment[]> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/messages/${messageId}/attachments`
      : `/me/messages/${messageId}/attachments`;

    return this.client.getAllPages<GraphAttachment>(endpoint);
  }

  /**
   * Download attachment content
   */
  async getAttachmentContent(messageId: string, attachmentId: string): Promise<GraphAttachment> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/messages/${messageId}/attachments/${attachmentId}`
      : `/me/messages/${messageId}/attachments/${attachmentId}`;

    return this.client.request<GraphAttachment>(endpoint, {
      params: { $select: "id,name,contentType,size,contentBytes" },
    });
  }

  /**
   * Perform delta sync for incremental email updates
   */
  async deltaSync(folderId: string, deltaToken?: string): Promise<DeltaSyncResult> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/mailFolders/${folderId}/messages/delta`
      : `/me/mailFolders/${folderId}/messages/delta`;

    const url = deltaToken || endpoint;

    const result = await this.client.deltaQuery<GraphMessage>(url, deltaToken);

    return {
      messages: result.value,
      deletedIds: result.deletedIds,
      deltaToken: result.deltaLink,
    };
  }

  /**
   * Send an email
   */
  async sendEmail(request: SendEmailRequest): Promise<void> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/sendMail`
      : "/me/sendMail";

    const message = {
      subject: request.subject,
      body: {
        contentType: request.bodyType === "html" ? "HTML" : "Text",
        content: request.body,
      },
      toRecipients: request.toRecipients.map((email) => ({
        emailAddress: { address: email },
      })),
      ccRecipients: request.ccRecipients?.map((email) => ({
        emailAddress: { address: email },
      })),
      bccRecipients: request.bccRecipients?.map((email) => ({
        emailAddress: { address: email },
      })),
      attachments: request.attachments?.map((att) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.name,
        contentType: att.contentType,
        contentBytes: att.contentBytes,
      })),
    };

    await this.client.request(endpoint, {
      method: "POST",
      body: {
        message,
        saveToSentItems: request.saveToSentItems !== false,
      },
    });
  }

  /**
   * Reply to an email
   */
  async replyToEmail(
    messageId: string,
    body: string,
    bodyType: "text" | "html" = "html",
    replyAll: boolean = false
  ): Promise<void> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/messages/${messageId}/${replyAll ? "replyAll" : "reply"}`
      : `/me/messages/${messageId}/${replyAll ? "replyAll" : "reply"}`;

    await this.client.request(endpoint, {
      method: "POST",
      body: {
        comment: body,
        // Note: Graph API reply uses 'comment' which is plain text
        // For HTML, you'd need to create a reply draft and modify it
      },
    });
  }

  /**
   * Forward an email
   */
  async forwardEmail(
    messageId: string,
    toRecipients: string[],
    comment?: string
  ): Promise<void> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/messages/${messageId}/forward`
      : `/me/messages/${messageId}/forward`;

    await this.client.request(endpoint, {
      method: "POST",
      body: {
        comment,
        toRecipients: toRecipients.map((email) => ({
          emailAddress: { address: email },
        })),
      },
    });
  }

  /**
   * Mark email as read/unread
   */
  async markAsRead(messageId: string, isRead: boolean = true): Promise<void> {
    const endpoint = this.mailboxEmail
      ? `/users/${this.mailboxEmail}/messages/${messageId}`
      : `/me/messages/${messageId}`;

    await this.client.request(endpoint, {
      method: "PATCH",
      body: { isRead },
    });
  }

  /**
   * Process a Graph message into our format
   */
  static processMessage(message: GraphMessage, mailboxEmail: string): ProcessedEmail {
    const fromEmail = message.from?.emailAddress?.address || "";
    const isOutbound = fromEmail.toLowerCase() === mailboxEmail.toLowerCase();

    return {
      graphMessageId: message.id,
      graphConversationId: message.conversationId || null,
      direction: isOutbound ? "OUTBOUND" : "INBOUND",
      subject: message.subject,
      bodyPreview: message.bodyPreview || null,
      bodyHtml: message.body?.contentType === "html" ? message.body.content : null,
      fromEmail,
      fromName: message.from?.emailAddress?.name || null,
      toEmails: message.toRecipients?.map((r) => r.emailAddress.address) || [],
      ccEmails: message.ccRecipients?.map((r) => r.emailAddress.address) || [],
      sentAt: message.sentDateTime ? new Date(message.sentDateTime) : null,
      receivedAt: message.receivedDateTime ? new Date(message.receivedDateTime) : null,
      hasAttachments: message.hasAttachments,
    };
  }
}

/**
 * Create an email service for a mailbox
 */
export async function createEmailService(mailboxId: string): Promise<EmailService> {
  const mailbox = await prisma.microsoftMailbox.findUnique({
    where: { id: mailboxId },
    select: { credentialId: true, mailboxEmail: true },
  });

  if (!mailbox) {
    throw new Error("Mailbox not found");
  }

  const client = createGraphClient(mailbox.credentialId);
  return new EmailService(client, mailbox.mailboxEmail);
}

/**
 * Auto-link email to CRM records based on email addresses
 */
export async function autoLinkEmail(
  businessId: string,
  email: ProcessedEmail
): Promise<{ contactId?: string; companyId?: string; dealId?: string }> {
  const result: { contactId?: string; companyId?: string; dealId?: string } = {};

  // Collect all email addresses from the email
  const emailAddresses = [
    email.fromEmail,
    ...email.toEmails,
    ...email.ccEmails,
  ].filter((e) => e).map((e) => e.toLowerCase());

  // Find matching contact
  const contact = await prisma.contact.findFirst({
    where: {
      businessId,
      email: { in: emailAddresses, mode: "insensitive" },
    },
    select: { id: true, companyId: true },
  });

  if (contact) {
    result.contactId = contact.id;
    result.companyId = contact.companyId || undefined;

    // Find active deal for this contact
    const deal = await prisma.deal.findFirst({
      where: {
        businessId,
        contactId: contact.id,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (deal) {
      result.dealId = deal.id;
    }
  }

  return result;
}
