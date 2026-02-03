import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationPriority } from "@prisma/client";

// Dynamic import to avoid circular dependencies
let broadcastToUser: ((userId: string, data: unknown) => void) | null = null;

export function setBroadcastFunction(fn: (userId: string, data: unknown) => void) {
  broadcastToUser = fn;
}

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  link?: string;
  fromUserId?: string;
  fromUserName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(options: CreateNotificationOptions): Promise<string> {
  // Check user preferences
  const preference = await prisma.notificationPreference.findUnique({
    where: {
      userId_type: {
        userId: options.userId,
        type: options.type,
      },
    },
  });

  // If user has disabled this notification type, skip in-app
  const shouldCreateInApp = !preference || preference.inApp;

  if (!shouldCreateInApp) {
    return "";
  }

  const notification = await prisma.notification.create({
    data: {
      userId: options.userId,
      type: options.type,
      title: options.title,
      message: options.message,
      priority: options.priority || NotificationPriority.NORMAL,
      entityType: options.entityType,
      entityId: options.entityId,
      link: options.link,
      fromUserId: options.fromUserId,
      fromUserName: options.fromUserName,
      metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
    },
  });

  // Broadcast real-time notification to the user
  if (broadcastToUser) {
    broadcastToUser(options.userId, {
      type: "notification",
      notification: {
        id: notification.id,
        title: options.title,
        message: options.message,
        type: options.type,
        priority: options.priority || "NORMAL",
        link: options.link,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  }

  // Handle email notification (in production, this would queue an email)
  if (preference?.email !== false && preference?.emailImmediate !== false) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { emailSent: true, emailSentAt: new Date() },
    });
    // TODO: Actually send email using email service
  }

  return notification.id;
}

/**
 * Send deal stage change notification
 */
export async function notifyDealStageChange(
  dealId: string,
  dealTitle: string,
  fromStage: string,
  toStage: string,
  ownerId: string,
  changedByUserId?: string,
  changedByName?: string
): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: NotificationType.DEAL_STAGE_CHANGE,
    title: "Deal Stage Changed",
    message: `Deal "${dealTitle}" moved from ${fromStage} to ${toStage}`,
    priority:
      toStage === "CLOSED_WON"
        ? NotificationPriority.HIGH
        : NotificationPriority.NORMAL,
    entityType: "deal",
    entityId: dealId,
    link: `/deals/${dealId}`,
    fromUserId: changedByUserId,
    fromUserName: changedByName,
  });
}

/**
 * Send task assigned notification
 */
export async function notifyTaskAssigned(
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  assignedByUserId?: string,
  assignedByName?: string
): Promise<void> {
  await createNotification({
    userId: assigneeId,
    type: NotificationType.TASK_ASSIGNED,
    title: "Task Assigned",
    message: `You have been assigned: "${taskTitle}"`,
    priority: NotificationPriority.NORMAL,
    entityType: "task",
    entityId: taskId,
    link: `/tasks?id=${taskId}`,
    fromUserId: assignedByUserId,
    fromUserName: assignedByName,
  });
}

/**
 * Send task due soon reminder
 */
export async function notifyTaskDueSoon(
  taskId: string,
  taskTitle: string,
  ownerId: string,
  dueDate: Date
): Promise<void> {
  const timeUntilDue = dueDate.getTime() - Date.now();
  const hoursUntilDue = Math.round(timeUntilDue / (1000 * 60 * 60));

  await createNotification({
    userId: ownerId,
    type: NotificationType.TASK_DUE_SOON,
    title: "Task Due Soon",
    message: `Task "${taskTitle}" is due in ${hoursUntilDue} hours`,
    priority: hoursUntilDue <= 2 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
    entityType: "task",
    entityId: taskId,
    link: `/tasks?id=${taskId}`,
  });
}

/**
 * Send task overdue notification
 */
export async function notifyTaskOverdue(
  taskId: string,
  taskTitle: string,
  ownerId: string,
  dueDate: Date
): Promise<void> {
  const overdueDays = Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  await createNotification({
    userId: ownerId,
    type: NotificationType.TASK_OVERDUE,
    title: "Task Overdue",
    message: `Task "${taskTitle}" is ${overdueDays} day${overdueDays > 1 ? "s" : ""} overdue`,
    priority: NotificationPriority.URGENT,
    entityType: "task",
    entityId: taskId,
    link: `/tasks?id=${taskId}`,
  });
}

/**
 * Send mention notification
 */
export async function notifyMention(
  mentionedUserId: string,
  mentionedById: string,
  mentionedByName: string,
  entityType: string,
  entityId: string,
  contextText?: string
): Promise<void> {
  // Create mention record
  await prisma.mention.create({
    data: {
      mentionedUserId,
      mentionedById,
      mentionedByName,
      entityType,
      entityId,
      contextText,
      notified: true,
    },
  });

  await createNotification({
    userId: mentionedUserId,
    type: NotificationType.MENTION,
    title: "You were mentioned",
    message: `${mentionedByName} mentioned you${contextText ? `: "${contextText.substring(0, 100)}${contextText.length > 100 ? "..." : ""}"` : ""}`,
    priority: NotificationPriority.NORMAL,
    entityType,
    entityId,
    link: entityType === "contact" ? `/contacts/${entityId}` : entityType === "deal" ? `/deals/${entityId}` : undefined,
    fromUserId: mentionedById,
    fromUserName: mentionedByName,
  });
}

