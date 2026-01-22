import { NextRequest, NextResponse } from "next/server";

// Default security settings
const defaultSettings = {
  mfaEnabled: false,
  mfaMethod: "app",
  sessionTimeoutMinutes: 480,
  maxConcurrentSessions: 5,
  allowRememberMe: true,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    expiryDays: 90,
    preventReuse: 5,
  },
};

// In-memory storage for demo (would be database in production)
let savedSettings: Record<string, unknown> | null = null;

export async function GET() {
  return NextResponse.json({
    success: true,
    data: savedSettings || defaultSettings,
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    savedSettings = { ...defaultSettings, ...data };

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving security settings:", error);
    return NextResponse.json(
      { success: false, error: { code: "SAVE_ERROR", message: "Failed to save settings" } },
      { status: 500 }
    );
  }
}
