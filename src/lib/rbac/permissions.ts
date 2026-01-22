import { prisma } from "@/lib/prisma";
import { PermissionAction, RecordAccess, RoleType } from "@prisma/client";

interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  recordAccess?: RecordAccess;
}

interface FieldPermissionResult {
  canView: boolean;
  canEdit: boolean;
  maskValue: boolean;
  maskPattern?: string;
}

interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Map<string, Map<PermissionAction, { recordAccess: RecordAccess; conditions: unknown[] }>>;
  fieldPermissions: Map<string, Map<string, FieldPermissionResult>>;
}

/**
 * Get all permissions for a user, including inherited permissions from roles
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  // Get user's role assignments
  const roleAssignments = await prisma.userRoleAssignment.findMany({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
      startsAt: { lte: new Date() },
    },
    include: {
      role: {
        include: {
          permissions: true,
          fieldPermissions: true,
          parent: {
            include: {
              permissions: true,
              fieldPermissions: true,
            },
          },
        },
      },
    },
  });

  const roles: string[] = [];
  const permissions = new Map<string, Map<PermissionAction, { recordAccess: RecordAccess; conditions: unknown[] }>>();
  const fieldPermissions = new Map<string, Map<string, FieldPermissionResult>>();

  // Process each role assignment
  for (const assignment of roleAssignments) {
    const role = assignment.role;
    if (!role.isActive) continue;

    roles.push(role.name);

    // Process role permissions (and inherited parent permissions)
    const rolesToProcess = [role];
    let currentRole = role;
    while (currentRole.parent) {
      rolesToProcess.push(currentRole.parent as typeof role);
      currentRole = currentRole.parent as typeof role;
    }

    // Process in reverse order (parent first) so child permissions override
    for (const r of rolesToProcess.reverse()) {
      // Object permissions
      for (const p of r.permissions) {
        if (!permissions.has(p.entity)) {
          permissions.set(p.entity, new Map());
        }
        const entityPerms = permissions.get(p.entity)!;

        // Use the most permissive access level
        const existing = entityPerms.get(p.action);
        if (!existing || getRecordAccessLevel(p.recordAccess) > getRecordAccessLevel(existing.recordAccess)) {
          entityPerms.set(p.action, {
            recordAccess: p.recordAccess,
            conditions: p.conditions as unknown[],
          });
        }
      }

      // Field permissions
      for (const fp of r.fieldPermissions) {
        const key = fp.entity;
        if (!fieldPermissions.has(key)) {
          fieldPermissions.set(key, new Map());
        }
        const entityFieldPerms = fieldPermissions.get(key)!;

        // Merge field permissions (more restrictive wins)
        const existing = entityFieldPerms.get(fp.fieldName);
        if (!existing) {
          entityFieldPerms.set(fp.fieldName, {
            canView: fp.canView,
            canEdit: fp.canEdit,
            maskValue: fp.maskValue,
            maskPattern: fp.maskPattern || undefined,
          });
        } else {
          entityFieldPerms.set(fp.fieldName, {
            canView: existing.canView && fp.canView,
            canEdit: existing.canEdit && fp.canEdit,
            maskValue: existing.maskValue || fp.maskValue,
            maskPattern: fp.maskPattern || existing.maskPattern,
          });
        }
      }
    }
  }

  return {
    userId,
    roles,
    permissions,
    fieldPermissions,
  };
}

/**
 * Check if a user has permission to perform an action on an entity
 */
