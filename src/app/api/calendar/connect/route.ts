import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user";
import { getCalendarProvider } from "@/lib/calendar/providers";
import { CalendarProvider, CalendarOAuthState } from "@/lib/calendar/types";

// GET /api/calendar/connect - Get OAuth URL for calendar connection
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") as CalendarProvider;
  const returnUrl = searchParams.get("returnUrl") || "/settings/integrations";

  if (!provider || !["google", "outlook"].includes(provider)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PROVIDER", message: "Invalid calendar provider" } },
      { status: 400 }
    );
  }

  try {
    const calendarProvider = getCalendarProvider(provider);

    // Create state for OAuth callback
    const state: CalendarOAuthState = {
      provider,
      userId,
      returnUrl,
    };

    // Encode state as base64 JSON
    const stateStr = Buffer.from(JSON.stringify(state)).toString("base64");
    const authUrl = calendarProvider.getAuthUrl(stateStr);

    return NextResponse.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error("Calendar connect error:", error);
    return NextResponse.json(
      { success: false, error: { code: "CONNECT_ERROR", message: "Failed to generate auth URL" } },
      { status: 500 }
    );
  }
}
