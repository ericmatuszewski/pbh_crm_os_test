import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateContactSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch contact with related data
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        tags: true,
        deals: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            pipelineStage: { select: { id: true, name: true, probability: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        activities: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        scheduledCalls: {
          include: { assignedTo: { select: { id: true, name: true } } },
          where: { status: "SCHEDULED" },
          orderBy: { scheduledAt: "asc" },
          take: 5,
        },
      },
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    // Fetch related tasks using polymorphic pattern
    const tasks = await prisma.task.findMany({
      where: {
        relatedType: "contact",
        relatedId: params.id,
      },
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Combine contact data with tasks
    const contactWithTasks = {
      ...contact,
      tasks,
    };

    return NextResponse.json({ success: true, data: contactWithTasks });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch contact" } },
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
    const data = updateContactSchema.parse(body);

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.title !== undefined && { title: data.title || null }),
        ...(data.companyId !== undefined && { companyId: data.companyId || null }),
        ...(data.status && { status: data.status }),
        ...(data.source !== undefined && { source: data.source || null }),
      },
      include: {
        company: { select: { id: true, name: true } },
        tags: true,
      },
    });

    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update contact" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.contact.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete contact" } },
      { status: 500 }
    );
  }
}
