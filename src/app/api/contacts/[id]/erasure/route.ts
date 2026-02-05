import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ErasureRequestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/contacts/[id]/erasure - Get erasure requests for a contact
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const erasureRequests = await prisma.erasureRequest.findMany({
      where: { contactId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: erasureRequests });
  } catch (error) {
    console.error("Failed to fetch erasure requests:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch erasure requests" } },
      { status: 500 }
    );
  }
}

// POST /api/contacts/[id]/erasure - Request data erasure (GDPR Article 17)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.requestSource) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "requestSource is required" },
        },
        { status: 400 }
      );
    }

    // Check contact exists
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        erasureRequestedAt: true,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    // Check for pending erasure request
    const existingRequest = await prisma.erasureRequest.findFirst({
      where: {
        contactId: id,
        status: { in: [ErasureRequestStatus.PENDING, ErasureRequestStatus.CONFIRMED, ErasureRequestStatus.PROCESSING] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE_REQUEST", message: "An erasure request is already pending for this contact" },
        },
        { status: 409 }
      );
    }

    // Calculate due date (30 days from now per GDPR)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create erasure request
    const erasureRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.erasureRequest.create({
        data: {
          contactId: id,
          requestSource: body.requestSource,
          requestReason: body.requestReason,
          verificationMethod: body.verificationMethod,
          dueDate,
        },
      });

      // Mark contact as having erasure requested
      await tx.contact.update({
        where: { id },
        data: {
          erasureRequestedAt: new Date(),
          doNotContact: true, // Stop all contact immediately
        },
      });

      return request;
    });

    return NextResponse.json({ success: true, data: erasureRequest }, { status: 201 });
  } catch (error) {
    console.error("Failed to create erasure request:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message: "Failed to create erasure request" } },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/[id]/erasure - Process or update an erasure request
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.requestId || !body.action) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "requestId and action are required" },
        },
        { status: 400 }
      );
    }

    const validActions = ["confirm", "process", "complete", "reject"];
    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: `action must be one of: ${validActions.join(", ")}` },
        },
        { status: 400 }
      );
    }

    const erasureRequest = await prisma.erasureRequest.findUnique({
      where: { id: body.requestId },
    });

    if (!erasureRequest || erasureRequest.contactId !== id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Erasure request not found" } },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (body.action) {
      case "confirm": {
        // Verify the request and mark as confirmed
        const updated = await prisma.erasureRequest.update({
          where: { id: body.requestId },
          data: {
            status: ErasureRequestStatus.CONFIRMED,
            verificationMethod: body.verificationMethod,
            verifiedAt: new Date(),
            verifiedById: body.verifiedById,
          },
        });
        return NextResponse.json({ success: true, data: updated });
      }

      case "process": {
        // Start processing - this is where actual deletion happens
        const result = await processErasure(id, body.requestId, body.processedById, body.processedByName);
        return NextResponse.json({ success: true, data: result });
      }

      case "complete": {
        // Mark as completed (for manual completion)
        const updated = await prisma.erasureRequest.update({
          where: { id: body.requestId },
          data: {
            status: ErasureRequestStatus.COMPLETED,
            processedAt: new Date(),
            completionNotifiedAt: body.notified ? new Date() : undefined,
          },
        });
        return NextResponse.json({ success: true, data: updated });
      }

      case "reject": {
        // Reject the request (with reason)
        if (!body.rejectionReason) {
          return NextResponse.json(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "rejectionReason is required for rejection" },
            },
            { status: 400 }
          );
        }

        const updated = await prisma.erasureRequest.update({
          where: { id: body.requestId },
          data: {
            status: ErasureRequestStatus.REJECTED,
            rejectionReason: body.rejectionReason,
            retentionReason: body.retentionReason,
            processedById: body.processedById,
            processedByName: body.processedByName,
            processedAt: new Date(),
          },
        });
        return NextResponse.json({ success: true, data: updated });
      }

      default:
        return NextResponse.json(
          { success: false, error: { code: "INVALID_ACTION", message: "Invalid action" } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Failed to process erasure request:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: "Failed to process erasure request" } },
      { status: 500 }
    );
  }
}

/**
 * Process the actual data erasure - cascading deletion of contact data
 * This is the core GDPR Article 17 implementation
 */
