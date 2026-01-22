import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface StorageProvider {
  upload(file: Buffer, filename: string, mimeType: string): Promise<StorageResult>;
  download(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  getUrl(storageKey: string): string;
}

export interface StorageResult {
  storageKey: string;
  url: string;
  size: number;
}

// Local filesystem storage provider
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Buffer, filename: string, mimeType: string): Promise<StorageResult> {
    const ext = path.extname(filename);
    const key = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadDir, key);

    await fs.promises.writeFile(filePath, file);

    return {
      storageKey: key,
      url: `${this.baseUrl}/api/files/${key}`,
      size: file.length,
    };
  }

  async download(storageKey: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, storageKey);
    return fs.promises.readFile(filePath);
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(this.uploadDir, storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  getUrl(storageKey: string): string {
    return `${this.baseUrl}/api/files/${storageKey}`;
  }
}

// S3-compatible storage provider (for future use)
export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private endpoint?: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "";
    this.region = process.env.S3_REGION || "us-east-1";
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
    this.endpoint = process.env.S3_ENDPOINT; // For S3-compatible providers like MinIO
  }

  async upload(file: Buffer, filename: string, mimeType: string): Promise<StorageResult> {
    // This is a placeholder - in production, use AWS SDK or compatible library
    // For now, we'll fall back to local storage
    console.warn("S3 storage not configured, falling back to local storage");
    const localProvider = new LocalStorageProvider();
    return localProvider.upload(file, filename, mimeType);
  }

  async download(storageKey: string): Promise<Buffer> {
    // Placeholder - fall back to local storage
    const localProvider = new LocalStorageProvider();
    return localProvider.download(storageKey);
  }

  async delete(storageKey: string): Promise<void> {
    // Placeholder - fall back to local storage
    const localProvider = new LocalStorageProvider();
    return localProvider.delete(storageKey);
  }

  getUrl(storageKey: string): string {
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${storageKey}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }
}

// Factory function to get the appropriate storage provider
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "s3":
      return new S3StorageProvider();
    case "local":
    default:
      return new LocalStorageProvider();
  }
}

// Helper function to determine file type from MIME type
export function getFileType(mimeType: string): "PDF" | "IMAGE" | "DOCUMENT" | "SPREADSHEET" | "PRESENTATION" | "VIDEO" | "AUDIO" | "OTHER" {
  const type = mimeType.toLowerCase();

  if (type === "application/pdf") {
    return "PDF";
  }

  if (type.startsWith("image/")) {
    return "IMAGE";
  }

  if (type.startsWith("video/")) {
    return "VIDEO";
  }

  if (type.startsWith("audio/")) {
    return "AUDIO";
  }

  // Document types
  if (
    type.includes("word") ||
    type.includes("document") ||
    type === "text/plain" ||
    type === "text/rtf" ||
    type === "application/rtf"
  ) {
    return "DOCUMENT";
  }

  // Spreadsheet types
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "text/csv"
  ) {
    return "SPREADSHEET";
  }

  // Presentation types
  if (type.includes("presentation") || type.includes("powerpoint")) {
    return "PRESENTATION";
  }

  return "OTHER";
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Allowed MIME types for upload
export const ALLOWED_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
  "text/plain",
  // Spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  // Presentations
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
];

// Max file size in bytes (default: 10MB)
export const MAX_FILE_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || "10485760");

// Validate file for upload
export function validateFile(
  file: { size: number; type: string },
  allowedTypes: string[] = ALLOWED_MIME_TYPES,
  maxSize: number = MAX_FILE_SIZE
): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${formatFileSize(maxSize)}`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
}
