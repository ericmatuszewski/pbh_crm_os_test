/**
 * Microsoft Graph API Types
 */

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}

export interface MicrosoftAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

export interface GraphMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: "text" | "html";
    content: string;
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  ccRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  hasAttachments: boolean;
  sentDateTime: string;
  receivedDateTime: string;
  isRead: boolean;
  isDraft: boolean;
  internetMessageId: string;
  parentFolderId: string;
}

export interface GraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentBytes?: string;
}

export interface GraphMailFolder {
  id: string;
  displayName: string;
  parentFolderId: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

export interface GraphSubscription {
  id: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState: string;
}

export interface DeltaSyncResult {
  messages: GraphMessage[];
  deletedIds: string[];
  deltaToken: string;
}

export interface SendEmailRequest {
  subject: string;
  body: string;
  bodyType: "text" | "html";
  toRecipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  replyTo?: string;
  attachments?: Array<{
    name: string;
    contentType: string;
    contentBytes: string; // Base64 encoded
  }>;
  saveToSentItems?: boolean;
}

export interface GraphWebhookNotification {
  changeType: "created" | "updated" | "deleted";
  clientState: string;
  resource: string;
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  tenantId: string;
  resourceData: {
    id: string;
    "@odata.type": string;
    "@odata.id": string;
    "@odata.etag": string;
  };
}

// Scopes required for email operations
export const EMAIL_SCOPES = [
  "Mail.Read",
  "Mail.ReadWrite",
  "Mail.Send",
  "User.Read",
  "offline_access",
] as const;

// Scopes for shared mailbox access (requires admin consent)
export const SHARED_MAILBOX_SCOPES = [
  "Mail.Read.Shared",
  "Mail.ReadWrite.Shared",
  "Mail.Send.Shared",
  ...EMAIL_SCOPES,
] as const;
