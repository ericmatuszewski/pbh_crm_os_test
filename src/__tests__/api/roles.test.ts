/**
 * Roles & RBAC API Tests
 *
 * Tests for role management and permission enforcement
 */

import { NextRequest } from 'next/server';

// Mock Prisma
const mockPrisma = {
  role: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  permission: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  fieldPermission: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
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

describe('GET /api/roles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all roles with counts', async () => {
    const mockRoles = [
      {
        id: 'role-admin',
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
        type: 'SYSTEM',
        level: 100,
        isActive: true,
        parent: null,
        _count: {
          permissions: 50,
          fieldPermissions: 20,
          userRoles: 3,
          children: 2,
        },
      },
      {
        id: 'role-agent',
        name: 'agent',
        displayName: 'Sales Agent',
        description: 'Standard sales access',
        type: 'SYSTEM',
        level: 50,
        isActive: true,
        parent: { id: 'role-admin', name: 'admin', displayName: 'Administrator' },
        _count: {
          permissions: 25,
          fieldPermissions: 10,
          userRoles: 10,
          children: 0,
        },
      },
    ];

    mockPrisma.role.findMany.mockResolvedValue(mockRoles);

    const { GET } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].displayName).toBe('Administrator');
    expect(data.data[0]._count.permissions).toBe(50);
  });

  it('should filter roles by type', async () => {
    mockPrisma.role.findMany.mockResolvedValue([
      {
        id: 'role-custom',
        name: 'custom_role',
        displayName: 'Custom Role',
        type: 'CUSTOM',
        _count: { permissions: 5, fieldPermissions: 2, userRoles: 1, children: 0 },
      },
    ]);

    const { GET } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles?type=CUSTOM');

    await GET(request);

    expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'CUSTOM' }),
      })
    );
  });

  it('should filter roles by active status', async () => {
    mockPrisma.role.findMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles?isActive=true');

    await GET(request);

    expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });

  it('should search roles by name and description', async () => {
    mockPrisma.role.findMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles?search=sales');

    await GET(request);

    expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'sales', mode: 'insensitive' } },
            { displayName: { contains: 'sales', mode: 'insensitive' } },
            { description: { contains: 'sales', mode: 'insensitive' } },
          ],
        }),
      })
    );
  });

  it('should order roles by level and name', async () => {
    mockPrisma.role.findMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles');

    await GET(request);

    expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ level: 'desc' }, { displayName: 'asc' }],
      })
    );
  });

  it('should handle database errors', async () => {
    mockPrisma.role.findMany.mockRejectedValue(new Error('DB Error'));

    const { GET } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FETCH_ERROR');
  });
});

describe('POST /api/roles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require name and displayName', async () => {
    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: { description: 'Missing name' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should normalize role name', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role',
      name: 'sales_manager',
      displayName: 'Sales Manager',
      type: 'CUSTOM',
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'Sales Manager!@#',
        displayName: 'Sales Manager',
      },
    });

    await POST(request);

    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'sales_manager___',
        }),
      })
    );
  });

  it('should reject duplicate role names', async () => {
    mockPrisma.role.findUnique.mockResolvedValue({
      id: 'existing-role',
      name: 'sales_manager',
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'sales_manager',
        displayName: 'Sales Manager',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('DUPLICATE_ERROR');
  });

  it('should create role with permissions', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role',
      name: 'custom_role',
      displayName: 'Custom Role',
      type: 'CUSTOM',
      permissions: [
        { entity: 'contact', action: 'read', recordAccess: 'ALL' },
        { entity: 'contact', action: 'write', recordAccess: 'OWN' },
      ],
      _count: { userRoles: 0 },
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'custom_role',
        displayName: 'Custom Role',
        permissions: [
          { entity: 'contact', action: 'read', recordAccess: 'ALL' },
          { entity: 'contact', action: 'write', recordAccess: 'OWN' },
        ],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          permissions: {
            create: expect.arrayContaining([
              expect.objectContaining({
                entity: 'contact',
                action: 'read',
                recordAccess: 'ALL',
              }),
            ]),
          },
        }),
      })
    );
  });

  it('should create role with field permissions', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role',
      name: 'restricted_role',
      displayName: 'Restricted Role',
      type: 'CUSTOM',
      fieldPermissions: [
        { entity: 'contact', fieldName: 'ssn', canView: false, canEdit: false },
        { entity: 'contact', fieldName: 'email', canView: true, canEdit: false, maskValue: true },
      ],
      _count: { userRoles: 0 },
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'restricted_role',
        displayName: 'Restricted Role',
        fieldPermissions: [
          { entity: 'contact', fieldName: 'ssn', canView: false, canEdit: false },
          { entity: 'contact', fieldName: 'email', canView: true, canEdit: false, maskValue: true },
        ],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fieldPermissions: {
            create: expect.arrayContaining([
              expect.objectContaining({
                entity: 'contact',
                fieldName: 'ssn',
                canView: false,
                canEdit: false,
              }),
            ]),
          },
        }),
      })
    );
  });

  it('should create role with parent (hierarchy)', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role',
      name: 'junior_agent',
      displayName: 'Junior Agent',
      type: 'CUSTOM',
      parentId: 'role-agent',
      level: 25,
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'junior_agent',
        displayName: 'Junior Agent',
        parentId: 'role-agent',
        level: 25,
      },
    });

    await POST(request);

    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: 'role-agent',
          level: 25,
        }),
      })
    );
  });

  it('should set default level to 0', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role',
      name: 'basic_role',
      displayName: 'Basic Role',
      type: 'CUSTOM',
      level: 0,
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'basic_role',
        displayName: 'Basic Role',
      },
    });

    await POST(request);

    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          level: 0,
        }),
      })
    );
  });

  it('should always create CUSTOM type roles', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role',
      name: 'hacker_role',
      displayName: 'Hacker Role',
      type: 'CUSTOM', // Even if they try to create SYSTEM
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'hacker_role',
        displayName: 'Hacker Role',
        type: 'SYSTEM', // Attacker tries to create system role
      },
    });

    await POST(request);

    // Verify that the type is always CUSTOM
    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'CUSTOM',
        }),
      })
    );
  });

  it('should handle creation errors', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockRejectedValue(new Error('DB Error'));

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'test_role',
        displayName: 'Test Role',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('CREATE_ERROR');
  });
});

