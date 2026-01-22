import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/login-history - List login history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");
    const success = searchParams.get("success");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const ipAddress = searchParams.get("ipAddress");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (email) where.email = { contains: email, mode: "insensitive" };
    if (success !== null) where.success = success === "true";
    if (ipAddress) where.ipAddress = ipAddress;

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [history, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.loginHistory.count({ where }),
    ]);

    // Calculate stats
    const stats = await prisma.loginHistory.groupBy({
      by: ["success"],
      where,
      _count: true,
    });

    const successCount = stats.find((s) => s.success)?._count || 0;
    const failureCount = stats.find((s) => !s.success)?._count || 0;

    return NextResponse.json({
      success: true,
      data: history,
      stats: {
        totalLogins: successCount,
        failedAttempts: failureCount,
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch login history:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch login history" } },
      { status: 500 }
    );
  }
}

// POST /api/login-history - Record a login attempt (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.email) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId and email are required" } },
        { status: 400 }
      );
    }

    // Parse user agent for browser/OS info
    const userAgent = request.headers.get("user-agent") || body.userAgent;
    const { browser, os, device } = parseUserAgent(userAgent);

    const record = await prisma.loginHistory.create({
      data: {
        userId: body.userId,
        email: body.email,
        success: body.success ?? true,
        failureReason: body.failureReason,
        ipAddress: request.headers.get("x-forwarded-for") || body.ipAddress,
        userAgent,
        browser,
        os,
        device,
        country: body.country,
        city: body.city,
        sessionId: body.sessionId,
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("Failed to record login:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to record login" } },
      { status: 500 }
    );
  }
}

// Simple user agent parser
function parseUserAgent(userAgent?: string | null): { browser: string | null; os: string | null; device: string | null } {
  if (!userAgent) {
    return { browser: null, os: null, device: null };
  }

  let browser: string | null = null;
  let os: string | null = null;
  let device: string | null = "desktop";

  // Browser detection
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome";
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
    browser = "Internet Explorer";
  }

  // OS detection
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS X")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
    device = "mobile";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
    device = userAgent.includes("iPad") ? "tablet" : "mobile";
  }

  // Device type override
  if (userAgent.includes("Mobile")) {
    device = "mobile";
  } else if (userAgent.includes("Tablet")) {
    device = "tablet";
  }

  return { browser, os, device };
}
