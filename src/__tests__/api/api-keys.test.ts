/**
 * API Keys Tests
 *
 * Tests for API key generation, management, and security
 */

import { NextRequest } from 'next/server';

// Mock generateApiKey
const mockGenerateApiKey = jest.fn().mockReturnValue({
  key: 'sk_test_full_api_key_12345',
  prefix: 'sk_test_',
  hash: 'hashed_key_value',
});

jest.mock('@/lib/api/keys', () => ({
  generateApiKey: () => mockGenerateApiKey(),
}));

// Mock Prisma
const mockPrisma = {
  apiKey: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

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

describe('API Keys Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/api-keys', () => {
    it('should require userId parameter', async () => {
      const { GET } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('userId');
    });

    it('should return API keys for user', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Production Key',
          description: 'Main API key',
          keyPrefix: 'sk_prod_',
          scopes: ['read', 'write'],
          allowedIps: ['192.168.1.0/24'],
          rateLimit: 1000,
          lastUsedAt: new Date('2024-01-15'),
          usageCount: 150,
          isActive: true,
          expiresAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'key-2',
          name: 'Staging Key',
          description: 'Testing only',
          keyPrefix: 'sk_test_',
          scopes: ['read'],
          allowedIps: [],
          rateLimit: 100,
          lastUsedAt: null,
          usageCount: 0,
          isActive: true,
          expiresAt: new Date('2024-12-31'),
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
      ];

      mockPrisma.apiKey.findMany.mockResolvedValue(mockKeys);

      const { GET } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('Production Key');
      expect(data.data[0].keyPrefix).toBe('sk_prod_');
    });

    it('should not return full key in list response', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'key-1',
          name: 'Test Key',
          keyPrefix: 'sk_test_',
          // Note: keyHash should not be in response
        },
      ]);

      const { GET } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(data.data[0].keyHash).toBeUndefined();
      expect(data.data[0].key).toBeUndefined();
    });

    it('should handle database errors', async () => {
      mockPrisma.apiKey.findMany.mockRejectedValue(new Error('DB Error'));

      const { GET } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FETCH_ERROR');
    });
  });

  describe('POST /api/api-keys', () => {
    it('should require name and userId', async () => {
      const { POST } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: { description: 'Missing required fields' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create API key with defaults', async () => {
      const createdKey = {
        id: 'new-key-id',
        name: 'My API Key',
        description: null,
        keyHash: 'hashed_key_value',
        keyPrefix: 'sk_test_',
        scopes: ['read'],
        allowedIps: [],
        rateLimit: 1000,
        rateLimitWindow: 3600,
        expiresAt: null,
        userId: 'user-123',
        organizationId: null,
        createdAt: new Date(),
      };

      mockPrisma.apiKey.create.mockResolvedValue(createdKey);

      const { POST } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: {
          name: 'My API Key',
          userId: 'user-123',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('My API Key');
      expect(data.data.scopes).toEqual(['read']);
      expect(data.data.rateLimit).toBe(1000);
    });

    it('should return full key only on creation', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'new-key-id',
        name: 'My API Key',
        keyHash: 'hashed_key_value',
        keyPrefix: 'sk_test_',
        scopes: ['read'],
        allowedIps: [],
        rateLimit: 1000,
        expiresAt: null,
        createdAt: new Date(),
      });

      const { POST } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: {
          name: 'My API Key',
          userId: 'user-123',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.key).toBe('sk_test_full_api_key_12345');
      expect(data.data.keyHash).toBeUndefined();
    });

    it('should create key with custom scopes', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'new-key-id',
        name: 'Full Access Key',
        keyPrefix: 'sk_test_',
        scopes: ['read', 'write', 'delete'],
        allowedIps: [],
        rateLimit: 5000,
        createdAt: new Date(),
      });

      const { POST } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: {
          name: 'Full Access Key',
          userId: 'user-123',
          scopes: ['read', 'write', 'delete'],
          rateLimit: 5000,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scopes: ['read', 'write', 'delete'],
          rateLimit: 5000,
        }),
      });
    });

    it('should create key with IP allowlist', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'new-key-id',
        name: 'Restricted Key',
        keyPrefix: 'sk_test_',
        scopes: ['read'],
        allowedIps: ['192.168.1.0/24', '10.0.0.1'],
        rateLimit: 1000,
        createdAt: new Date(),
      });

      const { POST } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: {
          name: 'Restricted Key',
          userId: 'user-123',
          allowedIps: ['192.168.1.0/24', '10.0.0.1'],
        },
      });

      await POST(request);

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          allowedIps: ['192.168.1.0/24', '10.0.0.1'],
        }),
      });
    });

    it('should create key with expiration date', async () => {
      const expiresAt = '2024-12-31T23:59:59.000Z';

      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'new-key-id',
        name: 'Temp Key',
        keyPrefix: 'sk_test_',
        expiresAt: new Date(expiresAt),
        createdAt: new Date(),
      });

      const { POST } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: {
          name: 'Temp Key',
          userId: 'user-123',
          expiresAt,
        },
      });

      await POST(request);

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: new Date(expiresAt),
        }),
      });
    });

    it('should handle creation errors', async () => {
      mockPrisma.apiKey.create.mockRejectedValue(new Error('Creation failed'));

      const { POST } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'POST',
        body: {
          name: 'My API Key',
          userId: 'user-123',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CREATE_ERROR');
    });
  });

  describe('PUT /api/api-keys', () => {
    it('should require id', async () => {
      const { PUT } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'PUT',
        body: { name: 'Updated Name' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update API key fields', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-1',
        name: 'Updated Name',
        description: 'Updated description',
        keyPrefix: 'sk_test_',
        scopes: ['read', 'write'],
        allowedIps: ['10.0.0.1'],
        rateLimit: 2000,
        isActive: true,
        expiresAt: null,
        updatedAt: new Date(),
      });

      const { PUT } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'PUT',
        body: {
          id: 'key-1',
          name: 'Updated Name',
          description: 'Updated description',
          scopes: ['read', 'write'],
          allowedIps: ['10.0.0.1'],
          rateLimit: 2000,
        },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
    });

    it('should allow deactivating API key', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-1',
        isActive: false,
        updatedAt: new Date(),
      });

      const { PUT } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'PUT',
        body: {
          id: 'key-1',
          isActive: false,
        },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: expect.objectContaining({ isActive: false }),
        select: expect.any(Object),
      });
    });

    it('should not expose keyHash in update response', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-1',
        name: 'Updated',
        keyPrefix: 'sk_test_',
        // keyHash should not be selected
      });

      const { PUT } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'PUT',
        body: { id: 'key-1', name: 'Updated' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(data.data.keyHash).toBeUndefined();
      expect(data.data.key).toBeUndefined();
    });
  });

  describe('DELETE /api/api-keys', () => {
    it('should require id', async () => {
      const { DELETE } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'DELETE',
        body: {},
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should delete (revoke) API key', async () => {
      mockPrisma.apiKey.delete.mockResolvedValue({ id: 'key-1' });

      const { DELETE } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'DELETE',
        body: { id: 'key-1' },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('key-1');
      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key-1' },
      });
    });

    it('should handle deletion errors', async () => {
      mockPrisma.apiKey.delete.mockRejectedValue(new Error('Key not found'));

      const { DELETE } = await import('@/app/api/api-keys/route');
      const request = createRequest('http://localhost:3000/api/api-keys', {
        method: 'DELETE',
        body: { id: 'nonexistent-key' },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DELETE_ERROR');
    });
  });
});

describe('API Key Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should store hashed key, not plain key', async () => {
    mockPrisma.apiKey.create.mockResolvedValue({
      id: 'key-1',
      keyHash: 'hashed_key_value',
      keyPrefix: 'sk_test_',
      createdAt: new Date(),
    });

    const { POST } = await import('@/app/api/api-keys/route');
    const request = createRequest('http://localhost:3000/api/api-keys', {
      method: 'POST',
      body: { name: 'Test Key', userId: 'user-123' },
    });

    await POST(request);

    expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        keyHash: 'hashed_key_value',
      }),
    });

    // Verify the full key is NOT stored
    const createCall = mockPrisma.apiKey.create.mock.calls[0][0];
    expect(createCall.data.key).toBeUndefined();
  });
});
