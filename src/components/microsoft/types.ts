// Shared types for Microsoft email integration components

export interface Mailbox {
  id: string;
  mailboxEmail: string;
  mailboxId: string | null;
  syncInbound: boolean;
  syncOutbound: boolean;
  syncFolders: string[];
  syncStatus: "ACTIVE" | "PAUSED" | "ERROR";
  lastSyncAt: string | null;
  _count?: {
    emails: number;
  };
}

export interface Email {
  id: string;
  graphMessageId: string;
  direction: "INBOUND" | "OUTBOUND";
  subject: string;
  bodyPreview: string | null;
  bodyHtml: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  sentAt: string | null;
  receivedAt: string | null;
  hasAttachments: boolean;
  isRead?: boolean;
  contactId: string | null;
  companyId: string | null;
  dealId: string | null;
  autoLinked: boolean;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  deal?: {
    id: string;
    title: string;
  } | null;
  attachments?: {
    id: string;
    name: string;
    contentType: string;
    size: number;
  }[];
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}
