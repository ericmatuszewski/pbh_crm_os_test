/**
 * Encryption Utility for Sensitive Data
 * Uses AES-256-CBC encryption for database credentials and other sensitive configuration
 */

import crypto from "crypto";

// Use a dedicated key for connector encryption, fallback to Microsoft token key
const ENCRYPTION_KEY =
  process.env.CONNECTOR_ENCRYPTION_KEY ||
  process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY ||
  "default-key-change-in-production";

const SALT = "connector-salt-v1";

/**
 * Encrypt sensitive data for storage
 * @param data - Plain text data to encrypt
 * @returns Encrypted string in format "iv:encryptedData"
 */
export function encrypt(data: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, SALT, 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt data from storage
 * @param encryptedData - Encrypted string in format "iv:encryptedData"
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  const [ivHex, encrypted] = encryptedData.split(":");
  if (!ivHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const key = crypto.scryptSync(ENCRYPTION_KEY, SALT, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Check if a string appears to be encrypted (matches iv:data format)
 */
export function isEncrypted(data: string): boolean {
  if (typeof data !== "string") return false;
  const parts = data.split(":");
  if (parts.length !== 2) return false;
  // IV should be 32 hex chars (16 bytes)
  return parts[0].length === 32 && /^[0-9a-f]+$/.test(parts[0]);
}

/**
 * Encrypt an object (JSON stringify, then encrypt)
 */
export function encryptObject<T>(obj: T): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt to an object (decrypt, then JSON parse)
 */
export function decryptObject<T>(encryptedData: string): T {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted) as T;
}
