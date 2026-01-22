/**
 * Authentication Utilities
 * Extract current user from request cookies/headers
 */

import { NextRequest } from "next/server";
import { getSessionByToken } from "@/lib/sessions/service";

export interface CurrentUser {
  id: string;
  name: string;
  email: string | null;
}

// Default fallback user for development/demo purposes
const FALLBACK_USER: CurrentUser = {
  id: "system",
  name: "System",
  email: null,
};

/**
 * Get the current authenticated user from request
 * Falls back to system user if no valid session found
 */
export async function getCurrentUser(request: NextRequest): Promise<CurrentUser> {
  try {
    // Try session token from cookie
    const sessionToken = request.cookies.get("session-token")?.value
      || request.cookies.get("next-auth.session-token")?.value
      || request.cookies.get("__Secure-next-auth.session-token")?.value;

    if (sessionToken) {
      const session = await getSessionByToken(sessionToken);
      if (session && session.user && session.isActive) {
        return {
          id: session.userId,
          name: session.user.name || "Unknown",
          email: session.user.email,
        };
      }
    }

    // Try authorization header (for API clients)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = await getSessionByToken(token);
      if (session && session.user && session.isActive) {
        return {
          id: session.userId,
          name: session.user.name || "Unknown",
          email: session.user.email,
        };
      }
    }
  } catch (error) {
    console.error("Error getting current user:", error);
  }

  // Fallback for demo/development
  return FALLBACK_USER;
}

/**
 * Get current user ID only (more efficient when full user not needed)
 */
export async function getCurrentUserId(request: NextRequest): Promise<string> {
  const user = await getCurrentUser(request);
  return user.id;
}

/**
 * Check if user is authenticated (not fallback system user)
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const user = await getCurrentUser(request);
  return user.id !== "system";
}
