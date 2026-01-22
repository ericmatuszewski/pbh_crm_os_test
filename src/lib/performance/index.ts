/**
 * Performance Monitoring Utilities
 *
 * Tracks response times, slow queries, and system metrics.
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Thresholds
const SLOW_RESPONSE_THRESHOLD = 1000; // 1 second
const SLOW_QUERY_THRESHOLD = 500; // 500ms

// ==================== RESPONSE TIME TRACKING ====================

export interface ResponseMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  apiKeyId?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
}

/**
 * Record response metrics to database
 */
export async function recordResponseMetrics(
  metrics: ResponseMetrics
): Promise<void> {
  try {
    await prisma.performanceMetric.create({
      data: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        statusCode: metrics.statusCode,
        responseTime: metrics.responseTime,
        userId: metrics.userId,
        apiKeyId: metrics.apiKeyId,
        userAgent: metrics.userAgent,
        requestSize: metrics.requestSize,
        responseSize: metrics.responseSize,
      },
    });

    // Log slow responses
    if (metrics.responseTime > SLOW_RESPONSE_THRESHOLD) {
      console.warn(
        `Slow response: ${metrics.method} ${metrics.endpoint} took ${metrics.responseTime}ms`
      );
    }
  } catch (error) {
    console.error("Failed to record performance metrics:", error);
  }
}

/**
 * Create a timed handler wrapper for API routes
 */
export function withTiming<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const method = request.method;
    const url = new URL(request.url);
    const endpoint = url.pathname;

    try {
      const response = await handler(request);
      const responseTime = Date.now() - startTime;

      // Record metrics (non-blocking)
      recordResponseMetrics({
        endpoint,
        method,
        statusCode: response.status,
        responseTime,
        userAgent: request.headers.get("user-agent") || undefined,
      }).catch(() => {}); // Ignore errors

      // Add timing header
      response.headers.set("X-Response-Time", `${responseTime}ms`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      recordResponseMetrics({
        endpoint,
        method,
        statusCode: 500,
        responseTime,
        userAgent: request.headers.get("user-agent") || undefined,
      }).catch(() => {});

      throw error;
    }
  };
}

// ==================== QUERY TIMING ====================

/**
 * Record a slow query
 */
export async function recordSlowQuery(
  query: string,
  duration: number,
  source?: string,
  rowsAffected?: number
): Promise<void> {
  if (duration < SLOW_QUERY_THRESHOLD) return;

  try {
    // Truncate query to avoid storing huge queries
    const truncatedQuery =
      query.length > 1000 ? query.substring(0, 1000) + "..." : query;

    await prisma.queryMetric.create({
      data: {
        query: truncatedQuery,
        duration,
        rowsAffected,
        source,
      },
    });

    console.warn(`Slow query (${duration}ms): ${truncatedQuery.substring(0, 100)}...`);
  } catch (error) {
    console.error("Failed to record query metric:", error);
  }
}

/**
 * Time a database operation
 */
export async function timeQuery<T>(
  operation: () => Promise<T>,
  queryDescription: string,
  source?: string
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    if (duration > SLOW_QUERY_THRESHOLD) {
      await recordSlowQuery(queryDescription, duration, source);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    await recordSlowQuery(
      `[FAILED] ${queryDescription}`,
      duration,
      source
    );
    throw error;
  }
}

// ==================== METRICS AGGREGATION ====================

export interface AggregatedMetrics {
  period: string;
  totalRequests: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  slowRequestCount: number;
}

/**
 * Get aggregated performance metrics
 */