async function processErasure(
  contactId: string,
  requestId: string,
  processedById?: string,
  processedByName?: string
) {
  const deletedRecords: Record<string, number> = {};
  const retainedRecords: Record<string, { count: number; reason: string }> = {};

  return prisma.$transaction(async (tx) => {
    // Update request status to processing
    await tx.erasureRequest.update({
      where: { id: requestId },
      data: { status: ErasureRequestStatus.PROCESSING },
    });

    // 1. Delete activities
    const activities = await tx.activity.deleteMany({
      where: { contactId },
    });
    deletedRecords.activities = activities.count;

    // 2. Delete notes
    const notes = await tx.note.deleteMany({
      where: { contactId },
    });
    deletedRecords.notes = notes.count;

    // 3. Delete email logs
    const emailLogs = await tx.emailLog.deleteMany({
      where: { contactId },
    });
    deletedRecords.emailLogs = emailLogs.count;

    // 4. Delete scheduled calls
    const scheduledCalls = await tx.scheduledCall.deleteMany({
      where: { contactId },
    });
    deletedRecords.scheduledCalls = scheduledCalls.count;

    // 5. Delete call queue items
    const callQueueItems = await tx.callQueueItem.deleteMany({
      where: { contactId },
    });
    deletedRecords.callQueueItems = callQueueItems.count;

    // 6. Delete consent events (historical consent record)
    const consentEvents = await tx.consentEvent.deleteMany({
      where: { contactId },
    });
    deletedRecords.consentEvents = consentEvents.count;

    // 7. Handle deals - these may need to be retained for business records
    const deals = await tx.deal.findMany({
      where: { contactId },
      select: { id: true, stage: true },
    });

    const closedDeals = deals.filter((d) => d.stage === "CLOSED_WON" || d.stage === "CLOSED_LOST");
    const openDeals = deals.filter((d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST");

    // Delete open deals
    if (openDeals.length > 0) {
      await tx.deal.deleteMany({
        where: { id: { in: openDeals.map((d) => d.id) } },
      });
      deletedRecords.openDeals = openDeals.length;
    }

    // Retain closed deals but anonymize (business record retention)
    if (closedDeals.length > 0) {
      await tx.deal.updateMany({
        where: { id: { in: closedDeals.map((d) => d.id) } },
        data: { contactId: null }, // Disassociate but keep record
      });
      retainedRecords.closedDeals = {
        count: closedDeals.length,
        reason: "Business records retention for accounting/tax purposes",
      };
    }

    // 8. Handle quotes similarly
    const quotes = await tx.quote.findMany({
      where: { contactId },
      select: { id: true, status: true },
    });

    const acceptedQuotes = quotes.filter((q) => q.status === "ACCEPTED");
    const otherQuotes = quotes.filter((q) => q.status !== "ACCEPTED");

    if (otherQuotes.length > 0) {
      await tx.quote.deleteMany({
        where: { id: { in: otherQuotes.map((q) => q.id) } },
      });
      deletedRecords.quotes = otherQuotes.length;
    }

    if (acceptedQuotes.length > 0) {
      await tx.quote.updateMany({
        where: { id: { in: acceptedQuotes.map((q) => q.id) } },
        data: { contactId: null },
      });
      retainedRecords.acceptedQuotes = {
        count: acceptedQuotes.length,
        reason: "Contract records retention for legal compliance",
      };
    }

    // 9. Remove tag associations
    await tx.contact.update({
      where: { id: contactId },
      data: { tags: { set: [] } },
    });

    // 10. Delete meetings
    const meetings = await tx.meeting.deleteMany({
      where: { contactId },
    });
    deletedRecords.meetings = meetings.count;

    // 11. Finally delete the contact
    await tx.contact.delete({
      where: { id: contactId },
    });
    deletedRecords.contact = 1;

    // 12. Update the erasure request with results
    const completedRequest = await tx.erasureRequest.update({
      where: { id: requestId },
      data: {
        status: ErasureRequestStatus.COMPLETED,
        processedById,
        processedByName,
        processedAt: new Date(),
        deletedRecords,
        retainedRecords: Object.keys(retainedRecords).length > 0 ? retainedRecords : undefined,
        retentionReason:
          Object.keys(retainedRecords).length > 0
            ? "Some records retained for legal/business compliance. See retainedRecords for details."
            : undefined,
      },
    });

    return {
      request: completedRequest,
      summary: {
        deleted: deletedRecords,
        retained: retainedRecords,
      },
    };
  });
}
