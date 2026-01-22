import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Generate a secure API key
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `sk_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 11); // "sk_" + 8 chars
  const hash = hashApiKey(key);

  return { key, prefix, hash };
}

// Hash an API key for storage
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Verify an API key and return the key record
export async function verifyApiKey(key: string): Promise<{
  valid: boolean;
  keyId?: string;
  userId?: string;
  scopes?: string[];
  error?: string;
}> {
  if (!key || !key.startsWith("sk_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const hash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
  });

  if (!apiKey) {
    return { valid: false, error: "API key not found" };
  }

  if (!apiKey.isActive) {
    return { valid: false, error: "API key is inactive" };
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });

  return {
    valid: true,
    keyId: apiKey.id,
    userId: apiKey.userId,
    scopes: apiKey.scopes,
  };
}

// Check rate limit for an API key
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (windowSeconds * 1000)) * (windowSeconds * 1000)
  );
  const windowEnd = new Date(windowStart.getTime() + windowSeconds * 1000);

  // Find or create rate limit log
  const existingLog = await prisma.rateLimitLog.findUnique({
    where: {
      identifier_endpoint_windowStart: {
        identifier,
        endpoint,
        windowStart,
      },
    },
  });

  if (existingLog) {
    if (existingLog.requestCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowEnd,
      };
    }

    await prisma.rateLimitLog.update({
      where: { id: existingLog.id },
      data: { requestCount: { increment: 1 } },
    });

    return {
      allowed: true,
      remaining: limit - existingLog.requestCount - 1,
      resetAt: windowEnd,
    };
  }

  await prisma.rateLimitLog.create({
    data: {
      identifier,
      endpoint,
      requestCount: 1,
      windowStart,
      windowEnd,
    },
  });

  return {
    allowed: true,
    remaining: limit - 1,
    resetAt: windowEnd,
  };
}

// Check if scope is allowed
export function hasScope(userScopes: string[], requiredScope: string): boolean {
  // Admin scope has access to everything
  if (userScopes.includes("admin")) return true;

  // Write scope includes read
  if (requiredScope === "read" && userScopes.includes("write")) return true;

  // Delete scope includes write and read
  if (requiredScope === "read" && userScopes.includes("delete")) return true;
  if (requiredScope === "write" && userScopes.includes("delete")) return true;

  return userScopes.includes(requiredScope);
}

// Generate OAuth client credentials
export function generateClientCredentials(): {
  clientId: string;
  clientSecret: string;
  clientSecretHash: string;
} {
  const clientId = `client_${crypto.randomBytes(16).toString("hex")}`;
  const clientSecret = `secret_${crypto.randomBytes(32).toString("hex")}`;
  const clientSecretHash = crypto
    .createHash("sha256")
    .update(clientSecret)
    .digest("hex");

  return { clientId, clientSecret, clientSecretHash };
}

// Generate access token
export function generateAccessToken(): {
  accessToken: string;
  accessTokenHash: string;
} {
  const accessToken = `at_${crypto.randomBytes(32).toString("hex")}`;
  const accessTokenHash = crypto
    .createHash("sha256")
    .update(accessToken)
    .digest("hex");

  return { accessToken, accessTokenHash };
}

// Generate refresh token
export function generateRefreshToken(): {
  refreshToken: string;
  refreshTokenHash: string;
} {
  const refreshToken = `rt_${crypto.randomBytes(32).toString("hex")}`;
  const refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  return { refreshToken, refreshTokenHash };
}

// Clean up expired rate limit logs (to be run periodically)
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await prisma.rateLimitLog.deleteMany({
    where: {
      windowEnd: { lt: new Date() },
    },
  });
  return result.count;
}
