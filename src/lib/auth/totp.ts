/**
 * TOTP (Time-based One-Time Password) Implementation
 * RFC 6238 compliant for MFA/2FA authentication
 */

import crypto from "crypto";
import { encrypt, decrypt } from "@/lib/crypto/encryption";

// TOTP Configuration
const TOTP_CONFIG = {
  digits: 6,
  period: 30, // seconds
  algorithm: "sha1" as const,
  issuer: "PBH Sales CRM",
};

// Backup codes configuration
const BACKUP_CODES_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

/**
 * Generate a random base32-encoded secret for TOTP
 */
export function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate TOTP code for current time
 */
export function generateTOTP(secret: string, time?: number): string {
  const currentTime = time ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(currentTime / TOTP_CONFIG.period);
  return generateHOTP(secret, counter);
}

/**
 * Verify a TOTP code with time window tolerance
 * @param secret - Base32 encoded secret
 * @param token - User provided token
 * @param window - Number of periods to check before/after (default: 1)
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(currentTime / TOTP_CONFIG.period);

  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const expectedToken = generateHOTP(secret, currentCounter + i);
    if (constantTimeCompare(token, expectedToken)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate HOTP (HMAC-based One-Time Password)
 */
function generateHOTP(secret: string, counter: number): string {
  const decodedSecret = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac(TOTP_CONFIG.algorithm, decodedSecret);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_CONFIG.digits);
  return otp.toString().padStart(TOTP_CONFIG.digits, "0");
}

/**
 * Generate otpauth:// URI for QR code generation
 */
export function generateOTPAuthURI(secret: string, userEmail: string): string {
  const encodedIssuer = encodeURIComponent(TOTP_CONFIG.issuer);
  const encodedEmail = encodeURIComponent(userEmail);
  const label = `${encodedIssuer}:${encodedEmail}`;

  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${TOTP_CONFIG.algorithm.toUpperCase()}&digits=${TOTP_CONFIG.digits}&period=${TOTP_CONFIG.period}`;
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    const code = crypto.randomBytes(BACKUP_CODE_LENGTH / 2).toString("hex").toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 */
export function hashBackupCode(code: string): string {
  const normalized = code.replace(/-/g, "").toUpperCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Verify a backup code against hashed codes
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; usedIndex: number } {
  const normalized = code.replace(/-/g, "").toUpperCase();
  const hash = crypto.createHash("sha256").update(normalized).digest("hex");

  const index = hashedCodes.indexOf(hash);
  return { valid: index !== -1, usedIndex: index };
}

/**
 * Encrypt MFA secret for database storage
 */
export function encryptMFASecret(secret: string): string {
  return encrypt(secret);
}

/**
 * Decrypt MFA secret from database
 */
export function decryptMFASecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}

/**
 * Base32 encoding (RFC 4648)
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleanedInput = encoded.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleanedInput) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * MFA setup result type
 */
export interface MFASetupResult {
  secret: string;
  encryptedSecret: string;
  otpauthUri: string;
  backupCodes: string[];
  hashedBackupCodes: string[];
}

/**
 * Complete MFA setup - generates all required data
 */
export function setupMFA(userEmail: string): MFASetupResult {
  const secret = generateSecret();
  const encryptedSecret = encryptMFASecret(secret);
  const otpauthUri = generateOTPAuthURI(secret, userEmail);
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = backupCodes.map(hashBackupCode);

  return {
    secret,
    encryptedSecret,
    otpauthUri,
    backupCodes,
    hashedBackupCodes,
  };
}
