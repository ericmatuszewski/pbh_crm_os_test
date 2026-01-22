import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit/logger";

// Supported cleanup entities
export const CLEANUP_ENTITIES = {
  audit_logs: {
    name: "Audit Logs",
    description: "System audit log entries",
    defaultRetentionDays: 365,
  },
  notifications: {
    name: "Notifications",
    description: "User notifications",
    defaultRetentionDays: 90,
  },
  activities: {
    name: "Activities",
    description: "CRM activity records",
    defaultRetentionDays: 730, // 2 years
  },
  deleted_records: {
    name: "Deleted Records",
    description: "Soft-deleted records pending purge",
    defaultRetentionDays: 90,
  },
  jobs: {
    name: "Background Jobs",
    description: "Completed background job records",
    defaultRetentionDays: 30,
  },
  login_history: {
    name: "Login History",
    description: "User login records",
    defaultRetentionDays: 180,
  },
  user_sessions: {
    name: "User Sessions",
    description: "Expired and revoked sessions",
    defaultRetentionDays: 30,
  },
} as const;

export type CleanupEntity = keyof typeof CLEANUP_ENTITIES;

/**
 * Create or update a cleanup configuration
 */
export async function createCleanupConfiguration(
  entity: CleanupEntity,
  retentionDays: number,
  isActive: boolean = true,
  description?: string
) {
  const entityInfo = CLEANUP_ENTITIES[entity];
  if (!entityInfo) {
    throw new Error(`Invalid cleanup entity: ${entity}`);
  }

  return prisma.cleanupConfiguration.upsert({
    where: { entity },
    create: {
      name: entityInfo.name,
      description: description || entityInfo.description,
      entity,
      retentionDays,
      isActive,
    },
    update: {
      retentionDays,
      isActive,
      description: description || entityInfo.description,
    },
  });
}

/**
 * Get all cleanup configurations
 */
export async function getCleanupConfigurations() {
  const configs = await prisma.cleanupConfiguration.findMany({
    orderBy: { entity: "asc" },
  });

  // Add any missing entities with defaults
  const existingEntities = new Set(configs.map(c => c.entity));
  const allConfigs = [...configs];

  for (const [entity, info] of Object.entries(CLEANUP_ENTITIES)) {
    if (!existingEntities.has(entity)) {
      allConfigs.push({
        id: `default-${entity}`,
        name: info.name,
        description: info.description,
        entity,
        retentionDays: info.defaultRetentionDays,
        isActive: false,
        lastRunAt: null,
        nextRunAt: null,
        lastRunRecords: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return allConfigs.sort((a, b) => a.entity.localeCompare(b.entity));
}

/**
 * Run cleanup for a specific entity
 */
export async function runCleanup(entity: CleanupEntity, userId: string) {
  const config = await prisma.cleanupConfiguration.findUnique({
    where: { entity },
  });

  const retentionDays = config?.retentionDays || CLEANUP_ENTITIES[entity].defaultRetentionDays;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  let deletedCount = 0;

  switch (entity) {
    case "audit_logs":
      const auditResult = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      });
      deletedCount = auditResult.count;
      break;

    case "notifications":
      const notifResult = await prisma.notification.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      });
      deletedCount = notifResult.count;
      break;

    case "activities":
      const activityResult = await prisma.activity.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      });
      deletedCount = activityResult.count;
      break;

    case "deleted_records":
      const deletedResult = await prisma.deletedRecord.deleteMany({
        where: { deletedAt: { lt: cutoffDate } },
      });
      deletedCount = deletedResult.count;
      break;

    case "jobs":
      const jobResult = await prisma.backgroundJob.deleteMany({
        where: {
          status: { in: ["completed", "failed", "cancelled"] },
          completedAt: { lt: cutoffDate },
        },
      });
      deletedCount = jobResult.count;
      break;

    case "login_history":
      const loginResult = await prisma.loginHistory.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      });
      deletedCount = loginResult.count;
      break;

    case "user_sessions":
      const sessionResult = await prisma.userSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: cutoffDate } },
            { isActive: false, revokedAt: { lt: cutoffDate } },
          ],
        },
      });
      deletedCount = sessionResult.count;
      break;

    default:
      throw new Error(`Unsupported cleanup entity: ${entity}`);
  }

  // Update configuration with run results
  if (config) {
    await prisma.cleanupConfiguration.update({
      where: { id: config.id },
      data: {
        lastRunAt: new Date(),
        lastRunRecords: deletedCount,
      },
    });
  }

  // Log the cleanup
  await logAudit(
    {
      action: "DELETE",
      entity: "cleanup",
      entityId: entity,
      metadata: {
        type: "cleanup_executed",
        entity,
        recordsDeleted: deletedCount,
        retentionDays,
      },
    },
    { userId }
  );

  return {
    entity,
    deletedCount,
    retentionDays,
  };
}

/**
 * Get cleanup statistics
 */
export async function getCleanupStats() {
  const [
    auditLogs,
    notifications,
    activities,
    deletedRecords,
    jobs,
    loginHistory,
    userSessions,
  ] = await Promise.all([
    prisma.auditLog.count(),
    prisma.notification.count(),
    prisma.activity.count(),
    prisma.deletedRecord.count(),
    prisma.backgroundJob.count(),
    prisma.loginHistory.count(),
    prisma.userSession.count(),
  ]);

  return {
    audit_logs: auditLogs,
    notifications,
    activities,
    deleted_records: deletedRecords,
    jobs,
    login_history: loginHistory,
    user_sessions: userSessions,
  };
}

export default {
  CLEANUP_ENTITIES,
  createCleanupConfiguration,
  getCleanupConfigurations,
  runCleanup,
  getCleanupStats,
};
