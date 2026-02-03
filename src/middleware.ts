import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getRateLimitHeaders,
  getRateLimitForPath,
} from "@/lib/rate-limit";

// Paths that don't require authentication
const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/health",
  "/_next",
  "/favicon.ico",
];

// Paths exempt from rate limiting
const rateLimitExemptPaths = [
  "/_next",
  "/favicon.ico",
  "/api/health",
];

// Check if path is public
function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
}

// Check if path is exempt from rate limiting
function isRateLimitExempt(pathname: string): boolean {
  return rateLimitExemptPaths.some((path) => pathname.startsWith(path));
}

// Get client identifier for rate limiting
function getClientIdentifier(request: NextRequest): string {
  // Use X-Forwarded-For header if behind proxy, otherwise use IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return ip;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip rate limiting for exempt paths
  if (!isRateLimitExempt(pathname) && pathname.startsWith("/api/")) {
    const clientId = getClientIdentifier(request);
    const rateLimitConfig = getRateLimitForPath(pathname);
    const rateLimitResult = checkRateLimit(clientId, rateLimitConfig);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = handleAuth(request, pathname);
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  return handleAuth(request, pathname);
}

function handleAuth(request: NextRequest, pathname: string): NextResponse {
  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for session token
  const sessionToken = request.cookies.get("session-token")?.value;

  // If no session and trying to access protected route
  if (!sessionToken) {
    // For API routes, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }
    // For other routes, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session token exists - pass request through
  // Full session validation is done by individual API routes via getServerSession()
  // This prevents database calls in edge middleware
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
