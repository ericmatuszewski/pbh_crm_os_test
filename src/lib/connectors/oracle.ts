import { ImportSourceType } from "@prisma/client";
import { BaseConnector, ConnectorError } from "./base";
import {
  OracleConfig,
  TableInfo,
  ColumnInfo,
  QueryOptions,
  ConnectorResult,
  ConnectionTestResult,
} from "./types";

// Oracle DB types - imported dynamically
type OracleDBConnection = {
  execute: <T>(sql: string, params?: unknown[], options?: { outFormat?: number }) => Promise<{ rows?: T[]; metaData?: { name: string }[] }>;
  close: () => Promise<void>;
};

type OracleDBModule = {
  OUT_FORMAT_OBJECT: number;
  getConnection: (config: {
    user: string;
    password: string;
    connectString: string;
  }) => Promise<OracleDBConnection>;
};

/**
 * Oracle Database Connector
 * Handles importing data from Oracle databases
 *
 * Note: Requires oracledb package to be installed
 * npm install oracledb
 */
export class OracleConnector extends BaseConnector {
  readonly type = ImportSourceType.ORACLE_DB;
  private connection: OracleDBConnection | null = null;
  private oracledb: OracleDBModule | null = null;

  constructor(config: OracleConfig) {
    super(config);
  }

  private get oracleConfig(): OracleConfig {
    return this.config as OracleConfig;
  }

