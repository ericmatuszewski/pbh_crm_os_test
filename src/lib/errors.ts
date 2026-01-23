/**
 * User-friendly error messages for common API errors
 */

export interface ApiError {
  code?: string;
  message: string;
}

// Map of error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  // Authentication errors
  UNAUTHORIZED: "Please log in to continue",
  SESSION_EXPIRED: "Your session has expired. Please log in again",
  INVALID_CREDENTIALS: "Invalid username or password",
  USER_NOT_FOUND: "User not found in the system",
  USER_DISABLED: "Your account has been disabled. Contact your administrator",
  NOT_IN_GROUP: "You don't have permission to access this system",

  // Business/permission errors
  NO_BUSINESS: "No business selected. Please select a business to continue",
  ACCESS_DENIED: "You don't have permission to perform this action",
  INSUFFICIENT_PERMISSIONS: "You don't have the required permissions",

  // Validation errors
  VALIDATION_ERROR: "Please check your input and try again",
  MISSING_REQUIRED_FIELDS: "Please fill in all required fields",
  INVALID_EMAIL: "Please enter a valid email address",
  INVALID_PHONE: "Please enter a valid phone number",

  // Resource errors
  NOT_FOUND: "The requested item was not found",
  ALREADY_EXISTS: "This item already exists",
  DUPLICATE_ENTRY: "A record with this information already exists",

  // Server errors
  INTERNAL_ERROR: "Something went wrong. Please try again later",
  DATABASE_ERROR: "Unable to save your changes. Please try again",
  CONNECTION_ERROR: "Unable to connect to the server. Check your internet connection",

  // LDAP/AD errors
  LDAP_CONNECTION_FAILED: "Unable to connect to the authentication server",
  LDAP_BIND_FAILED: "Authentication service error. Contact your administrator",

  // Default
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again",
};

/**
 * Get a user-friendly error message from an API error
 */
export function getErrorMessage(error: ApiError | string | unknown): string {
  // String error
  if (typeof error === "string") {
    return errorMessages[error] || error;
  }

  // ApiError object
  if (error && typeof error === "object" && "message" in error) {
    const apiError = error as ApiError;

    // Check if we have a code mapping
    if (apiError.code && errorMessages[apiError.code]) {
      return errorMessages[apiError.code];
    }

    // Check if the message itself is a known code
    if (apiError.message && errorMessages[apiError.message]) {
      return errorMessages[apiError.message];
    }

    // Return the message if it looks user-friendly (not a stack trace or technical error)
    if (apiError.message && !apiError.message.includes("Error:") && apiError.message.length < 200) {
      return apiError.message;
    }
  }

  return errorMessages.UNKNOWN_ERROR;
}

/**
 * Parse API response and extract error
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data.error) {
      return getErrorMessage(data.error);
    }
    if (data.message) {
      return getErrorMessage(data.message);
    }
  } catch {
    // Response wasn't JSON
  }

  // Fallback based on status code
  switch (response.status) {
    case 400:
      return "Invalid request. Please check your input";
    case 401:
      return "Please log in to continue";
    case 403:
      return "You don't have permission to perform this action";
    case 404:
      return "The requested item was not found";
    case 409:
      return "This item already exists";
    case 422:
      return "Please check your input and try again";
    case 429:
      return "Too many requests. Please wait a moment and try again";
    case 500:
      return "Something went wrong on our end. Please try again later";
    case 502:
    case 503:
    case 504:
      return "The service is temporarily unavailable. Please try again later";
    default:
      return errorMessages.UNKNOWN_ERROR;
  }
}

/**
 * Handle fetch errors with proper messaging
 */
export async function handleFetchError(error: unknown): Promise<string> {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Unable to connect to the server. Check your internet connection";
  }

  if (error instanceof Error) {
    return getErrorMessage(error.message);
  }

  return errorMessages.UNKNOWN_ERROR;
}
