/**
 * API Integration Tests for Companies Routes
 */

import { NextRequest } from 'next/server';

// Mock Prisma before importing routes
const mockPrisma = {
  company: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
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

describe('Companies API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/companies', () => {
    it('should return companies list', async () => {
      const mockCompanies = [
        {
          id: 'company-1',
          name: 'Acme Corp',
          industry: 'Technology',
          size: 'MEDIUM',
          city: 'London',
          createdAt: new Date(),
          _count: { contacts: 5, deals: 2 },
        },
      ];

      mockPrisma.company.findMany.mockResolvedValue(mockCompanies);

      const { GET } = await import('@/app/api/companies/route');
      const request = createRequest('http://localhost:3000/api/companies');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Acme Corp');
    });

    it('should filter companies by search term', async () => {
      mockPrisma.company.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/companies/route');
      const request = createRequest('http://localhost:3000/api/companies?search=acme');
      await GET(request);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.company.findMany.mockRejectedValue(new Error('Database error'));

      const { GET } = await import('@/app/api/companies/route');
      const request = createRequest('http://localhost:3000/api/companies');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/companies', () => {
    it('should create a new company with valid data', async () => {
      const newCompany = {
        id: 'new-company-id',
        name: 'New Company',
        industry: 'Finance',
        size: 'SMALL',
        createdAt: new Date(),
      };

      mockPrisma.company.create.mockResolvedValue(newCompany);

      const { POST } = await import('@/app/api/companies/route');
      const request = createRequest('http://localhost:3000/api/companies', {
        method: 'POST',
        body: {
          name: 'New Company',
          industry: 'Finance',
          size: 'SMALL',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Company');
    });

    it('should return validation error for missing name', async () => {
      const { POST } = await import('@/app/api/companies/route');
      const request = createRequest('http://localhost:3000/api/companies', {
        method: 'POST',
        body: {
          industry: 'Finance',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/companies/:id', () => {
    it('should return company by ID', async () => {
      const mockCompany = {
        id: 'company-1',
        name: 'Acme Corp',
        industry: 'Technology',
        contacts: [],
        deals: [],
      };

      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);

      const { GET } = await import('@/app/api/companies/[id]/route');
      const request = createRequest('http://localhost:3000/api/companies/company-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'company-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('company-1');
    });

    it('should return 404 for non-existent company', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);

      const { GET } = await import('@/app/api/companies/[id]/route');
      const request = createRequest('http://localhost:3000/api/companies/non-existent');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/companies/:id', () => {
    it('should update company', async () => {
      const updatedCompany = {
        id: 'company-1',
        name: 'Acme Corp Updated',
        industry: 'Tech',
      };

      mockPrisma.company.update.mockResolvedValue(updatedCompany);

      const { PUT } = await import('@/app/api/companies/[id]/route');
      const request = createRequest('http://localhost:3000/api/companies/company-1', {
        method: 'PUT',
        body: {
          name: 'Acme Corp Updated',
          industry: 'Tech',
        },
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'company-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Acme Corp Updated');
    });
  });

  describe('DELETE /api/companies/:id', () => {
    it('should delete company', async () => {
      mockPrisma.company.delete.mockResolvedValue({ id: 'company-1' });

      const { DELETE } = await import('@/app/api/companies/[id]/route');
      const request = createRequest('http://localhost:3000/api/companies/company-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'company-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
