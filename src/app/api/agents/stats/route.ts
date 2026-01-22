import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user";
import { startOfDay, endOfDay } from "date-fns";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface OutcomeStats {
  ANSWERED: number;
  NO_ANSWER: number;
  VOICEMAIL: number;
  BUSY: number;
  CALLBACK_REQUESTED: number;
  NOT_INTERESTED: number;
  WRONG_NUMBER: number;
  DO_NOT_CALL: number;
}

interface AgentStats {
  callsMade: number;
  callsTarget: number;
  callbacksDue: number;
  callbacksOverdue: number;
  successRate: number;
  avgCallDuration: number;
  outcomes: OutcomeStats;
}

// GET /api/agents/stats - Get agent's daily statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const userId = searchParams.get("userId") || await getCurrentUserId(request);

    // Parse date or use today
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    const now = new Date();

    // Default target - can be made configurable per user/business
    const DAILY_TARGET = 30;

    // Get completed calls for today (from Activity records of type CALL)
    const completedCalls = await prisma.activity.findMany({
      where: {
        userId,
        type: "CALL",
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        scheduledCall: {
          select: {
            outcome: true,
            duration: true,
          },
        },
        callQueueItem: {
          select: {
            outcome: true,
          },
        },
      },
    });

    // Count outcomes from both scheduled calls and queue items
    const outcomes: OutcomeStats = {
      ANSWERED: 0,
      NO_ANSWER: 0,
      VOICEMAIL: 0,
      BUSY: 0,
      CALLBACK_REQUESTED: 0,
      NOT_INTERESTED: 0,
      WRONG_NUMBER: 0,
      DO_NOT_CALL: 0,
    };

    let totalDuration = 0;
    let callsWithDuration = 0;

    for (const activity of completedCalls) {
      const outcome = activity.scheduledCall?.outcome || activity.callQueueItem?.outcome;
      if (outcome && outcome in outcomes) {
        outcomes[outcome as keyof OutcomeStats]++;
      }

      // Track duration for average calculation
      const duration = activity.scheduledCall?.duration;
      if (duration) {
        totalDuration += duration;
        callsWithDuration++;
      }
    }

    const callsMade = completedCalls.length;
    const successfulCalls = outcomes.ANSWERED + outcomes.CALLBACK_REQUESTED;
    const successRate = callsMade > 0 ? successfulCalls / callsMade : 0;
    const avgCallDuration = callsWithDuration > 0 ? totalDuration / callsWithDuration : 0;

    // Get callbacks due today (scheduled calls with status SCHEDULED and scheduledAt today)
    const callbacksDueToday = await prisma.scheduledCall.count({
      where: {
        assignedToId: userId,
        status: "SCHEDULED",
        scheduledAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    // Get callbacks that are overdue (scheduled calls with status SCHEDULED and scheduledAt < now)
    const callbacksOverdue = await prisma.scheduledCall.count({
      where: {
        assignedToId: userId,
        status: "SCHEDULED",
        scheduledAt: {
          lt: now,
        },
      },
    });

    // Also check CallQueueItem for callbacks due
    const queueCallbacksDue = await prisma.callQueueItem.count({
      where: {
        assignedToId: userId,
        status: "SCHEDULED",
        callbackAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    const queueCallbacksOverdue = await prisma.callQueueItem.count({
      where: {
        assignedToId: userId,
        status: "SCHEDULED",
        callbackAt: {
          lt: now,
          not: null,
        },
      },
    });

    const stats: AgentStats = {
      callsMade,
      callsTarget: DAILY_TARGET,
      callbacksDue: callbacksDueToday + queueCallbacksDue,
      callbacksOverdue: callbacksOverdue + queueCallbacksOverdue,
      successRate: Math.round(successRate * 100) / 100,
      avgCallDuration: Math.round(avgCallDuration * 10) / 10,
      outcomes,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching agent stats:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch agent stats" } },
      { status: 500 }
    );
  }
}
