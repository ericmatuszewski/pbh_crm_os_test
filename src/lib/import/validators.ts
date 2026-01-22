import { z } from "zod";
import { importRowSchema } from "@/lib/validations";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: z.infer<typeof importRowSchema>;
}

export function validateRow(
  rowData: Record<string, string>,
  columnMapping: Record<string, string>,
  rowNumber: number
): ValidationResult {
  // Map the source columns to target fields
  const mappedData: Record<string, string> = {};

  for (const [sourceColumn, targetField] of Object.entries(columnMapping)) {
    if (targetField && rowData[sourceColumn] !== undefined) {
      mappedData[targetField] = rowData[sourceColumn].trim();
    }
  }

  // Validate with zod schema
  const result = importRowSchema.safeParse(mappedData);

  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `Row ${rowNumber}: ${e.path.join(".")} - ${e.message}`
    );
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [], data: result.data };
}

export function validateStatus(status: string | undefined): string | undefined {
  if (!status) return undefined;

  const normalizedStatus = status.toUpperCase().trim();
  const validStatuses = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "PARTNER"];

  if (validStatuses.includes(normalizedStatus)) {
    return normalizedStatus;
  }

  // Try to map common variations
  const statusMap: Record<string, string> = {
    "NEW": "LEAD",
    "PROSPECT": "LEAD",
    "ACTIVE": "CUSTOMER",
    "CLIENT": "CUSTOMER",
    "LOST": "CHURNED",
    "INACTIVE": "CHURNED",
    "FORMER": "CHURNED",
  };

  return statusMap[normalizedStatus] || undefined;
}

export function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;

  // Remove all non-numeric characters except + at the start
  let normalized = phone.replace(/[^\d+]/g, "");

  // Ensure + is only at the start
  if (normalized.includes("+") && !normalized.startsWith("+")) {
    normalized = normalized.replace(/\+/g, "");
  }

  return normalized || undefined;
}

export function normalizeEmail(email: string | undefined): string | undefined {
  if (!email) return undefined;
  return email.toLowerCase().trim() || undefined;
}

export interface ProcessedRow {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
    companyName?: string;
    status?: string;
    source?: string;
    tags?: string[];
  } | null;
}

export function processRow(
  rowData: Record<string, string>,
  columnMapping: Record<string, string>,
  rowNumber: number
): ProcessedRow {
  const errors: string[] = [];

  // Map the source columns to target fields
  const mappedData: Record<string, string> = {};

  for (const [sourceColumn, targetField] of Object.entries(columnMapping)) {
    if (targetField && rowData[sourceColumn] !== undefined) {
      mappedData[targetField] = rowData[sourceColumn].trim();
    }
  }

  // Required fields check
  if (!mappedData.firstName || mappedData.firstName.length === 0) {
    errors.push(`Row ${rowNumber}: First name is required`);
  }
  if (!mappedData.lastName || mappedData.lastName.length === 0) {
    errors.push(`Row ${rowNumber}: Last name is required`);
  }

  // Validate and normalize fields
  const email = normalizeEmail(mappedData.email);
  if (mappedData.email && !email) {
    errors.push(`Row ${rowNumber}: Invalid email format`);
  }

  const phone = normalizePhone(mappedData.phone);
  const status = validateStatus(mappedData.status);

  // Parse tags if comma-separated
  const tags = mappedData.tags
    ? mappedData.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : undefined;

  if (errors.length > 0) {
    return { rowNumber, isValid: false, errors, data: null };
  }

  return {
    rowNumber,
    isValid: true,
    errors: [],
    data: {
      firstName: mappedData.firstName,
      lastName: mappedData.lastName,
      email,
      phone,
      title: mappedData.title || undefined,
      companyName: mappedData.companyName || undefined,
      status,
      source: mappedData.source || undefined,
      tags,
    },
  };
}
