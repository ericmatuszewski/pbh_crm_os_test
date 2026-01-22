import { ImportSourceType } from "@prisma/client";

/**
 * Configuration for different data source types
 */
export interface OracleConfig {
  host: string;
  port: number;
  serviceName?: string;
  sid?: string;
  user: string;
  password: string;
  connectString?: string;  // Full connection string (alternative to host/port)
}

export interface MySqlConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface PostgreSqlConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema?: string;
  ssl?: boolean | "require" | "prefer" | "allow" | "disable";
}

export interface MsSqlConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
}

export interface FileConfig {
  delimiter?: string;       // For CSV: ",", ";", "\t"
  encoding?: string;        // "utf-8", "utf-16", "iso-8859-1"
  hasHeader?: boolean;      // For CSV: first row is header
  rootPath?: string;        // For JSON/XML: path to array of records
  dateFormat?: string;      // For parsing dates
}

export interface RestApiConfig {
  baseUrl: string;
  endpoint: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  authType?: "none" | "basic" | "bearer" | "api_key";
  authConfig?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;  // Header name for API key
  };
  pagination?: {
    type: "offset" | "cursor" | "page";
    pageParam?: string;
    limitParam?: string;
    cursorParam?: string;
    cursorPath?: string;    // JSON path to next cursor in response
    totalPath?: string;     // JSON path to total count
    dataPath?: string;      // JSON path to data array
  };
}

export type ConnectionConfig =
  | OracleConfig
  | MySqlConfig
  | PostgreSqlConfig
  | MsSqlConfig
  | FileConfig
  | RestApiConfig;

/**
 * Column/field information from a data source
 */
export interface ColumnInfo {
  name: string;
  type: string;           // Native type from source
  mappedType: "string" | "number" | "boolean" | "date" | "json" | "unknown";
  nullable: boolean;
  isPrimaryKey?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  sampleValues?: unknown[];  // Sample values for preview
}

/**
 * Table or collection information from a data source
 */
export interface TableInfo {
  name: string;
  schema?: string;
  type: "table" | "view" | "collection" | "file";
  estimatedRows?: number;
  columns?: ColumnInfo[];
}

/**
 * Query options for fetching data
 */
export interface QueryOptions {
  table?: string;          // Table name for DB sources
  query?: string;          // Custom SQL/query for DB sources
  columns?: string[];      // Columns to select
  where?: string;          // WHERE clause or filter expression
  orderBy?: string;        // ORDER BY clause
  limit?: number;          // Max rows to fetch
  offset?: number;         // Skip rows (pagination)
  params?: unknown[];      // Parameterized query values
}

/**
 * Result from a connector query
 */
export interface ConnectorResult {
  rows: Record<string, unknown>[];
  columns: ColumnInfo[];
  totalRows?: number;      // Total matching rows (before limit)
  hasMore: boolean;        // More rows available
  nextOffset?: number;     // Next offset for pagination
  nextCursor?: string;     // Next cursor for cursor-based pagination
  metadata?: {
    executionTime?: number;
    queryPlan?: string;
  };
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    version?: string;
    serverInfo?: string;
    latencyMs?: number;
    permissions?: string[];
  };
}

/**
 * Field mapping for import
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: FieldTransform;
  defaultValue?: unknown;
  isRequired?: boolean;
}

export type FieldTransform =
  | { type: "none" }
  | { type: "uppercase" }
  | { type: "lowercase" }
  | { type: "trim" }
  | { type: "truncate"; maxLength: number }
  | { type: "toNumber"; decimalSeparator?: string }
  | { type: "toBoolean"; trueValues?: string[]; falseValues?: string[] }
  | { type: "toDate"; inputFormat?: string; outputFormat?: string }
  | { type: "regex"; pattern: string; replacement: string }
  | { type: "lookup"; lookupTable: Record<string, unknown> }
  | { type: "template"; template: string }  // e.g., "{firstName} {lastName}"
  | { type: "custom"; function: string };   // Custom JavaScript expression

/**
 * Import validation error
 */
