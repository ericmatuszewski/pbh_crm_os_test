import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SequenceStatus, ActionType } from "@prisma/client";

// GET /api/sequences/[id] - Get a single sequence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sequence = await prisma.followUpSequence.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { position: "asc" },
        },
        enrollments: {
          orderBy: { enrolledAt: "desc" },
          take: 20,
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Sequence not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: sequence });
  } catch (error) {
    console.error("Failed to fetch sequence:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch sequence" } },
      { status: 500 }
    );
  }
}

// PUT /api/sequences/[id] - Update a sequence
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, entryCriteria, exitCriteria, steps } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      if (!Object.values(SequenceStatus).includes(status)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status" } },
          { status: 400 }
        );
      }
      updateData.status = status;
    }
    if (entryCriteria !== undefined) updateData.entryCriteria = entryCriteria;
    if (exitCriteria !== undefined) updateData.exitCriteria = exitCriteria;

    // If steps are provided, replace them all
    if (steps !== undefined) {
      // Validate steps
      for (const step of steps) {
        if (!Object.values(ActionType).includes(step.actionType)) {
          return NextResponse.json(
            { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid action type: ${step.actionType}` } },
            { status: 400 }
          );
        }
      }

      // Delete existing steps and create new ones
      await prisma.followUpStep.deleteMany({ where: { sequenceId: id } });
      await prisma.followUpStep.createMany({
        data: steps.map((s: Record<string, unknown>) => ({
          sequenceId: id,
          position: s.position as number,
          name: s.name as string,
          delayDays: (s.delayDays as number) || 0,
          delayHours: (s.delayHours as number) || 0,
          actionType: s.actionType as ActionType,
          actionConfig: s.actionConfig || {},
          skipConditions: s.skipConditions || [],
        })),
      });
    }

    const sequence = await prisma.followUpSequence.update({
      where: { id },
      data: updateData,
      include: {
        steps: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: sequence });
  } catch (error) {
    console.error("Failed to update sequence:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update sequence" } },
      { status: 500 }
    );
  }
}

// DELETE /api/sequences/[id] - Delete a sequence
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.followUpSequence.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete sequence:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete sequence" } },
      { status: 500 }
    );
  }
}
