import { NextRequest, NextResponse } from "next/server";
import {
  getAggregatedMetrics,
  getEndpointMetrics,
  getSlowQueries,
  getHealthStatus,
  cleanupOldMetrics,
} from "@/lib/performance";

// GET /api/performance - Get performance metrics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "1h"; // 1h, 6h, 24h, 7d, 30d
    const endpoint = searchParams.get("endpoint");
    const view = searchParams.get("view") || "overview"; // overview, endpoints, slow_queries

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "1h":
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "6h":
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
    }

    let data: unknown;

    switch (view) {
      case "endpoints":
        data = await getEndpointMetrics(startDate, now, 50);
        break;
      case "slow_queries":
        data = await getSlowQueries(startDate, now, 50);
        break;
      case "overview":
      default:
        const [aggregated, endpoints, slowQueries, health] = await Promise.all([
          getAggregatedMetrics(startDate, now, endpoint || undefined),
          getEndpointMetrics(startDate, now, 10),
          getSlowQueries(startDate, now, 10),
          getHealthStatus(),
        ]);

        data = {
          overview: aggregated,
          topEndpoints: endpoints,
          slowQueries,
          health,
        };
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to fetch performance metrics:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch performance metrics" } },
      { status: 500 }
    );
  }
}

// DELETE /api/performance - Cleanup old metrics
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const daysOld = body.daysOld || 7;

    const deleted = await cleanupOldMetrics(daysOld);

    return NextResponse.json({
      success: true,
      data: {
        deleted,
        message: `Deleted ${deleted} old metric records`,
      },
    });
  } catch (error) {
    console.error("Failed to cleanup metrics:", error);
    return NextResponse.json(
      { success: false, error: { code: "CLEANUP_ERROR", message: "Failed to cleanup metrics" } },
      { status: 500 }
    );
  }
}
