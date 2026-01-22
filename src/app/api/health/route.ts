import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/performance";

export async function GET() {
  try {
    const health = await getHealthStatus();

    const statusCode = health.status === "unhealthy" ? 503 : 200;

    return NextResponse.json(
      {
        ...health,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        database: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
