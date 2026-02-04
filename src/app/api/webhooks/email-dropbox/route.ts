import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

interface ParsedEmail {
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: {
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }[];
  headers?: Record<string, string>;
  receivedAt: Date;
}

// Parse SendGrid Inbound Parse webhook
function parseSendGridEmail(body: FormData): ParsedEmail | null {
  const from = body.get("from") as string;
  const to = body.get("to") as string;
  const subject = body.get("subject") as string;
  const text = body.get("text") as string;
  const html = body.get("html") as string;
  const headers = body.get("headers") as string;

  if (!from || !subject) return null;

  // Extract email from "Name <email@domain.com>" format
  const fromMatch = from.match(/<([^>]+)>/) || [null, from];
  const fromEmail = fromMatch[1] || from;
  const fromName = from.replace(/<[^>]+>/, "").trim();

  // Parse headers for message ID
  let messageId: string | undefined;
  let inReplyTo: string | undefined;
  if (headers) {
    const messageIdMatch = headers.match(/Message-ID:\s*<([^>]+)>/i);
    const inReplyToMatch = headers.match(/In-Reply-To:\s*<([^>]+)>/i);
    messageId = messageIdMatch?.[1];
    inReplyTo = inReplyToMatch?.[1];
  }

  return {
    from: fromEmail,
    fromName: fromName || undefined,
    to: to ? to.split(",").map((e) => e.trim()) : [],
    subject,
    body: text || "",
    bodyHtml: html || undefined,
    messageId,
    inReplyTo,
    receivedAt: new Date(),
  };
}

// Parse Mailgun webhook
function parseMailgunEmail(payload: Record<string, unknown>): ParsedEmail | null {
  const eventData = payload["event-data"] as Record<string, unknown>;
  const message = eventData?.message as Record<string, unknown>;

  if (!message) return null;

  const headers = message.headers as Record<string, string>;

  return {
    from: headers?.from || "",
    to: (headers?.to || "").split(",").map((e) => e.trim()),
    subject: headers?.subject || "",
    body: (payload["body-plain"] as string) || "",
    bodyHtml: (payload["body-html"] as string) || undefined,
    messageId: headers?.["message-id"],
    inReplyTo: headers?.["in-reply-to"],
    receivedAt: new Date(),
  };
}

// Parse Postmark inbound webhook
function parsePostmarkEmail(payload: Record<string, unknown>): ParsedEmail | null {
  if (!payload.From || !payload.Subject) return null;

  return {
    from: payload.FromFull ? (payload.FromFull as { Email: string }).Email : (payload.From as string),
    fromName: payload.FromFull ? (payload.FromFull as { Name: string }).Name : undefined,
    to: payload.ToFull
      ? (payload.ToFull as { Email: string }[]).map((t) => t.Email)
      : [(payload.To as string)],
    cc: payload.CcFull
      ? (payload.CcFull as { Email: string }[]).map((c) => c.Email)
      : undefined,
    bcc: payload.BccFull
      ? (payload.BccFull as { Email: string }[]).map((b) => b.Email)
      : undefined,
    subject: payload.Subject as string,
    body: (payload.TextBody as string) || "",
    bodyHtml: (payload.HtmlBody as string) || undefined,
    messageId: payload.MessageID as string,
    inReplyTo: payload.Headers
      ? ((payload.Headers as { Name: string; Value: string }[]).find(
          (h) => h.Name.toLowerCase() === "in-reply-to"
        )?.Value)
      : undefined,
    attachments: payload.Attachments
      ? (payload.Attachments as { Name: string; ContentType: string; ContentLength: number }[]).map(
          (a) => ({
            filename: a.Name,
            contentType: a.ContentType,
            size: a.ContentLength,
          })
        )
      : undefined,
    receivedAt: payload.Date ? new Date(payload.Date as string) : new Date(),
  };
}

// Find contact by email address
async function findContactByEmail(email: string, businessId?: string) {
  return prisma.contact.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      ...(businessId && { businessId }),
    },
    include: {
      company: true,
    },
  });
}

// Find user by email address
async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
  });
}

