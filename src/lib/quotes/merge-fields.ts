import { format } from "date-fns";

interface QuoteData {
  id: string;
  quoteNumber: string;
  title: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  validUntil: Date | string | null;
  issueDate?: Date | string;
  notes?: string | null;
  terms?: string | null;
}

interface ContactData {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title?: string | null;
}

interface CompanyData {
  name: string;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

interface LineItemData {
  productName: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

interface BusinessData {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
}

export interface MergeFieldContext {
  quote: QuoteData;
  contact?: ContactData | null;
  company?: CompanyData | null;
  lineItems?: LineItemData[];
  business?: BusinessData | null;
  user?: { name: string; email: string } | null;
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

function formatDate(date: Date | string | null | undefined, formatStr: string = "PPP"): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr);
}

function buildMergeFieldMap(context: MergeFieldContext): Record<string, string> {
  const { quote, contact, company, lineItems, business, user } = context;
  const currency = quote.currency || "USD";

  const fields: Record<string, string> = {
    "quote.number": quote.quoteNumber || "",
    "quote.quoteNumber": quote.quoteNumber || "",
    "quoteNumber": quote.quoteNumber || "",
    "quote.title": quote.title || "",
    "quote.status": quote.status || "",
    "quote.subtotal": formatCurrency(quote.subtotal, currency),
    "quote.discount": formatCurrency(quote.discountAmount, currency),
    "quote.tax": formatCurrency(quote.taxAmount, currency),
    "quote.total": formatCurrency(quote.total, currency),
    "quote.currency": currency,
    "quote.validUntil": formatDate(quote.validUntil),
    "quote.issueDate": formatDate(quote.issueDate || new Date()),
    "issueDate": formatDate(quote.issueDate || new Date()),
    "currentDate": formatDate(new Date()),
    "today": formatDate(new Date()),
  };

  if (contact) {
    const fullName = (contact.firstName || "") + " " + (contact.lastName || "");
    fields["contact.firstName"] = contact.firstName || "";
    fields["contact.lastName"] = contact.lastName || "";
    fields["contact.fullName"] = fullName.trim();
    fields["contact.name"] = fullName.trim();
    fields["contactName"] = fullName.trim();
    fields["contact.email"] = contact.email || "";
    fields["contact.phone"] = contact.phone || "";
    fields["contact.title"] = contact.title || "";
  }

  if (company) {
    fields["company.name"] = company.name || "";
    fields["companyName"] = company.name || "";
    fields["company.website"] = company.website || "";
    fields["company.phone"] = company.phone || "";
    fields["company.address"] = company.address || "";
    fields["company.city"] = company.city || "";
    fields["company.state"] = company.state || "";
    fields["company.postalCode"] = company.postalCode || "";
    fields["company.country"] = company.country || "";
    fields["company.fullAddress"] = [
      company.address, company.city, company.state, company.postalCode, company.country
    ].filter(Boolean).join(", ");
  }

  if (business) {
    fields["business.name"] = business.name || "";
    fields["business.email"] = business.email || "";
    fields["business.phone"] = business.phone || "";
    fields["sender.name"] = business.name || "";
  }

  if (user) {
    fields["user.name"] = user.name || "";
    fields["user.email"] = user.email || "";
    fields["owner.name"] = user.name || "";
  }

  if (lineItems && lineItems.length > 0) {
    fields["lineItems.count"] = lineItems.length.toString();
    const total = lineItems.reduce((sum, item) => sum + item.total, 0);
    fields["lineItems.total"] = formatCurrency(total, currency);
  }

  return fields;
}

export function processMergeFields(template: string, context: MergeFieldContext): string {
  if (!template) return "";
  const fieldMap = buildMergeFieldMap(context);
  return template.replace(/{{([^}]+)}}/g, (match, fieldName) => {
    const trimmedField = fieldName.trim();
    return fieldMap[trimmedField] ?? match;
  });
}

export function getAvailableMergeFields(): { category: string; fields: { name: string; description: string }[] }[] {
  return [
    {
      category: "Quote",
      fields: [
        { name: "{{quote.number}}", description: "Quote number" },
        { name: "{{quote.title}}", description: "Quote title" },
        { name: "{{quote.total}}", description: "Total amount" },
        { name: "{{quote.subtotal}}", description: "Subtotal" },
        { name: "{{quote.validUntil}}", description: "Expiration date" },
      ],
    },
    {
      category: "Contact",
      fields: [
        { name: "{{contact.firstName}}", description: "First name" },
        { name: "{{contact.lastName}}", description: "Last name" },
        { name: "{{contact.fullName}}", description: "Full name" },
        { name: "{{contact.email}}", description: "Email" },
      ],
    },
    {
      category: "Company",
      fields: [
        { name: "{{company.name}}", description: "Company name" },
        { name: "{{company.fullAddress}}", description: "Full address" },
      ],
    },
    {
      category: "Other",
      fields: [
        { name: "{{currentDate}}", description: "Today's date" },
        { name: "{{user.name}}", description: "Quote owner" },
      ],
    },
  ];
}
