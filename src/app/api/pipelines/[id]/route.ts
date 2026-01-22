import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updatePipelineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateStagesSchema = z.object({
  stages: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    color: z.string().optional(),
    probability: z.number().min(0).max(100),
    position: z.number().min(0),
    isClosed: z.boolean().optional(),
    isWon: z.boolean().optional(),
  })),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: params.id },
      include: {
        stages: {
          orderBy: { position: "asc" },
          include: {
            _count: { select: { deals: true } },
          },
        },
        _count: { select: { deals: true } },
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Pipeline not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch pipeline" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = updatePipelineSchema.parse(body);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.pipeline.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      });
    }

    const pipeline = await prisma.pipeline.update({
      where: { id: params.id },
      data,
      include: {
        stages: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    console.error("Error updating pipeline:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update pipeline" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = updateStagesSchema.parse(body);

    // Delete existing stages and recreate them
    await prisma.$transaction(async (tx) => {
      // Get existing stage IDs
      const existingStages = await tx.pipelineStage.findMany({
        where: { pipelineId: params.id },
        select: { id: true },
      });
      const existingIds = new Set(existingStages.map(s => s.id));

      // Separate updates and creates
      const stagesToUpdate = data.stages.filter(s => s.id && existingIds.has(s.id));
      const stagesToCreate = data.stages.filter(s => !s.id || !existingIds.has(s.id));
      const stageIdsToKeep = new Set(stagesToUpdate.map(s => s.id));
      const stageIdsToDelete = existingStages.filter(s => !stageIdsToKeep.has(s.id)).map(s => s.id);

      // Delete removed stages
      if (stageIdsToDelete.length > 0) {
        await tx.pipelineStage.deleteMany({
          where: { id: { in: stageIdsToDelete } },
        });
      }

      // Update existing stages
      for (const stage of stagesToUpdate) {
        await tx.pipelineStage.update({
          where: { id: stage.id },
          data: {
            name: stage.name,
            color: stage.color,
            probability: stage.probability,
            position: stage.position,
            isClosed: stage.isClosed || false,
            isWon: stage.isWon || false,
          },
        });
      }

      // Create new stages
      if (stagesToCreate.length > 0) {
        await tx.pipelineStage.createMany({
          data: stagesToCreate.map(stage => ({
            pipelineId: params.id,
            name: stage.name,
            color: stage.color || "#6366f1",
            probability: stage.probability,
            position: stage.position,
            isClosed: stage.isClosed || false,
            isWon: stage.isWon || false,
          })),
        });
      }
    });

    const pipeline = await prisma.pipeline.findUnique({
      where: { id: params.id },
      include: {
        stages: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    console.error("Error updating stages:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update stages" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if pipeline has deals
    const dealCount = await prisma.deal.count({
      where: { pipelineId: params.id },
    });

    if (dealCount > 0) {
      return NextResponse.json(
        { success: false, error: { code: "HAS_DEALS", message: `Cannot delete pipeline with ${dealCount} deals` } },
        { status: 400 }
      );
    }

    await prisma.pipeline.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    console.error("Error deleting pipeline:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete pipeline" } },
      { status: 500 }
    );
  }
}