describe('RBAC Permission Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should support entity-level permissions', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role',
      permissions: [
        { entity: 'contact', action: 'create', recordAccess: 'ALL' },
        { entity: 'contact', action: 'read', recordAccess: 'ALL' },
        { entity: 'contact', action: 'update', recordAccess: 'OWN' },
        { entity: 'contact', action: 'delete', recordAccess: 'NONE' },
        { entity: 'deal', action: 'read', recordAccess: 'TEAM' },
      ],
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'entity_perms_role',
        displayName: 'Entity Perms Role',
        permissions: [
          { entity: 'contact', action: 'create', recordAccess: 'ALL' },
          { entity: 'contact', action: 'read', recordAccess: 'ALL' },
          { entity: 'contact', action: 'update', recordAccess: 'OWN' },
          { entity: 'contact', action: 'delete', recordAccess: 'NONE' },
          { entity: 'deal', action: 'read', recordAccess: 'TEAM' },
        ],
      },
    });

    await POST(request);

    const createCall = mockPrisma.role.create.mock.calls[0][0];
    const permissionsCreate = createCall.data.permissions.create;

    expect(permissionsCreate).toHaveLength(5);
    expect(permissionsCreate).toContainEqual(
      expect.objectContaining({
        entity: 'contact',
        action: 'update',
        recordAccess: 'OWN',
      })
    );
    expect(permissionsCreate).toContainEqual(
      expect.objectContaining({
        entity: 'deal',
        action: 'read',
        recordAccess: 'TEAM',
      })
    );
  });

  it('should support field-level masking', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role',
      fieldPermissions: [
        {
          entity: 'contact',
          fieldName: 'phone',
          canView: true,
          canEdit: false,
          maskValue: true,
          maskPattern: '***-***-####',
        },
      ],
    });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'masked_role',
        displayName: 'Masked Role',
        fieldPermissions: [
          {
            entity: 'contact',
            fieldName: 'phone',
            canView: true,
            canEdit: false,
            maskValue: true,
            maskPattern: '***-***-####',
          },
        ],
      },
    });

    await POST(request);

    const createCall = mockPrisma.role.create.mock.calls[0][0];
    const fieldPerms = createCall.data.fieldPermissions.create;

    expect(fieldPerms[0]).toMatchObject({
      entity: 'contact',
      fieldName: 'phone',
      maskValue: true,
      maskPattern: '***-***-####',
    });
  });

  it('should default recordAccess to OWN', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({ id: 'new-role' });

    const { POST } = await import('@/app/api/roles/route');
    const request = createRequest('http://localhost:3000/api/roles', {
      method: 'POST',
      body: {
        name: 'default_access_role',
        displayName: 'Default Access Role',
        permissions: [
          { entity: 'contact', action: 'read' }, // No recordAccess specified
        ],
      },
    });

    await POST(request);

    const createCall = mockPrisma.role.create.mock.calls[0][0];
    const perms = createCall.data.permissions.create;

    expect(perms[0].recordAccess).toBe('OWN');
  });
});
