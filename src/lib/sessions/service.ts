import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit/logger";

export interface DeviceInfo {
  deviceName?: string;
  deviceType?: string; // desktop, mobile, tablet
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
}

export interface LocationInfo {
  ipAddress?: string;
  country?: string;
  city?: string;
}

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const info: DeviceInfo = {};

  // Detect device type
  if (/mobile/i.test(userAgent)) {
    info.deviceType = "mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    info.deviceType = "tablet";
  } else {
    info.deviceType = "desktop";
  }

  // Detect browser
  if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) {
    info.browser = "Chrome";
    const match = userAgent.match(/chrome\/([\d.]+)/i);
    if (match) info.browserVersion = match[1];
  } else if (/firefox/i.test(userAgent)) {
    info.browser = "Firefox";
    const match = userAgent.match(/firefox\/([\d.]+)/i);
    if (match) info.browserVersion = match[1];
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    info.browser = "Safari";
    const match = userAgent.match(/version\/([\d.]+)/i);
    if (match) info.browserVersion = match[1];
  } else if (/edge|edg/i.test(userAgent)) {
    info.browser = "Edge";
    const match = userAgent.match(/(?:edge|edg)\/([\d.]+)/i);
    if (match) info.browserVersion = match[1];
  }

  // Detect OS
  if (/windows/i.test(userAgent)) {
    info.os = "Windows";
    if (/windows nt 10/i.test(userAgent)) info.osVersion = "10";
    else if (/windows nt 11/i.test(userAgent)) info.osVersion = "11";
  } else if (/macintosh|mac os/i.test(userAgent)) {
    info.os = "macOS";
    const match = userAgent.match(/mac os x ([\d_]+)/i);
    if (match) info.osVersion = match[1].replace(/_/g, ".");
  } else if (/linux/i.test(userAgent)) {
    info.os = "Linux";
  } else if (/iphone|ipad/i.test(userAgent)) {
    info.os = "iOS";
    const match = userAgent.match(/os ([\d_]+)/i);
    if (match) info.osVersion = match[1].replace(/_/g, ".");
  } else if (/android/i.test(userAgent)) {
    info.os = "Android";
    const match = userAgent.match(/android ([\d.]+)/i);
    if (match) info.osVersion = match[1];
  }

  // Generate device name
  info.deviceName = [info.browser, "on", info.os].filter(Boolean).join(" ");

  return info;
}

/**
 * Create or update a user session
 */
export async function createUserSession(
  sessionToken: string,
  userId: string,
  userAgent: string,
  location: LocationInfo,
  expiresAt: Date
) {
  const deviceInfo = parseUserAgent(userAgent);

  // Check if session already exists
  const existing = await prisma.userSession.findUnique({
    where: { sessionToken },
  });

  if (existing) {
    // Update existing session
    return prisma.userSession.update({
      where: { sessionToken },
      data: {
        lastActiveAt: new Date(),
        ...deviceInfo,
        ...location,
      },
    });
  }

  // Create new session
  return prisma.userSession.create({
    data: {
      sessionToken,
      userId,
      expiresAt,
      ...deviceInfo,
      ...location,
    },
  });
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(sessionToken: string) {
  return prisma.userSession.update({
    where: { sessionToken },
    data: { lastActiveAt: new Date() },
  });
}

/**
 * Get all active sessions for a user
 */
export async function getActiveSessions(userId: string) {
  return prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActiveAt: "desc" },
  });
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionToken: string,
  revokedById: string,
  reason?: string
) {
  const session = await prisma.userSession.findUnique({
    where: { sessionToken },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Update UserSession
  await prisma.userSession.update({
    where: { sessionToken },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedById,
      revokedReason: reason,
    },
  });

  // Also delete from NextAuth Session table to actually invalidate
  await prisma.session.deleteMany({
    where: { sessionToken },
  });

  // Log the revocation
  await logAudit(
    {
      action: "DELETE",
      entity: "user_session",
      entityId: session.id,
      metadata: {
        type: "session_revoked",
        revokedUserId: session.userId,
        reason,
      },
    },
    { userId: revokedById }
  );

  return session;
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(
  userId: string,
  revokedById: string,
  reason?: string,
  excludeSessionToken?: string
) {
  const where = {
    userId,
    isActive: true,
    ...(excludeSessionToken && {
      sessionToken: { not: excludeSessionToken },
    }),
  };

  // Get sessions to revoke
  const sessions = await prisma.userSession.findMany({ where });

  if (sessions.length === 0) {
    return { count: 0 };
  }

  // Update UserSessions
  await prisma.userSession.updateMany({
    where,
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedById,
      revokedReason: reason || "All sessions revoked",
    },
  });

  // Delete from NextAuth Session table
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(excludeSessionToken && {
        sessionToken: { not: excludeSessionToken },
      }),
    },
  });

  // Log the bulk revocation
  await logAudit(
    {
      action: "DELETE",
      entity: "user_session",
      entityId: userId,
      metadata: {
        type: "all_sessions_revoked",
        count: sessions.length,
        reason,
      },
    },
    { userId: revokedById }
  );

  return { count: sessions.length };
}

/**
 * Get session by token
 */
export async function getSessionByToken(sessionToken: string) {
  return prisma.userSession.findUnique({
    where: { sessionToken },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions() {
  const result = await prisma.userSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isActive: false, revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // 30 days old revoked sessions
      ],
    },
  });

  return result.count;
}

/**
 * Get session statistics for admin
 */
export async function getSessionStats() {
  const [totalActive, byDeviceType, recentLogins] = await Promise.all([
    prisma.userSession.count({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    }),
    prisma.userSession.groupBy({
      by: ["deviceType"],
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      _count: true,
    }),
    prisma.userSession.findMany({
      where: {
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    totalActive,
    byDeviceType: byDeviceType.reduce((acc, item) => {
      acc[item.deviceType || "unknown"] = item._count;
      return acc;
    }, {} as Record<string, number>),
    recentLogins,
  };
}

export default {
  parseUserAgent,
  createUserSession,
  updateSessionActivity,
  getActiveSessions,
  revokeSession,
  revokeAllUserSessions,
  getSessionByToken,
  cleanupExpiredSessions,
  getSessionStats,
};
