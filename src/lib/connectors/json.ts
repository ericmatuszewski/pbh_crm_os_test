import { ImportSourceType } from "@prisma/client";
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
 * JSON File Connector
 * Handles importing data from JSON files
 */
export class JsonConnector extends BaseConnector implements FileConnector {
  readonly type = ImportSourceType.JSON_FILE;
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
      const content = await fs.readFile(filePath, "utf-8");
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
    const parsed = JSON.parse(content);

    // Find the data array using rootPath or auto-detect
    let dataArray: unknown[];

    if (this.fileConfig.rootPath) {
      dataArray = this.getNestedValue(parsed, this.fileConfig.rootPath);
      if (!Array.isArray(dataArray)) {
        throw new Error(`Root path "${this.fileConfig.rootPath}" does not point to an array`);
      }
    } else {
      // Auto-detect: if parsed is array, use it; otherwise look for common array properties
      if (Array.isArray(parsed)) {
        dataArray = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        // Look for common data array property names
        const commonNames = ["data", "items", "records", "results", "rows", "entries"];
        const arrayProp = commonNames.find(
          (name) => Array.isArray((parsed as Record<string, unknown>)[name])
        );

        if (arrayProp) {
          dataArray = (parsed as Record<string, unknown>)[arrayProp] as unknown[];
        } else {
          // Try to find any array property
          const arrayKey = Object.keys(parsed).find((key) =>
            Array.isArray((parsed as Record<string, unknown>)[key])
          );

          if (arrayKey) {
            dataArray = (parsed as Record<string, unknown>)[arrayKey] as unknown[];
          } else {
            // Treat single object as single-item array
            dataArray = [parsed];
          }
        }
      } else {
        throw new Error("JSON must be an array or an object containing an array");
      }
    }

    // Ensure all items are objects
    this.data = dataArray.map((item) => {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        return this.flattenObject(item as Record<string, unknown>);
      }
      // Wrap primitives
      return { value: item };
    });

    // Infer columns from data
    this.columns = this.inferColumns(this.data);
  }

  private getNestedValue(obj: unknown, path: string): unknown[] {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        throw new Error(`Path "${path}" not found`);
      }
      if (typeof current === "object") {
        current = (current as Record<string, unknown>)[part];
      } else {
        throw new Error(`Path "${path}" not found`);
      }
    }

    return current as unknown[];
  }

  private flattenObject(obj: Record<string, unknown>, prefix: string = ""): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively flatten nested objects (max 2 levels deep)
        if (prefix.split(".").length < 2) {
          Object.assign(result, this.flattenObject(value as Record<string, unknown>, newKey));
        } else {
          // Store as JSON for deeper nesting
          result[newKey] = value;
        }
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  private inferColumns(records: Record<string, unknown>[]): ColumnInfo[] {
    if (records.length === 0) return [];

    // Collect all unique keys from all records
    const allKeys = new Set<string>();
    records.forEach((record) => {
      Object.keys(record).forEach((key) => allKeys.add(key));
    });

    return Array.from(allKeys).map((name) => {
      const sampleValues = records
        .slice(0, 100)
        .map((r) => r[name])
        .filter((v) => v !== null && v !== undefined);

      const type = this.inferType(sampleValues);

      return {
        name,
        type: "json_" + type,
        mappedType: type,
        nullable: records.some((r) => r[name] === null || r[name] === undefined),
        sampleValues: sampleValues.slice(0, 5),
      };
    });
  }

  private inferType(values: unknown[]): ColumnInfo["mappedType"] {
    if (values.length === 0) return "string";

    const types = values.map((v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === "number") return "number";
      if (typeof v === "boolean") return "boolean";
      if (v instanceof Date) return "date";
      if (typeof v === "string") {
        // Try to detect dates in strings
        if (this.isDateString(v)) return "date";
        return "string";
      }
      if (Array.isArray(v) || typeof v === "object") return "json";
      return "string";
    }).filter((t) => t !== null);

    // If all same type, return that type
    const uniqueTypes = [...new Set(types)];
    if (uniqueTypes.length === 1) return uniqueTypes[0] as ColumnInfo["mappedType"];

    // Mixed types - default to string unless all are json/array
    if (uniqueTypes.every((t) => t === "json")) return "json";

    return "string";
  }

  private isDateString(value: string): boolean {
    // Check for ISO date strings
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    return isoDateRegex.test(value) && !isNaN(Date.parse(value));
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

    // Apply WHERE filter using dot notation for nested fields
    if (options.where) {
      const filters = this.parseWhere(options.where);
      filteredData = filteredData.filter((row) =>
        filters.every(({ field, operator, value }) =>
          this.evaluateCondition(this.getFieldValue(row, field), operator, value)
        )
      );
    }

    const totalRows = filteredData.length;

    // Apply ORDER BY
    if (options.orderBy) {
      const [field, direction] = options.orderBy.split(/\s+/);
      const isDesc = direction?.toLowerCase() === "desc";

      filteredData.sort((a, b) => {
        const aVal = this.getFieldValue(a, field);
        const bVal = this.getFieldValue(b, field);

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
          filtered[col] = this.getFieldValue(row, col);
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

  private getFieldValue(obj: Record<string, unknown>, path: string): unknown {
    // Handle dot notation
    if (path.includes(".")) {
      const parts = path.split(".");
      let current: unknown = obj;

      for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = (current as Record<string, unknown>)[part];
      }

      return current;
    }

    return obj[path];
  }

  private parseWhere(where: string): Array<{ field: string; operator: string; value: unknown }> {
    const conditions: Array<{ field: string; operator: string; value: unknown }> = [];

    const parts = where.split(/\s+AND\s+/i);
    for (const part of parts) {
      // Support dot notation in field names
      const match = part.match(/([\w.]+)\s*(=|!=|<>|>|<|>=|<=|LIKE|IN)\s*(.+)/i);
      if (match) {
        let value: unknown = match[3].trim();

        // Remove quotes
        if ((value as string).startsWith("'") || (value as string).startsWith('"')) {
          value = (value as string).slice(1, -1);
        }

        // Parse arrays for IN operator
        if (match[2].toUpperCase() === "IN") {
          const arrayMatch = (value as string).match(/\((.+)\)/);
          if (arrayMatch) {
            value = arrayMatch[1].split(",").map((v) => v.trim().replace(/^['"]|['"]$/g, ""));
          }
        } else {
          // Try to parse as number, boolean, or null
          if (value === "null") {
            value = null;
          } else if (value === "true") {
            value = true;
          } else if (value === "false") {
            value = false;
          } else if (!isNaN(Number(value))) {
            value = Number(value);
          }
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
    if (operator === "IN" && Array.isArray(conditionValue)) {
      return conditionValue.includes(fieldValue);
    }

    if (fieldValue === null || fieldValue === undefined) {
      return conditionValue === null || operator === "!=" || operator === "<>";
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
    const result = await this.query({ ...options, limit: Number.MAX_SAFE_INTEGER });
    return result.totalRows ?? 0;
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
