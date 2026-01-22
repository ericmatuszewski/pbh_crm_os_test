/**
 * Microsoft Graph Authentication Service
 * Handles OAuth2 flow and token management
 */

import crypto from "crypto";
import { MicrosoftAuthConfig, MicrosoftTokens, EMAIL_SCOPES, SHARED_MAILBOX_SCOPES } from "./types";

// Microsoft OAuth endpoints
const AUTHORITY_URL = "https://login.microsoftonline.com";
const GRAPH_URL = "https://graph.microsoft.com/v1.0";

export class MicrosoftAuthService {
  private config: MicrosoftAuthConfig;

  constructor(config?: Partial<MicrosoftAuthConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: config?.clientSecret || process.env.MICROSOFT_CLIENT_SECRET || "",
      tenantId: config?.tenantId || process.env.MICROSOFT_TENANT_ID || "common",
      redirectUri: config?.redirectUri || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/microsoft/auth/callback`,
    };
  }

  /**
   * Generate authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(state: string, useSharedMailboxScopes: boolean = false): string {
    const scopes = useSharedMailboxScopes ? SHARED_MAILBOX_SCOPES : EMAIL_SCOPES;
    const scopeString = scopes.join(" ");

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: this.config.redirectUri,
      response_mode: "query",
      scope: scopeString,
      state: state,
      prompt: "consent", // Force consent to ensure all scopes are granted
    });

    return `${AUTHORITY_URL}/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: code,
      redirect_uri: this.config.redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(
      `${AUTHORITY_URL}/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(" ") || [],
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(
      `${AUTHORITY_URL}/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // May not return new refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(" ") || [],
    };
  }

  /**
   * Generate a secure state parameter for OAuth flow
   */
  static generateState(businessId: string): string {
    const random = crypto.randomBytes(16).toString("hex");
    const data = JSON.stringify({ businessId, random });
    return Buffer.from(data).toString("base64url");
  }

  /**
   * Parse and validate state parameter
   */
  static parseState(state: string): { businessId: string } | null {
    try {
      const data = JSON.parse(Buffer.from(state, "base64url").toString());
      return { businessId: data.businessId };
    } catch {
      return null;
    }
  }
}

/**
 * Token Manager - Handles token storage and refresh
 */
export class TokenManager {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY || "default-key-change-in-production";
  }

  /**
   * Encrypt token for storage
   */
  encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  /**
   * Decrypt token from storage
   */
  decryptToken(encryptedToken: string): string {
    const [ivHex, encrypted] = encryptedToken.split(":");
    if (!ivHex || !encrypted) {
      throw new Error("Invalid encrypted token format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Check if token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired(expiresAt: Date): boolean {
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
    return new Date(expiresAt).getTime() - bufferMs < Date.now();
  }
}

export { GRAPH_URL };
