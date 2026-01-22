import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";

export interface ParsedData {
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export function parseCSV(buffer: Buffer): ParsedData {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    return { columns: [], rows: [], rowCount: 0 };
  }

  const columns = Object.keys(records[0]);

  return {
    columns,
    rows: records,
    rowCount: records.length,
  };
}

export function parseExcel(buffer: Buffer): ParsedData {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { columns: [], rows: [], rowCount: 0 };
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with headers
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
  });

  if (records.length === 0) {
    return { columns: [], rows: [], rowCount: 0 };
  }

  // Convert all values to strings
  const rows = records.map((row) => {
    const stringRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      stringRow[key] = value?.toString() ?? "";
    }
    return stringRow;
  });

  const columns = Object.keys(rows[0]);

  return {
    columns,
    rows,
    rowCount: rows.length,
  };
}

export function parseFile(buffer: Buffer, filename: string): ParsedData {
  const extension = filename.toLowerCase().split(".").pop();

  switch (extension) {
    case "csv":
      return parseCSV(buffer);
    case "xlsx":
    case "xls":
      return parseExcel(buffer);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

// Contact field mapping suggestions based on column names
export const fieldMappingSuggestions: Record<string, string[]> = {
  firstName: ["first name", "firstname", "first", "given name", "givenname"],
  lastName: ["last name", "lastname", "last", "surname", "family name"],
  email: ["email", "e-mail", "email address", "emailaddress"],
  phone: ["phone", "telephone", "tel", "mobile", "cell", "phone number"],
  title: ["title", "job title", "jobtitle", "position", "role"],
  companyName: ["company", "company name", "companyname", "organization", "organisation", "employer"],
  status: ["status", "lead status", "contact status"],
  source: ["source", "lead source", "how did you hear", "referral"],
  tags: ["tags", "labels", "categories"],
};

export function suggestFieldMapping(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const column of columns) {
    const normalizedColumn = column.toLowerCase().trim();

    for (const [field, suggestions] of Object.entries(fieldMappingSuggestions)) {
      if (suggestions.includes(normalizedColumn) || suggestions.some((s) => normalizedColumn.includes(s))) {
        mapping[column] = field;
        break;
      }
    }
  }

  return mapping;
}
