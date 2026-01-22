import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Sign webhook payload
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signWebhookPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Send a webhook
async function sendWebhook(
  webhook: {
    id: string;
    url: string;
    secret: string | null;
    headers: Record<string, string> | null;
  },
  event: string,
  data: Record<string, unknown>
): Promise<{
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  responseTime?: number;
}> {
  const payload: WebhookPayload = {
    id: crypto.randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": event,
    "X-Webhook-Delivery": payload.id,
    ...(webhook.headers || {}),
  };

  // Add signature if secret is set
  if (webhook.secret) {
    headers["X-Webhook-Signature"] = signWebhookPayload(
      payloadString,
      webhook.secret
    );
  }

  const startTime = Date.now();

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    let responseBody: string;

    try {
      responseBody = await response.text();
    } catch {
      responseBody = "";
    }

    if (response.ok) {
      return {
        success: true,
        statusCode: response.status,
        responseBody,
        responseTime,
      };
    } else {
      return {
        success: false,
        statusCode: response.status,
        responseBody,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        responseTime,
      };
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      responseTime: Date.now() - startTime,
    };
  }
}

// Dispatch webhook to all subscribers
export async function dispatchWebhook(
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  // Find all active webhooks subscribed to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      isActive: true,
      isPaused: false,
      events: { has: event },
    },
  });

  for (const webhook of webhooks) {
    // Create delivery log
    const deliveryLog = await prisma.webhookDeliveryLog.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: JSON.parse(JSON.stringify(data)),
        status: "pending",
      },
    });

    // Send webhook
    const result = await sendWebhook(
      {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        headers: webhook.headers as Record<string, string> | null,
      },
      event,
      data
    );

    // Update delivery log
    await prisma.webhookDeliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status: result.success ? "success" : "failed",
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        errorMessage: result.errorMessage,
        sentAt: new Date(),
        responseTime: result.responseTime,
        nextRetryAt: result.success
          ? null
          : new Date(Date.now() + webhook.retryDelay * 1000),
      },
    });

    // Update webhook status
    if (result.success) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastSuccessAt: new Date(),
          failureCount: 0,
        },
      });
    } else {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastFailureAt: new Date(),
          failureCount: { increment: 1 },
        },
      });

      // Auto-pause webhook after too many failures
      if (webhook.failureCount >= 10) {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { isPaused: true },
        });
      }
    }
  }
}

// Retry failed webhook deliveries
export async function retryFailedWebhooks(): Promise<number> {
  const now = new Date();

  // Find failed deliveries ready for retry
  const failedDeliveries = await prisma.webhookDeliveryLog.findMany({
    where: {
      status: "failed",
      nextRetryAt: { lte: now },
    },
    include: {
      webhook: true,
    },
    take: 100, // Process in batches
  });

  let retried = 0;

  for (const delivery of failedDeliveries) {
    const webhook = delivery.webhook;

    // Skip if webhook is paused or inactive
    if (!webhook.isActive || webhook.isPaused) continue;

    // Skip if max retries exceeded
    if (delivery.retryCount >= webhook.maxRetries) {
      await prisma.webhookDeliveryLog.update({
        where: { id: delivery.id },
        data: { nextRetryAt: null },
      });
      continue;
    }

    // Retry the webhook
    const result = await sendWebhook(
      {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        headers: webhook.headers as Record<string, string> | null,
      },
      delivery.event,
      delivery.payload as Record<string, unknown>
    );

    // Update delivery log
    await prisma.webhookDeliveryLog.update({
      where: { id: delivery.id },
      data: {
        status: result.success ? "success" : "failed",
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        errorMessage: result.errorMessage,
        sentAt: new Date(),
        responseTime: result.responseTime,
        retryCount: { increment: 1 },
        nextRetryAt:
          result.success || delivery.retryCount + 1 >= webhook.maxRetries
            ? null
            : new Date(Date.now() + webhook.retryDelay * 1000 * (delivery.retryCount + 1)),
      },
    });

    // Update webhook status
    if (result.success) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastSuccessAt: new Date(),
          failureCount: 0,
        },
      });
    }

    retried++;
  }

  return retried;
}

// List of all available webhook events
export const WEBHOOK_EVENTS = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "company.created",
  "company.updated",
  "company.deleted",
  "deal.created",
  "deal.updated",
  "deal.deleted",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "quote.created",
  "quote.updated",
  "quote.sent",
  "quote.accepted",
  "quote.declined",
  "task.created",
  "task.updated",
  "task.completed",
  "document.uploaded",
  "document.deleted",
] as const;
