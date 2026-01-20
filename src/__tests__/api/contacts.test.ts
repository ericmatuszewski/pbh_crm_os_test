/**
 * API Integration Tests for CRM Routes
 * 
 * These tests verify the API routes work correctly with mocked Prisma client
 */

import { NextRequest } from 'next/server';

// Mock Prisma before importing routes
const mockPrisma = {
  contact: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  company: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  deal: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  task: {
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
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), requestInit);
}

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/contacts', () => {
    it('should return contacts with pagination', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'LEAD',
          createdAt: new Date(),
          company: { id: 'company-1', name: 'Acme' },
          tags: [],
        },
      ];

      mockPrisma.contact.findMany.mockResolvedValue(mockContacts);
      mockPrisma.contact.count.mockResolvedValue(1);

      const { GET } = await import('@/app/api/contacts/route');
      const request = createRequest('http://localhost:3000/api/contacts?page=1&limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter contacts by status', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/contacts/route');
      const request = createRequest('http://localhost:3000/api/contacts?status=LEAD');
      await GET(request);

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'LEAD',
          }),
        })
      );
    });

    it('should search contacts by name or email', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/contacts/route');
      const request = createRequest('http://localhost:3000/api/contacts?search=john');
      await GET(request);

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.anything() }),
              expect.objectContaining({ lastName: expect.anything() }),
              expect.objectContaining({ email: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.contact.findMany.mockRejectedValue(new Error('Database error'));

      const { GET } = await import('@/app/api/contacts/route');
      const request = createRequest('http://localhost:3000/api/contacts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FETCH_ERROR');
    });
  });

  describe('POST /api/contacts', () => {
    it('should create a new contact with valid data', async () => {
      const newContact = {
        id: 'new-contact-id',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        status: 'LEAD',
        createdAt: new Date(),
      };

      mockPrisma.contact.create.mockResolvedValue(newContact);

      const { POST } = await import('@/app/api/contacts/route');
      const request = createRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        body: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.firstName).toBe('Jane');
    });

    it('should return validation error for invalid data', async () => {
      const { POST } = await import('@/app/api/contacts/route');
      const request = createRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        body: {
          // Missing required firstName and lastName
          email: 'invalid',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return contact by ID', async () => {
      const mockContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: null,
        tags: [],
        deals: [],
        activities: [],
        notes: [],
      };

      mockPrisma.contact.findUnique.mockResolvedValue(mockContact);

      const { GET } = await import('@/app/api/contacts/[id]/route');
      const request = createRequest('http://localhost:3000/api/contacts/contact-1');
      const response = await GET(request, { params: { id: 'contact-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('contact-1');
    });

    it('should return 404 for non-existent contact', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      const { GET } = await import('@/app/api/contacts/[id]/route');
      const request = createRequest('http://localhost:3000/api/contacts/non-existent');
      const response = await GET(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update contact', async () => {
      const updatedContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Updated',
        email: 'john.updated@example.com',
      };

      mockPrisma.contact.update.mockResolvedValue(updatedContact);

      const { PUT } = await import('@/app/api/contacts/[id]/route');
      const request = createRequest('http://localhost:3000/api/contacts/contact-1', {
        method: 'PUT',
        body: {
          lastName: 'Updated',
          email: 'john.updated@example.com',
        },
      });
      const response = await PUT(request, { params: { id: 'contact-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.lastName).toBe('Updated');
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should delete contact', async () => {
      mockPrisma.contact.delete.mockResolvedValue({ id: 'contact-1' });

      const { DELETE } = await import('@/app/api/contacts/[id]/route');
      const request = createRequest('http://localhost:3000/api/contacts/contact-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'contact-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('API Security', () => {
  describe('Input Validation', () => {
    it('should sanitize search input to prevent injection', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/contacts/route');
      // Attempt SQL-like injection in search
      const request = createRequest("http://localhost:3000/api/contacts?search='; DROP TABLE contacts; --");
      const response = await GET(request);

      // Should handle gracefully without error
      expect(response.status).toBe(200);
    });

    it('should reject excessively long input', async () => {
      const { POST } = await import('@/app/api/contacts/route');
      const request = createRequest('http://localhost:3000/api/contacts', {
        method: 'POST',
        body: {
          firstName: 'A'.repeat(200), // Exceeds 100 char limit
          lastName: 'Doe',
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting Considerations', () => {
    it('should handle concurrent requests', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/contacts/route');
      
      // Simulate multiple concurrent requests
      const requests = Array(10).fill(null).map(() => {
        const request = createRequest('http://localhost:3000/api/contacts');
        return GET(request);
      });

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
