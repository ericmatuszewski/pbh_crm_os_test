/**
 * Merge Field Processor for Quote PDFs
 * Processes template strings with {{field}} placeholders
 */

export interface QuoteMergeData {
  quote: {
    quoteNumber: string;
    title: string;
    issueDate: Date;
    validUntil: Date;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    currency: string;
    status: string;
  };
  contact?: {
    firstName: string;
    lastName: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    title: string | null;
  } | null;
  company?: {
    name: string;
    website: string | null;
    industry: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  business: {
    name: string;
    legalName: string | null;
    tradingName: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    vatNumber: string | null;
    companyNumber: string | null;
    city: string | null;
    postcode: string | null;
    country: string;
  };
  user?: {
    name: string | null;
    email: string | null;
  } | null;
}

/**
 * Available merge fields with descriptions
 */
export const QUOTE_MERGE_FIELDS = [
  // Quote fields
  { field: "{{quote.quoteNumber}}", description: "Quote number (e.g., QT-2024-001)" },
  { field: "{{quote.title}}", description: "Quote title/subject" },
  { field: "{{quote.issueDate}}", description: "Issue date (formatted)" },
  { field: "{{quote.validUntil}}", description: "Expiration date (formatted)" },
  { field: "{{quote.subtotal}}", description: "Subtotal amount (formatted with currency)" },
  { field: "{{quote.discountAmount}}", description: "Discount amount (formatted)" },
  { field: "{{quote.taxAmount}}", description: "Tax amount (formatted)" },
  { field: "{{quote.total}}", description: "Total amount (formatted)" },
  { field: "{{quote.status}}", description: "Quote status (DRAFT, SENT, etc.)" },

  // Contact fields
  { field: "{{contact.firstName}}", description: "Contact's first name" },
  { field: "{{contact.lastName}}", description: "Contact's last name" },
  { field: "{{contact.fullName}}", description: "Contact's full name" },
  { field: "{{contact.email}}", description: "Contact's email address" },
  { field: "{{contact.phone}}", description: "Contact's phone number" },
  { field: "{{contact.title}}", description: "Contact's job title" },

  // Company fields
  { field: "{{company.name}}", description: "Client company name" },
  { field: "{{company.website}}", description: "Client company website" },
  { field: "{{company.industry}}", description: "Client company industry" },
  { field: "{{company.address}}", description: "Client company address" },
  { field: "{{company.city}}", description: "Client company city" },
  { field: "{{company.country}}", description: "Client company country" },

  // Business (your company) fields
  { field: "{{business.name}}", description: "Your business name" },
  { field: "{{business.legalName}}", description: "Legal entity name" },
  { field: "{{business.phone}}", description: "Business phone" },
  { field: "{{business.email}}", description: "Business email" },
  { field: "{{business.website}}", description: "Business website" },
  { field: "{{business.vatNumber}}", description: "VAT registration number" },
  { field: "{{business.companyNumber}}", description: "Company registration number" },

  // User (quote creator) fields
  { field: "{{user.name}}", description: "Quote creator's name" },
  { field: "{{user.email}}", description: "Quote creator's email" },

  // Utility fields
  { field: "{{today}}", description: "Current date (formatted)" },
  { field: "{{currentYear}}", description: "Current year" },
] as const;

/**
 * Format a currency value
 */
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Format a date value
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return "";
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return "";
    }
  }

  return current;
}

/**
 * Process merge fields in a text string
 */
