/**
 * Microsoft Graph API Client
 * HTTP client with token management and retry logic
 */

import prisma from "@/lib/prisma";
import { MicrosoftAuthService, TokenManager, GRAPH_URL } from "./auth";

export interface GraphRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export interface GraphResponse<T> {
  value?: T[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

/**
 * Microsoft Graph API Client
 */
export class GraphClient {
  private credentialId: string;
  private accessToken: string | null = null;
  private tokenManager = new TokenManager();
  private authService = new MicrosoftAuthService();

  constructor(credentialId: string) {
    this.credentialId = credentialId;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    // Fetch credential from database
    const credential = await prisma.microsoftCredential.findUnique({
      where: { id: this.credentialId },
    });

    if (!credential) {
      throw new Error("Microsoft credential not found");
    }

    if (!credential.isActive) {
      throw new Error("Microsoft credential is not active");
    }

    // Check if token needs refresh
    const tokenManager = new TokenManager();
    if (tokenManager.isTokenExpired(credential.tokenExpiresAt)) {
      // Refresh the token
      try {
        const decryptedRefreshToken = tokenManager.decryptToken(credential.refreshToken);
        const newTokens = await this.authService.refreshAccessToken(decryptedRefreshToken);

        // Update credential with new tokens
        await prisma.microsoftCredential.update({
          where: { id: this.credentialId },
          data: {
            accessToken: tokenManager.encryptToken(newTokens.accessToken),
            refreshToken: tokenManager.encryptToken(newTokens.refreshToken),
            tokenExpiresAt: newTokens.expiresAt,
            scopes: newTokens.scopes,
          },
        });

        this.accessToken = newTokens.accessToken;
      } catch (error) {
        // Mark credential as inactive on refresh failure
        await prisma.microsoftCredential.update({
          where: { id: this.credentialId },
          data: { isActive: false },
        });
        throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } else {
      // Use existing token
      this.accessToken = tokenManager.decryptToken(credential.accessToken);
    }

    return this.accessToken!;
  }

  /**
   * Make a Graph API request
   */
  async request<T>(endpoint: string, options: GraphRequestOptions = {}): Promise<T> {
    const accessToken = await this.getAccessToken();

    const url = new URL(endpoint.startsWith("http") ? endpoint : `${GRAPH_URL}${endpoint}`);

    // Add query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method: options.method || "GET",
      headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));

      // Handle specific error codes
      if (response.status === 401) {
        // Token might be invalid, try refreshing once
        this.accessToken = null;
        const newToken = await this.getAccessToken();

        // Retry with new token
        headers.Authorization = `Bearer ${newToken}`;
        const retryResponse = await fetch(url.toString(), { ...fetchOptions, headers });

        if (!retryResponse.ok) {
          throw new Error(`Graph API error: ${error.error?.message || response.statusText}`);
        }

        if (retryResponse.status === 204) {
          return {} as T;
        }

        return retryResponse.json();
      }

      throw new Error(`Graph API error: ${error.error?.message || response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Get paginated results
   */
  async *paginate<T>(endpoint: string, options: GraphRequestOptions = {}): AsyncGenerator<T[]> {
    let nextLink: string | undefined = undefined;

    do {
      const url = nextLink || endpoint;
      const response: GraphResponse<T> = await this.request(url, nextLink ? {} : options);

      if (response.value) {
        yield response.value;
      }

      nextLink = response["@odata.nextLink"];
    } while (nextLink);
  }

  /**
   * Get all results from paginated endpoint
   */
  async getAllPages<T>(endpoint: string, options: GraphRequestOptions = {}): Promise<T[]> {
    const results: T[] = [];

    for await (const page of this.paginate<T>(endpoint, options)) {
      results.push(...page);
    }

    return results;
  }

  /**
   * Perform delta query (for incremental sync)
   */
  async deltaQuery<T>(
    endpoint: string,
    deltaToken?: string
  ): Promise<{ value: T[]; deltaLink: string; deletedIds: string[] }> {
    let nextLink: string | undefined = deltaToken || endpoint;
    const results: T[] = [];
    const deletedIds: string[] = [];
    let deltaLink: string | undefined;

    do {
      const response: GraphResponse<T> & {
        "@odata.deltaLink"?: string;
        value?: (T & { "@removed"?: { reason: string } })[];
      } = await this.request(nextLink, {
        params: deltaToken ? {} : { $deltaToken: "" },
      });

      if (response.value) {
        for (const item of response.value) {
          if (item["@removed"]) {
            deletedIds.push((item as unknown as { id: string }).id);
          } else {
            results.push(item);
          }
        }
      }

      nextLink = response["@odata.nextLink"];
      deltaLink = response["@odata.deltaLink"];
    } while (nextLink);

    return {
      value: results,
      deltaLink: deltaLink || endpoint,
      deletedIds,
    };
  }
}

/**
 * Create a Graph client for a specific credential
 */
export function createGraphClient(credentialId: string): GraphClient {
  return new GraphClient(credentialId);
}

/**
 * Create a Graph client for a specific mailbox
 */
export async function createGraphClientForMailbox(mailboxId: string): Promise<GraphClient> {
  const mailbox = await prisma.microsoftMailbox.findUnique({
    where: { id: mailboxId },
    select: { credentialId: true },
  });

  if (!mailbox) {
    throw new Error("Mailbox not found");
  }

  return new GraphClient(mailbox.credentialId);
}
