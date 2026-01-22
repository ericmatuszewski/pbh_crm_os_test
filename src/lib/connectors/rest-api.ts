import { ImportSourceType } from "@prisma/client";
import { BaseConnector, ConnectorError } from "./base";
import {
  RestApiConfig,
  TableInfo,
  ColumnInfo,
  QueryOptions,
  ConnectorResult,
  ConnectionTestResult,
} from "./types";

/**
 * REST API Connector
 * Handles importing data from REST API endpoints
 */
export class RestApiConnector extends BaseConnector {
  readonly type = ImportSourceType.REST_API;
  private cachedData: Record<string, unknown>[] | null = null;
  private cachedColumns: ColumnInfo[] | null = null;

  constructor(config: RestApiConfig) {
    super(config);
  }

  private get apiConfig(): RestApiConfig {
    return this.config as RestApiConfig;
  }

  async connect(): Promise<void> {
    // REST API doesn't maintain persistent connections
    // Just validate the config
    if (!this.apiConfig.baseUrl || !this.apiConfig.endpoint) {
      throw new Error("Base URL and endpoint are required");
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.cachedData = null;
    this.cachedColumns = null;
    this.connected = false;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    try {
      const response = await this.fetchData({ limit: 1 });
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        message: "API connection successful",
        details: {
          latencyMs,
          serverInfo: `Endpoint: ${this.apiConfig.baseUrl}${this.apiConfig.endpoint}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!this.apiConfig.authType || this.apiConfig.authType === "none") {
      return headers;
    }

    const authConfig = this.apiConfig.authConfig;
    if (!authConfig) return headers;

    switch (this.apiConfig.authType) {
      case "basic":
        if (authConfig.username && authConfig.password) {
          const credentials = Buffer.from(
            `${authConfig.username}:${authConfig.password}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;

      case "bearer":
        if (authConfig.token) {
          headers["Authorization"] = `Bearer ${authConfig.token}`;
        }
        break;

      case "api_key":
        if (authConfig.apiKey) {
          const headerName = authConfig.apiKeyHeader || "X-API-Key";
          headers[headerName] = authConfig.apiKey;
        }
        break;
    }

    return headers;
  }

  private async fetchData(options?: {
    limit?: number;
    offset?: number;
    cursor?: string;
    page?: number;
  }): Promise<{ data: Record<string, unknown>[]; totalRows?: number; nextCursor?: string }> {
    const url = new URL(this.apiConfig.endpoint, this.apiConfig.baseUrl);

    // Add pagination parameters
    const pagination = this.apiConfig.pagination;
    if (pagination) {
      switch (pagination.type) {
        case "offset":
          if (options?.limit && pagination.limitParam) {
            url.searchParams.set(pagination.limitParam, options.limit.toString());
          }
          if (options?.offset && pagination.pageParam) {
            url.searchParams.set(pagination.pageParam, options.offset.toString());
          }
          break;

        case "page":
          if (options?.page && pagination.pageParam) {
            url.searchParams.set(pagination.pageParam, options.page.toString());
          }
          if (options?.limit && pagination.limitParam) {
            url.searchParams.set(pagination.limitParam, options.limit.toString());
          }
          break;

        case "cursor":
          if (options?.cursor && pagination.cursorParam) {
            url.searchParams.set(pagination.cursorParam, options.cursor);
          }
          if (options?.limit && pagination.limitParam) {
            url.searchParams.set(pagination.limitParam, options.limit.toString());
          }
          break;
      }
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...this.apiConfig.headers,
      ...this.buildAuthHeaders(),
    };

    const response = await fetch(url.toString(), {
      method: this.apiConfig.method || "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    // Extract data array
    let data: Record<string, unknown>[];
    if (pagination?.dataPath) {
      data = this.getNestedValue(json, pagination.dataPath) as Record<string, unknown>[];
    } else if (Array.isArray(json)) {
      data = json;
    } else if (json.data && Array.isArray(json.data)) {
      data = json.data;
    } else if (json.results && Array.isArray(json.results)) {
      data = json.results;
    } else if (json.items && Array.isArray(json.items)) {
      data = json.items;
    } else {
      // Single object response
      data = [json];
    }

    // Get total if available
    let totalRows: number | undefined;
    if (pagination?.totalPath) {
      totalRows = this.getNestedValue(json, pagination.totalPath) as number;
    }

    // Get next cursor if available
    let nextCursor: string | undefined;
    if (pagination?.cursorPath) {
      nextCursor = this.getNestedValue(json, pagination.cursorPath) as string;
    }

    return { data, totalRows, nextCursor };
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === "object") {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private inferColumns(records: Record<string, unknown>[]): ColumnInfo[] {
    if (records.length === 0) return [];

    const allKeys = new Set<string>();
    records.forEach((record) => {
      this.collectKeys(record, "", allKeys);
    });

    return Array.from(allKeys).map((name) => {
      const sampleValues = records
        .slice(0, 10)
        .map((r) => this.getNestedValue(r, name))
        .filter((v) => v !== null && v !== undefined);

      return {
        name,
        type: "api_field",
        mappedType: this.inferType(sampleValues),
        nullable: records.some((r) => {
          const v = this.getNestedValue(r, name);
          return v === null || v === undefined;
        }),
        sampleValues: sampleValues.slice(0, 5),
      };
    });
  }

  private collectKeys(obj: Record<string, unknown>, prefix: string, keys: Set<string>): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        // Only go one level deep for nested objects
        if (!prefix) {
          this.collectKeys(value as Record<string, unknown>, fullKey, keys);
        } else {
          keys.add(fullKey);
        }
      } else {
        keys.add(fullKey);
      }
    }
  }

  private inferType(values: unknown[]): ColumnInfo["mappedType"] {
    if (values.length === 0) return "string";

    const types = values.map((v) => {
      if (typeof v === "number") return "number";
      if (typeof v === "boolean") return "boolean";
      if (v instanceof Date) return "date";
      if (typeof v === "string" && this.isDateString(v)) return "date";
      if (Array.isArray(v) || (typeof v === "object" && v !== null)) return "json";
      return "string";
    });

    const uniqueTypes = [...new Set(types)];
    if (uniqueTypes.length === 1) return uniqueTypes[0] as ColumnInfo["mappedType"];

    return "string";
  }

  private isDateString(value: string): boolean {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    return isoDateRegex.test(value);
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.connected) {
      throw ConnectorError.notConnected(this.type);
    }

    // Fetch initial data to determine structure
    const { data, totalRows } = await this.fetchData({ limit: 100 });
    this.cachedData = data;
    this.cachedColumns = this.inferColumns(data);

    return [
      {
        name: this.apiConfig.endpoint,
        type: "collection",
        estimatedRows: totalRows || data.length,
        columns: this.cachedColumns,
      },
    ];
  }

  async getColumns(): Promise<ColumnInfo[]> {
    if (!this.connected) {
      throw ConnectorError.notConnected(this.type);
    }

    if (!this.cachedColumns) {
      await this.getTables();
    }

    return this.cachedColumns || [];
  }

  async query(options: QueryOptions): Promise<ConnectorResult> {
    if (!this.connected) {
      throw ConnectorError.notConnected(this.type);
    }

    try {
      // If pagination is supported, use it
      const pagination = this.apiConfig.pagination;
      let allData: Record<string, unknown>[] = [];
      let totalRows: number | undefined;

      if (pagination) {
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        if (pagination.type === "offset") {
          const result = await this.fetchData({ limit, offset });
          allData = result.data;
          totalRows = result.totalRows;
        } else if (pagination.type === "page") {
          const page = Math.floor(offset / limit) + 1;
          const result = await this.fetchData({ limit, page });
          allData = result.data;
          totalRows = result.totalRows;
        } else {
          // For cursor-based, need to iterate
          let cursor: string | undefined;
          let fetched = 0;
          const targetOffset = offset || 0;

          while (fetched < targetOffset + limit) {
            const result = await this.fetchData({ limit: 100, cursor });
            allData = allData.concat(result.data);
            totalRows = result.totalRows;
            fetched += result.data.length;

            if (!result.nextCursor || result.data.length === 0) break;
            cursor = result.nextCursor;
          }

          // Apply offset/limit manually
          allData = allData.slice(offset, offset + limit);
        }
      } else {
        // No pagination - fetch all
        const result = await this.fetchData();
        allData = result.data;
        totalRows = allData.length;

        // Apply manual pagination
        if (options.offset || options.limit) {
          const offset = options.offset || 0;
          const limit = options.limit || allData.length;
          allData = allData.slice(offset, offset + limit);
        }
      }

      // Apply WHERE filtering (client-side)
      if (options.where) {
        allData = this.filterData(allData, options.where);
      }

      // Apply ORDER BY (client-side)
      if (options.orderBy) {
        allData = this.sortData(allData, options.orderBy);
      }

      // Select specific columns
      if (options.columns?.length) {
        allData = allData.map((row) => {
          const filtered: Record<string, unknown> = {};
          for (const col of options.columns!) {
            filtered[col] = this.getNestedValue(row, col);
          }
          return filtered;
        });
      }

      const columns = this.cachedColumns || this.inferColumns(allData);

      return {
        rows: allData,
        columns,
        totalRows: totalRows || allData.length,
        hasMore: totalRows ? (options.offset || 0) + allData.length < totalRows : false,
        nextOffset: totalRows && (options.offset || 0) + allData.length < totalRows
          ? (options.offset || 0) + allData.length
          : undefined,
      };
    } catch (error) {
      throw ConnectorError.queryFailed(
        this.type,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private filterData(data: Record<string, unknown>[], where: string): Record<string, unknown>[] {
    // Simple AND filtering
    const conditions = where.split(/\s+AND\s+/i);

    return data.filter((row) => {
      return conditions.every((condition) => {
        const match = condition.match(/([\w.]+)\s*(=|!=|>|<|>=|<=)\s*['"]?([^'"]+)['"]?/i);
        if (!match) return true;

        const [, field, operator, valueStr] = match;
        const fieldValue = this.getNestedValue(row, field);
        let value: unknown = valueStr;

        // Parse value
        if (valueStr === "true") value = true;
        else if (valueStr === "false") value = false;
        else if (valueStr === "null") value = null;
        else if (!isNaN(Number(valueStr))) value = Number(valueStr);

        switch (operator) {
          case "=": return fieldValue === value;
          case "!=": return fieldValue !== value;
          case ">": return (fieldValue as number) > (value as number);
          case "<": return (fieldValue as number) < (value as number);
          case ">=": return (fieldValue as number) >= (value as number);
          case "<=": return (fieldValue as number) <= (value as number);
          default: return true;
        }
      });
    });
  }

  private sortData(data: Record<string, unknown>[], orderBy: string): Record<string, unknown>[] {
    const [field, direction] = orderBy.split(/\s+/);
    const isDesc = direction?.toLowerCase() === "desc";

    return [...data].sort((a, b) => {
      const aVal = this.getNestedValue(a, field);
      const bVal = this.getNestedValue(b, field);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return isDesc ? -1 : 1;
      if (bVal === null || bVal === undefined) return isDesc ? 1 : -1;

      const comparison = aVal < bVal ? -1 : 1;
      return isDesc ? -comparison : comparison;
    });
  }

  async getRowCount(): Promise<number> {
    const result = await this.query({ limit: 1 });
    return result.totalRows || 0;
  }
}
