import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateCompanySchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
            status: true,
            leadScore: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        deals: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            pipelineStage: { select: { id: true, name: true, probability: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Company not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch company" } },
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
    const data = updateCompanySchema.parse(body);

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.industry !== undefined && { industry: data.industry || null }),
        ...(data.size !== undefined && { size: data.size }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.county !== undefined && { county: data.county || null }),
        ...(data.postcode !== undefined && { postcode: data.postcode || null }),
        ...(data.country !== undefined && { country: data.country || null }),
      },
    });

    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to update company" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.company.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "Failed to delete company" } },
      { status: 500 }
    );
  }
}
