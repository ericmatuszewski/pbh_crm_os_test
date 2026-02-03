import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createNoteSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
});

// GET /api/notes - List notes with filtering
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const companyId = searchParams.get("companyId");
    const dealId = searchParams.get("dealId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (contactId) where.contactId = contactId;
    if (companyId) where.companyId = companyId;
    if (dealId) where.dealId = dealId;

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
          company: {
            select: { id: true, name: true },
          },
          deal: {
            select: { id: true, title: true },
          },
        },
      }),
      prisma.note.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: notes,
      meta: { total, limit, offset },
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch notes" } },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createNoteSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.errors[0].message,
          },
        },
        { status: 400 }
      );
    }

    const { content, contactId, companyId, dealId } = validated.data;

    // Ensure at least one entity is linked
    if (!contactId && !companyId && !dealId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Note must be linked to a contact, company, or deal",
          },
        },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        content,
        authorId: userId,
        contactId,
        companyId,
        dealId,
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        company: {
          select: { id: true, name: true },
        },
        deal: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create note" } },
      { status: 500 }
    );
  }
}
