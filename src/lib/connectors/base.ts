import { ImportSourceType } from "@prisma/client";
import {
  DataConnector,
  ConnectionConfig,
  ConnectionTestResult,
  TableInfo,
  ColumnInfo,
  QueryOptions,
  ConnectorResult,
} from "./types";

/**
 * Abstract base class for data connectors
 * Provides common functionality and enforces interface implementation
 */
export abstract class BaseConnector implements DataConnector {
  abstract readonly type: ImportSourceType;
  protected config: ConnectionConfig;
  protected connected: boolean = false;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getTables(): Promise<TableInfo[]>;
  abstract getColumns(table: string): Promise<ColumnInfo[]>;
  abstract query(options: QueryOptions): Promise<ConnectorResult>;

  isConnected(): boolean {
    return this.connected;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    try {
      await this.connect();
      const latencyMs = Date.now() - startTime;

      // Try to get basic info
      const tables = await this.getTables();

      await this.disconnect();

      return {
        success: true,
        message: "Connection successful",
        details: {
          latencyMs,
          permissions: tables.length > 0 ? ["read"] : [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async preview(options: QueryOptions, maxRows: number = 100): Promise<ConnectorResult> {
    return this.query({
      ...options,
      limit: maxRows,
      offset: 0,
    });
  }

  async getRowCount(options: Omit<QueryOptions, "limit" | "offset">): Promise<number> {
    // Default implementation - can be overridden for better performance
    const result = await this.query({
      ...options,
      limit: 1,
      offset: 0,
    });
    return result.totalRows ?? 0;
  }

  /**
   * Map native database types to normalized types
   */
  protected mapColumnType(nativeType: string): ColumnInfo["mappedType"] {
    const type = nativeType.toUpperCase();

    // Numeric types
    if (
      type.includes("INT") ||
      type.includes("NUMBER") ||
      type.includes("DECIMAL") ||
      type.includes("NUMERIC") ||
      type.includes("FLOAT") ||
      type.includes("DOUBLE") ||
      type.includes("REAL") ||
      type.includes("MONEY")
    ) {
      return "number";
    }

    // Boolean types
    if (type.includes("BOOL") || type === "BIT") {
      return "boolean";
    }

    // Date/time types
    if (
      type.includes("DATE") ||
      type.includes("TIME") ||
      type.includes("TIMESTAMP")
    ) {
      return "date";
    }

    // JSON types
    if (type.includes("JSON") || type.includes("JSONB")) {
      return "json";
    }

    // String types (default)
    if (
      type.includes("CHAR") ||
      type.includes("TEXT") ||
      type.includes("STRING") ||
      type.includes("VARCHAR") ||
      type.includes("NVARCHAR") ||
      type.includes("CLOB")
    ) {
      return "string";
    }

    // Binary types
    if (type.includes("BLOB") || type.includes("BINARY") || type.includes("RAW")) {
      return "unknown";
    }

    return "string"; // Default to string for unknown types
  }

  /**
   * Escape identifier for SQL (table/column names)
   */
  protected escapeIdentifier(identifier: string): string {
    // Default implementation using double quotes
    // Subclasses can override for database-specific escaping
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Build a basic SELECT query
   */
  protected buildSelectQuery(options: QueryOptions): string {
    const columns = options.columns?.length
      ? options.columns.map(c => this.escapeIdentifier(c)).join(", ")
      : "*";

    let sql = `SELECT ${columns} FROM `;

    if (options.query) {
      // Use subquery
      sql += `(${options.query}) AS subquery`;
    } else if (options.table) {
      sql += this.escapeIdentifier(options.table);
    } else {
      throw new Error("Either table or query must be specified");
    }

    if (options.where) {
      sql += ` WHERE ${options.where}`;
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    return sql;
  }
}

/**
 * Error class for connector-related errors
 */
export class ConnectorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly sourceType: ImportSourceType,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "ConnectorError";
  }

  static connectionFailed(sourceType: ImportSourceType, error: Error): ConnectorError {
    return new ConnectorError(
      `Failed to connect to ${sourceType}: ${error.message}`,
      "CONNECTION_FAILED",
      sourceType,
      error
    );
  }

  static queryFailed(sourceType: ImportSourceType, error: Error): ConnectorError {
    return new ConnectorError(
      `Query failed on ${sourceType}: ${error.message}`,
      "QUERY_FAILED",
      sourceType,
      error
    );
  }

  static notConnected(sourceType: ImportSourceType): ConnectorError {
    return new ConnectorError(
      `Not connected to ${sourceType}`,
      "NOT_CONNECTED",
      sourceType
    );
  }
}
