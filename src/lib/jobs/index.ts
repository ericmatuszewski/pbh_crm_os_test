/**
 * Background Job Queue System
 *
 * Provides async job processing for:
 * - Email sending
 * - Report generation
 * - Data imports/exports
 * - Webhook retries
 * - Cleanup tasks
 */

import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

// Job type definitions
export type JobType =
  | "email"
  | "report"
  | "import"
  | "export"
  | "webhook_retry"
  | "cleanup"
  | "notification"
  | "workflow"
  | "email_sync"
  | "email_delta_sync"
  | "subscription_renewal";

export interface JobPayload {
  [key: string]: unknown;
}

export interface CreateJobOptions {
  type: JobType;
  name: string;
  payload: JobPayload;
  priority?: number;
  scheduledFor?: Date;
  maxAttempts?: number;
  userId?: string;
}

export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Job handler type
export type JobHandler = (
  payload: JobPayload,
  updateProgress: (progress: number, message?: string) => Promise<void>
) => Promise<JobResult>;

// Job handlers registry
const jobHandlers = new Map<JobType, JobHandler>();

// ==================== JOB CREATION ====================

/**
 * Create a new background job
 */
export async function createJob(options: CreateJobOptions): Promise<string> {
  const job = await prisma.backgroundJob.create({
    data: {
      type: options.type,
      name: options.name,
      payload: JSON.parse(JSON.stringify(options.payload)),
      priority: options.priority || 0,
      scheduledFor: options.scheduledFor || new Date(),
      maxAttempts: options.maxAttempts || 3,
      userId: options.userId,
      status: "pending",
    },
  });

  await logJob(job.id, "info", `Job created: ${options.name}`);

  return job.id;
}

/**
 * Create multiple jobs at once
 */
export async function createJobs(
  jobs: CreateJobOptions[]
): Promise<string[]> {
  const created = await prisma.$transaction(
    jobs.map((options) =>
      prisma.backgroundJob.create({
        data: {
          type: options.type,
          name: options.name,
          payload: JSON.parse(JSON.stringify(options.payload)),
          priority: options.priority || 0,
          scheduledFor: options.scheduledFor || new Date(),
          maxAttempts: options.maxAttempts || 3,
          userId: options.userId,
          status: "pending",
        },
      })
    )
  );

  return created.map((j) => j.id);
}

// ==================== JOB PROCESSING ====================

/**
 * Register a job handler
 */
export function registerHandler(type: JobType, handler: JobHandler): void {
  jobHandlers.set(type, handler);
}

/**
 * Process a single job
 */
async function processJob(jobId: string): Promise<void> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.status !== "pending") {
    return;
  }

  const handler = jobHandlers.get(job.type as JobType);
  if (!handler) {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: `No handler registered for job type: ${job.type}`,
      },
    });
    return;
  }

  // Mark as processing
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: "processing",
      startedAt: new Date(),
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });

  await logJob(jobId, "info", "Job started");

  try {
    // Progress update callback
    const updateProgress = async (
      progress: number,
      message?: string
    ): Promise<void> => {
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          progress: Math.min(100, Math.max(0, progress)),
          progressMessage: message,
        },
      });
      if (message) {
        await logJob(jobId, "info", `Progress: ${progress}% - ${message}`);
      }
    };

    // Execute the handler
    const result = await handler(
      job.payload as JobPayload,
      updateProgress
    );

    if (result.success) {
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          completedAt: new Date(),
          progress: 100,
          result: result.data ? JSON.parse(JSON.stringify(result.data)) : null,
        },
      });
      await logJob(jobId, "info", "Job completed successfully");
    } else {
      throw new Error(result.error || "Job failed without error message");
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const stackTrace = error instanceof Error ? error.stack : undefined;

    const updatedJob = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    if (updatedJob && updatedJob.attempts < updatedJob.maxAttempts) {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, updatedJob.attempts) * 60 * 1000; // 2^attempts minutes
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: "pending",
          errorMessage,
          stackTrace,
          nextRetryAt: new Date(Date.now() + retryDelay),
        },
      });
      await logJob(
        jobId,
        "warn",
        `Job failed, will retry in ${retryDelay / 60000} minutes: ${errorMessage}`
      );
    } else {
      // Max attempts reached
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          completedAt: new Date(),
          errorMessage,
          stackTrace,
        },
      });
      await logJob(jobId, "error", `Job failed permanently: ${errorMessage}`);
    }
  }
}

/**
 * Process pending jobs
 */
export async function processJobs(
  limit: number = 10
): Promise<number> {
  const now = new Date();

  // Find pending jobs that are ready to run
  const jobs = await prisma.backgroundJob.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: now },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: [{ priority: "desc" }, { scheduledFor: "asc" }],
    take: limit,
  });

  // Process jobs sequentially (could be parallelized with a proper queue)
  for (const job of jobs) {
    await processJob(job.id);
  }

  return jobs.length;
}

