import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user";
import { startOfDay, endOfDay, subDays } from "date-fns";

interface AgentStats {
  callsMade: number;
  callsTarget: number;
  callbacksDue: number;
  callbacksOverdue: number;
  successRate: number;
  avgCallDuration: number;
  outcomes: Record<string, number>;
  trend: {
    callsVsAvg: number;
    successRateVsAvg: number;
  };
}

// GET /api/agents/stats - Get agent daily statistics
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  try {
    // Get today's completed calls (from Activity records with type CALL)
    const todaysCalls = await prisma.activity.findMany({
      where: {
        userId,
        type: "CALL",
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        scheduledCall: true,
        callQueueItem: true,
      },
    });

    // Get calls made count
    const callsMade = todaysCalls.length;

    // Calculate outcomes breakdown
    const outcomes: Record<string, number> = {};
    let totalDuration = 0;
    let answeredCalls = 0;

    for (const call of todaysCalls) {
      const outcome = call.scheduledCall?.outcome || call.callQueueItem?.outcome;
      if (outcome) {
        outcomes[outcome] = (outcomes[outcome] || 0) + 1;
        if (outcome === "ANSWERED") {
          answeredCalls++;
        }
      }
      // Sum duration from scheduled calls
      if (call.scheduledCall?.duration) {
        totalDuration += call.scheduledCall.duration;
      }
    }

    // Calculate success rate (answered / total calls made)
    const successRate = callsMade > 0 ? answeredCalls / callsMade : 0;

    // Calculate average call duration
    const avgCallDuration = callsMade > 0 ? totalDuration / callsMade : 0;

    // Get callbacks due today (scheduled for today but not completed)
    const callbacksDueCount = await prisma.callQueueItem.count({
      where: {
        assignedToId: userId,
        status: "SCHEDULED",
        callbackAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    // Get overdue callbacks (scheduled before today and not completed)
    const callbacksOverdueCount = await prisma.callQueueItem.count({
      where: {
        assignedToId: userId,
        status: "SCHEDULED",
        callbackAt: {
          lt: dayStart,
        },
      },
    });

    // Calculate 7-day average for comparison
    const weekAgo = subDays(targetDate, 7);
    const weekCalls = await prisma.activity.count({
      where: {
        userId,
        type: "CALL",
        createdAt: {
          gte: startOfDay(weekAgo),
          lt: dayStart,
        },
      },
    });
    const avgDailyCalls = weekCalls / 7;

    // Get week's success rate
    const weekAnswered = await prisma.activity.count({
      where: {
        userId,
        type: "CALL",
        createdAt: {
          gte: startOfDay(weekAgo),
          lt: dayStart,
        },
        OR: [
          { scheduledCall: { outcome: "ANSWERED" } },
          { callQueueItem: { outcome: "ANSWERED" } },
        ],
      },
    });
    const avgSuccessRate = weekCalls > 0 ? weekAnswered / weekCalls : 0;

    // Default target: 30 calls per day (can be made configurable)
    const callsTarget = 30;

    const stats: AgentStats = {
      callsMade,
      callsTarget,
      callbacksDue: callbacksDueCount,
      callbacksOverdue: callbacksOverdueCount,
      successRate: Math.round(successRate * 100) / 100,
      avgCallDuration: Math.round(avgCallDuration * 10) / 10,
      outcomes,
      trend: {
        callsVsAvg: Math.round((callsMade - avgDailyCalls) * 10) / 10,
        successRateVsAvg: Math.round((successRate - avgSuccessRate) * 100) / 100,
      },
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Failed to fetch agent stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch agent stats" } },
      { status: 500 }
    );
  }
}
