import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Supported e-signature providers
type SignatureProvider = "docusign" | "hellosign" | "pandadoc";

interface SignatureEvent {
  provider: SignatureProvider;
  eventType: string;
  envelopeId: string;
  documentId?: string;
  signerEmail?: string;
  signerName?: string;
  signedAt?: string;
  status: string;
  rawPayload: Record<string, unknown>;
}

// Parse DocuSign webhook payload
function parseDocuSignEvent(payload: Record<string, unknown>): SignatureEvent | null {
  const envelope = payload.envelopeId || (payload.data as Record<string, unknown>)?.envelopeId;
  const eventType = payload.event || payload.status;

  if (!envelope || !eventType) return null;

  const recipients = (payload.recipients as Record<string, unknown[]>)?.signers?.[0] as Record<string, string> | undefined;

  return {
    provider: "docusign",
    eventType: String(eventType),
    envelopeId: String(envelope),
    signerEmail: recipients?.email,
    signerName: recipients?.name,
    signedAt: payload.completedDateTime as string | undefined,
    status: mapDocuSignStatus(String(eventType)),
    rawPayload: payload,
  };
}

// Parse HelloSign webhook payload
function parseHelloSignEvent(payload: Record<string, unknown>): SignatureEvent | null {
  const event = payload.event as Record<string, unknown> | undefined;
  const signatureRequest = payload.signature_request as Record<string, unknown> | undefined;

  if (!event || !signatureRequest) return null;

  const signatures = signatureRequest.signatures as Record<string, string>[] | undefined;
  const firstSigner = signatures?.[0];

  return {
    provider: "hellosign",
    eventType: String(event.event_type),
    envelopeId: String(signatureRequest.signature_request_id),
    signerEmail: firstSigner?.signer_email_address,
    signerName: firstSigner?.signer_name,
    signedAt: firstSigner?.signed_at,
    status: mapHelloSignStatus(String(event.event_type)),
    rawPayload: payload,
  };
}

// Parse PandaDoc webhook payload
function parsePandaDocEvent(payload: Record<string, unknown>): SignatureEvent | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const eventType = payload.event;

  if (!data || !eventType) return null;

  const recipients = data.recipients as Record<string, string>[] | undefined;
  const firstRecipient = recipients?.[0];

  return {
    provider: "pandadoc",
    eventType: String(eventType),
    envelopeId: String(data.id),
    documentId: String(data.id),
    signerEmail: firstRecipient?.email,
    signerName: `${firstRecipient?.first_name || ""} ${firstRecipient?.last_name || ""}`.trim(),
    signedAt: data.date_completed as string | undefined,
    status: mapPandaDocStatus(String(eventType)),
    rawPayload: payload,
  };
}

function mapDocuSignStatus(eventType: string): string {
  const statusMap: Record<string, string> = {
    "envelope-sent": "SENT",
    "envelope-delivered": "DELIVERED",
    "envelope-completed": "SIGNED",
    "envelope-declined": "DECLINED",
    "envelope-voided": "VOIDED",
    "recipient-sent": "SENT",
    "recipient-delivered": "VIEWED",
    "recipient-completed": "SIGNED",
    "recipient-declined": "DECLINED",
  };
  return statusMap[eventType.toLowerCase()] || "UNKNOWN";
}

function mapHelloSignStatus(eventType: string): string {
  const statusMap: Record<string, string> = {
    "signature_request_sent": "SENT",
    "signature_request_viewed": "VIEWED",
    "signature_request_signed": "SIGNED",
    "signature_request_declined": "DECLINED",
    "signature_request_all_signed": "COMPLETED",
    "signature_request_canceled": "VOIDED",
  };
  return statusMap[eventType] || "UNKNOWN";
}

function mapPandaDocStatus(eventType: string): string {
  const statusMap: Record<string, string> = {
    "document_state_changed": "UPDATED",
    "document_sent": "SENT",
    "document_viewed": "VIEWED",
    "document_completed": "SIGNED",
    "document_voided": "VOIDED",
  };
  return statusMap[eventType] || "UNKNOWN";
}