// ==================== JOB MANAGEMENT ====================

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.status === "completed" || job.status === "failed") {
    return false;
  }

  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: { status: "cancelled" },
  });

  await logJob(jobId, "info", "Job cancelled");
  return true;
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId: string): Promise<boolean> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.status !== "failed") {
    return false;
  }

  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: "pending",
      attempts: 0,
      errorMessage: null,
      stackTrace: null,
      nextRetryAt: null,
      progress: 0,
      progressMessage: null,
    },
  });

  await logJob(jobId, "info", "Job queued for retry");
  return true;
}

/**
 * Get job status and progress
 */
export async function getJobStatus(jobId: string): Promise<{
  status: JobStatus;
  progress: number;
  progressMessage: string | null;
  error: string | null;
  result: unknown;
} | null> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      progress: true,
      progressMessage: true,
      errorMessage: true,
      result: true,
    },
  });

  if (!job) return null;

  return {
    status: job.status,
    progress: job.progress,
    progressMessage: job.progressMessage,
    error: job.errorMessage,
    result: job.result,
  };
}

/**
 * Clean up old completed/failed jobs
 */
export async function cleanupOldJobs(
  daysOld: number = 30
): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await prisma.backgroundJob.deleteMany({
    where: {
      status: { in: ["completed", "failed", "cancelled"] },
      completedAt: { lt: cutoff },
    },
  });

  return result.count;
}

// ==================== JOB LOGGING ====================

async function logJob(
  jobId: string,
  level: "debug" | "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.jobLog.create({
      data: {
        jobId,
        level,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  } catch {
    // Ignore logging errors
  }
}

/**
 * Get logs for a job
 */
export async function getJobLogs(
  jobId: string,
  limit: number = 100
): Promise<
  Array<{
    id: string;
    level: string;
    message: string;
    metadata: unknown;
    createdAt: Date;
  }>
