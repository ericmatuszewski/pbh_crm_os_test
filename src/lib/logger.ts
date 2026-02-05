/**
 * Structured Application Logger
 *
 * Provides consistent logging across the application with:
 * - Log levels (error, warn, info, debug)
 * - Context attachment (request ID, user ID, etc.)
 * - Environment-aware output
 * - Extensible for external services (Datadog, Sentry, etc.)
 */

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogContext {
  userId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  data?: unknown;
}

// Log level priority for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Get minimum log level from environment
function getMinLevel(): number {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel];
  }
  // Default: debug in development, info in production
  return process.env.NODE_ENV === "development" ? LOG_LEVELS.debug : LOG_LEVELS.info;
}

// Format log entry for console output
function formatForConsole(entry: LogEntry): string {
  const { level, message, timestamp, context, error, data } = entry;

  let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

  if (context && Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    output += ` | ${contextStr}`;
  }

  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack && process.env.NODE_ENV === "development") {
      output += `\n  Stack: ${error.stack}`;
    }
  }

  if (data && process.env.NODE_ENV === "development") {
    output += `\n  Data: ${JSON.stringify(data, null, 2)}`;
  }

  return output;
}

// Core logging function
function log(level: LogLevel, message: string, options?: { context?: LogContext; error?: Error; data?: unknown }) {
  const minLevel = getMinLevel();

  if (LOG_LEVELS[level] > minLevel) {
    return; // Skip if below minimum level
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: options?.context,
    data: options?.data,
  };

  if (options?.error) {
    entry.error = {
      name: options.error.name,
      message: options.error.message,
      stack: options.error.stack,
    };
  }

  // Console output
  const formatted = formatForConsole(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "debug":
      console.debug(formatted);
      break;
  }

  // Hook for external logging services
  // Uncomment and configure as needed:
  // sendToExternalService(entry);
}

/**
 * Log an error with optional context
 * @example logger.error("Database connection failed", { error: err, context: { route: "/api/users" } })
 */
function error(message: string, options?: { error?: Error; context?: LogContext; data?: unknown }) {
  log("error", message, options);
}

/**
 * Log a warning with optional context
 * @example logger.warn("Rate limit approaching", { context: { userId: "123" } })
 */
function warn(message: string, options?: { context?: LogContext; data?: unknown }) {
  log("warn", message, options);
}

/**
 * Log info with optional context
 * @example logger.info("User logged in", { context: { userId: "123" } })
 */
function info(message: string, options?: { context?: LogContext; data?: unknown }) {
  log("info", message, options);
}

/**
 * Log debug information (only in development or when LOG_LEVEL=debug)
 * @example logger.debug("Processing request", { data: requestBody })
 */
function debug(message: string, options?: { context?: LogContext; data?: unknown }) {
  log("debug", message, options);
}

/**
 * Create a child logger with preset context
 * @example const routeLogger = logger.child({ route: "/api/contacts", method: "POST" })
 */
function child(context: LogContext) {
  return {
    error: (msg: string, opts?: { error?: Error; context?: LogContext; data?: unknown }) =>
      error(msg, { ...opts, context: { ...context, ...opts?.context } }),
    warn: (msg: string, opts?: { context?: LogContext; data?: unknown }) =>
      warn(msg, { ...opts, context: { ...context, ...opts?.context } }),
    info: (msg: string, opts?: { context?: LogContext; data?: unknown }) =>
      info(msg, { ...opts, context: { ...context, ...opts?.context } }),
    debug: (msg: string, opts?: { context?: LogContext; data?: unknown }) =>
      debug(msg, { ...opts, context: { ...context, ...opts?.context } }),
  };
}

export const logger = {
  error,
  warn,
  info,
  debug,
  child,
};

export default logger;

// Type exports for use in other modules
export type { LogLevel, LogContext, LogEntry };