// Verify webhook signature (example for HelloSign)
function verifyHelloSignSignature(payload: string, signature: string, apiKey: string): boolean {
  const hash = crypto.createHmac("sha256", apiKey).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// POST /api/webhooks/signatures - Handle e-signature provider webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload = JSON.parse(body) as Record<string, unknown>;

    // Determine provider from headers or payload structure
    const provider = detectProvider(request, payload);

    if (!provider) {
      console.error("Unknown signature provider");
      return NextResponse.json({ success: false, error: "Unknown provider" }, { status: 400 });
    }

    // Verify webhook signature if configured
    const isValid = await verifyWebhookSignature(request, body, provider);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    // Parse the event based on provider
    let event: SignatureEvent | null = null;

    switch (provider) {
      case "docusign":
        event = parseDocuSignEvent(payload);
        break;
      case "hellosign":
        event = parseHelloSignEvent(payload);
        break;
      case "pandadoc":
        event = parsePandaDocEvent(payload);
        break;
    }

    if (!event) {
      console.error("Failed to parse signature event");
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    // Find the quote associated with this signature request
    const quote = await prisma.quote.findFirst({
      where: {
        signatureRequestId: event.envelopeId,
      },
      include: {
        contact: true,
        deal: true,
      },
    });

    if (!quote) {
      // No matching quote - might be a test webhook or different system
      return NextResponse.json({ success: true, message: "No matching quote" });
    }

    // Update quote based on signature status
    const updateData: Record<string, unknown> = {
      signatureStatus: event.status,
      signatureUpdatedAt: new Date(),
    };

    if (event.status === "SIGNED" || event.status === "COMPLETED") {
      updateData.status = "ACCEPTED";
      updateData.signedAt = event.signedAt ? new Date(event.signedAt) : new Date();
      updateData.signedByEmail = event.signerEmail;
      updateData.signedByName = event.signerName;
    } else if (event.status === "DECLINED") {
      updateData.status = "REJECTED";
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = "Signature declined";
    } else if (event.status === "VOIDED") {
      updateData.status = "EXPIRED";
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: updateData,
    });

    // Create activity record for significant events
    if (["SIGNED", "COMPLETED", "DECLINED", "VOIDED", "VIEWED"].includes(event.status)) {
      await prisma.activity.create({
        data: {
          type: "NOTE",
          title: `Quote ${event.status.toLowerCase()}`,
          description: `Quote #${quote.quoteNumber} was ${event.status.toLowerCase()}${event.signerName ? ` by ${event.signerName}` : ""} (Provider: ${event.provider}, Event: ${event.eventType})`,
          userId: quote.createdById,
          contactId: quote.contactId,
          dealId: quote.dealId,
          businessId: quote.businessId,
        },
      });
    }

    // If quote is signed and deal exists, optionally update deal stage
    if ((event.status === "SIGNED" || event.status === "COMPLETED") && quote.dealId) {
      // Find a "closed won" or "contract signed" stage
      const wonStage = await prisma.pipelineStage.findFirst({
        where: {
          pipeline: {
            deals: {
              some: { id: quote.dealId },
            },
          },
          OR: [
            { name: { contains: "won", mode: "insensitive" } },
            { name: { contains: "closed", mode: "insensitive" } },
            { name: { contains: "signed", mode: "insensitive" } },
          ],
        },
        orderBy: { position: "desc" },
      });

      if (wonStage) {
        await prisma.deal.update({
          where: { id: quote.dealId },
          data: { stageId: wonStage.id },
        });
      }
    }

    return NextResponse.json({ success: true, status: event.status });
  } catch (error) {
    console.error("Signature webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

function detectProvider(request: NextRequest, payload: Record<string, unknown>): SignatureProvider | null {
  // Check headers for provider identification
  const userAgent = request.headers.get("user-agent") || "";
  const contentType = request.headers.get("content-type") || "";

  if (userAgent.includes("DocuSign") || payload.apiVersion) {
    return "docusign";
  }

  if (request.headers.get("x-hellosign-signature") || payload.signature_request) {
    return "hellosign";
  }

  if (userAgent.includes("PandaDoc") || (payload.event && typeof payload.event === "string" && payload.event.startsWith("document_"))) {
    return "pandadoc";
  }

  // Try to detect from payload structure
  if (payload.envelopeId || payload.envelope) {
    return "docusign";
  }

  if (payload.event && (payload.event as Record<string, unknown>).event_type) {
    return "hellosign";
  }

  return null;
}

async function verifyWebhookSignature(
  request: NextRequest,
  body: string,
  provider: SignatureProvider
): Promise<boolean> {
  // In production, verify signatures using provider-specific methods
  // For now, return true if no signature verification is configured

  switch (provider) {
    case "hellosign": {
      const signature = request.headers.get("x-hellosign-signature");
      const apiKey = process.env.HELLOSIGN_API_KEY;
      if (signature && apiKey) {
        return verifyHelloSignSignature(body, signature, apiKey);
      }
      break;
    }
    case "docusign": {
      // DocuSign uses HMAC signatures with connect key
      const signature = request.headers.get("x-docusign-signature-1");
      const connectKey = process.env.DOCUSIGN_CONNECT_KEY;
      if (signature && connectKey) {
        const hash = crypto.createHmac("sha256", connectKey).update(body).digest("base64");
        return hash === signature;
      }
      break;
    }
    case "pandadoc": {
      // PandaDoc signature verification
      const signature = request.headers.get("x-pandadoc-signature");
      const secretKey = process.env.PANDADOC_WEBHOOK_KEY;
      if (signature && secretKey) {
        const hash = crypto.createHmac("sha256", secretKey).update(body).digest("hex");
        return hash === signature;
      }
      break;
    }
  }

  // If no signature verification is configured, allow the request
  // In production, this should be more strict
  return true;
}

// GET endpoint for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // HelloSign verification
  if (searchParams.has("hello_sign")) {
    return new NextResponse("Hello API Event Received", { status: 200 });
  }

  // DocuSign verification - echo challenge
  const challenge = searchParams.get("challenge");
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: "ok", message: "Signature webhook endpoint" });
}
