import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJob, cancelJob, retryJob, processJobs } from "@/lib/jobs";

// GET /api/jobs - List jobs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const [jobs, total] = await Promise.all([
      prisma.backgroundJob.findMany({
        where,
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { logs: true },
          },
        },
      }),
      prisma.backgroundJob.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch jobs" } },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create a job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type || !body.name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "type and name are required" } },
        { status: 400 }
      );
    }

    const validTypes = ["email", "report", "import", "export", "webhook_retry", "cleanup", "notification", "workflow", "email_sync", "email_delta_sync", "subscription_renewal", "call_timeout"];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    const jobId = await createJob({
      type: body.type,
      name: body.name,
      payload: body.payload || {},
      priority: body.priority,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      maxAttempts: body.maxAttempts,
      userId: body.userId,
    });

    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create job" } },
      { status: 500 }
    );
  }
}

// PUT /api/jobs - Process pending jobs (for cron/scheduler)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const limit = body.limit || 10;

    const processed = await processJobs(limit);

    return NextResponse.json({
      success: true,
      data: {
        processed,
        message: `Processed ${processed} jobs`,
      },
    });
  } catch (error) {
    console.error("Failed to process jobs:", error);
    return NextResponse.json(
      { success: false, error: { code: "PROCESS_ERROR", message: "Failed to process jobs" } },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs - Cancel or retry a job
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.action) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "id and action are required" } },
        { status: 400 }
      );
    }

    let success = false;
    let message = "";

    switch (body.action) {
      case "cancel":
        success = await cancelJob(body.id);
        message = success ? "Job cancelled" : "Could not cancel job";
        break;
      case "retry":
        success = await retryJob(body.id);
        message = success ? "Job queued for retry" : "Could not retry job";
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid action. Must be 'cancel' or 'retry'",
            },
          },
          { status: 400 }
        );
    }

    if (!success) {
      return NextResponse.json(
        { success: false, error: { code: "ACTION_FAILED", message } },
        { status: 400 }
      );
    }

    const job = await prisma.backgroundJob.findUnique({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, data: job, message });
  } catch (error) {
    console.error("Failed to update job:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update job" } },
      { status: 500 }
    );
  }
}
