import prisma from "@/lib/prisma";
import { logAudit, logUpdate } from "@/lib/audit/logger";
import { Prisma, UserStatus } from "@prisma/client";

export interface ListUsersOptions {
  search?: string;
  status?: UserStatus;
  businessId?: string;
  teamId?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  timezone?: string;
  status?: UserStatus;
}

/**
 * Get a user by ID with their roles and business memberships
 */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      businesses: {
        include: {
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      teamMemberships: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

/**
 * List users with search, filtering, and pagination
 */
export async function listUsers(options: ListUsersOptions = {}) {
  const { search, status, businessId, teamId, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    deletedAt: null, // Exclude soft-deleted users
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (businessId) {
    where.businesses = {
      some: { businessId },
    };
  }

  if (teamId) {
    where.OR = [
      { teamId },
      { teamMemberships: { some: { teamId } } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        businesses: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            deals: true,
            tasks: true,
            activities: true,
          },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update a user's details
 */
export async function updateUser(
  userId: string,
  data: UpdateUserData,
  updatedById: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  // Log the update
  await logUpdate(
    "user",
    userId,
    user as Record<string, unknown>,
    updated as Record<string, unknown>,
    { userId: updatedById }
  );

  return updated;
}

/**
 * Change a user's status (activate, deactivate, lock)
 */
export async function changeUserStatus(
  userId: string,
  newStatus: UserStatus,
  reason: string | null,
  changedById: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const updateData: Prisma.UserUpdateInput = {
    status: newStatus,
  };

  if (newStatus === "LOCKED") {
    updateData.lockedAt = new Date();
    updateData.lockedReason = reason;
  } else if (newStatus === "ACTIVE") {
    updateData.lockedAt = null;
    updateData.lockedReason = null;
    updateData.failedLoginCount = 0;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  // Log the status change
  await logAudit(
    {
      action: "UPDATE",
      entity: "user",
      entityId: userId,
      previousValues: { status: user.status },
      newValues: { status: newStatus, reason },
      metadata: { type: "status_change" },
    },
    { userId: changedById }
  );

  return updated;
}

/**
 * Soft delete a user
 */
export async function deactivateUser(userId: string, deletedById: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      status: "INACTIVE",
      deletedAt: new Date(),
    },
  });

  await logAudit(
    {
      action: "DELETE",
      entity: "user",
      entityId: userId,
      previousValues: user as Record<string, unknown>,
      metadata: { type: "soft_delete" },
    },
    { userId: deletedById }
  );

  return updated;
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(userId: string) {
  const [
    dealsCount,
    tasksCount,
    activitiesCount,
    quotesCount,
    lastLogin,
    recentActivities,
  ] = await Promise.all([
    prisma.deal.count({ where: { ownerId: userId } }),
    prisma.task.count({ where: { assigneeId: userId } }),
    prisma.activity.count({ where: { userId } }),
    prisma.quote.count({ where: { createdById: userId } }),
    prisma.loginHistory.findFirst({
      where: { userId, success: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        deal: { select: { title: true } },
      },
    }),
  ]);

  return {
    counts: {
      deals: dealsCount,
      tasks: tasksCount,
      activities: activitiesCount,
      quotes: quotesCount,
    },
    lastLogin: lastLogin?.createdAt || null,
    recentActivities,
  };
}

/**
 * Record a failed login attempt
 */
export async function recordFailedLogin(userId: string, maxAttempts: number = 5) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const newCount = user.failedLoginCount + 1;
  const shouldLock = newCount >= maxAttempts;

  return prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: newCount,
      ...(shouldLock && {
        status: "LOCKED",
        lockedAt: new Date(),
        lockedReason: `Too many failed login attempts (${maxAttempts})`,
      }),
    },
  });
}

/**
 * Record a successful login
 */
export async function recordSuccessfulLogin(userId: string, ipAddress: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
      failedLoginCount: 0,
    },
  });
}

const userService = {
  getUserById,
  listUsers,
  updateUser,
  changeUserStatus,
  deactivateUser,
  getUserActivitySummary,
  recordFailedLogin,
  recordSuccessfulLogin,
};

export default userService;
