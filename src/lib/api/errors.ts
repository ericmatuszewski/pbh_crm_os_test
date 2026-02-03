import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// Error codes
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE: "DUPLICATE",
  CONFLICT: "CONFLICT",

  // Operation errors
  CREATE_ERROR: "CREATE_ERROR",
  FETCH_ERROR: "FETCH_ERROR",
  UPDATE_ERROR: "UPDATE_ERROR",
  DELETE_ERROR: "DELETE_ERROR",

  // Business logic
  NO_BUSINESS: "NO_BUSINESS",
  BUSINESS_REQUIRED: "BUSINESS_REQUIRED",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

interface ApiErrorOptions {
  status?: number;
  details?: unknown;
  logError?: boolean;
}

/**
 * Create a standardized error response
 */
export function apiError(
  code: ErrorCode,
  message: string,
  options: ApiErrorOptions = {}
): NextResponse<ApiErrorResponse> {
  const { status = 500, details, logError = true } = options;

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    response.error.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Handle Zod validation errors
 */
export function handleZodError(error: ZodError): NextResponse<ApiErrorResponse> {
  const firstError = error.errors[0];
  const message = firstError?.message || "Invalid input data";
  const path = firstError?.path?.join(".") || undefined;

  return apiError(
    ErrorCodes.VALIDATION_ERROR,
    message,
    {
      status: 400,
      details: path ? { field: path } : undefined,
      logError: false,
    }
  );
}

/**
 * Handle Prisma errors
 */
export function handlePrismaError(
  error: unknown,
  entityName: string = "Record"
): NextResponse<ApiErrorResponse> {
  // Handle Prisma known request errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        // Unique constraint violation
        const target = (error.meta?.target as string[])?.join(", ") || "field";
        return apiError(
          ErrorCodes.DUPLICATE,
          `A ${entityName.toLowerCase()} with this ${target} already exists`,
          { status: 409, logError: false }
        );
      }
      case "P2025": {
        // Record not found
        return apiError(
          ErrorCodes.NOT_FOUND,
          `${entityName} not found`,
          { status: 404, logError: false }
        );
      }
      case "P2003": {
        // Foreign key constraint violation
        return apiError(
          ErrorCodes.CONFLICT,
          `Cannot complete operation due to related records`,
          { status: 409 }
        );
      }
      case "P2014": {
        // Required relation violation
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Missing required related ${entityName.toLowerCase()}`,
          { status: 400 }
        );
      }
      default:
        return apiError(
          ErrorCodes.INTERNAL_ERROR,
          `Database error occurred`,
          { status: 500 }
        );
    }
  }

  // Handle validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid data format",
      { status: 400 }
    );
  }

  // Unknown Prisma error
  return apiError(
    ErrorCodes.INTERNAL_ERROR,
    `Failed to process ${entityName.toLowerCase()}`,
    { status: 500 }
  );
}

/**
 * Unified error handler for API routes
 */
export function handleApiError(
  error: unknown,
  operation: "create" | "fetch" | "update" | "delete",
  entityName: string = "Record"
): NextResponse<ApiErrorResponse> {
  // Handle Zod errors
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Handle Prisma errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return handlePrismaError(error, entityName);
  }

  // Map operation to error code
  const errorCodeMap = {
    create: ErrorCodes.CREATE_ERROR,
    fetch: ErrorCodes.FETCH_ERROR,
    update: ErrorCodes.UPDATE_ERROR,
    delete: ErrorCodes.DELETE_ERROR,
  } as const;

  const errorCode = errorCodeMap[operation];
  const operationVerb = operation === "fetch" ? "fetching" : `${operation}ing`;

  return apiError(
    errorCode,
    `Failed to ${operation} ${entityName.toLowerCase()}`,
    { status: 500 }
  );
}

// Common error responses
export const unauthorizedError = () =>
  apiError(ErrorCodes.UNAUTHORIZED, "Unauthorized", { status: 401, logError: false });

export const forbiddenError = (message: string = "Access denied") =>
  apiError(ErrorCodes.FORBIDDEN, message, { status: 403, logError: false });

export const notFoundError = (entityName: string = "Resource") =>
  apiError(ErrorCodes.NOT_FOUND, `${entityName} not found`, { status: 404, logError: false });

export const noBusinessError = () =>
  apiError(ErrorCodes.NO_BUSINESS, "No business selected", { status: 400, logError: false });

export const validationError = (message: string, details?: unknown) =>
  apiError(ErrorCodes.VALIDATION_ERROR, message, { status: 400, details, logError: false });