export function processMergeFields(text: string, data: QuoteMergeData): string {
  if (!text) return text;

  // Create a flat lookup map for efficient replacement
  const lookup: Record<string, string> = {
    // Quote fields (with currency formatting for amounts)
    "quote.quoteNumber": data.quote.quoteNumber,
    "quote.title": data.quote.title,
    "quote.issueDate": formatDate(data.quote.issueDate),
    "quote.validUntil": formatDate(data.quote.validUntil),
    "quote.subtotal": formatCurrency(data.quote.subtotal, data.quote.currency),
    "quote.discountAmount": formatCurrency(data.quote.discountAmount, data.quote.currency),
    "quote.taxAmount": formatCurrency(data.quote.taxAmount, data.quote.currency),
    "quote.total": formatCurrency(data.quote.total, data.quote.currency),
    "quote.status": data.quote.status,

    // Contact fields
    "contact.firstName": data.contact?.firstName || "",
    "contact.lastName": data.contact?.lastName || "",
    "contact.fullName": data.contact?.fullName || "",
    "contact.email": data.contact?.email || "",
    "contact.phone": data.contact?.phone || "",
    "contact.title": data.contact?.title || "",

    // Company fields
    "company.name": data.company?.name || "",
    "company.website": data.company?.website || "",
    "company.industry": data.company?.industry || "",
    "company.address": data.company?.address || "",
    "company.city": data.company?.city || "",
    "company.state": data.company?.state || "",
    "company.country": data.company?.country || "",

    // Business fields
    "business.name": data.business.name,
    "business.legalName": data.business.legalName || data.business.name,
    "business.tradingName": data.business.tradingName || data.business.name,
    "business.phone": data.business.phone || "",
    "business.email": data.business.email || "",
    "business.website": data.business.website || "",
    "business.vatNumber": data.business.vatNumber || "",
    "business.companyNumber": data.business.companyNumber || "",
    "business.city": data.business.city || "",
    "business.postcode": data.business.postcode || "",
    "business.country": data.business.country,

    // User fields
    "user.name": data.user?.name || "",
    "user.email": data.user?.email || "",

    // Utility fields
    "today": formatDate(new Date()),
    "currentYear": new Date().getFullYear().toString(),
  };

  // Replace all {{field}} patterns
  return text.replace(/\{\{([\w.]+)\}\}/g, (match, field) => {
    const value = lookup[field];
    return value !== undefined ? value : match; // Keep original if not found
  });
}

/**
 * Process merge fields in an object (recursively for nested structures)
 */
export function processMergeFieldsInObject<T>(obj: T, data: QuoteMergeData): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return processMergeFields(obj, data) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => processMergeFieldsInObject(item, data)) as T;
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processMergeFieldsInObject(value, data);
    }
    return result as T;
  }

  return obj;
}

/**
 * Validate that all merge fields in a text are valid
 */
export function validateMergeFields(text: string): {
  valid: boolean;
  unknownFields: string[];
} {
  const validFieldNames = QUOTE_MERGE_FIELDS.map((f) => f.field.replace("{{", "").replace("}}", ""));
  const foundFields = text.match(/\{\{([\w.]+)\}\}/g) || [];
  const unknownFields: string[] = [];

  for (const match of foundFields) {
    const fieldName = match.replace("{{", "").replace("}}", "");
    if (!validFieldNames.includes(fieldName)) {
      unknownFields.push(match);
    }
  }

  return {
    valid: unknownFields.length === 0,
    unknownFields,
  };
}

/**
 * Get a preview of all merge fields with sample data
 */
export function getMergeFieldPreview(): Record<string, string> {
  const sampleData: QuoteMergeData = {
    quote: {
      quoteNumber: "QT-2024-0042",
      title: "Web Development Project",
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 5000,
      discountAmount: 250,
      taxAmount: 950,
      total: 5700,
      currency: "GBP",
      status: "DRAFT",
    },
    contact: {
      firstName: "John",
      lastName: "Smith",
      fullName: "John Smith",
      email: "john.smith@example.com",
      phone: "+44 20 1234 5678",
      title: "CTO",
    },
    company: {
      name: "Acme Corporation",
      website: "www.acme.com",
      industry: "Technology",
      address: "123 Tech Street",
      city: "London",
      state: null,
      country: "United Kingdom",
    },
    business: {
      name: "PBH Group Ltd",
      legalName: "PBH Group Limited",
      tradingName: "PBH Group",
      phone: "+44 800 123 4567",
      email: "sales@pbhgroup.co.uk",
      website: "www.pbhgroup.co.uk",
      vatNumber: "GB123456789",
      companyNumber: "12345678",
      city: "London",
      postcode: "EC1A 1BB",
      country: "United Kingdom",
    },
    user: {
      name: "Sarah Johnson",
      email: "sarah@pbhgroup.co.uk",
    },
  };

  const preview: Record<string, string> = {};

  for (const { field } of QUOTE_MERGE_FIELDS) {
    const fieldName = field.replace("{{", "").replace("}}", "");
    preview[field] = processMergeFields(field, sampleData);
  }

  return preview;
}