// Verify webhook signature
function verifyWebhookSignature(
  request: NextRequest,
  body: string,
  provider: string
): boolean {
  switch (provider) {
    case "sendgrid": {
      // SendGrid doesn't require signature verification for basic parse
      // But can use OAuth verification if configured
      return true;
    }
    case "mailgun": {
      const timestamp = request.headers.get("x-mailgun-timestamp");
      const token = request.headers.get("x-mailgun-token");
      const signature = request.headers.get("x-mailgun-signature");
      const apiKey = process.env.MAILGUN_API_KEY;

      if (timestamp && token && signature && apiKey) {
        const hash = crypto
          .createHmac("sha256", apiKey)
          .update(timestamp + token)
          .digest("hex");
        return hash === signature;
      }
      return !apiKey; // Allow if not configured
    }
    case "postmark": {
      // Postmark uses basic auth, verified at server level
      return true;
    }
    default:
      return true;
  }
}

// POST /api/webhooks/email-dropbox - Handle inbound email webhooks
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Detect provider and parse email
    let email: ParsedEmail | null = null;
    let provider = "unknown";

    if (contentType.includes("multipart/form-data")) {
      // SendGrid Inbound Parse
      provider = "sendgrid";
      const formData = await request.formData();
      email = parseSendGridEmail(formData);
    } else {
      const body = await request.text();
      const payload = JSON.parse(body) as Record<string, unknown>;

      if (payload["event-data"]) {
        // Mailgun
        provider = "mailgun";
        email = parseMailgunEmail(payload);
      } else if (payload.MessageID || payload.FromFull) {
        // Postmark
        provider = "postmark";
        email = parsePostmarkEmail(payload);
      }

      // Verify signature
      if (!verifyWebhookSignature(request, body, provider)) {
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Could not parse email" },
        { status: 400 }
      );
    }

    // Try to find matching contact from sender email
    const contact = await findContactByEmail(email.from);

    // Try to find the CRM user who sent/received this
    // (from BCC means original sender was a CRM user)
    let crmUser = await findUserByEmail(email.from);

    // If no user found from sender, check recipients
    if (!crmUser && email.to.length > 0) {
      for (const toEmail of email.to) {
        crmUser = await findUserByEmail(toEmail);
        if (crmUser) break;
      }
    }

    // Determine direction
    const direction = crmUser && email.from === crmUser.email ? "OUTBOUND" : "INBOUND";

    // Create email log
    const emailLog = await prisma.emailLog.create({
      data: {
        subject: email.subject,
        body: email.body,
        fromEmail: email.from,
        fromName: email.fromName,
        toEmails: email.to,
        ccEmails: email.cc || [],
        bccEmails: email.bcc || [],
        status: "RECEIVED",
        direction,
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        provider,
        contactId: contact?.id,
        userId: crmUser?.id,
        businessId: contact?.businessId,
        receivedAt: email.receivedAt,
      },
    });

    // Create activity record for the email
    if (contact && crmUser) {
      await prisma.activity.create({
        data: {
          type: "EMAIL",
          title: `Email ${direction === "OUTBOUND" ? "sent" : "received"}: ${email.subject}`,
          description: email.body.substring(0, 500) + (email.body.length > 500 ? "..." : ""),
          userId: crmUser.id,
          contactId: contact.id,
          businessId: contact.businessId,
        },
      });
    }

    console.log(
      `Email dropbox: ${provider} - ${direction} - ${email.subject} - Contact: ${contact?.id || "unknown"}`
    );

    return NextResponse.json({
      success: true,
      emailLogId: emailLog.id,
      direction,
      contact: contact ? { id: contact.id, name: `${contact.firstName} ${contact.lastName}` } : null,
    });
  } catch (error) {
    console.error("Email dropbox webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Mailgun verification
  if (searchParams.has("mailgun")) {
    return new NextResponse("OK", { status: 200 });
  }

  return NextResponse.json({
    status: "ok",
    message: "Email dropbox webhook endpoint",
    supportedProviders: ["sendgrid", "mailgun", "postmark"],
    instructions: "Configure your email provider to forward BCC emails to this endpoint",
  });
}
