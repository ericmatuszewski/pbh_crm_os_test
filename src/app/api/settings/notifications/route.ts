import { NextRequest, NextResponse } from "next/server";

// Default notification settings
const defaultSettings = {
  emailEnabled: true,
  emailDealAssigned: true,
  emailDealStageChanged: true,
  emailDealWon: true,
  emailDealLost: true,
  emailTaskAssigned: true,
  emailTaskDueSoon: true,
  emailTaskOverdue: true,
  emailMeetingReminder: true,
  emailQuoteAccepted: true,
  emailQuoteRejected: true,
  emailNewContact: false,
  emailWeeklyDigest: true,
  inAppEnabled: true,
  inAppDealUpdates: true,
  inAppTaskUpdates: true,
  inAppMentions: true,
  inAppSystemAlerts: true,
  digestFrequency: "weekly",
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
    console.error("Error saving notification settings:", error);
    return NextResponse.json(
      { success: false, error: { code: "SAVE_ERROR", message: "Failed to save settings" } },
      { status: 500 }
    );
  }
}
