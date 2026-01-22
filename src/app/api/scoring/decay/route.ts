import { NextRequest, NextResponse } from "next/server";
import { scheduleScoreDecayJob } from "@/lib/scoring/schedule";
import { processScoreDecay } from "@/lib/scoring/engine";

// POST /api/scoring/decay - Trigger score decay processing
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const immediate = searchParams.get("immediate") === "true";

    if (immediate) {
      // Run decay immediately (synchronous)
      const decayedCount = await processScoreDecay();
      return NextResponse.json({
        success: true,
        data: { decayedCount },
        message: `Applied decay to ${decayedCount} contacts`,
      });
    } else {
      // Schedule a background job
      const jobId = await scheduleScoreDecayJob();
      return NextResponse.json({
        success: true,
        data: { jobId },
        message: "Score decay job scheduled",
      });
    }
  } catch (error) {
    console.error("Error processing score decay:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to process score decay" } },
      { status: 500 }
    );
  }
}
