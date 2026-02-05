/**
 * Field-Level Encryption for PII (Personally Identifiable Information)
 *
 * Encrypts sensitive contact data at rest using AES-256-GCM
 * with authenticated encryption for tamper detection.
 */

import crypto from "crypto";

// Encryption key from environment (should be 32 bytes for AES-256)
const PII_ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY || process.env.CONNECTOR_ENCRYPTION_KEY || "";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

// Fields to encrypt per model
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Contact: ["email", "phone", "address"],
  Company: ["taxId"],
  User: ["phoneNumber"],
};

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return PII_ENCRYPTION_KEY.length >= 32;
}

/**
 * Derive encryption key from the configured key
 */
function getEncryptionKey(): Buffer {
  if (!isEncryptionConfigured()) {
    throw new Error("PII encryption key not configured. Set PII_ENCRYPTION_KEY environment variable (min 32 chars).");
  }
  // Use first 32 bytes of the key
  return Buffer.from(PII_ENCRYPTION_KEY.slice(0, 32), "utf8");
}

/**
 * Encrypt a string value
 * Returns format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptField(value: string): string {
  if (!value) return value;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string value
 * Expects format: iv:authTag:ciphertext (all hex encoded)
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue;

  // Check if value looks encrypted (has the right format)
  if (!isEncryptedValue(encryptedValue)) {
    // Return as-is if not encrypted (for backwards compatibility)
    return encryptedValue;
  }

  const [ivHex, authTagHex, ciphertext] = encryptedValue.split(":");

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error("Invalid encrypted value format");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a value appears to be encrypted (matches our format)
 */
export function isEncryptedValue(value: string): boolean {
  if (typeof value !== "string") return false;

  const parts = value.split(":");
  if (parts.length !== 3) return false;

  const [ivHex, authTagHex, ciphertext] = parts;

  // IV should be 24 hex chars (12 bytes)
  // Auth tag should be 32 hex chars (16 bytes)
  // Ciphertext should be hex
  return (
    ivHex.length === IV_LENGTH * 2 &&
    authTagHex.length === AUTH_TAG_LENGTH * 2 &&
    /^[0-9a-f]+$/.test(ivHex) &&
    /^[0-9a-f]+$/.test(authTagHex) &&
    /^[0-9a-f]+$/.test(ciphertext)
  );
}

/**
 * Encrypt multiple fields in an object
 */
export function encryptFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToEncrypt: string[]
): T {
  if (!isEncryptionConfigured()) {
    // Skip encryption if not configured
    return data;
  }

  const result = { ...data };

  for (const field of fieldsToEncrypt) {
    if (field in result && typeof result[field] === "string" && result[field]) {
      const value = result[field] as string;
      // Don't re-encrypt already encrypted values
      if (!isEncryptedValue(value)) {
        (result as Record<string, unknown>)[field] = encryptField(value);
      }
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in an object
 */
export function decryptFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToDecrypt: string[]
): T {
  if (!isEncryptionConfigured()) {
    return data;
  }

  const result = { ...data };

  for (const field of fieldsToDecrypt) {
    if (field in result && typeof result[field] === "string" && result[field]) {
      const value = result[field] as string;
      if (isEncryptedValue(value)) {
        try {
          (result as Record<string, unknown>)[field] = decryptField(value);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Leave as-is on decryption error
        }
      }
    }
  }

  return result;
}

/**
 * Encrypt sensitive fields for a specific model
 */
export function encryptModelFields<T extends Record<string, unknown>>(
  modelName: string,
  data: T
): T {
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields || fields.length === 0) {
    return data;
  }
  return encryptFields(data, fields);
}

/**
 * Decrypt sensitive fields for a specific model
 */
export function decryptModelFields<T extends Record<string, unknown>>(
  modelName: string,
  data: T
): T {
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields || fields.length === 0) {
    return data;
  }
  return decryptFields(data, fields);
}

/**
 * Decrypt an array of records
 */
export function decryptRecords<T extends Record<string, unknown>>(
  modelName: string,
  records: T[]
): T[] {
  return records.map((record) => decryptModelFields(modelName, record));
}

/**
 * Create a searchable hash for encrypted fields (for lookups)
 * Note: This is a one-way hash, useful for exact match lookups only
 */
export function createSearchableHash(value: string): string {
  if (!value) return "";
  const normalized = value.toLowerCase().trim();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Mask a decrypted value for display (e.g., show only last 4 chars)
 */
export function maskValue(value: string, showLastN: number = 4): string {
  if (!value || value.length <= showLastN) {
    return "*".repeat(value?.length || 0);
  }
  return "*".repeat(value.length - showLastN) + value.slice(-showLastN);
}

/**
 * Mask email for display (e.g., j***@example.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return maskValue(email);

  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${"*".repeat(local.length - 2)}${local.slice(-1)}@${domain}`;
}

/**
 * Mask phone number for display (e.g., ***-***-1234)
 */
export function maskPhone(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) {
    return maskValue(phone);
  }
  // Show last 4 digits
  const masked = "*".repeat(digits.length - 4) + digits.slice(-4);
  // Try to format like original if it had dashes/spaces
  if (phone.includes("-")) {
    return masked.replace(/(.{3})(.{3})(.{4})/, "$1-$2-$3");
  }
  return masked;
}
