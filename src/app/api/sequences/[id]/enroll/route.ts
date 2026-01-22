import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SequenceStatus } from "@prisma/client";

// POST /api/sequences/[id]/enroll - Enroll an entity in a sequence
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { entityId } = body;

    if (!entityId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "entityId is required" } },
        { status: 400 }
      );
    }

    // Get sequence
    const sequence = await prisma.followUpSequence.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { position: "asc" },
          take: 1,
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Sequence not found" } },
        { status: 404 }
      );
    }

    if (sequence.status !== SequenceStatus.ACTIVE) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Sequence is not active" } },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        sequenceId_entityType_entityId: {
          sequenceId: id,
          entityType: sequence.entity,
          entityId,
        },
      },
    });

    if (existingEnrollment && existingEnrollment.status === "active") {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_ENROLLED", message: "Entity is already enrolled in this sequence" } },
        { status: 400 }
      );
    }

    // Calculate next step time based on first step delay
    const firstStep = sequence.steps[0];
    const delayMs = firstStep
      ? (firstStep.delayDays * 24 * 60 * 60 * 1000) + (firstStep.delayHours * 60 * 60 * 1000)
      : 0;
    const nextStepAt = new Date(Date.now() + delayMs);

    // Create or update enrollment
    const enrollment = existingEnrollment
      ? await prisma.sequenceEnrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            status: "active",
            currentStep: 0,
            nextStepAt,
            stepsCompleted: 0,
            exitedAt: null,
            exitReason: null,
          },
        })
      : await prisma.sequenceEnrollment.create({
          data: {
            sequenceId: id,
            entityType: sequence.entity,
            entityId,
            status: "active",
            currentStep: 0,
            nextStepAt,
          },
        });

    // Update sequence stats
    await prisma.followUpSequence.update({
      where: { id },
      data: { totalEnrolled: { increment: 1 } },
    });

    return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
  } catch (error) {
    console.error("Failed to enroll in sequence:", error);
    return NextResponse.json(
      { success: false, error: { code: "ENROLL_ERROR", message: "Failed to enroll in sequence" } },
      { status: 500 }
    );
  }
}
