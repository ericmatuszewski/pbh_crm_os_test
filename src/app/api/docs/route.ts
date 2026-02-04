import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// GET /api/docs - Serve OpenAPI specification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  try {
    // Read the OpenAPI spec from the JSON file
    const specPath = join(process.cwd(), "src/app/api/docs/openapi.json");
    const specContent = readFileSync(specPath, "utf-8");
    const spec = JSON.parse(specContent);

    // Add server URL based on request
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    spec.servers = [
      {
        url: `${protocol}://${host}/api`,
        description: "Current server",
      },
    ];

    if (format === "yaml") {
      // Simple YAML conversion for basic cases
      const yaml = jsonToYaml(spec);
      return new NextResponse(yaml, {
        headers: {
          "Content-Type": "text/yaml; charset=utf-8",
          "Content-Disposition": 'inline; filename="openapi.yaml"',
        },
      });
    }

    return NextResponse.json(spec, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error serving OpenAPI spec:", error);
    return NextResponse.json(
      { error: "Failed to load OpenAPI specification" },
      { status: 500 }
    );
  }
}

// Simple JSON to YAML converter
function jsonToYaml(obj: unknown, indent: number = 0): string {
  const spaces = "  ".repeat(indent);

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj === "boolean" || typeof obj === "number") {
    return String(obj);
  }

  if (typeof obj === "string") {
    // Check if string needs quoting
    if (obj.includes("\n") || obj.includes(":") || obj.includes("#") || obj.includes("'") || obj.includes('"')) {
      return `"${obj.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map((item) => `${spaces}- ${jsonToYaml(item, indent + 1).trimStart()}`).join("\n");
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";

    return entries
      .map(([key, value]) => {
        const valueStr = jsonToYaml(value, indent + 1);
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        if (Array.isArray(value) && value.length > 0) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        return `${spaces}${key}: ${valueStr}`;
      })
      .join("\n");
  }

  return String(obj);
}