export async function checkPermission(
  userId: string,
  entity: string,
  action: PermissionAction,
  recordOwnerId?: string,
  recordTeamId?: string
): Promise<PermissionCheckResult> {
  const userPerms = await getUserPermissions(userId);

  // Check if user has any roles
  if (userPerms.roles.length === 0) {
    return { allowed: false, reason: "User has no roles assigned" };
  }

  // Check entity permissions
  const entityPerms = userPerms.permissions.get(entity);
  if (!entityPerms) {
    return { allowed: false, reason: `No permissions for entity: ${entity}` };
  }

  const actionPerm = entityPerms.get(action);
  if (!actionPerm) {
    return { allowed: false, reason: `No ${action} permission for entity: ${entity}` };
  }

  // Check record-level access
  if (actionPerm.recordAccess === RecordAccess.NONE) {
    return { allowed: false, reason: "Record access denied" };
  }

  if (actionPerm.recordAccess === RecordAccess.ALL) {
    return { allowed: true, recordAccess: RecordAccess.ALL };
  }

  // For OWN access, check if user owns the record
  if (actionPerm.recordAccess === RecordAccess.OWN) {
    if (recordOwnerId && recordOwnerId !== userId) {
      return { allowed: false, reason: "Can only access own records" };
    }
    return { allowed: true, recordAccess: RecordAccess.OWN };
  }

  // For TEAM access, check if user is in same team
  if (actionPerm.recordAccess === RecordAccess.TEAM) {
    if (recordTeamId) {
      const userTeam = await prisma.user.findUnique({
        where: { id: userId },
        select: { teamId: true },
      });

      if (userTeam?.teamId !== recordTeamId && recordOwnerId !== userId) {
        return { allowed: false, reason: "Can only access team records" };
      }
    }
    return { allowed: true, recordAccess: RecordAccess.TEAM };
  }

  return { allowed: true, recordAccess: actionPerm.recordAccess };
}

/**
 * Get field permissions for a user on an entity
 */
export async function getFieldPermissions(
  userId: string,
  entity: string
): Promise<Record<string, FieldPermissionResult>> {
  const userPerms = await getUserPermissions(userId);
  const entityFieldPerms = userPerms.fieldPermissions.get(entity);

  if (!entityFieldPerms) {
    return {};
  }

  const result: Record<string, FieldPermissionResult> = {};
  for (const [fieldName, perms] of entityFieldPerms) {
    result[fieldName] = perms;
  }

  return result;
}

/**
 * Apply field masking to a value
 */
export function maskFieldValue(value: string, pattern?: string): string {
  if (!value) return value;

  if (pattern) {
    // Replace {{last4}} with last 4 characters
    if (pattern.includes("{{last4}}")) {
      const last4 = value.slice(-4);
      return pattern.replace("{{last4}}", last4);
    }
    // Replace {{first4}} with first 4 characters
    if (pattern.includes("{{first4}}")) {
      const first4 = value.slice(0, 4);
      return pattern.replace("{{first4}}", first4);
    }
    return pattern;
  }

  // Default masking: show first and last character with asterisks in between
  if (value.length <= 2) {
    return "*".repeat(value.length);
  }
  return value[0] + "*".repeat(value.length - 2) + value[value.length - 1];
}

/**
 * Filter and mask record fields based on permissions
 */
export async function applyFieldPermissions<T extends Record<string, unknown>>(
  userId: string,
  entity: string,
  record: T
): Promise<Partial<T>> {
  const fieldPerms = await getFieldPermissions(userId, entity);
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(record)) {
    const perm = fieldPerms[key];

    // If no specific permission, allow view by default
    if (!perm || perm.canView) {
      if (perm?.maskValue && typeof value === "string") {
        result[key as keyof T] = maskFieldValue(value, perm.maskPattern) as T[keyof T];
      } else {
        result[key as keyof T] = value as T[keyof T];
      }
    }
  }

  return result;
}

/**
 * Check data sharing rules for additional access
 */
export async function checkDataSharingRules(
  userId: string,
  entity: string,
  action: PermissionAction,
  record: Record<string, unknown>
): Promise<boolean> {
  // Get user's roles and team
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true },
  });

  const userRoles = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { roleId: true },
  });

  const roleIds = userRoles.map((r) => r.roleId);

  // Find applicable sharing rules
  const rules = await prisma.dataSharingRule.findMany({
    where: {
      entity,
      isActive: true,
      actions: { has: action },
      OR: [
        { shareWithType: "public" },
        { shareWithType: "user", shareWithId: userId },
        { shareWithType: "team", shareWithId: user?.teamId || undefined },
        { shareWithType: "role", shareWithId: { in: roleIds } },
      ],
    },
  });

  // Check if any rule grants access
  for (const rule of rules) {
    const conditions = rule.shareConditions as Array<{ field: string; operator: string; value: unknown }>;

    // If no conditions, rule applies
    if (!conditions || conditions.length === 0) {
      return true;
    }

    // Check if all conditions match
    const matches = conditions.every((condition) => {
      const recordValue = record[condition.field];
      switch (condition.operator) {
        case "equals":
          return recordValue === condition.value;
        case "not_equals":
          return recordValue !== condition.value;
        case "contains":
          return String(recordValue).includes(String(condition.value));
        case "in":
          return Array.isArray(condition.value) && condition.value.includes(recordValue);
        default:
          return false;
      }
    });

    if (matches) {
      return true;
    }
  }

  return false;
}

