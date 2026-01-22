import { ImportSourceType } from "@prisma/client";
import {
  DataConnector,
  FileConnector,
  ConnectionConfig,
  OracleConfig,
  MySqlConfig,
  PostgreSqlConfig,
  MsSqlConfig,
  FileConfig,
  RestApiConfig,
} from "./types";
import { CsvConnector } from "./csv";
import { JsonConnector } from "./json";
import { PostgreSqlConnector } from "./postgresql";
import { encryptObject, decryptObject, isEncrypted } from "@/lib/crypto/encryption";

/**
 * Connector Factory
 * Creates appropriate data connector instances based on source type
 */
export class ConnectorFactory {
  /**
   * Create a connector for the given source type and configuration
   */
  static create(sourceType: ImportSourceType, config: ConnectionConfig): DataConnector {
    switch (sourceType) {
      case ImportSourceType.CSV_FILE:
        return new CsvConnector(config as FileConfig);

      case ImportSourceType.JSON_FILE:
        return new JsonConnector(config as FileConfig);

      case ImportSourceType.POSTGRESQL_DB:
        return new PostgreSqlConnector(config as PostgreSqlConfig);

      case ImportSourceType.ORACLE_DB:
        return ConnectorFactory.createOracleConnector(config as OracleConfig);

      case ImportSourceType.MYSQL_DB:
        return ConnectorFactory.createMySqlConnector(config as MySqlConfig);

      case ImportSourceType.MSSQL_DB:
        return ConnectorFactory.createMsSqlConnector(config as MsSqlConfig);

      case ImportSourceType.XML_FILE:
        return ConnectorFactory.createXmlConnector(config as FileConfig);

      case ImportSourceType.REST_API:
        return ConnectorFactory.createRestApiConnector(config as RestApiConfig);

      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  }

  /**
   * Create a file-based connector
   */
  static createFileConnector(sourceType: ImportSourceType, config: FileConfig = {}): FileConnector {
    switch (sourceType) {
      case ImportSourceType.CSV_FILE:
        return new CsvConnector(config);

      case ImportSourceType.JSON_FILE:
        return new JsonConnector(config);

      case ImportSourceType.XML_FILE:
        return ConnectorFactory.createXmlConnector(config) as FileConnector;

      default:
        throw new Error(`Not a file-based source type: ${sourceType}`);
    }
  }

  /**
   * Check if a source type requires external packages
   */
  static requiresExternalPackage(sourceType: ImportSourceType): string | null {
    const packageMap: Record<string, string> = {
      [ImportSourceType.ORACLE_DB]: "oracledb",
      [ImportSourceType.MYSQL_DB]: "mysql2",
      [ImportSourceType.MSSQL_DB]: "mssql",
    };

    return packageMap[sourceType] || null;
  }

  /**
   * Check if all required dependencies for a source type are installed
   */
  static async isDependencyInstalled(sourceType: ImportSourceType): Promise<boolean> {
    const packageName = ConnectorFactory.requiresExternalPackage(sourceType);
    if (!packageName) return true;

    try {
      await import(packageName);
      return true;
    } catch {
      return false;
    }
  }

  // Connectors for optional dependencies
  // These dynamically import the connectors when the required packages are available

  private static createOracleConnector(config: OracleConfig): DataConnector {
    // Import OracleConnector dynamically to avoid requiring oracledb at build time
    const mod = require("./oracle") as { OracleConnector: new (config: OracleConfig) => DataConnector };
    return new mod.OracleConnector(config);
  }

  private static createMySqlConnector(config: MySqlConfig): DataConnector {
    // Import MySqlConnector dynamically to avoid requiring mysql2 at build time
    const mod = require("./mysql") as { MySqlConnector: new (config: MySqlConfig) => DataConnector };
    return new mod.MySqlConnector(config);
  }

  private static createMsSqlConnector(_config: MsSqlConfig): DataConnector {
    throw new Error(
      "MSSQL connector requires 'mssql' package. Install with: npm install mssql"
    );
  }

  private static createXmlConnector(config: FileConfig): DataConnector {
    // Import XmlConnector dynamically to avoid requiring xml2js at build time
    const mod = require("./xml") as { XmlConnector: new (config: FileConfig) => DataConnector };
    return new mod.XmlConnector(config);
  }

  private static createRestApiConnector(config: RestApiConfig): DataConnector {
    // Import directly since RestApiConnector has no external deps
    const { RestApiConnector } = require("./rest-api") as { RestApiConnector: new (config: RestApiConfig) => DataConnector };
    return new RestApiConnector(config);
  }
}

/**
 * Decrypt connection configuration from storage
 * Handles both encrypted (string) and legacy unencrypted (object) formats
 */
export function decryptConnectionConfig(encrypted: unknown): ConnectionConfig {
  // Handle string (encrypted) format
  if (typeof encrypted === "string" && isEncrypted(encrypted)) {
    return decryptObject<ConnectionConfig>(encrypted);
  }

  // Handle legacy unencrypted object format
  // This allows backward compatibility with existing data
  if (typeof encrypted === "object" && encrypted !== null) {
    return encrypted as ConnectionConfig;
  }

  throw new Error("Invalid connection configuration format");
}

/**
 * Encrypt connection configuration for secure storage
 * Uses AES-256-CBC encryption for database credentials and API keys
 */
export function encryptConnectionConfig(config: ConnectionConfig): string {
  return encryptObject(config);
}

/**
 * Validate connection configuration for a source type
 */
export function validateConnectionConfig(
  sourceType: ImportSourceType,
  config: ConnectionConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (sourceType) {
    case ImportSourceType.POSTGRESQL_DB:
    case ImportSourceType.MYSQL_DB: {
      const dbConfig = config as PostgreSqlConfig | MySqlConfig;
      if (!dbConfig.host) errors.push("Host is required");
      if (!dbConfig.port) errors.push("Port is required");
      if (!dbConfig.database) errors.push("Database is required");
      if (!dbConfig.user) errors.push("User is required");
      if (!dbConfig.password) errors.push("Password is required");
      break;
    }

    case ImportSourceType.ORACLE_DB: {
      const oraConfig = config as OracleConfig;
      if (!oraConfig.user) errors.push("User is required");
      if (!oraConfig.password) errors.push("Password is required");
      if (!oraConfig.connectString && !oraConfig.host) {
        errors.push("Either connect string or host is required");
      }
      if (oraConfig.host && !oraConfig.serviceName && !oraConfig.sid) {
        errors.push("Either service name or SID is required when using host");
      }
      break;
    }

    case ImportSourceType.REST_API: {
      const apiConfig = config as RestApiConfig;
      if (!apiConfig.baseUrl) errors.push("Base URL is required");
      if (!apiConfig.endpoint) errors.push("Endpoint is required");
      break;
    }

    case ImportSourceType.CSV_FILE:
    case ImportSourceType.JSON_FILE:
    case ImportSourceType.XML_FILE:
      // File configs don't require validation - they're loaded from files
      break;

    default:
      errors.push(`Unknown source type: ${sourceType}`);
  }

  return { valid: errors.length === 0, errors };
}

export { CsvConnector, JsonConnector, PostgreSqlConnector };
