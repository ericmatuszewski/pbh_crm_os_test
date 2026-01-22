import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MicrosoftAuthService, TokenManager, createGraphClient } from "@/lib/microsoft-graph";

/**
 * GET /api/microsoft/auth/callback
 * OAuth callback handler - exchange code for tokens
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("Microsoft OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=missing_params", request.url)
      );
    }

    // Parse and validate state
    const stateData = MicrosoftAuthService.parseState(state);
    if (!stateData) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url)
      );
    }

    const { businessId } = stateData;

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_business", request.url)
      );
    }

    // Exchange code for tokens
    const authService = new MicrosoftAuthService();
    const tokens = await authService.exchangeCodeForTokens(code);

    // Encrypt tokens for storage
    const tokenManager = new TokenManager();
    const encryptedAccessToken = tokenManager.encryptToken(tokens.accessToken);
    const encryptedRefreshToken = tokenManager.encryptToken(tokens.refreshToken);

    // Get tenant ID and user info from the token
    // The access token is a JWT - we can decode it to get tenant info
    const tokenParts = tokens.accessToken.split(".");
    let tenantId = "common";
    let userEmail = "";

    try {
      const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
      tenantId = payload.tid || "common";

      // Try to get user email from Graph API
      const client = await createTempGraphClient(tokens.accessToken);
      const userInfo = await client.request<{ mail: string; userPrincipalName: string }>("/me", {
        params: { $select: "mail,userPrincipalName" },
      });
      userEmail = userInfo.mail || userInfo.userPrincipalName;
    } catch {
      // If we can't get user info, that's okay - admin can set it manually
    }

    // Upsert credential
    const credential = await prisma.microsoftCredential.upsert({
      where: {
        businessId_tenantId: {
          businessId,
          tenantId,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        isActive: true,
      },
      create: {
        businessId,
        tenantId,
        clientId: process.env.MICROSOFT_CLIENT_ID || "",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        isActive: true,
      },
    });

    // Redirect to success page
    const successUrl = new URL("/settings/integrations", request.url);
    successUrl.searchParams.set("microsoft", "connected");
    if (userEmail) {
      successUrl.searchParams.set("email", userEmail);
    }

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error"
        )}`,
        request.url
      )
    );
  }
}

/**
 * Create a temporary Graph client for initial user info fetch
 */
async function createTempGraphClient(accessToken: string) {
  return {
    async request<T>(endpoint: string, options?: { params?: Record<string, string> }): Promise<T> {
      const url = new URL(`https://graph.microsoft.com/v1.0${endpoint}`);
      if (options?.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.statusText}`);
      }

      return response.json();
    },
  };
}
