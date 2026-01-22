/**
 * UK Localisation Utilities
 *
 * Provides UK-specific formatting and validation for:
 * - Dates (DD/MM/YYYY, "15 January 2024")
 * - Currency (GBP with £ symbol)
 * - Postcodes (SW1A 2AA format)
 * - Phone numbers (+44 format)
 * - VAT numbers (GB123456789 format)
 */

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format a date in UK format (15 January 2024)
 */
export function formatDateUK(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a date in short UK format (15/01/2024)
 */
export function formatDateShortUK(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a date with time in UK format (15 January 2024 at 14:30)
 */
export function formatDateTimeUK(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const dateStr = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeStr = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Format a relative date (Today, Yesterday, or date)
 */
export function formatRelativeDateUK(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDateUK(d);
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format currency with correct locale based on currency code
 */
export function formatCurrencyUK(
  amount: number | string | null | undefined,
  currency: string = "GBP"
): string {
  if (amount === null || amount === undefined || amount === "") return "";

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "";

  // Use appropriate locale for the currency
  const locale = getLocaleForCurrency(currency);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Get the appropriate locale for a currency
 */
function getLocaleForCurrency(currency: string): string {
  const currencyLocales: Record<string, string> = {
    GBP: "en-GB",
    USD: "en-US",
    EUR: "de-DE", // Euro with European formatting
    CAD: "en-CA",
    AUD: "en-AU",
  };
  return currencyLocales[currency] || "en-GB";
}

/**
 * Format a number with UK thousands separator
 */
export function formatNumberUK(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || value === "") return "";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";

  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format percentage
 */
export function formatPercentageUK(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || value === "") return "";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";

  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100);
}

// ============================================================================
// UK POSTCODE VALIDATION
// ============================================================================

/**
 * UK postcode regex pattern
 * Matches formats like: SW1A 2AA, M1 1AE, B33 8TH, CR2 6XH, DN55 1PT
 */
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i;

/**
 * Validate a UK postcode
 */
export function isValidUKPostcode(postcode: string | null | undefined): boolean {
  if (!postcode) return false;
  return UK_POSTCODE_REGEX.test(postcode.trim());
}

/**
 * Format a UK postcode (add space in correct position)
 */
export function formatUKPostcode(postcode: string | null | undefined): string {
  if (!postcode) return "";

  // Remove all spaces and convert to uppercase
  const cleaned = postcode.replace(/\s/g, "").toUpperCase();

  if (cleaned.length < 5 || cleaned.length > 7) return cleaned;

  // Insert space before the last 3 characters
  const outward = cleaned.slice(0, -3);
  const inward = cleaned.slice(-3);

  return `${outward} ${inward}`;
}

/**
 * Validate and format a UK postcode, returns null if invalid
 */
export function validateAndFormatUKPostcode(postcode: string | null | undefined): string | null {
  if (!postcode) return null;

  const formatted = formatUKPostcode(postcode);
  return isValidUKPostcode(formatted) ? formatted : null;
}

// ============================================================================
// UK PHONE NUMBER VALIDATION
// ============================================================================

/**
 * UK phone number patterns
 * Supports: 020 XXXX XXXX, 0121 XXX XXXX, 07XXX XXXXXX, +44 XX XXXX XXXX
 */
const UK_PHONE_PATTERNS = [
  /^0[1-9]\d{8,9}$/, // UK landline without spaces
  /^07\d{9}$/, // UK mobile without spaces
  /^\+44[1-9]\d{8,9}$/, // International format without spaces
  /^44[1-9]\d{8,9}$/, // International format without + or spaces
];

/**
 * Validate a UK phone number
 */
export function isValidUKPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  return UK_PHONE_PATTERNS.some(pattern => pattern.test(cleaned));
}

/**
 * Format a UK phone number for display
 */
export function formatUKPhone(phone: string | null | undefined): string {
  if (!phone) return "";

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Convert +44 to 0
  if (cleaned.startsWith("+44")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("44") && cleaned.length > 10) {
    cleaned = "0" + cleaned.slice(2);
  }

  // Format based on number type
  if (cleaned.startsWith("02")) {
    // London/other 02X numbers: 020 XXXX XXXX
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
    }
  } else if (cleaned.startsWith("01") || cleaned.startsWith("03")) {
    // Other landlines: 01onal XXX XXXX or 01234 XXXXXX
    if (cleaned.length === 11) {
      // Check if it's a 4-digit area code (most are)
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    } else if (cleaned.length === 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
  } else if (cleaned.startsWith("07")) {
    // Mobile: 07XXX XXXXXX
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
  }

  return cleaned;
}

/**
 * Convert UK phone to international format (+44)
 */
export function formatUKPhoneInternational(phone: string | null | undefined): string {
  if (!phone) return "";

  // Remove all non-digit characters
  let cleaned = phone.replace(/[^\d]/g, "");

  // Remove leading 0 and add +44
  if (cleaned.startsWith("0")) {
    cleaned = "44" + cleaned.slice(1);
  }

  // Add + prefix
  if (!cleaned.startsWith("44")) {
    return phone; // Return as-is if not recognizable
  }

  return `+${cleaned}`;
}

// ============================================================================
// UK VAT NUMBER VALIDATION
// ============================================================================

/**
 * UK VAT number patterns
 * Standard: GB123456789 (9 digits)
 * Branch: GB123456789 123 (9 digits + 3 digit branch)
 * Government: GBGD001 to GBGD499
 * Health Authority: GBHA500 to GBHA999
 */
const UK_VAT_PATTERNS = [
  /^GB\d{9}$/, // Standard 9 digits
  /^GB\d{12}$/, // With 3 digit branch
  /^GBGD[0-4]\d{2}$/, // Government departments
  /^GBHA[5-9]\d{2}$/, // Health authorities
];

/**
 * Validate a UK VAT number
 */
export function isValidUKVATNumber(vatNumber: string | null | undefined): boolean {
  if (!vatNumber) return false;

  // Remove spaces and convert to uppercase
  const cleaned = vatNumber.replace(/\s/g, "").toUpperCase();

  return UK_VAT_PATTERNS.some(pattern => pattern.test(cleaned));
}

/**
 * Format a UK VAT number for display
 */
export function formatUKVATNumber(vatNumber: string | null | undefined): string {
  if (!vatNumber) return "";

  // Remove spaces and convert to uppercase
  let cleaned = vatNumber.replace(/\s/g, "").toUpperCase();

  // Add GB prefix if missing and looks like a VAT number
  if (/^\d{9,12}$/.test(cleaned)) {
    cleaned = "GB" + cleaned;
  }

  // Format: GB 123 456 789 or GB 123 456 789 123
  if (/^GB\d{9}$/.test(cleaned)) {
    return `GB ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  } else if (/^GB\d{12}$/.test(cleaned)) {
    return `GB ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 11)} ${cleaned.slice(11)}`;
  }

  return cleaned;
}

/**
 * Validate and format a UK VAT number, returns null if invalid
 */
export function validateAndFormatUKVATNumber(vatNumber: string | null | undefined): string | null {
  if (!vatNumber) return null;

  // Remove spaces and convert to uppercase
  let cleaned = vatNumber.replace(/\s/g, "").toUpperCase();

  // Add GB prefix if missing
  if (/^\d{9,12}$/.test(cleaned)) {
    cleaned = "GB" + cleaned;
  }

  return isValidUKVATNumber(cleaned) ? formatUKVATNumber(cleaned) : null;
}

// ============================================================================
// UK COMPANY NUMBER VALIDATION
// ============================================================================

/**
 * UK Company Registration Number (CRN) patterns
 * Standard: 8 digits (e.g., 12345678)
 * With prefix: SC123456 (Scotland), NI123456 (Northern Ireland), etc.
 */
const UK_COMPANY_NUMBER_REGEX = /^([A-Z]{2})?\d{6,8}$/i;

/**
 * Validate a UK company registration number
 */
export function isValidUKCompanyNumber(companyNumber: string | null | undefined): boolean {
  if (!companyNumber) return false;

  const cleaned = companyNumber.replace(/\s/g, "").toUpperCase();
  return UK_COMPANY_NUMBER_REGEX.test(cleaned);
}

/**
 * Format a UK company registration number
 */
export function formatUKCompanyNumber(companyNumber: string | null | undefined): string {
  if (!companyNumber) return "";

  let cleaned = companyNumber.replace(/\s/g, "").toUpperCase();

  // Pad numeric-only numbers to 8 digits
  if (/^\d+$/.test(cleaned) && cleaned.length < 8) {
    cleaned = cleaned.padStart(8, "0");
  }

  return cleaned;
}

// ============================================================================
// UK ADDRESS FORMATTING
// ============================================================================

export interface UKAddress {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
}

/**
 * Format a UK address for display (multi-line)
 */
export function formatUKAddress(address: UKAddress, separator: string = "\n"): string {
  const parts: string[] = [];

  if (address.addressLine1) parts.push(address.addressLine1);
  if (address.addressLine2) parts.push(address.addressLine2);
  if (address.city) parts.push(address.city);
  if (address.county) parts.push(address.county);
  if (address.postcode) parts.push(formatUKPostcode(address.postcode));
  if (address.country && address.country !== "United Kingdom" && address.country !== "UK") {
    parts.push(address.country);
  }

  return parts.join(separator);
}

/**
 * Format a UK address for single line display
 */
export function formatUKAddressSingleLine(address: UKAddress): string {
  return formatUKAddress(address, ", ");
}

// ============================================================================
// DEFAULT UK VALUES
// ============================================================================

export const UK_DEFAULTS = {
  currency: "GBP",
  timezone: "Europe/London",
  country: "United Kingdom",
  vatRate: 20, // Standard UK VAT rate
  locale: "en-GB",
  dateFormat: "dd/MM/yyyy",
  currencySymbol: "£",
};

// ============================================================================
// EXPORTS
// ============================================================================

const ukLocale = {
  // Date
  formatDateUK,
  formatDateShortUK,
  formatDateTimeUK,
  formatRelativeDateUK,

  // Currency
  formatCurrencyUK,
  formatNumberUK,
  formatPercentageUK,

  // Postcode
  isValidUKPostcode,
  formatUKPostcode,
  validateAndFormatUKPostcode,

  // Phone
  isValidUKPhone,
  formatUKPhone,
  formatUKPhoneInternational,

  // VAT
  isValidUKVATNumber,
  formatUKVATNumber,
  validateAndFormatUKVATNumber,

  // Company Number
  isValidUKCompanyNumber,
  formatUKCompanyNumber,

  // Address
  formatUKAddress,
  formatUKAddressSingleLine,

  // Defaults
  UK_DEFAULTS,
};

export default ukLocale;
