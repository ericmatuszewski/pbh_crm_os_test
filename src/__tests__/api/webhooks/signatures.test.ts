/**
 * Tests for the e-signature webhook handler
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/webhooks/signatures/route";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    quote: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      create: jest.fn(),
    },
    pipelineStage: {
      findFirst: jest.fn(),
    },
    deal: {
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("E-Signature Webhook Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/webhooks/signatures", () => {
    it("should return ok status for basic GET request", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/signatures");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
    });

    it("should handle HelloSign verification", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/signatures?hello_sign=true");
      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe("Hello API Event Received");
    });

    it("should echo DocuSign challenge", async () => {
      const request = new NextRequest(
        "http://localhost/api/webhooks/signatures?challenge=test-challenge-123"
      );
      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe("test-challenge-123");
    });
  });

  describe("POST /api/webhooks/signatures - DocuSign", () => {
    const createDocuSignPayload = (eventType: string, envelopeId: string) => ({
      apiVersion: "v2.1",
      event: eventType,
      envelopeId: envelopeId,
      recipients: {
        signers: [
          {
            email: "signer@example.com",
            name: "John Signer",
          },
        ],
      },
      completedDateTime: "2024-01-15T10:30:00Z",
    });

    it("should process DocuSign envelope-sent event", async () => {
      const payload = createDocuSignPayload("envelope-sent", "env-123");

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DocuSign Connect",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should update quote status when signature is completed", async () => {
      const payload = createDocuSignPayload("envelope-completed", "env-456");

      const mockQuote = {
        id: "quote-123",
        quoteNumber: "Q-2024-001",
        contactId: "contact-123",
        dealId: "deal-123",
        createdById: "user-123",
        businessId: "biz-123",
        contact: { id: "contact-123", email: "contact@example.com" },
        deal: { id: "deal-123" },
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.quote.update as jest.Mock).mockResolvedValue({ ...mockQuote, status: "ACCEPTED" });
      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-123" });
      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue({
        id: "stage-won",
        name: "Closed Won",
      });
      (mockPrisma.deal.update as jest.Mock).mockResolvedValue({ id: "deal-123" });

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DocuSign Connect",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe("SIGNED");

      // Verify quote was updated with ACCEPTED status
      expect(mockPrisma.quote.update).toHaveBeenCalledWith({
        where: { id: "quote-123" },
        data: expect.objectContaining({
          status: "ACCEPTED",
          signatureStatus: "SIGNED",
        }),
      });

      // Verify activity was created
      expect(mockPrisma.activity.create).toHaveBeenCalled();
    });

    it("should update quote status when signature is declined", async () => {
      const payload = createDocuSignPayload("envelope-declined", "env-789");

      const mockQuote = {
        id: "quote-123",
        quoteNumber: "Q-2024-002",
        contactId: "contact-123",
        createdById: "user-123",
        businessId: "biz-123",
        contact: null,
        deal: null,
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.quote.update as jest.Mock).mockResolvedValue({ ...mockQuote, status: "REJECTED" });
      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-123" });

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DocuSign Connect",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("DECLINED");

      expect(mockPrisma.quote.update).toHaveBeenCalledWith({
        where: { id: "quote-123" },
        data: expect.objectContaining({
          status: "REJECTED",
          signatureStatus: "DECLINED",
        }),
      });
    });
  });

  describe("POST /api/webhooks/signatures - HelloSign", () => {
    const createHelloSignPayload = (eventType: string, requestId: string) => ({
      event: {
        event_type: eventType,
        event_time: "1704283800",
        event_hash: "abc123",
      },
      signature_request: {
        signature_request_id: requestId,
        title: "Test Document",
        signatures: [
          {
            signer_email_address: "signer@example.com",
            signer_name: "Jane Signer",
            signed_at: "1704284000",
          },
        ],
      },
    });

    it("should process HelloSign signature_request_sent event", async () => {
      const payload = createHelloSignPayload("signature_request_sent", "hs-123");

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "x-hellosign-signature": "test-signature",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should process HelloSign signature_request_signed event", async () => {
      const payload = createHelloSignPayload("signature_request_signed", "hs-456");

      const mockQuote = {
        id: "quote-456",
        quoteNumber: "Q-2024-003",
        contactId: "contact-456",
        createdById: "user-123",
        businessId: "biz-123",
        dealId: null,
        contact: null,
        deal: null,
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.quote.update as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-456" });

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "x-hellosign-signature": "test-signature",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("SIGNED");
    });

    it("should process HelloSign signature_request_declined event", async () => {
      const payload = createHelloSignPayload("signature_request_declined", "hs-789");

      const mockQuote = {
        id: "quote-789",
        quoteNumber: "Q-2024-004",
        contactId: "contact-789",
        createdById: "user-123",
        businessId: "biz-123",
        dealId: null,
        contact: null,
        deal: null,
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.quote.update as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-789" });

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "x-hellosign-signature": "test-signature",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("DECLINED");
    });
  });

  describe("POST /api/webhooks/signatures - PandaDoc", () => {
    const createPandaDocPayload = (eventType: string, docId: string) => ({
      event: eventType,
      data: {
        id: docId,
        name: "Test Quote",
        recipients: [
          {
            email: "recipient@example.com",
            first_name: "Bob",
            last_name: "Recipient",
          },
        ],
        date_completed: "2024-01-15T12:00:00Z",
      },
    });

    it("should process PandaDoc document_sent event", async () => {
      const payload = createPandaDocPayload("document_sent", "pd-123");

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PandaDoc/1.0",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should process PandaDoc document_completed event", async () => {
      const payload = createPandaDocPayload("document_completed", "pd-456");

      const mockQuote = {
        id: "quote-pd-456",
        quoteNumber: "Q-2024-005",
        contactId: "contact-pd",
        createdById: "user-123",
        businessId: "biz-123",
        dealId: null,
        contact: null,
        deal: null,
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.quote.update as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-pd" });

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PandaDoc/1.0",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("SIGNED");
    });

    it("should process PandaDoc document_viewed event", async () => {
      const payload = createPandaDocPayload("document_viewed", "pd-789");

      const mockQuote = {
        id: "quote-pd-789",
        quoteNumber: "Q-2024-006",
        contactId: "contact-pd-2",
        createdById: "user-123",
        businessId: "biz-123",
        dealId: null,
        contact: null,
        deal: null,
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.quote.update as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-pd-2" });

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PandaDoc/1.0",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("VIEWED");

      // Activity should be created for VIEWED event
      expect(mockPrisma.activity.create).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should return 400 for unknown provider", async () => {
      const payload = { unknown: "structure" };

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unknown provider");
    });

    it("should return 400 for invalid payload structure", async () => {
      // DocuSign-like but missing required fields
      const payload = {
        apiVersion: "v2.1",
        // Missing event and envelopeId
      };

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DocuSign Connect",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid payload");
    });

    it("should return 500 for database errors", async () => {
      const payload = {
        apiVersion: "v2.1",
        event: "envelope-sent",
        envelopeId: "env-error",
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DocuSign Connect",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle malformed JSON gracefully", async () => {
      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: "not-json{",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe("Deal stage update on signature", () => {
    it("should update deal stage to won stage when quote is signed", async () => {
      const payload = {
        apiVersion: "v2.1",
        event: "envelope-completed",
        envelopeId: "env-deal-update",
        completedDateTime: "2024-01-15T10:30:00Z",
      };

      const mockQuote = {
        id: "quote-deal",
        quoteNumber: "Q-DEAL-001",
        contactId: "contact-deal",
        dealId: "deal-to-update",
        createdById: "user-123",
        businessId: "biz-123",
        contact: null,
        deal: { id: "deal-to-update" },
      };

      const mockWonStage = {
        id: "stage-closed-won",
        name: "Closed Won",
        position: 5,
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.quote.update as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-deal" });
      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue(mockWonStage);
      (mockPrisma.deal.update as jest.Mock).mockResolvedValue({ id: "deal-to-update" });

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DocuSign Connect",
        },
      });

      const response = await POST(request);
      await response.json();

      // Verify deal was updated to won stage
      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: "deal-to-update" },
        data: { stageId: "stage-closed-won" },
      });
    });

    it("should not update deal stage if no won stage found", async () => {
      const payload = {
        apiVersion: "v2.1",
        event: "envelope-completed",
        envelopeId: "env-no-stage",
        completedDateTime: "2024-01-15T10:30:00Z",
      };

      const mockQuote = {
        id: "quote-no-stage",
        quoteNumber: "Q-NS-001",
        contactId: "contact-ns",
        dealId: "deal-no-stage",
        createdById: "user-123",
        businessId: "biz-123",
        contact: null,
        deal: { id: "deal-no-stage" },
      };

      (mockPrisma.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.quote.update as jest.Mock).mockResolvedValue(mockQuote);
      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-ns" });
      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/webhooks/signatures", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DocuSign Connect",
        },
      });

      await POST(request);

      // Deal update should not have been called
      expect(mockPrisma.deal.update).not.toHaveBeenCalled();
    });
  });
});
