import { NextRequest, NextResponse } from "next/server";

// Default appearance settings
const defaultSettings = {
  theme: "system",
  accentColor: "#3b82f6",
  fontSize: "medium",
  compactMode: false,
  sidebarCollapsed: false,
  showAvatars: true,
  animationsEnabled: true,
  highContrastMode: false,
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  weekStartsOn: "monday",
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
    console.error("Error saving appearance settings:", error);
    return NextResponse.json(
      { success: false, error: { code: "SAVE_ERROR", message: "Failed to save settings" } },
      { status: 500 }
    );
  }
}
