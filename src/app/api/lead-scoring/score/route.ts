import { NextRequest, NextResponse } from "next/server";
import { ScoringEventType } from "@prisma/client";
import { processScoreEvent, adjustScore } from "@/lib/scoring/engine";

// POST /api/lead-scoring/score - Process a scoring event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, eventType, eventDescription, relatedType, relatedId, manualPoints } = body;

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "contactId is required" } },
        { status: 400 }
      );
    }

    // Manual score adjustment
    if (manualPoints !== undefined) {
      if (typeof manualPoints !== "number") {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "manualPoints must be a number" } },
          { status: 400 }
        );
      }

      const result = await adjustScore(
        contactId,
        manualPoints,
        eventDescription || "Manual adjustment"
      );

      return NextResponse.json({ success: true, data: result });
    }

    // Event-based scoring
    if (!eventType) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "eventType is required" } },
        { status: 400 }
      );
    }

    if (!Object.values(ScoringEventType).includes(eventType)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid event type: ${eventType}` } },
        { status: 400 }
      );
    }

    const result = await processScoreEvent({
      contactId,
      eventType,
      eventDescription,
      relatedType,
      relatedId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to process score event:", error);
    return NextResponse.json(
      { success: false, error: { code: "SCORE_ERROR", message: "Failed to process score event" } },
      { status: 500 }
    );
  }
}
