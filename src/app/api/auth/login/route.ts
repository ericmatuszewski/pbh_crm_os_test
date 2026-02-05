import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { authenticateAD, isLDAPConfigured } from "@/lib/auth/ldap";
import { createSessionWithLimitEnforcement, parseUserAgent } from "@/lib/sessions/service";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Session duration: 8 hours (typical workday)
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: { message: "Username and password required" } },
        { status: 400 }
      );
    }

    // Check if LDAP is configured
    if (!isLDAPConfigured()) {
      return NextResponse.json(
        { success: false, error: { message: "Authentication not configured" } },
        { status: 500 }
      );
    }

    // Authenticate against AD
    const authResult = await authenticateAD(username, password);

    let user = null;

    if (!authResult.success || !authResult.user) {
      // Development fallback: allow login with existing database users
      // when AD is unreachable (e.g., not on corporate network)
      if (process.env.NODE_ENV !== "production" || process.env.DEV_AUTH_FALLBACK === "true") {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { contains: username, mode: "insensitive" } },
              { name: { contains: username, mode: "insensitive" } },
            ],
            status: "ACTIVE",
          },
        });

        if (user && password === "devtest123") {
          // Dev fallback login
        } else {
          return NextResponse.json(
            { success: false, error: { message: authResult.error || "Authentication failed" } },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: { message: authResult.error || "Authentication failed" } },
          { status: 401 }
        );
      }
    } else {
      const adUser = authResult.user;

      // Find or create user in database
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: adUser.mail },
            { email: adUser.userPrincipalName },
            { name: adUser.sAMAccountName },
          ],
        },
      });

      if (!user) {
        // Get default business (or first one)
        const business = await prisma.business.findFirst();

        // Create new user from AD info
        user = await prisma.user.create({
          data: {
            email: adUser.mail || adUser.userPrincipalName || `${adUser.sAMAccountName}@nobutts.com`,
            name: adUser.displayName || `${adUser.givenName} ${adUser.sn}`.trim() || adUser.sAMAccountName,
            status: "ACTIVE",
            authProvider: "LDAP",
            externalId: adUser.dn,
          },
        });

        // If a default business exists, associate user with it
        if (business) {
          await prisma.userBusiness.create({
            data: {
              userId: user.id,
              businessId: business.id,
              isDefault: true,
            },
          });
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "User not found" } },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: { message: "User account is disabled" } },
        { status: 403 }
      );
    }

    // Check MFA status
    const userMfa = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaEnabled: true },
    });

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    // Get device/location info
    const userAgent = request.headers.get("user-agent") || "";
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    // Check if user has MFA enabled
    if (userMfa?.mfaEnabled) {
      // Return partial response requiring MFA verification
      // Store pending session info temporarily (could use Redis in production)
      return NextResponse.json({
        success: true,
        data: {
          requiresMfa: true,
          userId: user.id,
          message: "MFA verification required",
        },
      });
    }

    // Create session with limit enforcement (revokes oldest if over limit)
    const { enforcementResult } = await createSessionWithLimitEnforcement(
      sessionToken,
      user.id,
      userAgent,
      { ipAddress },
      expiresAt
    );

    // Log if sessions were revoked due to limit
    if (enforcementResult.revokedCount > 0) {
      console.log(`Session limit enforced for user ${user.id}: ${enforcementResult.revokedCount} sessions revoked`);
    }

    // Update user last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Login failed" } },
      { status: 500 }
    );
  }
}