export interface ValidationError {
  row: number;
  field: string;
  value: unknown;
  error: string;
  severity: "error" | "warning";
}

/**
 * Import progress tracking
 */
export interface ImportProgress {
  phase: "connecting" | "fetching" | "validating" | "importing" | "completed" | "failed";
  totalRows: number;
  processedRows: number;
  importedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  currentBatch?: number;
  totalBatches?: number;
  errors: ValidationError[];
  startTime: Date;
  estimatedTimeRemaining?: number;
}

/**
 * Data Connector Interface
 *
 * All data connectors must implement this interface
 */
export interface DataConnector {
  /**
   * Get the connector type
   */
  readonly type: ImportSourceType;

  /**
   * Connect to the data source
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the data source
   */
  disconnect(): Promise<void>;

  /**
   * Test the connection
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Check if currently connected
   */
  isConnected(): boolean;

  /**
   * Get available tables/collections
   */
  getTables(): Promise<TableInfo[]>;

  /**
   * Get columns/fields for a specific table
   */
  getColumns(table: string): Promise<ColumnInfo[]>;

  /**
   * Execute a query and return results
   */
  query(options: QueryOptions): Promise<ConnectorResult>;

  /**
   * Get a preview of data (limited rows with sample values)
   */
  preview(options: QueryOptions, maxRows?: number): Promise<ConnectorResult>;

  /**
   * Get row count for a table/query
   */
  getRowCount(options: Omit<QueryOptions, "limit" | "offset">): Promise<number>;

  /**
   * Stream rows for large datasets (optional - for connectors that support it)
   */
  stream?(
    options: QueryOptions,
    batchSize: number,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void>
  ): Promise<void>;
}

/**
 * File-based connector interface (extends base for file upload support)
 */
export interface FileConnector extends DataConnector {
  /**
   * Load data from a file buffer or path
   */
  loadFromBuffer(buffer: Buffer, filename: string): Promise<void>;

  /**
   * Load data from a file path
   */
  loadFromPath(filePath: string): Promise<void>;

  /**
   * Parse file content and return structure
   */
  parseStructure(): Promise<TableInfo>;
}

/**
 * Connector factory type
 */
export type ConnectorFactory = (config: ConnectionConfig) => DataConnector;

/**
 * Supported target entities for import
 */
export const IMPORTABLE_ENTITIES = [
  "products",
  "contacts",
  "companies",
  "deals",
  "product_categories",
  "product_attributes",
] as const;

export type ImportableEntity = typeof IMPORTABLE_ENTITIES[number];

/**
 * Entity field definitions for import mapping
 */
export const ENTITY_FIELDS: Record<ImportableEntity, { required: string[]; optional: string[] }> = {
  products: {
    required: ["sku", "name", "basePrice"],
    optional: [
      "description", "shortDescription", "type", "status", "currency", "pricingType",
      "category", "tags", "trackInventory", "stockQuantity", "costPrice", "brand",
      "weight", "length", "width", "height", "dimensionUnit", "weightUnit",
      "metaTitle", "metaDescription", "slug", "externalId"
    ],
  },
  contacts: {
    required: ["firstName", "lastName"],
    optional: [
      "email", "phone", "title", "status", "source", "leadScore",
      "companyName", "address", "city", "state", "country", "externalId"
    ],
  },
  companies: {
    required: ["name"],
    optional: [
      "website", "industry", "size", "address", "city", "state", "country",
      "phone", "email", "externalId"
    ],
  },
  deals: {
    required: ["title", "value"],
    optional: [
      "currency", "stage", "probability", "expectedCloseDate", "source",
      "contactEmail", "companyName", "ownerEmail", "externalId"
    ],
  },
  product_categories: {
    required: ["name", "slug"],
    optional: ["description", "parentSlug", "imageUrl", "isActive"],
  },
  product_attributes: {
    required: ["name", "label", "valueType"],
    optional: [
      "description", "isRequired", "isFilterable", "isSearchable",
      "showInList", "isVariantDefining", "options", "unit"
    ],
  },
};
