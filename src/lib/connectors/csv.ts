import { ImportSourceType } from "@prisma/client";
import { parse, Options as CsvParseOptions } from "csv-parse/sync";
import { BaseConnector, ConnectorError } from "./base";
import {
  FileConnector,
  FileConfig,
  TableInfo,
  ColumnInfo,
  QueryOptions,
  ConnectorResult,
} from "./types";

/**
 * CSV File Connector
 * Handles importing data from CSV files
 */
export class CsvConnector extends BaseConnector implements FileConnector {
  readonly type = ImportSourceType.CSV_FILE;
  private data: Record<string, unknown>[] = [];
  private columns: ColumnInfo[] = [];
  private filename: string = "";

  constructor(config: FileConfig = {}) {
    super(config);
  }

  private get fileConfig(): FileConfig {
    return this.config as FileConfig;
  }

  async connect(): Promise<void> {
    if (this.data.length > 0) {
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    this.data = [];
    this.columns = [];
    this.connected = false;
  }

  async loadFromBuffer(buffer: Buffer, filename: string): Promise<void> {
    try {
      this.filename = filename;
      const content = buffer.toString((this.fileConfig.encoding || "utf-8") as BufferEncoding);
      await this.parseContent(content);
      this.connected = true;
    } catch (error) {
      throw ConnectorError.connectionFailed(
        this.type,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async loadFromPath(filePath: string): Promise<void> {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(filePath, (this.fileConfig.encoding || "utf-8") as BufferEncoding);
      this.filename = filePath.split("/").pop() || filePath;
      await this.parseContent(content);
      this.connected = true;
    } catch (error) {
      throw ConnectorError.connectionFailed(
        this.type,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async parseContent(content: string): Promise<void> {
    const parseOptions: CsvParseOptions = {
      delimiter: this.fileConfig.delimiter || ",",
      columns: this.fileConfig.hasHeader !== false, // Default to true
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      cast: true,
      cast_date: true,
    };

    const records = parse(content, parseOptions);

    if (records.length === 0) {
      this.data = [];
      this.columns = [];
      return;
    }

    this.data = records;

    // Infer column types from data
    this.columns = this.inferColumns(records);
  }

  private inferColumns(records: Record<string, unknown>[]): ColumnInfo[] {
    if (records.length === 0) return [];

    const firstRow = records[0];
    const columnNames = Object.keys(firstRow);

    return columnNames.map((name) => {
      const sampleValues = records
        .slice(0, 100)
        .map((r) => r[name])
        .filter((v) => v !== null && v !== undefined && v !== "");

      const type = this.inferType(sampleValues);

      return {
        name,
        type: "csv_" + type,
        mappedType: type,
        nullable: records.some((r) => r[name] === null || r[name] === undefined || r[name] === ""),
        sampleValues: sampleValues.slice(0, 5),
      };
    });
  }

  private inferType(values: unknown[]): ColumnInfo["mappedType"] {
    if (values.length === 0) return "string";

    let hasNumber = false;
    let hasBoolean = false;
    let hasDate = false;
    let hasString = false;

    for (const value of values) {
      if (typeof value === "number") {
        hasNumber = true;
      } else if (typeof value === "boolean") {
        hasBoolean = true;
      } else if (value instanceof Date) {
        hasDate = true;
      } else if (typeof value === "string") {
        // Try to detect type from string
        if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
          hasBoolean = true;
        } else if (!isNaN(Number(value)) && value.trim() !== "") {
          hasNumber = true;
        } else if (this.isDateString(value)) {
          hasDate = true;
        } else {
          hasString = true;
        }
      } else {
        hasString = true;
      }
    }

    // Priority: if any strings found, treat as string
    if (hasString) return "string";
    if (hasDate && !hasNumber && !hasBoolean) return "date";
    if (hasBoolean && !hasNumber && !hasDate) return "boolean";
    if (hasNumber && !hasBoolean && !hasDate) return "number";

    return "string";
  }

  private isDateString(value: string): boolean {
    // Common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY or DD/MM/YYYY
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO 8601
      /^\d{2}-\d{2}-\d{4}$/,           // DD-MM-YYYY or MM-DD-YYYY
    ];

    return datePatterns.some((pattern) => pattern.test(value));
  }

  async parseStructure(): Promise<TableInfo> {
    return {
      name: this.filename,
      type: "file",
      estimatedRows: this.data.length,
      columns: this.columns,
    };
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.connected) {
      throw ConnectorError.notConnected(this.type);
    }

    return [await this.parseStructure()];
  }

  async getColumns(): Promise<ColumnInfo[]> {
    if (!this.connected) {
      throw ConnectorError.notConnected(this.type);
    }

    return this.columns;
  }

  async query(options: QueryOptions): Promise<ConnectorResult> {
    if (!this.connected) {
      throw ConnectorError.notConnected(this.type);
    }

    let filteredData = [...this.data];

    // Apply WHERE filter (simple field=value filtering)
    if (options.where) {
      const filters = this.parseSimpleWhere(options.where);
      filteredData = filteredData.filter((row) =>
        filters.every(({ field, operator, value }) =>
          this.evaluateCondition(row[field], operator, value)
        )
      );
    }

    const totalRows = filteredData.length;

    // Apply ORDER BY (simple single-field sorting)
    if (options.orderBy) {
      const [field, direction] = options.orderBy.split(/\s+/);
      const isDesc = direction?.toLowerCase() === "desc";

      filteredData.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return isDesc ? -1 : 1;
        if (bVal === null || bVal === undefined) return isDesc ? 1 : -1;

        const comparison = aVal < bVal ? -1 : 1;
        return isDesc ? -comparison : comparison;
      });
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || filteredData.length;
    const pagedData = filteredData.slice(offset, offset + limit);

    // Select specific columns if requested
    let resultData = pagedData;
    if (options.columns?.length) {
      resultData = pagedData.map((row) => {
        const filtered: Record<string, unknown> = {};
        for (const col of options.columns!) {
          filtered[col] = row[col];
        }
        return filtered;
      });
    }

    return {
      rows: resultData,
      columns: this.columns,
      totalRows,
      hasMore: offset + limit < totalRows,
      nextOffset: offset + limit < totalRows ? offset + limit : undefined,
    };
  }

  private parseSimpleWhere(where: string): Array<{ field: string; operator: string; value: unknown }> {
    // Simple parser for conditions like "field = value AND field2 > 10"
    const conditions: Array<{ field: string; operator: string; value: unknown }> = [];

    const parts = where.split(/\s+AND\s+/i);
    for (const part of parts) {
      const match = part.match(/(\w+)\s*(=|!=|<>|>|<|>=|<=|LIKE)\s*['"]?([^'"]+)['"]?/i);
      if (match) {
        let value: unknown = match[3];

        // Try to parse as number or boolean
        if (!isNaN(Number(value))) {
          value = Number(value);
        } else if (value === "true") {
          value = true;
        } else if (value === "false") {
          value = false;
        }

        conditions.push({
          field: match[1],
          operator: match[2].toUpperCase(),
          value,
        });
      }
    }

    return conditions;
  }

  private evaluateCondition(fieldValue: unknown, operator: string, conditionValue: unknown): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return operator === "!=" || operator === "<>";
    }

    switch (operator) {
      case "=":
        return fieldValue === conditionValue;
      case "!=":
      case "<>":
        return fieldValue !== conditionValue;
      case ">":
        return (fieldValue as number) > (conditionValue as number);
      case "<":
        return (fieldValue as number) < (conditionValue as number);
      case ">=":
        return (fieldValue as number) >= (conditionValue as number);
      case "<=":
        return (fieldValue as number) <= (conditionValue as number);
      case "LIKE":
        if (typeof fieldValue === "string" && typeof conditionValue === "string") {
          const pattern = conditionValue.replace(/%/g, ".*").replace(/_/g, ".");
          return new RegExp(`^${pattern}$`, "i").test(fieldValue);
        }
        return false;
      default:
        return true;
    }
  }

  async getRowCount(options: Omit<QueryOptions, "limit" | "offset">): Promise<number> {
    if (!this.connected) {
      throw ConnectorError.notConnected(this.type);
    }

    let filteredData = this.data;

    if (options.where) {
      const filters = this.parseSimpleWhere(options.where);
      filteredData = filteredData.filter((row) =>
        filters.every(({ field, operator, value }) =>
          this.evaluateCondition(row[field], operator, value)
        )
      );
    }

    return filteredData.length;
  }

  async stream(
    options: QueryOptions,
    batchSize: number,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void>
  ): Promise<void> {
    const result = await this.query({
      ...options,
      limit: undefined,
      offset: undefined,
    });

    const rows = result.rows;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await onBatch(batch);
    }
  }
}
