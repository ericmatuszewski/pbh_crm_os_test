import { NextRequest, NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/business";
import { MicrosoftAuthService } from "@/lib/microsoft-graph";

/**
 * GET /api/microsoft/auth
 * Get OAuth authorization URL to start Microsoft connection
 */
export async function GET(request: NextRequest) {
  try {
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const useSharedMailbox = searchParams.get("shared") === "true";

    // Generate state parameter with business ID
    const state = MicrosoftAuthService.generateState(business.id);

    // Get authorization URL
    const authService = new MicrosoftAuthService();
    const authUrl = authService.getAuthorizationUrl(state, useSharedMailbox);

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        state,
      },
    });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { success: false, error: { code: "AUTH_ERROR", message: "Failed to generate authorization URL" } },
      { status: 500 }
    );
  }
}
