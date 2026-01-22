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

// XML parser types
type Xml2JsModule = {
  parseStringPromise: (xml: string, options?: {
    explicitArray?: boolean;
    ignoreAttrs?: boolean;
    mergeAttrs?: boolean;
    normalize?: boolean;
    normalizeTags?: boolean;
    trim?: boolean;
  }) => Promise<unknown>;
};

/**
 * XML File Connector
 * Handles importing data from XML files
 *
 * Note: Requires xml2js package to be installed
 * npm install xml2js
 */
export class XmlConnector extends BaseConnector implements FileConnector {
  readonly type = ImportSourceType.XML_FILE;
  private data: Record<string, unknown>[] = [];
  private columns: ColumnInfo[] = [];
  private filename: string = "";
  private xml2js: Xml2JsModule | null = null;

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
    // Dynamically import xml2js
    try {
      this.xml2js = await (eval('import("xml2js")') as Promise<Xml2JsModule>);
    } catch {
      throw new Error(
        "XML connector requires 'xml2js' package. Install with: npm install xml2js"
      );
    }

    const parsed = await this.xml2js.parseStringPromise(content, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true,
      normalize: true,
      normalizeTags: false,
      trim: true,
    });

    // Find the data array using rootPath or auto-detect
    let dataArray: unknown[];

    if (this.fileConfig.rootPath) {
      dataArray = this.getNestedValue(parsed, this.fileConfig.rootPath);
      if (!Array.isArray(dataArray)) {
        // Might be a single record, wrap in array
        dataArray = [dataArray];
      }
    } else {
      // Auto-detect: look for array of records
      dataArray = this.findDataArray(parsed);
    }

    // Convert XML items to flat records
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

  private findDataArray(obj: unknown): unknown[] {
    if (Array.isArray(obj)) {
      return obj;
    }

    if (typeof obj !== "object" || obj === null) {
      return [obj];
    }

    const record = obj as Record<string, unknown>;

    // Look for common patterns: root element containing records
    for (const key of Object.keys(record)) {
      const value = record[key];

      if (Array.isArray(value) && value.length > 0) {
        return value;
      }

      // Check one level deeper
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        for (const nestedKey of Object.keys(nested)) {
          const nestedValue = nested[nestedKey];
          if (Array.isArray(nestedValue) && nestedValue.length > 0) {
            return nestedValue;
          }
        }

        // If nested object has records pattern, wrap parent
        const nestedKeys = Object.keys(nested);
        if (nestedKeys.length > 2) {
          // Likely a single record, wrap in array
          return [nested];
        }
      }
    }

    // If nothing found, treat root as single record
    return [record];
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
      // Skip $ prefix from xml2js attributes
      const cleanKey = key.startsWith("$") ? key.slice(1) : key;
      const newKey = prefix ? `${prefix}.${cleanKey}` : cleanKey;

      if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        // Check if it's a simple text node with attributes
        const innerObj = value as Record<string, unknown>;
        if (innerObj._ !== undefined) {
          // XML text content with attributes
          result[newKey] = innerObj._;
          // Also store attributes
          for (const [attrKey, attrValue] of Object.entries(innerObj)) {
            if (attrKey !== "_" && !attrKey.startsWith("$")) {
              result[`${newKey}.${attrKey}`] = attrValue;
            }
          }
        } else if (prefix.split(".").length < 2) {
          // Recursively flatten nested objects (max 2 levels deep)
          Object.assign(result, this.flattenObject(innerObj, newKey));
        } else {
          // Store as JSON for deeper nesting
          result[newKey] = value;
        }
      } else if (Array.isArray(value)) {
        // Convert arrays to JSON
        result[newKey] = value;
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
        type: "xml_" + type,
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
        // Try to detect type from string
        if (v.toLowerCase() === "true" || v.toLowerCase() === "false") return "boolean";
        if (!isNaN(Number(v)) && v.trim() !== "") return "number";
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
    // Check for ISO date strings and common date formats
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

    // Apply WHERE filter
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

        const comparison = (aVal as number) < (bVal as number) ? -1 : 1;
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
