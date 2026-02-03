import ExcelJS from "exceljs";
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

export async function parseExcel(buffer: Buffer): Promise<ParsedData> {
  const workbook = new ExcelJS.Workbook();
  // Use stream-based reading for better type compatibility
  const stream = require("stream");
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);
  await workbook.xlsx.read(bufferStream);

  // Get the first sheet
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    return { columns: [], rows: [], rowCount: 0 };
  }

  // Get header row (first row)
  const headerRow = worksheet.getRow(1);
  const columns: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    columns[colNumber - 1] = cell.text?.toString() || `Column${colNumber}`;
  });

  if (columns.length === 0) {
    return { columns: [], rows: [], rowCount: 0 };
  }

  // Get data rows (starting from row 2)
  const rows: Record<string, string>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const rowData: Record<string, string> = {};
    row.eachCell((cell, colNumber) => {
      const columnName = columns[colNumber - 1];
      if (columnName) {
        rowData[columnName] = cell.text?.toString() ?? "";
      }
    });

    // Fill in missing columns with empty strings
    for (const col of columns) {
      if (!(col in rowData)) {
        rowData[col] = "";
      }
    }

    rows.push(rowData);
  });

  return {
    columns,
    rows,
    rowCount: rows.length,
  };
}

export async function parseFile(buffer: Buffer, filename: string): Promise<ParsedData> {
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
