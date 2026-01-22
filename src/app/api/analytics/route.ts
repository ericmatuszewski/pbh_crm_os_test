import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfMonth, subMonths, format, startOfWeek, subWeeks } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("range") || "all";

    // Calculate date ranges
    const now = new Date();
    let startDate: Date | undefined;

    switch (timeRange) {
      case "week":
        startDate = startOfWeek(now);
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "quarter":
        startDate = subMonths(startOfMonth(now), 2);
        break;
      case "year":
        startDate = subMonths(startOfMonth(now), 11);
        break;
      default:
        startDate = undefined;
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;

    // Fetch all relevant data
    const [deals, contacts, quotes, tasks, users] = await Promise.all([
      prisma.deal.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contact.count({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
      }),
      prisma.quote.count({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
      }),
      prisma.task.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        select: { status: true, assigneeId: true },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true },
      }),
    ]);

    // Core KPIs
    const wonDeals = deals.filter((d) => d.stage === "CLOSED_WON");
    const lostDeals = deals.filter((d) => d.stage === "CLOSED_LOST");
    const openDeals = deals.filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage));

    const totalPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const closedDeals = wonDeals.length + lostDeals.length;
    const winRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;
    const avgDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;

    // Revenue forecast (weighted pipeline)
    const weightedPipelineValue = openDeals.reduce(
      (sum, d) => sum + Number(d.value) * (d.probability / 100),
      0
    );

    // Deals by stage
    const dealsByStage: Record<string, { count: number; value: number }> = {};
    deals.forEach((deal) => {
      if (!dealsByStage[deal.stage]) {
        dealsByStage[deal.stage] = { count: 0, value: 0 };
      }
      dealsByStage[deal.stage].count++;
      dealsByStage[deal.stage].value += Number(deal.value);
    });

    // Sales rep leaderboard
    const repPerformance: Record<string, {
      id: string;
      name: string;
      email: string;
      deals: number;
      wonDeals: number;
      wonValue: number;
      pipelineValue: number;
      winRate: number;
    }> = {};

    deals.forEach((deal) => {
      const ownerId = deal.ownerId;
      if (!ownerId) return;

      if (!repPerformance[ownerId]) {
        const user = users.find((u) => u.id === ownerId);
        repPerformance[ownerId] = {
          id: ownerId,
          name: user?.name || "Unknown",
          email: user?.email || "",
          deals: 0,
          wonDeals: 0,
          wonValue: 0,
          pipelineValue: 0,
          winRate: 0,
        };
      }

      repPerformance[ownerId].deals++;
      if (deal.stage === "CLOSED_WON") {
        repPerformance[ownerId].wonDeals++;
        repPerformance[ownerId].wonValue += Number(deal.value);
      }
      if (!["CLOSED_WON", "CLOSED_LOST"].includes(deal.stage)) {
        repPerformance[ownerId].pipelineValue += Number(deal.value);
      }
    });

    // Calculate win rates for reps
    Object.values(repPerformance).forEach((rep) => {
      const closedByRep = deals.filter(
        (d) => d.ownerId === rep.id && ["CLOSED_WON", "CLOSED_LOST"].includes(d.stage)
      ).length;
      rep.winRate = closedByRep > 0 ? (rep.wonDeals / closedByRep) * 100 : 0;
    });

    // Sort leaderboard by won value
    const leaderboard = Object.values(repPerformance)
      .sort((a, b) => b.wonValue - a.wonValue)
      .slice(0, 10);

    // Pipeline velocity (avg days to close won deals)
    const avgDaysToClose = wonDeals.length > 0
      ? wonDeals.reduce((sum, d) => {
          const days = d.closedAt
            ? Math.ceil((new Date(d.closedAt).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          return sum + days;
        }, 0) / wonDeals.length
      : 0;

    // Monthly trend data (last 6 months)
    const monthlyData: Array<{
      month: string;
      won: number;
      lost: number;
      created: number;
      value: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = subMonths(startOfMonth(now), i);
      const monthEnd = subMonths(startOfMonth(now), i - 1);
      const monthLabel = format(monthStart, "MMM yyyy");

      const monthDeals = deals.filter((d) => {
        const createdAt = new Date(d.createdAt);
        return createdAt >= monthStart && createdAt < monthEnd;
      });

      monthlyData.push({
        month: monthLabel,
        won: monthDeals.filter((d) => d.stage === "CLOSED_WON").length,
        lost: monthDeals.filter((d) => d.stage === "CLOSED_LOST").length,
        created: monthDeals.length,
        value: monthDeals
          .filter((d) => d.stage === "CLOSED_WON")
          .reduce((sum, d) => sum + Number(d.value), 0),
      });
    }

    // Weekly activity (last 8 weeks)
    const weeklyActivity: Array<{
      week: string;
      deals: number;
      tasks: number;
    }> = [];

    for (let i = 7; i >= 0; i--) {
      const weekStart = subWeeks(startOfWeek(now), i);
      const weekEnd = subWeeks(startOfWeek(now), i - 1);
      const weekLabel = format(weekStart, "MMM d");

      const weekDeals = deals.filter((d) => {
        const createdAt = new Date(d.createdAt);
        return createdAt >= weekStart && createdAt < weekEnd;
      }).length;

      weeklyActivity.push({
        week: weekLabel,
        deals: weekDeals,
        tasks: 0, // Would need createdAt on tasks
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalDeals: deals.length,
          totalPipelineValue,
          wonDeals: wonDeals.length,
          wonValue,
          lostDeals: lostDeals.length,
          winRate,
          avgDealSize,
          weightedPipelineValue,
          avgDaysToClose,
          totalContacts: contacts,
          totalQuotes: quotes,
          pendingTasks: tasks.filter((t) => t.status !== "COMPLETED").length,
        },
        dealsByStage,
        leaderboard,
        monthlyTrend: monthlyData,
        weeklyActivity,
        recentDeals: deals.slice(0, 10).map((d) => ({
          id: d.id,
          title: d.title,
          value: Number(d.value),
          stage: d.stage,
          probability: d.probability,
          company: d.company?.name,
          owner: d.owner?.name,
          createdAt: d.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { success: false, error: { code: "ANALYTICS_ERROR", message: "Failed to fetch analytics data" } },
      { status: 500 }
    );
  }
}