> {
  return prisma.jobLog.findMany({
    where: { jobId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ==================== BUILT-IN HANDLERS ====================

// Cleanup handler - removes old data
registerHandler("cleanup", async (payload, updateProgress) => {
  const { target, daysOld = 30 } = payload;

  await updateProgress(10, "Starting cleanup");

  let deleted = 0;
  const cutoff = new Date(Date.now() - (daysOld as number) * 24 * 60 * 60 * 1000);

  switch (target) {
    case "audit_logs":
      await updateProgress(30, "Cleaning audit logs");
      const auditResult = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      deleted = auditResult.count;
      break;

    case "notifications":
      await updateProgress(30, "Cleaning old notifications");
      const notifResult = await prisma.notification.deleteMany({
        where: { createdAt: { lt: cutoff }, isRead: true },
      });
      deleted = notifResult.count;
      break;

    case "activities":
      await updateProgress(30, "Cleaning old activities");
      const actResult = await prisma.activity.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      deleted = actResult.count;
      break;

    case "jobs":
      await updateProgress(30, "Cleaning old jobs");
      deleted = await cleanupOldJobs(daysOld as number);
      break;

    default:
      return { success: false, error: `Unknown cleanup target: ${target}` };
  }

  await updateProgress(100, `Deleted ${deleted} records`);

  return { success: true, data: { deleted } };
});

// Email sync handler - Full sync for a mailbox
registerHandler("email_sync", async (payload, updateProgress) => {
  const { mailboxId } = payload;

  if (!mailboxId) {
    return { success: false, error: "mailboxId is required" };
  }

  await updateProgress(10, "Starting email sync");

  try {
    // Import dynamically to avoid circular dependencies
    const { createEmailService, autoLinkEmail, EmailService } = await import("@/lib/microsoft-graph/emails");

    const mailbox = await prisma.microsoftMailbox.findUnique({
      where: { id: mailboxId as string },
    });

    if (!mailbox) {
      return { success: false, error: "Mailbox not found" };
    }

    await updateProgress(20, "Fetching folders");
    const emailService = await createEmailService(mailboxId as string);
    const folders = await emailService.getFolders();

    const foldersToSync = folders.filter((f) =>
      mailbox.syncFolders.some((sf) => sf.toLowerCase() === f.displayName.toLowerCase())
    );

    let importedCount = 0;
    let skippedCount = 0;
    let progressPct = 30;
    const progressPerFolder = 60 / foldersToSync.length;

    for (const folder of foldersToSync) {
      await updateProgress(progressPct, `Syncing ${folder.displayName}`);

      const messages = await emailService.getMessages(folder.id, { top: 100 });

      for (const message of messages) {
        const existing = await prisma.email.findFirst({
          where: { graphMessageId: message.id },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const processed = EmailService.processMessage(message, mailbox.mailboxEmail);
        const links = await autoLinkEmail(mailbox.businessId, processed);

        await prisma.email.create({
          data: {
            graphMessageId: processed.graphMessageId,
            graphConversationId: processed.graphConversationId,
            mailboxId: mailbox.id,
            businessId: mailbox.businessId,
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
        importedCount++;
      }

      progressPct += progressPerFolder;
    }

    await prisma.microsoftMailbox.update({
      where: { id: mailbox.id },
      data: { lastSyncAt: new Date(), syncStatus: "ACTIVE" },
    });

    await updateProgress(100, `Completed: ${importedCount} imported, ${skippedCount} skipped`);

    return { success: true, data: { imported: importedCount, skipped: skippedCount } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
});

// Delta sync handler - Incremental sync using delta tokens
registerHandler("email_delta_sync", async (payload, updateProgress) => {
  const { mailboxId } = payload;

  if (!mailboxId) {
    return { success: false, error: "mailboxId is required" };
  }

  await updateProgress(10, "Starting delta sync");

  try {
    const { createEmailService, autoLinkEmail, EmailService } = await import("@/lib/microsoft-graph/emails");

    const mailbox = await prisma.microsoftMailbox.findUnique({
      where: { id: mailboxId as string },
    });

    if (!mailbox) {
      return { success: false, error: "Mailbox not found" };
    }

    const emailService = await createEmailService(mailboxId as string);
    const folders = await emailService.getFolders();

    const foldersToSync = folders.filter((f) =>
      mailbox.syncFolders.some((sf) => sf.toLowerCase() === f.displayName.toLowerCase())
    );

    let importedCount = 0;
    let deletedCount = 0;

    for (const folder of foldersToSync) {
      await updateProgress(30, `Delta sync ${folder.displayName}`);

      const delta = await emailService.deltaSync(folder.id, mailbox.deltaSyncToken || undefined);

      // Process new/updated messages
      for (const message of delta.messages) {
        const existing = await prisma.email.findFirst({
          where: { graphMessageId: message.id },
        });

        if (existing) continue;

        const processed = EmailService.processMessage(message, mailbox.mailboxEmail);
        const links = await autoLinkEmail(mailbox.businessId, processed);

        await prisma.email.create({
          data: {
            graphMessageId: processed.graphMessageId,
            graphConversationId: processed.graphConversationId,
            mailboxId: mailbox.id,
            businessId: mailbox.businessId,
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
        importedCount++;
      }

      // Handle deleted messages
      if (delta.deletedIds.length > 0) {
        const deleteResult = await prisma.email.deleteMany({
          where: { graphMessageId: { in: delta.deletedIds } },
        });
        deletedCount += deleteResult.count;
      }

      // Update delta token
      await prisma.microsoftMailbox.update({
        where: { id: mailbox.id },
        data: { deltaSyncToken: delta.deltaToken },
      });
    }

    await prisma.microsoftMailbox.update({
      where: { id: mailbox.id },
      data: { lastSyncAt: new Date(), syncStatus: "ACTIVE" },
    });

    await updateProgress(100, `Completed: ${importedCount} imported, ${deletedCount} deleted`);

    return { success: true, data: { imported: importedCount, deleted: deletedCount } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
});

// Subscription renewal handler - Renew Microsoft Graph webhooks
registerHandler("subscription_renewal", async (payload, updateProgress) => {
  const { businessId } = payload;

  await updateProgress(10, "Checking subscriptions");

  try {
    const { createGraphClient } = await import("@/lib/microsoft-graph/client");

    // Find mailboxes with expiring subscriptions (within 24 hours)
    const expiryThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const whereClause: { webhookExpiresAt: { lt: Date }; businessId?: string } = {
      webhookExpiresAt: { lt: expiryThreshold },
    };

    if (businessId) {
      whereClause.businessId = businessId as string;
    }

    const mailboxes = await prisma.microsoftMailbox.findMany({
      where: whereClause,
      include: { credential: true },
    });

    let renewed = 0;
    let failed = 0;

    for (const mailbox of mailboxes) {
      try {
        if (!mailbox.webhookSubscriptionId) continue;

        const client = createGraphClient(mailbox.credentialId);

        // Extend subscription by 3 days
        const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

        await client.request(`/subscriptions/${mailbox.webhookSubscriptionId}`, {
          method: "PATCH",
          body: { expirationDateTime },
        });

        await prisma.microsoftMailbox.update({
          where: { id: mailbox.id },
          data: { webhookExpiresAt: new Date(expirationDateTime) },
        });

        renewed++;
      } catch {
        failed++;
      }
    }

    await updateProgress(100, `Renewed ${renewed}, failed ${failed}`);

    return { success: true, data: { renewed, failed } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
});

export default {
  createJob,
  createJobs,
  registerHandler,
  processJobs,
  cancelJob,
  retryJob,
  getJobStatus,
  getJobLogs,
  cleanupOldJobs,
};