  private buildConnectionString(): string {
    if (this.oracleConfig.connectString) {
      return this.oracleConfig.connectString;
    }

    const { host, port, serviceName, sid } = this.oracleConfig;

    if (serviceName) {
      return `${host}:${port}/${serviceName}`;
    } else if (sid) {
      return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SID=${sid})))`;
    }

    throw new Error("Either serviceName or sid must be provided");
  }

  async connect(): Promise<void> {
    try {
      // Dynamically import oracledb
      try {
        this.oracledb = await (eval('import("oracledb")') as Promise<OracleDBModule>);
      } catch {
        throw new Error(
          "Oracle connector requires 'oracledb' package. Install with: npm install oracledb"
        );
      }

      this.connection = await this.oracledb.getConnection({
        user: this.oracleConfig.user,
        password: this.oracleConfig.password,
        connectString: this.buildConnectionString(),
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
      await this.connection.close();
      this.connection = null;
    }
    this.connected = false;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    try {
      await this.connect();

      // Get Oracle version
      const result = await this.connection!.execute<{ BANNER: string }>(
        "SELECT banner FROM v$version WHERE ROWNUM = 1",
        [],
        { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
      );
      const version = result.rows?.[0]?.BANNER || "Unknown";

      // Get current user and database
      const userResult = await this.connection!.execute<{ USER: string; INSTANCE_NAME: string }>(
        "SELECT USER, SYS_CONTEXT('USERENV', 'INSTANCE_NAME') AS INSTANCE_NAME FROM DUAL",
        [],
        { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
      );
      const userInfo = userResult.rows?.[0];

      const latencyMs = Date.now() - startTime;

      await this.disconnect();

      return {
        success: true,
        message: "Connection successful",
        details: {
          version,
          serverInfo: `Instance: ${userInfo?.INSTANCE_NAME}, User: ${userInfo?.USER}`,
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

    const result = await this.connection.execute<{
      TABLE_NAME: string;
      TABLE_TYPE: string;
      NUM_ROWS: number | null;
    }>(
      `
      SELECT
        t.TABLE_NAME,
        'TABLE' AS TABLE_TYPE,
        t.NUM_ROWS
      FROM USER_TABLES t
      UNION ALL
      SELECT
        v.VIEW_NAME AS TABLE_NAME,
        'VIEW' AS TABLE_TYPE,
        NULL AS NUM_ROWS
      FROM USER_VIEWS v
      ORDER BY TABLE_TYPE, TABLE_NAME
      `,
      [],
      { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
    );

    return (result.rows || []).map((row) => ({
      name: row.TABLE_NAME,
      type: row.TABLE_TYPE === "TABLE" ? "table" : "view",
      estimatedRows: row.NUM_ROWS || undefined,
    }));
  }

  async getColumns(table: string): Promise<ColumnInfo[]> {
    if (!this.connected || !this.connection) {
      throw ConnectorError.notConnected(this.type);
    }

    // Get column information
    const columnsResult = await this.connection.execute<{
      COLUMN_NAME: string;
      DATA_TYPE: string;
      NULLABLE: string;
      DATA_LENGTH: number;
      DATA_PRECISION: number | null;
      DATA_SCALE: number | null;
    }>(
      `
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        NULLABLE,
        DATA_LENGTH,
        DATA_PRECISION,
        DATA_SCALE
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = :tableName
      ORDER BY COLUMN_ID
      `,
      [table.toUpperCase()],
      { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
    );

    // Get primary key columns
    const pkResult = await this.connection.execute<{ COLUMN_NAME: string }>(
      `
      SELECT cols.COLUMN_NAME
      FROM USER_CONSTRAINTS cons
      JOIN USER_CONS_COLUMNS cols ON cons.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
      WHERE cons.TABLE_NAME = :tableName
        AND cons.CONSTRAINT_TYPE = 'P'
      `,
      [table.toUpperCase()],
      { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
    );
    const pkColumns = new Set((pkResult.rows || []).map((r) => r.COLUMN_NAME));

    // Get sample values
    const sampleResult = await this.connection.execute<Record<string, unknown>>(
      `SELECT * FROM "${table.toUpperCase()}" WHERE ROWNUM <= 5`,
      [],
      { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
    );
    const samples = sampleResult.rows || [];

    return (columnsResult.rows || []).map((col) => ({
      name: col.COLUMN_NAME,
      type: col.DATA_TYPE,
      mappedType: this.mapColumnType(col.DATA_TYPE),
      nullable: col.NULLABLE === "Y",
      isPrimaryKey: pkColumns.has(col.COLUMN_NAME),
      maxLength: col.DATA_TYPE.includes("CHAR") ? col.DATA_LENGTH : undefined,
      precision: col.DATA_PRECISION || undefined,
      scale: col.DATA_SCALE || undefined,
      sampleValues: samples.map((s) => s[col.COLUMN_NAME]).slice(0, 5),
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
        countSql = `SELECT COUNT(*) AS CNT FROM (${options.query})`;
      } else if (options.table) {
        const columns = options.columns?.length
          ? options.columns.map((c) => `"${c}"`).join(", ")
          : "*";

        sql = `SELECT ${columns} FROM "${options.table.toUpperCase()}"`;
        countSql = `SELECT COUNT(*) AS CNT FROM "${options.table.toUpperCase()}"`;

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
      const countResult = await this.connection.execute<{ CNT: number }>(
        countSql,
        params,
        { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
      );
      const totalRows = countResult.rows?.[0]?.CNT || 0;

      // Apply Oracle pagination using OFFSET FETCH (Oracle 12c+)
      if (options.offset !== undefined || options.limit !== undefined) {
        const offset = options.offset || 0;
        const limit = options.limit || 100;
        sql += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      }

      // Execute main query
      const result = await this.connection.execute<Record<string, unknown>>(
        sql,
        params,
        { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
      );

      // Build column info from metadata
      const columns: ColumnInfo[] = (result.metaData || []).map((meta) => ({
        name: meta.name,
        type: "unknown",
        mappedType: "string" as const,
        nullable: true,
      }));

      const offset = options.offset || 0;
      const limit = options.limit || (result.rows?.length || 0);

      return {
        rows: result.rows || [],
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
      sql = `SELECT COUNT(*) AS CNT FROM (${options.query})`;
    } else if (options.table) {
      sql = `SELECT COUNT(*) AS CNT FROM "${options.table.toUpperCase()}"`;
      if (options.where) {
        sql += ` WHERE ${options.where}`;
      }
    } else {
      throw new Error("Either table or query must be specified");
    }

    const result = await this.connection.execute<{ CNT: number }>(
      sql,
      options.params || [],
      { outFormat: this.oracledb!.OUT_FORMAT_OBJECT }
    );
    return result.rows?.[0]?.CNT || 0;
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

  protected mapColumnType(oracleType: string): ColumnInfo["mappedType"] {
    const type = oracleType.toUpperCase();

    if (type.includes("NUMBER") || type.includes("FLOAT") || type.includes("BINARY_DOUBLE") || type.includes("BINARY_FLOAT")) {
      return "number";
    }
    if (type.includes("DATE") || type.includes("TIMESTAMP")) {
      return "date";
    }
    if (type.includes("CLOB") || type.includes("BLOB") || type.includes("RAW") || type === "XMLTYPE") {
      return "json";
    }
    if (type.includes("CHAR") || type.includes("VARCHAR") || type.includes("NVARCHAR")) {
      return "string";
    }

    return "string";
  }
}