/**
 * Get record access level as a number for comparison
 */
function getRecordAccessLevel(access: RecordAccess): number {
  switch (access) {
    case RecordAccess.ALL:
      return 3;
    case RecordAccess.TEAM:
      return 2;
    case RecordAccess.OWN:
      return 1;
    case RecordAccess.NONE:
      return 0;
    default:
      return 0;
  }
}

/**
 * Create default system roles (call during database seeding)
 */
export async function createDefaultRoles(): Promise<void> {
  const defaultRoles = [
    {
      name: "admin",
      displayName: "Administrator",
      description: "Full system access",
      level: 100,
      type: RoleType.SYSTEM,
      permissions: [
        // All entities, all actions, all records
        { entity: "contacts", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "companies", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "deals", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "quotes", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "tasks", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "products", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "users", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "roles", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "settings", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
      ],
    },
    {
      name: "sales_manager",
      displayName: "Sales Manager",
      description: "Manage sales team and view all records",
      level: 50,
      type: RoleType.SYSTEM,
      permissions: [
        { entity: "contacts", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "companies", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "deals", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "quotes", actions: Object.values(PermissionAction), recordAccess: RecordAccess.ALL },
        { entity: "tasks", actions: Object.values(PermissionAction), recordAccess: RecordAccess.TEAM },
        { entity: "products", actions: [PermissionAction.VIEW], recordAccess: RecordAccess.ALL },
      ],
    },
    {
      name: "sales_rep",
      displayName: "Sales Representative",
      description: "Standard sales user with own record access",
      level: 10,
      type: RoleType.SYSTEM,
      permissions: [
        { entity: "contacts", actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT], recordAccess: RecordAccess.OWN },
        { entity: "companies", actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT], recordAccess: RecordAccess.OWN },
        { entity: "deals", actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT], recordAccess: RecordAccess.OWN },
        { entity: "quotes", actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT], recordAccess: RecordAccess.OWN },
        { entity: "tasks", actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT], recordAccess: RecordAccess.OWN },
        { entity: "products", actions: [PermissionAction.VIEW], recordAccess: RecordAccess.ALL },
      ],
    },
    {
      name: "read_only",
      displayName: "Read Only",
      description: "View-only access to all records",
      level: 1,
      type: RoleType.SYSTEM,
      permissions: [
        { entity: "contacts", actions: [PermissionAction.VIEW], recordAccess: RecordAccess.ALL },
        { entity: "companies", actions: [PermissionAction.VIEW], recordAccess: RecordAccess.ALL },
        { entity: "deals", actions: [PermissionAction.VIEW], recordAccess: RecordAccess.ALL },
        { entity: "quotes", actions: [PermissionAction.VIEW], recordAccess: RecordAccess.ALL },
        { entity: "tasks", actions: [PermissionAction.VIEW], recordAccess: RecordAccess.ALL },
        { entity: "products", actions: [PermissionAction.VIEW], recordAccess: RecordAccess.ALL },
      ],
    },
  ];

  for (const roleData of defaultRoles) {
    // Check if role already exists
    const existing = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (existing) continue;

    // Create role
    const role = await prisma.role.create({
      data: {
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        level: roleData.level,
        type: roleData.type,
      },
    });

    // Create permissions
    for (const perm of roleData.permissions) {
      for (const action of perm.actions) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            entity: perm.entity,
            action,
            recordAccess: perm.recordAccess,
          },
        });
      }
    }
  }
}
