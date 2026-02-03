/**
 * API Integration Tests for Deals Routes
 */

import { NextRequest } from 'next/server';

// Mock Prisma before importing routes
const mockPrisma = {
  deal: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  pipeline: {
    findFirst: jest.fn(),
  },
  pipelineStage: {
    findFirst: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock business scoping
jest.mock('@/lib/business', () => ({
  getCurrentBusiness: jest.fn().mockResolvedValue({ id: 'business-1', parentId: null }),
  buildBusinessScopeFilter: jest.fn().mockResolvedValue({ businessId: 'business-1' }),
}));

// Helper to create NextRequest
function createRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-business-id': 'business-1',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), requestInit);
}

describe('Deals API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/deals', () => {
    it('should return deals list with pipeline stages', async () => {
      const mockDeals = [
        {
          id: 'deal-1',
          title: 'Enterprise Contract',
          value: 50000,
          status: 'OPEN',
          createdAt: new Date(),
          company: { id: 'company-1', name: 'Acme' },
          contact: { id: 'contact-1', firstName: 'John', lastName: 'Doe' },
          stage: { id: 'stage-1', name: 'Negotiation' },
          owner: { id: 'user-1', name: 'Sales Rep' },
        },
      ];

      mockPrisma.deal.findMany.mockResolvedValue(mockDeals);
      mockPrisma.deal.count.mockResolvedValue(1);

      const { GET } = await import('@/app/api/deals/route');
      const request = createRequest('http://localhost:3000/api/deals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Enterprise Contract');
    });

    it('should filter deals by status', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/deals/route');
      const request = createRequest('http://localhost:3000/api/deals?status=WON');
      await GET(request);

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'WON',
          }),
        })
      );
    });

    it('should filter deals by pipeline', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/deals/route');
      const request = createRequest('http://localhost:3000/api/deals?pipelineId=pipeline-1');
      await GET(request);

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pipelineId: 'pipeline-1',
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.deal.findMany.mockRejectedValue(new Error('Database error'));

      const { GET } = await import('@/app/api/deals/route');
      const request = createRequest('http://localhost:3000/api/deals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/deals', () => {
    it('should create a new deal with valid data', async () => {
      const newDeal = {
        id: 'new-deal-id',
        title: 'New Opportunity',
        value: 25000,
        status: 'OPEN',
        createdAt: new Date(),
      };

      mockPrisma.deal.create.mockResolvedValue(newDeal);
      mockPrisma.pipeline.findFirst.mockResolvedValue({ id: 'pipeline-1' });
      mockPrisma.pipelineStage.findFirst.mockResolvedValue({ id: 'stage-1' });

      const { POST } = await import('@/app/api/deals/route');
      const request = createRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: {
          title: 'New Opportunity',
          value: 25000,
          companyId: 'company-1',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('New Opportunity');
    });

    it('should return validation error for missing title', async () => {
      const { POST } = await import('@/app/api/deals/route');
      const request = createRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: {
          value: 25000,
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/deals/:id', () => {
    it('should return deal by ID with full details', async () => {
      const mockDeal = {
        id: 'deal-1',
        title: 'Enterprise Contract',
        value: 50000,
        company: { id: 'company-1', name: 'Acme' },
        contact: { id: 'contact-1', firstName: 'John', lastName: 'Doe' },
        stage: { id: 'stage-1', name: 'Negotiation' },
        activities: [],
        tasks: [],
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);

      const { GET } = await import('@/app/api/deals/[id]/route');
      const request = createRequest('http://localhost:3000/api/deals/deal-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'deal-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('deal-1');
    });

    it('should return 404 for non-existent deal', async () => {
      mockPrisma.deal.findUnique.mockResolvedValue(null);

      const { GET } = await import('@/app/api/deals/[id]/route');
      const request = createRequest('http://localhost:3000/api/deals/non-existent');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/deals/:id', () => {
    it('should update deal value and stage', async () => {
      const updatedDeal = {
        id: 'deal-1',
        title: 'Enterprise Contract',
        value: 75000,
        stageId: 'stage-2',
      };

      mockPrisma.deal.update.mockResolvedValue(updatedDeal);

      const { PUT } = await import('@/app/api/deals/[id]/route');
      const request = createRequest('http://localhost:3000/api/deals/deal-1', {
        method: 'PUT',
        body: {
          value: 75000,
          stageId: 'stage-2',
        },
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'deal-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.value).toBe(75000);
    });
  });

  describe('DELETE /api/deals/:id', () => {
    it('should delete deal', async () => {
      mockPrisma.deal.delete.mockResolvedValue({ id: 'deal-1' });

      const { DELETE } = await import('@/app/api/deals/[id]/route');
      const request = createRequest('http://localhost:3000/api/deals/deal-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'deal-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('Deal Value Calculations', () => {
  it('should handle decimal values correctly', async () => {
    const dealWithDecimals = {
      id: 'deal-1',
      title: 'Decimal Deal',
      value: 12345.67,
      status: 'OPEN',
      createdAt: new Date(),
    };

    mockPrisma.deal.findMany.mockResolvedValue([dealWithDecimals]);
    mockPrisma.deal.count.mockResolvedValue(1);

    const { GET } = await import('@/app/api/deals/route');
    const request = createRequest('http://localhost:3000/api/deals');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data[0].value).toBe(12345.67);
  });

  it('should handle zero value deals', async () => {
    mockPrisma.deal.create.mockResolvedValue({
      id: 'new-deal',
      title: 'Zero Value Deal',
      value: 0,
      status: 'OPEN',
    });
    mockPrisma.pipeline.findFirst.mockResolvedValue({ id: 'pipeline-1' });
    mockPrisma.pipelineStage.findFirst.mockResolvedValue({ id: 'stage-1' });

    const { POST } = await import('@/app/api/deals/route');
    const request = createRequest('http://localhost:3000/api/deals', {
      method: 'POST',
      body: {
        title: 'Zero Value Deal',
        value: 0,
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.value).toBe(0);
  });
});
