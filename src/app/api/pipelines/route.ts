import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  stages: z.array(z.object({
    name: z.string().min(1),
    color: z.string().optional(),
    probability: z.number().min(0).max(100),
    isClosed: z.boolean().optional(),
    isWon: z.boolean().optional(),
  })).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStages = searchParams.get("includeStages") !== "false";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const pipelines = await prisma.pipeline.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: includeStages ? {
        stages: {
          orderBy: { position: "asc" },
        },
        _count: { select: { deals: true } },
      } : {
        _count: { select: { deals: true } },
      },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ success: true, data: pipelines });
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch pipelines" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createPipelineSchema.parse(body);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.pipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const pipeline = await prisma.pipeline.create({
      data: {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault || false,
        stages: data.stages ? {
          create: data.stages.map((stage, index) => ({
            name: stage.name,
            color: stage.color || "#6366f1",
            probability: stage.probability,
            position: index,
            isClosed: stage.isClosed || false,
            isWon: stage.isWon || false,
          })),
        } : undefined,
      },
      include: {
        stages: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: pipeline }, { status: 201 });
  } catch (error) {
    console.error("Error creating pipeline:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.errors } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create pipeline" } },
      { status: 500 }
    );
  }
}
