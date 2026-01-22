import { ImportSourceType } from "@prisma/client";
import { BaseConnector, ConnectorError } from "./base";
import {
  MySqlConfig,
  TableInfo,
  ColumnInfo,
  QueryOptions,
  ConnectorResult,
  ConnectionTestResult,
} from "./types";

// MySQL2 types - imported dynamically
type MySqlConnection = {
  execute: <T>(sql: string, params?: unknown[]) => Promise<[T[], unknown[]]>;
  query: <T>(sql: string, params?: unknown[]) => Promise<[T[], unknown[]]>;
  end: () => Promise<void>;
};

type MySqlModule = {
  createConnection: (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: { rejectUnauthorized: boolean };
  }) => Promise<MySqlConnection>;
};

/**
 * MySQL Database Connector
 * Handles importing data from MySQL databases
 *
 * Note: Requires mysql2 package to be installed
 * npm install mysql2
 */
export class MySqlConnector extends BaseConnector {
  readonly type = ImportSourceType.MYSQL_DB;
  private connection: MySqlConnection | null = null;
  private mysql: MySqlModule | null = null;

  constructor(config: MySqlConfig) {
    super(config);
  }

  private get mysqlConfig(): MySqlConfig {
    return this.config as MySqlConfig;
  }

  async connect(): Promise<void> {
    try {
      // Dynamically import mysql2
      try {
        this.mysql = await (eval('import("mysql2/promise")') as Promise<MySqlModule>);
      } catch {
        throw new Error(
          "MySQL connector requires 'mysql2' package. Install with: npm install mysql2"
        );
      }

      this.connection = await this.mysql.createConnection({
        host: this.mysqlConfig.host,
        port: this.mysqlConfig.port,
        database: this.mysqlConfig.database,
        user: this.mysqlConfig.user,
        password: this.mysqlConfig.password,
        ssl: this.mysqlConfig.ssl ? { rejectUnauthorized: false } : undefined,
      });

      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw ConnectorError.connectionFailed(
        this.type,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
    this.connected = false;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    try {
      await this.connect();

      // Get MySQL version
      const [versionRows] = await this.connection!.query<{ Variable_name: string; Value: string }>(
        "SHOW VARIABLES LIKE 'version'"
      );
      const versionRow = versionRows as unknown as { Variable_name: string; Value: string }[];
      const version = versionRow[0]?.Value || "Unknown";

      // Get current database and user
      const [userRows] = await this.connection!.query<{ "DATABASE()": string; "USER()": string }>(
        "SELECT DATABASE(), USER()"
      );
      const userInfoRow = userRows as unknown as { "DATABASE()": string; "USER()": string }[];
      const userInfo = userInfoRow[0];

      const latencyMs = Date.now() - startTime;

      await this.disconnect();

      return {
        success: true,
        message: "Connection successful",
        details: {
          version: `MySQL ${version}`,
          serverInfo: `Database: ${userInfo?.["DATABASE()"]}, User: ${userInfo?.["USER()"]}`,
          latencyMs,
          permissions: ["read"],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.connected || !this.connection) {
      throw ConnectorError.notConnected(this.type);
    }

    const [tableRows] = await this.connection.query(
      `
      SELECT
        TABLE_NAME,
        TABLE_TYPE,
        TABLE_ROWS
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_TYPE, TABLE_NAME
      `
    );
    const rows = tableRows as { TABLE_NAME: string; TABLE_TYPE: string; TABLE_ROWS: number | null }[];

    return rows.map((row) => ({
      name: row.TABLE_NAME,
      type: row.TABLE_TYPE === "BASE TABLE" ? "table" : "view",
      estimatedRows: row.TABLE_ROWS || undefined,
    }));
  }

  async getColumns(table: string): Promise<ColumnInfo[]> {
    if (!this.connected || !this.connection) {
      throw ConnectorError.notConnected(this.type);
    }

    // Get column information
    const [colQueryResult] = await this.connection.query(
      `
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
      `,
      [table]
    );
    const columnsRows = colQueryResult as {
      COLUMN_NAME: string;
      DATA_TYPE: string;
      IS_NULLABLE: string;
      CHARACTER_MAXIMUM_LENGTH: number | null;
      NUMERIC_PRECISION: number | null;
      NUMERIC_SCALE: number | null;
      COLUMN_KEY: string;
    }[];

    // Get sample values
    const [sampleQueryResult] = await this.connection.query(
      `SELECT * FROM \`${table}\` LIMIT 5`
    );
    const sampleRows = sampleQueryResult as Record<string, unknown>[];

    return columnsRows.map((col) => ({
      name: col.COLUMN_NAME,
      type: col.DATA_TYPE,
      mappedType: this.mapColumnType(col.DATA_TYPE),
      nullable: col.IS_NULLABLE === "YES",
      isPrimaryKey: col.COLUMN_KEY === "PRI",
      maxLength: col.CHARACTER_MAXIMUM_LENGTH || undefined,
      precision: col.NUMERIC_PRECISION || undefined,
      scale: col.NUMERIC_SCALE || undefined,
      sampleValues: sampleRows.map((s) => s[col.COLUMN_NAME]).slice(0, 5),
    }));
  }

  async query(options: QueryOptions): Promise<ConnectorResult> {
    if (!this.connected || !this.connection) {
      throw ConnectorError.notConnected(this.type);
    }

    try {
      let sql: string;
      let countSql: string;
      const params: unknown[] = options.params || [];

      if (options.query) {
        sql = options.query;
        countSql = `SELECT COUNT(*) AS cnt FROM (${options.query}) AS subquery`;
      } else if (options.table) {
        const columns = options.columns?.length
          ? options.columns.map((c) => `\`${c}\``).join(", ")
          : "*";

        sql = `SELECT ${columns} FROM \`${options.table}\``;
        countSql = `SELECT COUNT(*) AS cnt FROM \`${options.table}\``;

        if (options.where) {
          sql += ` WHERE ${options.where}`;
          countSql += ` WHERE ${options.where}`;
        }

        if (options.orderBy) {
          sql += ` ORDER BY ${options.orderBy}`;
        }
      } else {
        throw new Error("Either table or query must be specified");
      }

      // Get total count
      const [countResult] = await this.connection.query(countSql, params);
      const countRows = countResult as { cnt: number }[];
      const totalRows = countRows[0]?.cnt || 0;

      // Apply pagination
      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
      }
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }

      // Execute main query
      const [queryResult] = await this.connection.query(sql, params);
      const rows = queryResult as Record<string, unknown>[];

      // Build column info from first row
      const columns: ColumnInfo[] = rows.length > 0
        ? Object.keys(rows[0]).map((name) => ({
            name,
            type: "unknown",
            mappedType: "string" as const,
            nullable: true,
          }))
        : [];

      const offset = options.offset || 0;
      const limit = options.limit || rows.length;

      return {
        rows,
        columns,
        totalRows,
        hasMore: offset + limit < totalRows,
        nextOffset: offset + limit < totalRows ? offset + limit : undefined,
      };
    } catch (error) {
      throw ConnectorError.queryFailed(
        this.type,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async getRowCount(options: Omit<QueryOptions, "limit" | "offset">): Promise<number> {
    if (!this.connected || !this.connection) {
      throw ConnectorError.notConnected(this.type);
    }

    let sql: string;

    if (options.query) {
      sql = `SELECT COUNT(*) AS cnt FROM (${options.query}) AS subquery`;
    } else if (options.table) {
      sql = `SELECT COUNT(*) AS cnt FROM \`${options.table}\``;
      if (options.where) {
        sql += ` WHERE ${options.where}`;
      }
    } else {
      throw new Error("Either table or query must be specified");
    }

    const [result] = await this.connection.query(sql, options.params || []);
    const rows = result as { cnt: number }[];
    return rows[0]?.cnt || 0;
  }

  async stream(
    options: QueryOptions,
    batchSize: number,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void>
  ): Promise<void> {
    if (!this.connected || !this.connection) {
      throw ConnectorError.notConnected(this.type);
    }

    const totalRows = await this.getRowCount(options);
    let offset = 0;

    while (offset < totalRows) {
      const result = await this.query({
        ...options,
        limit: batchSize,
        offset,
      });

      await onBatch(result.rows);
      offset += batchSize;
    }
  }

  protected mapColumnType(mysqlType: string): ColumnInfo["mappedType"] {
    const type = mysqlType.toLowerCase();

    if (["int", "tinyint", "smallint", "mediumint", "bigint", "float", "double", "decimal", "numeric"].some((t) => type.includes(t))) {
      return "number";
    }
    if (["date", "datetime", "timestamp", "time", "year"].some((t) => type === t)) {
      return "date";
    }
    if (type === "json") {
      return "json";
    }
    if (["tinyint(1)", "boolean", "bool"].includes(type)) {
      return "boolean";
    }

    return "string";
  }
}
