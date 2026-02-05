/**
 * Prisma Middleware for Automatic PII Encryption
 *
 * Automatically encrypts sensitive fields on write operations
 * and decrypts them on read operations.
 */

import type { Prisma } from "@prisma/client";
import {
  encryptModelFields,
  decryptModelFields,
  decryptRecords,
  ENCRYPTED_FIELDS,
  isEncryptionConfigured,
} from "@/lib/crypto/pii-encryption";

// Models that have encrypted fields
const MODELS_WITH_ENCRYPTION = Object.keys(ENCRYPTED_FIELDS);

/**
 * Check if a model has encrypted fields
 */
function hasEncryptedFields(model: string): boolean {
  return MODELS_WITH_ENCRYPTION.includes(model);
}

/**
 * Encryption middleware for Prisma
 * Add to prisma client: prisma.$use(encryptionMiddleware)
 */
export async function encryptionMiddleware(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<unknown>
): Promise<unknown> {
  // Skip if encryption not configured
  if (!isEncryptionConfigured()) {
    return next(params);
  }

  const model = params.model;
  if (!model || !hasEncryptedFields(model)) {
    return next(params);
  }

  // Encrypt data on write operations
  if (params.action === "create" || params.action === "update" || params.action === "upsert") {
    if (params.args.data) {
      params.args.data = encryptModelFields(model, params.args.data as Record<string, unknown>);
    }
  }

  if (params.action === "createMany" && params.args.data) {
    if (Array.isArray(params.args.data)) {
      params.args.data = params.args.data.map((item: Record<string, unknown>) =>
        encryptModelFields(model, item)
      );
    }
  }

  if (params.action === "updateMany" && params.args.data) {
    params.args.data = encryptModelFields(model, params.args.data as Record<string, unknown>);
  }

  // Execute the query
  const result = await next(params);

  // Decrypt data on read operations
  if (result && typeof result === "object") {
    if (
      params.action === "findUnique" ||
      params.action === "findFirst" ||
      params.action === "create" ||
      params.action === "update" ||
      params.action === "upsert"
    ) {
      return decryptModelFields(model, result as Record<string, unknown>);
    }

    if (params.action === "findMany") {
      return decryptRecords(model, result as Record<string, unknown>[]);
    }
  }

  return result;
}

export default encryptionMiddleware;
