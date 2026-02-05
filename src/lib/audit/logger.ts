import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

interface AuditContext {
  userId?: string;
  userName?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

interface AuditLogEntry {
  entity: string;
  entityId: string;
  action: AuditAction;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event
 */
export async function logAudit(
  entry: AuditLogEntry,
  context: AuditContext = {}
): Promise<void> {
  try {
    // Detect changed fields if not provided
    let changedFields = entry.changedFields || [];
    if (!changedFields.length && entry.previousValues && entry.newValues) {
      changedFields = detectChangedFields(entry.previousValues, entry.newValues);
    }

    await prisma.auditLog.create({
      data: {
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        previousValues: entry.previousValues ? JSON.parse(JSON.stringify(entry.previousValues)) : undefined,
        newValues: entry.newValues ? JSON.parse(JSON.stringify(entry.newValues)) : undefined,
        changedFields,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Log a CREATE action
 */
export async function logCreate(
  entity: string,
  entityId: string,
  newValues: Record<string, unknown>,
  context: AuditContext = {},
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAudit(
    {
      entity,
      entityId,
      action: AuditAction.CREATE,
      newValues,
      metadata,
    },
    context
  );
}

/**
 * Log an UPDATE action
 */
export async function logUpdate(
  entity: string,
  entityId: string,
  previousValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  context: AuditContext = {},
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAudit(
    {
      entity,
      entityId,
      action: AuditAction.UPDATE,
      previousValues,
      newValues,
      metadata,
    },
    context
  );
}

/**
 * Log a DELETE action
 */
export async function logDelete(
  entity: string,
  entityId: string,
  previousValues: Record<string, unknown>,
  context: AuditContext = {},
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAudit(
    {
      entity,
      entityId,
      action: AuditAction.DELETE,
      previousValues,
      metadata,
    },
    context
  );
}

/**
 * Log a RESTORE action
 */
export async function logRestore(
  entity: string,
  entityId: string,
  restoredValues: Record<string, unknown>,
  context: AuditContext = {},
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAudit(
    {
      entity,
      entityId,
      action: AuditAction.RESTORE,
      newValues: restoredValues,
      metadata,
    },
    context
  );
}

/**
 * Log field history for important field changes
 */
export async function logFieldChange(
  entity: string,
  entityId: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown,
  context: AuditContext = {},
  changeReason?: string
): Promise<void> {
  try {
    // Determine value type
    let valueType = "string";
    if (typeof newValue === "number" || typeof oldValue === "number") {
      valueType = "number";
    } else if (typeof newValue === "boolean" || typeof oldValue === "boolean") {
      valueType = "boolean";
    } else if (newValue instanceof Date || oldValue instanceof Date) {
      valueType = "date";
    } else if (typeof newValue === "object" || typeof oldValue === "object") {
      valueType = "json";
    }

    await prisma.fieldHistory.create({
      data: {
        entity,
        entityId,
        fieldName,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: newValue != null ? String(newValue) : null,
        valueType,
        userId: context.userId,
        userName: context.userName,
        changeReason,
      },
    });
  } catch (error) {
    console.error("Failed to log field history:", error);
  }
}

/**
 * Log login attempt
 */
export async function logLogin(
  userId: string,
  email: string,
  success: boolean,
  context: {
    ipAddress?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    country?: string;
    city?: string;
    sessionId?: string;
    failureReason?: string;
  } = {}
): Promise<void> {
  try {
    await prisma.loginHistory.create({
      data: {
        userId,
        email,
        success,
        failureReason: context.failureReason,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        browser: context.browser,
        os: context.os,
        device: context.device,
        country: context.country,
        city: context.city,
        sessionId: context.sessionId,
      },
    });

    // Also log to audit log
    await logAudit(
      {
        entity: "user",
        entityId: userId,
        action: success ? AuditAction.LOGIN : AuditAction.LOGIN,
        metadata: {
          success,
          failureReason: context.failureReason,
        },
      },
      {
        userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
      }
    );
  } catch (error) {
    console.error("Failed to log login:", error);
  }
}

/**
 * Soft delete a record and store for recovery
 */
export async function softDelete(
  entity: string,
  entityId: string,
  recordData: Record<string, unknown>,
  context: AuditContext = {},
  purgeAfterDays: number = 90
): Promise<void> {
  try {
    const purgeAfter = new Date();
    purgeAfter.setDate(purgeAfter.getDate() + purgeAfterDays);

    await prisma.deletedRecord.create({
      data: {
        entity,
        entityId,
        recordData: JSON.parse(JSON.stringify(recordData)),
        deletedById: context.userId,
        deletedByName: context.userName,
        purgeAfter,
      },
    });

    // Log the delete
    await logDelete(entity, entityId, recordData, context);
  } catch (error) {
    console.error("Failed to soft delete record:", error);
    throw error;
  }
}

/**
 * Recover a soft-deleted record
 */
export async function recoverRecord(
  entity: string,
  entityId: string,
  context: AuditContext = {}
): Promise<Record<string, unknown> | null> {
  try {
    const deleted = await prisma.deletedRecord.findUnique({
      where: {
        entity_entityId: {
          entity,
          entityId,
        },
      },
    });

    if (!deleted || !deleted.recoverable) {
      return null;
    }

    // Mark as recovered
    await prisma.deletedRecord.update({
      where: { id: deleted.id },
      data: {
        recoverable: false,
        recoveredAt: new Date(),
        recoveredById: context.userId,
      },
    });

    // Log the restore
    await logRestore(entity, entityId, deleted.recordData as Record<string, unknown>, context);

    return deleted.recordData as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to recover record:", error);
    throw error;
  }
}

/**
 * Get deleted records for an entity type
 */
export async function getDeletedRecords(
  entity: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ data: unknown[]; total: number }> {
  const [data, total] = await Promise.all([
    prisma.deletedRecord.findMany({
      where: {
        entity,
        recoverable: true,
      },
      orderBy: { deletedAt: "desc" },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.deletedRecord.count({
      where: {
        entity,
        recoverable: true,
      },
    }),
  ]);

  return { data, total };
}

/**
 * Detect which fields changed between two objects
 */
function detectChangedFields(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

  for (const key of allKeys) {
    // Skip internal fields
    if (key.startsWith("_") || key === "createdAt" || key === "updatedAt") {
      continue;
    }

    const prevValue = previous[key];
    const currValue = current[key];

    // Simple comparison - could be enhanced for deep object comparison
    if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Create a data export request
 */
export async function createExportRequest(
  userId: string,
  userEmail: string,
  exportType: string,
  options: {
    entity?: string;
    filters?: Record<string, unknown>;
    ipAddress?: string;
  } = {}
): Promise<string> {
  const request = await prisma.dataExportRequest.create({
    data: {
      userId,
      userEmail,
      exportType,
      entity: options.entity,
      filters: options.filters ? JSON.parse(JSON.stringify(options.filters)) : undefined,
      ipAddress: options.ipAddress,
    },
  });

  return request.id;
}

/**
 * Update export request progress
 */
export async function updateExportProgress(
  requestId: string,
  progress: number,
  status?: string
): Promise<void> {
  await prisma.dataExportRequest.update({
    where: { id: requestId },
    data: {
      progress,
      status: status || (progress >= 100 ? "completed" : "processing"),
      completedAt: progress >= 100 ? new Date() : undefined,
    },
  });
}

/**
 * Complete export request with file URL
 */
export async function completeExportRequest(
  requestId: string,
  fileUrl: string,
  fileSize: number,
  expiresInHours: number = 24
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  await prisma.dataExportRequest.update({
    where: { id: requestId },
    data: {
      status: "completed",
      progress: 100,
      fileUrl,
      fileSize,
      expiresAt,
      completedAt: new Date(),
    },
  });
}

// ==================== COMPLIANCE AUDIT EXTENSIONS ====================

/**
 * Define sensitive fields that should be logged when accessed
 */
const SENSITIVE_FIELDS: Record<string, string[]> = {
  contact: ["email", "phone", "address", "ssn", "dateOfBirth"],
  company: ["taxId", "bankAccount"],
  user: ["email", "phone", "authProvider", "externalId"],
};

/**
 * Log sensitive field access (GDPR/SOC2 compliance)
 */
export async function logSensitiveAccess(
  entity: string,
  entityId: string,
  accessedFields: string[],
  context: AuditContext = {},
  accessReason?: string
): Promise<void> {
  // Filter to only sensitive fields
  const sensitiveFields = SENSITIVE_FIELDS[entity] || [];
  const sensitiveAccess = accessedFields.filter((f) => sensitiveFields.includes(f));

  if (sensitiveAccess.length === 0) return;

  try {
    await logAudit(
      {
        entity,
        entityId,
        action: AuditAction.VIEW,
        metadata: {
          accessedFields: sensitiveAccess,
          accessReason,
          isSensitiveAccess: true,
        },
      },
      context
    );
  } catch (error) {
    console.error("Failed to log sensitive access:", error);
  }
}

/**
 * Log failed authorization attempts (security compliance)
 */
export async function logAuthorizationFailure(
  entity: string,
  entityId: string,
  attemptedAction: string,
  context: AuditContext = {},
  reason?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action: AuditAction.SHARE, // Using SHARE as closest match; could add ACCESS_DENIED
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        metadata: {
          type: "authorization_failure",
          attemptedAction,
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Failed to log authorization failure:", error);
  }
}

/**
 * Log administrative action (settings, config changes)
 */
export async function logAdminAction(
  action: string,
  description: string,
  context: AuditContext = {},
  details?: {
    previousValue?: unknown;
    newValue?: unknown;
    affectedEntity?: string;
    affectedEntityId?: string;
  }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entity: "system",
        entityId: "admin-action",
        action: AuditAction.UPDATE,
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        previousValues: details?.previousValue
          ? JSON.parse(JSON.stringify({ value: details.previousValue }))
          : undefined,
        newValues: details?.newValue
          ? JSON.parse(JSON.stringify({ value: details.newValue }))
          : undefined,
        metadata: {
          type: "admin_action",
          action,
          description,
          affectedEntity: details?.affectedEntity,
          affectedEntityId: details?.affectedEntityId,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
}

/**
 * Log permission/role changes (RBAC audit)
 */
export async function logPermissionChange(
  targetUserId: string,
  changeType: "grant" | "revoke" | "modify",
  context: AuditContext = {},
  details: {
    roleId?: string;
    roleName?: string;
    permissions?: string[];
    previousPermissions?: string[];
  }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entity: "user_permission",
        entityId: targetUserId,
        action: AuditAction.UPDATE,
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        previousValues: details.previousPermissions
          ? JSON.parse(JSON.stringify({ permissions: details.previousPermissions }))
          : undefined,
        newValues: details.permissions
          ? JSON.parse(JSON.stringify({ permissions: details.permissions }))
          : undefined,
        metadata: {
          type: "permission_change",
          changeType,
          roleId: details.roleId,
          roleName: details.roleName,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Failed to log permission change:", error);
  }
}

/**
 * Log API key operations (security compliance)
 */
export async function logApiKeyOperation(
  operation: "create" | "revoke" | "update" | "use",
  keyId: string,
  keyName: string,
  context: AuditContext = {},
  details?: {
    scopes?: string[];
    ipAddress?: string;
    endpoint?: string;
  }
): Promise<void> {
  try {
    const actionMap: Record<string, AuditAction> = {
      create: AuditAction.CREATE,
      revoke: AuditAction.DELETE,
      update: AuditAction.UPDATE,
      use: AuditAction.VIEW,
    };

    await prisma.auditLog.create({
      data: {
        entity: "api_key",
        entityId: keyId,
        action: actionMap[operation] || AuditAction.UPDATE,
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress || details?.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        metadata: {
          type: "api_key_operation",
          operation,
          keyName,
          scopes: details?.scopes,
          endpoint: details?.endpoint,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Failed to log API key operation:", error);
  }
}

/**
 * Log data export operation (GDPR compliance)
 */
export async function logDataExport(
  exportType: string,
  context: AuditContext = {},
  details: {
    entity?: string;
    recordCount?: number;
    filters?: Record<string, unknown>;
    format?: string;
  }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entity: details.entity || "export",
        entityId: `export-${Date.now()}`,
        action: AuditAction.EXPORT,
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        metadata: JSON.parse(JSON.stringify({
          type: "data_export",
          exportType,
          recordCount: details.recordCount,
          filters: details.filters,
          format: details.format,
          timestamp: new Date().toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to log data export:", error);
  }
}

/**
 * Log bulk operation (compliance for mass changes)
 */
export async function logBulkOperation(
  operation: string,
  entity: string,
  affectedIds: string[],
  context: AuditContext = {},
  details?: {
    changes?: Record<string, unknown>;
    filters?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entity,
        entityId: `bulk-${Date.now()}`,
        action: AuditAction.UPDATE,
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        metadata: JSON.parse(JSON.stringify({
          type: "bulk_operation",
          operation,
          affectedCount: affectedIds.length,
          affectedIds: affectedIds.slice(0, 100), // Limit to first 100 for storage
          changes: details?.changes,
          filters: details?.filters,
          timestamp: new Date().toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to log bulk operation:", error);
  }
}

/**
 * Log GDPR-related action (data subject requests, consent changes)
 */
export async function logGdprAction(
  actionType: "consent_granted" | "consent_withdrawn" | "erasure_requested" | "erasure_completed" | "data_exported",
  contactId: string,
  context: AuditContext = {},
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entity: "contact",
        entityId: contactId,
        action: AuditAction.UPDATE,
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        metadata: {
          type: "gdpr_action",
          actionType,
          ...details,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Failed to log GDPR action:", error);
  }
}