/**
 * Send quote status change notification
 */
export async function notifyQuoteStatusChange(
  quoteId: string,
  quoteNumber: string,
  newStatus: string,
  ownerId: string
): Promise<void> {
  const priority =
    newStatus === "ACCEPTED"
      ? NotificationPriority.HIGH
      : newStatus === "DECLINED"
      ? NotificationPriority.HIGH
      : NotificationPriority.NORMAL;

  await createNotification({
    userId: ownerId,
    type: NotificationType.QUOTE_STATUS_CHANGE,
    title: `Quote ${newStatus.toLowerCase()}`,
    message: `Quote ${quoteNumber} has been ${newStatus.toLowerCase()}`,
    priority,
    entityType: "quote",
    entityId: quoteId,
    link: `/quotes/${quoteId}`,
  });
}

/**
 * Send call reminder notification
 */
export async function notifyCallReminder(
  callId: string,
  contactName: string,
  ownerId: string,
  scheduledFor: Date
): Promise<void> {
  const minutesUntil = Math.round((scheduledFor.getTime() - Date.now()) / (1000 * 60));

  await createNotification({
    userId: ownerId,
    type: NotificationType.CALL_REMINDER,
    title: "Call Reminder",
    message: `Call with ${contactName} in ${minutesUntil} minutes`,
    priority: minutesUntil <= 5 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
    entityType: "call",
    entityId: callId,
    link: `/calls/schedule`,
  });
}

/**
 * Schedule a notification for later
 */
export async function scheduleNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  scheduledFor: Date,
  options: {
    entityType?: string;
    entityId?: string;
    repeatInterval?: string;
    repeatUntil?: Date;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<string> {
  const scheduled = await prisma.scheduledNotification.create({
    data: {
      userId,
      type,
      title,
      message,
      scheduledFor,
      entityType: options.entityType,
      entityId: options.entityId,
      repeatInterval: options.repeatInterval,
      repeatUntil: options.repeatUntil,
      metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
    },
  });

  return scheduled.id;
}

/**
 * Process scheduled notifications (run periodically)
 */
export async function processScheduledNotifications(): Promise<number> {
  const now = new Date();

  const pending = await prisma.scheduledNotification.findMany({
    where: {
      scheduledFor: { lte: now },
      sent: false,
    },
    take: 100,
  });

  let processed = 0;

  for (const scheduled of pending) {
    try {
      await createNotification({
        userId: scheduled.userId,
        type: scheduled.type,
        title: scheduled.title,
        message: scheduled.message,
        entityType: scheduled.entityType || undefined,
        entityId: scheduled.entityId || undefined,
        metadata: scheduled.metadata as Record<string, unknown> | undefined,
      });

      // Handle repeat
      if (scheduled.repeatInterval && scheduled.repeatInterval !== "none") {
        const nextScheduled = new Date(scheduled.scheduledFor);
        if (scheduled.repeatInterval === "daily") {
          nextScheduled.setDate(nextScheduled.getDate() + 1);
        } else if (scheduled.repeatInterval === "weekly") {
          nextScheduled.setDate(nextScheduled.getDate() + 7);
        }

        // Only schedule next if within repeat window
        if (!scheduled.repeatUntil || nextScheduled <= scheduled.repeatUntil) {
          await prisma.scheduledNotification.update({
            where: { id: scheduled.id },
            data: {
              sent: true,
              sentAt: now,
            },
          });

          // Create next occurrence
          await prisma.scheduledNotification.create({
            data: {
              userId: scheduled.userId,
              type: scheduled.type,
              title: scheduled.title,
              message: scheduled.message,
              scheduledFor: nextScheduled,
              entityType: scheduled.entityType,
              entityId: scheduled.entityId,
              repeatInterval: scheduled.repeatInterval,
              repeatUntil: scheduled.repeatUntil,
              metadata: scheduled.metadata ? JSON.parse(JSON.stringify(scheduled.metadata)) : undefined,
            },
          });
        } else {
          await prisma.scheduledNotification.update({
            where: { id: scheduled.id },
            data: { sent: true, sentAt: now },
          });
        }
      } else {
        await prisma.scheduledNotification.update({
          where: { id: scheduled.id },
          data: { sent: true, sentAt: now },
        });
      }

      processed++;
    } catch (error) {
      console.error(`Failed to process scheduled notification ${scheduled.id}:`, error);
    }
  }

  return processed;
}

/**
 * Get notification stats for a user
 */
export async function getNotificationStats(userId: string): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
}> {
  const [total, unread, byType] = await Promise.all([
    prisma.notification.count({
      where: { userId, isArchived: false },
    }),
    prisma.notification.count({
      where: { userId, isRead: false, isArchived: false },
    }),
    prisma.notification.groupBy({
      by: ["type"],
      where: { userId, isArchived: false },
      _count: true,
    }),
  ]);

  return {
    total,
    unread,
    byType: byType.reduce(
      (acc, item) => ({ ...acc, [item.type]: item._count }),
      {} as Record<string, number>
    ),
  };
}

/**
 * Mark notifications as read
 */
export async function markAsRead(notificationIds: string[], userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Archive notifications
 */
export async function archiveNotifications(notificationIds: string[], userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,
    },
    data: {
      isArchived: true,
    },
  });

  return result.count;
}

/**
 * Parse @mentions from text
 */
export function parseMentions(text: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[2]); // User ID is in the second capture group
  }

  return mentions;
}
