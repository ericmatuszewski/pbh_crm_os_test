// Types
export * from "./types";

// Base classes
export { BaseConnector, ConnectorError } from "./base";

// Factory - use this to create connectors (handles optional dependencies)
export {
  ConnectorFactory,
  decryptConnectionConfig,
  encryptConnectionConfig,
  validateConnectionConfig,
} from "./factory";

// Direct exports for connectors that don't have optional dependencies
export { CsvConnector } from "./csv";
export { JsonConnector } from "./json";
export { RestApiConnector } from "./rest-api";

// PostgreSQL connector - requires 'pg' package
export { PostgreSqlConnector } from "./postgresql";