export async function getAggregatedMetrics(
  startDate: Date,
  endDate: Date,
  endpoint?: string
): Promise<AggregatedMetrics> {
  const where: Record<string, unknown> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (endpoint) {
    where.endpoint = endpoint;
  }

  const metrics = await prisma.performanceMetric.findMany({
    where,
    select: {
      responseTime: true,
      statusCode: true,
    },
    orderBy: { responseTime: "asc" },
  });

  if (metrics.length === 0) {
    return {
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      totalRequests: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
      p95ResponseTime: 0,
      errorRate: 0,
      slowRequestCount: 0,
    };
  }

  const responseTimes = metrics.map((m) => m.responseTime);
  const errorCount = metrics.filter((m) => m.statusCode >= 400).length;
  const slowCount = metrics.filter(
    (m) => m.responseTime > SLOW_RESPONSE_THRESHOLD
  ).length;

  // Calculate percentile
  const p95Index = Math.floor(responseTimes.length * 0.95);

  return {
    period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
    totalRequests: metrics.length,
    avgResponseTime: Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    ),
    maxResponseTime: Math.max(...responseTimes),
    minResponseTime: Math.min(...responseTimes),
    p95ResponseTime: responseTimes[p95Index] || 0,
    errorRate: (errorCount / metrics.length) * 100,
    slowRequestCount: slowCount,
  };
}

/**
 * Get endpoint-level metrics
 */
export async function getEndpointMetrics(
  startDate: Date,
  endDate: Date,
  limit: number = 20
): Promise<
  Array<{
    endpoint: string;
    method: string;
    requestCount: number;
    avgResponseTime: number;
    maxResponseTime: number;
    errorCount: number;
  }>
> {
  // Group by endpoint and method
  const metrics = await prisma.performanceMetric.groupBy({
    by: ["endpoint", "method"],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
    _avg: {
      responseTime: true,
    },
    _max: {
      responseTime: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: limit,
  });

  // Get error counts separately
  const errorCounts = await prisma.performanceMetric.groupBy({
    by: ["endpoint", "method"],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      statusCode: { gte: 400 },
    },
    _count: {
      id: true,
    },
  });

  const errorMap = new Map(
    errorCounts.map((e) => [`${e.endpoint}:${e.method}`, e._count.id])
  );

  return metrics.map((m) => ({
    endpoint: m.endpoint,
    method: m.method,
    requestCount: m._count.id,
    avgResponseTime: Math.round(m._avg.responseTime || 0),
    maxResponseTime: m._max.responseTime || 0,
    errorCount: errorMap.get(`${m.endpoint}:${m.method}`) || 0,
  }));
}

/**
 * Get slow queries
 */
export async function getSlowQueries(
  startDate: Date,
  endDate: Date,
  limit: number = 20
): Promise<
  Array<{
    query: string;
    duration: number;
    source: string | null;
    createdAt: Date;
  }>
> {
  return prisma.queryMetric.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { duration: "desc" },
    take: limit,
    select: {
      query: true,
      duration: true,
      source: true,
      createdAt: true,
    },
  });
}

// ==================== HEALTH CHECK ====================

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  database: boolean;
  responseTime: {
    avg: number;
    p95: number;
  };
  errorRate: number;
  uptime: number;
}

const startTime = Date.now();

/**
 * Get system health status
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Check database
  let databaseHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseHealthy = true;
  } catch {
    databaseHealthy = false;
  }

  // Get recent metrics
  const recentMetrics = await getAggregatedMetrics(fiveMinutesAgo, now);

  // Determine overall status
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  if (!databaseHealthy) {
    status = "unhealthy";
  } else if (recentMetrics.errorRate > 10 || recentMetrics.p95ResponseTime > 2000) {
    status = "degraded";
  }

  return {
    status,
    database: databaseHealthy,
    responseTime: {
      avg: recentMetrics.avgResponseTime,
      p95: recentMetrics.p95ResponseTime,
    },
    errorRate: recentMetrics.errorRate,
    uptime: Date.now() - startTime,
  };
}

// ==================== CLEANUP ====================

/**
 * Clean up old performance metrics
 */
export async function cleanupOldMetrics(daysOld: number = 7): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await prisma.performanceMetric.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  const queryResult = await prisma.queryMetric.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return result.count + queryResult.count;
}

const performanceService = {
  recordResponseMetrics,
  withTiming,
  recordSlowQuery,
  timeQuery,
  getAggregatedMetrics,
  getEndpointMetrics,
  getSlowQueries,
  getHealthStatus,
  cleanupOldMetrics,
};

export default performanceService;
