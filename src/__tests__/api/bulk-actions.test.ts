/**
 * API Integration Tests for Bulk Actions Routes
 * Tests transaction handling for bulk operations
 */

import { NextRequest } from 'next/server';

// Mock Prisma before importing routes
const mockPrisma = {
  bulkAction: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  contact: {
    delete: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  company: {
    delete: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  deal: {
    delete: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  task: {
    delete: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  product: {
    delete: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  tag: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
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

describe('Bulk Actions API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bulk-actions', () => {
    describe('Validation', () => {
      it('should require userId', async () => {
        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            entity: 'contacts',
            action: 'delete',
            recordIds: ['id-1', 'id-2'],
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('VALIDATION_ERROR');
      });

      it('should require entity', async () => {
        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            action: 'delete',
            recordIds: ['id-1', 'id-2'],
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      });

      it('should require recordIds to be an array', async () => {
        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'delete',
            recordIds: 'not-an-array',
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      });

      it('should reject unknown actions', async () => {
        mockPrisma.bulkAction.create.mockResolvedValue({
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'unknown',
          recordIds: ['id-1'],
          recordCount: 1,
          status: 'processing',
        });

        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'unknown-action',
            recordIds: ['id-1'],
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.message).toContain('Unknown action');
      });
    });

    describe('Delete Action with Transaction', () => {
      it('should delete contacts in a transaction', async () => {
        mockPrisma.bulkAction.create.mockResolvedValue({
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'delete',
          recordIds: ['contact-1', 'contact-2'],
          recordCount: 2,
          status: 'processing',
        });
        mockPrisma.bulkAction.update.mockResolvedValue({});

        // Mock transaction to execute the callback
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          const txClient = {
            contact: {
              delete: jest.fn().mockResolvedValue({}),
            },
          };
          await callback(txClient);
        });

        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'delete',
            recordIds: ['contact-1', 'contact-2'],
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.successCount).toBe(2);
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });

      it('should rollback all deletions on transaction failure', async () => {
        mockPrisma.bulkAction.create.mockResolvedValue({
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'delete',
          recordIds: ['contact-1', 'contact-2'],
          recordCount: 2,
          status: 'processing',
        });
        mockPrisma.bulkAction.update.mockResolvedValue({});

        // Mock transaction to fail
        mockPrisma.$transaction.mockRejectedValue(new Error('Foreign key constraint'));

        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'delete',
            recordIds: ['contact-1', 'contact-2'],
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        // All failed due to transaction rollback
        expect(data.data.errorCount).toBe(2);
        expect(data.data.successCount).toBe(0);
      });
    });

    describe('Update Action with Transaction', () => {
      it('should require updateData for update action', async () => {
        mockPrisma.bulkAction.create.mockResolvedValue({
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'update',
          recordIds: ['contact-1'],
          recordCount: 1,
          status: 'processing',
        });

        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'update',
            recordIds: ['contact-1'],
            // Missing updateData
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.message).toContain('updateData is required');
      });

      it('should update contacts in a transaction', async () => {
        mockPrisma.bulkAction.create.mockResolvedValue({
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'update',
          recordIds: ['contact-1', 'contact-2'],
          recordCount: 2,
          status: 'processing',
        });
        mockPrisma.bulkAction.update.mockResolvedValue({});

        mockPrisma.$transaction.mockImplementation(async (callback) => {
          const txClient = {
            contact: {
              update: jest.fn().mockResolvedValue({}),
            },
          };
          await callback(txClient);
        });

        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'update',
            recordIds: ['contact-1', 'contact-2'],
            updateData: { status: 'QUALIFIED' },
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.successCount).toBe(2);
      });
    });

    describe('Assign Action with Transaction', () => {
      it('should require assigneeId for assign action', async () => {
        mockPrisma.bulkAction.create.mockResolvedValue({
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'assign',
          recordIds: ['contact-1'],
          recordCount: 1,
          status: 'processing',
        });

        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'assign',
            recordIds: ['contact-1'],
            // Missing assigneeId
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.message).toContain('assigneeId is required');
      });

      it('should assign contacts to new owner in a transaction', async () => {
        mockPrisma.bulkAction.create.mockResolvedValue({
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'assign',
          recordIds: ['contact-1', 'contact-2'],
          recordCount: 2,
          status: 'processing',
        });
        mockPrisma.bulkAction.update.mockResolvedValue({});

        mockPrisma.$transaction.mockImplementation(async (callback) => {
          const txClient = {
            contact: {
              update: jest.fn().mockResolvedValue({}),
            },
          };
          await callback(txClient);
        });

        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'assign',
            recordIds: ['contact-1', 'contact-2'],
            assigneeId: 'new-owner-id',
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.successCount).toBe(2);
      });
    });

    describe('Export Action', () => {
      it('should export contacts without transaction (read-only)', async () => {
        const mockContacts = [
          { id: 'contact-1', firstName: 'John', lastName: 'Doe', company: { name: 'Acme' } },
          { id: 'contact-2', firstName: 'Jane', lastName: 'Smith', company: null },
        ];

        mockPrisma.bulkAction.create.mockResolvedValue({
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'export',
          recordIds: ['contact-1', 'contact-2'],
          recordCount: 2,
          status: 'processing',
        });
        mockPrisma.bulkAction.update.mockResolvedValue({});
        mockPrisma.contact.findMany.mockResolvedValue(mockContacts);

        const { POST } = await import('@/app/api/bulk-actions/route');
        const request = createRequest('http://localhost:3000/api/bulk-actions', {
          method: 'POST',
          body: {
            userId: 'user-1',
            entity: 'contacts',
            action: 'export',
            recordIds: ['contact-1', 'contact-2'],
          },
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.exportData).toHaveLength(2);
        // Export doesn't use transaction
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });
    });
  });

  describe('GET /api/bulk-actions', () => {
    it('should return bulk action history', async () => {
      const mockActions = [
        {
          id: 'bulk-action-1',
          userId: 'user-1',
          entity: 'contacts',
          action: 'delete',
          recordCount: 5,
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      mockPrisma.bulkAction.findMany.mockResolvedValue(mockActions);

      const { GET } = await import('@/app/api/bulk-actions/route');
      const request = createRequest('http://localhost:3000/api/bulk-actions?userId=user-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it('should require userId parameter', async () => {
      const { GET } = await import('@/app/api/bulk-actions/route');
      const request = createRequest('http://localhost:3000/api/bulk-actions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should filter by entity', async () => {
      mockPrisma.bulkAction.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/bulk-actions/route');
      const request = createRequest('http://localhost:3000/api/bulk-actions?userId=user-1&entity=contacts');
      await GET(request);

      expect(mockPrisma.bulkAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            entity: 'contacts',
          }),
        })
      );
    });
  });
});
