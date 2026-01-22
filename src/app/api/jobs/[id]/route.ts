import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/jobs/[id] - Get job details with logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.backgroundJob.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Job not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch job" } },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Delete a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.backgroundJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Job not found" } },
        { status: 404 }
      );
    }

    // Only allow deleting completed, failed, or cancelled jobs
    if (!["completed", "failed", "cancelled"].includes(job.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: "Cannot delete a running or pending job. Cancel it first.",
          },
        },
        { status: 400 }
      );
    }

    await prisma.backgroundJob.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete job:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete job" } },
      { status: 500 }
    );
  }
}
