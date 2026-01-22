import { ImportSourceType } from "@prisma/client";
import { Pool, PoolClient, types } from "pg";
import { BaseConnector, ConnectorError } from "./base";
import {
  PostgreSqlConfig,
  TableInfo,
  ColumnInfo,
  QueryOptions,
  ConnectorResult,
  ConnectionTestResult,
} from "./types";

// Parse numeric types as JavaScript numbers
types.setTypeParser(types.builtins.NUMERIC, (val: string) => parseFloat(val));

/**
 * PostgreSQL Database Connector
 * Handles importing data from PostgreSQL databases
 */
export class PostgreSqlConnector extends BaseConnector {
  readonly type = ImportSourceType.POSTGRESQL_DB;
  private pool: Pool | null = null;
  private client: PoolClient | null = null;

  constructor(config: PostgreSqlConfig) {
    super(config);
  }

  private get pgConfig(): PostgreSqlConfig {
    return this.config as PostgreSqlConfig;
  }

  async connect(): Promise<void> {
    try {
      // Configure SSL based on config
      let ssl: boolean | { rejectUnauthorized: boolean } | undefined;
      if (this.pgConfig.ssl === true || this.pgConfig.ssl === "require") {
        ssl = { rejectUnauthorized: false };
      } else if (this.pgConfig.ssl === false || this.pgConfig.ssl === "disable") {
        ssl = false;
      }

      this.pool = new Pool({
        host: this.pgConfig.host,
        port: this.pgConfig.port,
        database: this.pgConfig.database,
        user: this.pgConfig.user,
        password: this.pgConfig.password,
        ssl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test the connection
      this.client = await this.pool.connect();
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
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.connected = false;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    try {
      await this.connect();

      // Get server version
      const versionResult = await this.client!.query("SELECT version()");
      const version = versionResult.rows[0]?.version;

      // Get current database and user
      const infoResult = await this.client!.query(
        "SELECT current_database(), current_user, pg_backend_pid()"
      );
      const dbInfo = infoResult.rows[0];

      const latencyMs = Date.now() - startTime;

      await this.disconnect();

      return {
        success: true,
        message: "Connection successful",
        details: {
          version: version?.split(" ")[0] + " " + version?.split(" ")[1],
          serverInfo: `Database: ${dbInfo.current_database}, User: ${dbInfo.current_user}`,
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
    if (!this.connected || !this.client) {
      throw ConnectorError.notConnected(this.type);
    }

    const schema = this.pgConfig.schema || "public";

    const result = await this.client.query(
      `
      SELECT
        t.table_name,
        t.table_type,
        COALESCE(
          (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name),
          0
        ) as estimated_rows
      FROM information_schema.tables t
      WHERE t.table_schema = $1
        AND t.table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY t.table_type, t.table_name
      `,
      [schema]
    );

    return result.rows.map((row) => ({
      name: row.table_name,
      schema,
      type: row.table_type === "BASE TABLE" ? "table" : "view",
      estimatedRows: parseInt(row.estimated_rows) || undefined,
    }));
  }

  async getColumns(table: string): Promise<ColumnInfo[]> {
    if (!this.connected || !this.client) {
      throw ConnectorError.notConnected(this.type);
    }

    const schema = this.pgConfig.schema || "public";

    // Get column information
    const columnsResult = await this.client.query(
      `
      SELECT
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_schema = $1
        AND c.table_name = $2
      ORDER BY c.ordinal_position
      `,
      [schema, table]
    );

    // Get sample values
    const sampleResult = await this.client.query(
      `SELECT * FROM ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)} LIMIT 5`
    );
    const samples = sampleResult.rows;

    return columnsResult.rows.map((col) => ({
      name: col.column_name,
      type: col.udt_name || col.data_type,
      mappedType: this.mapColumnType(col.udt_name || col.data_type),
      nullable: col.is_nullable === "YES",
      isPrimaryKey: col.is_primary_key,
      maxLength: col.character_maximum_length || undefined,
      precision: col.numeric_precision || undefined,
      scale: col.numeric_scale || undefined,
      sampleValues: samples.map((s) => s[col.column_name]).slice(0, 5),
    }));
  }

  async query(options: QueryOptions): Promise<ConnectorResult> {
    if (!this.connected || !this.client) {
      throw ConnectorError.notConnected(this.type);
    }

    try {
      const schema = this.pgConfig.schema || "public";
      let sql: string;
      let countSql: string;
      const params: unknown[] = options.params || [];

      if (options.query) {
        // Custom query provided
        sql = options.query;
        countSql = `SELECT COUNT(*) as count FROM (${options.query}) AS subquery`;
      } else if (options.table) {
        // Build SELECT query
        const columns = options.columns?.length
          ? options.columns.map((c) => this.escapeIdentifier(c)).join(", ")
          : "*";

        const tableName = `${this.escapeIdentifier(schema)}.${this.escapeIdentifier(options.table)}`;

        sql = `SELECT ${columns} FROM ${tableName}`;
        countSql = `SELECT COUNT(*) as count FROM ${tableName}`;

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
      const countResult = await this.client.query(countSql, params);
      const totalRows = parseInt(countResult.rows[0].count);

      // Apply pagination
      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
      }
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }

      // Execute main query
      const result = await this.client.query(sql, params);

      // Get column info
      const columns: ColumnInfo[] = result.fields.map((field) => ({
        name: field.name,
        type: field.dataTypeID.toString(),
        mappedType: this.mapPgTypeId(field.dataTypeID),
        nullable: true,
      }));

      const offset = options.offset || 0;
      const limit = options.limit || result.rows.length;

      return {
        rows: result.rows,
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
    if (!this.connected || !this.client) {
      throw ConnectorError.notConnected(this.type);
    }

    const schema = this.pgConfig.schema || "public";
    let sql: string;

    if (options.query) {
      sql = `SELECT COUNT(*) as count FROM (${options.query}) AS subquery`;
    } else if (options.table) {
      sql = `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(options.table)}`;
      if (options.where) {
        sql += ` WHERE ${options.where}`;
      }
    } else {
      throw new Error("Either table or query must be specified");
    }

    const result = await this.client.query(sql, options.params || []);
    return parseInt(result.rows[0].count);
  }

  async stream(
    options: QueryOptions,
    batchSize: number,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void>
  ): Promise<void> {
    if (!this.connected || !this.client) {
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

  private mapPgTypeId(typeId: number): ColumnInfo["mappedType"] {
    // Common PostgreSQL type OIDs
    const typeMap: Record<number, ColumnInfo["mappedType"]> = {
      16: "boolean",    // bool
      20: "number",     // int8
      21: "number",     // int2
      23: "number",     // int4
      25: "string",     // text
      700: "number",    // float4
      701: "number",    // float8
      1043: "string",   // varchar
      1082: "date",     // date
      1083: "date",     // time
      1114: "date",     // timestamp
      1184: "date",     // timestamptz
      1700: "number",   // numeric
      3802: "json",     // jsonb
      114: "json",      // json
    };

    return typeMap[typeId] || "string";
  }

  protected escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
