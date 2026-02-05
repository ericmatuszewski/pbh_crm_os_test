/**
 * Authentication API Tests
 *
 * Tests for login, logout, and session management
 */

import { NextRequest } from 'next/server';

// Mock session service
const mockCreateSessionWithLimitEnforcement = jest.fn();
const mockParseUserAgent = jest.fn().mockReturnValue({
  browser: 'Chrome',
  os: 'Windows',
  device: 'desktop',
});

jest.mock('@/lib/sessions/service', () => ({
  createSessionWithLimitEnforcement: (...args: unknown[]) => mockCreateSessionWithLimitEnforcement(...args),
  parseUserAgent: (...args: unknown[]) => mockParseUserAgent(...args),
}));

// Mock LDAP authentication
const mockAuthenticateAD = jest.fn();
const mockIsLDAPConfigured = jest.fn();

jest.mock('@/lib/auth/ldap', () => ({
  authenticateAD: (...args: unknown[]) => mockAuthenticateAD(...args),
  isLDAPConfigured: () => mockIsLDAPConfigured(),
}));

// Mock Prisma
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  business: {
    findFirst: jest.fn(),
  },
  userBusiness: {
    create: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock cookies
const mockCookiesSet = jest.fn();
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    set: (...args: unknown[]) => mockCookiesSet(...args),
  }),
}));

// Mock crypto for deterministic tests
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mocked-session-token-12345'),
  }),
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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), requestInit);
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLDAPConfigured.mockReturnValue(true);
  });

  describe('Input Validation', () => {
    it('should reject request without username', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { password: 'password123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Username and password required');
    });

    it('should reject request without password', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Username and password required');
    });

    it('should reject empty credentials', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: '', password: '' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('LDAP Configuration', () => {
    it('should return 500 when LDAP is not configured', async () => {
      mockIsLDAPConfigured.mockReturnValue(false);

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'password123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Authentication not configured');
    });
  });

  describe('AD Authentication', () => {
    it('should reject invalid credentials', async () => {
      mockAuthenticateAD.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      // Ensure we're in production mode to skip fallback
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'baduser', password: 'wrongpassword' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid credentials');

      process.env.NODE_ENV = originalEnv;
    });

    it('should create new user from AD on first login', async () => {
      const adUser = {
        dn: 'CN=Test User,OU=Users,DC=company,DC=com',
        sAMAccountName: 'testuser',
        mail: 'test@company.com',
        userPrincipalName: 'test@company.com',
        displayName: 'Test User',
        givenName: 'Test',
        sn: 'User',
      };

      mockAuthenticateAD.mockResolvedValue({
        success: true,
        user: adUser,
      });

      // User doesn't exist yet
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const newUser = {
        id: 'new-user-id',
        email: 'test@company.com',
        name: 'Test User',
        status: 'ACTIVE',
      };
      mockPrisma.user.create.mockResolvedValue(newUser);
      mockPrisma.business.findFirst.mockResolvedValue({ id: 'default-business' });
      mockPrisma.userBusiness.create.mockResolvedValue({});
      // Mock MFA check - MFA not enabled
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      mockPrisma.user.update.mockResolvedValue(newUser);
      mockCreateSessionWithLimitEnforcement.mockResolvedValue({ enforcementResult: { revokedCount: 0 } });

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'validpassword' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.id).toBe('new-user-id');
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.userBusiness.create).toHaveBeenCalledWith({
        data: {
          userId: 'new-user-id',
          businessId: 'default-business',
          isDefault: true,
        },
      });
    });

    it('should login existing user from AD', async () => {
      const adUser = {
        dn: 'CN=Existing User,OU=Users,DC=company,DC=com',
        sAMAccountName: 'existinguser',
        mail: 'existing@company.com',
        userPrincipalName: 'existing@company.com',
        displayName: 'Existing User',
      };

      const existingUser = {
        id: 'existing-user-id',
        email: 'existing@company.com',
        name: 'Existing User',
        status: 'ACTIVE',
      };

      mockAuthenticateAD.mockResolvedValue({
        success: true,
        user: adUser,
      });
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      // Mock MFA check - MFA not enabled
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      mockPrisma.user.update.mockResolvedValue(existingUser);
      mockCreateSessionWithLimitEnforcement.mockResolvedValue({ enforcementResult: { revokedCount: 0 } });

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'existinguser', password: 'validpassword' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('existing@company.com');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('Disabled User', () => {
    it('should reject login for disabled user', async () => {
      const adUser = {
        dn: 'CN=Disabled User,OU=Users,DC=company,DC=com',
        sAMAccountName: 'disableduser',
        mail: 'disabled@company.com',
      };

      const disabledUser = {
        id: 'disabled-user-id',
        email: 'disabled@company.com',
        name: 'Disabled User',
        status: 'INACTIVE',
      };

      mockAuthenticateAD.mockResolvedValue({
        success: true,
        user: adUser,
      });
      mockPrisma.user.findFirst.mockResolvedValue(disabledUser);

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'disableduser', password: 'validpassword' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('disabled');
    });
  });

  describe('Session Management', () => {
    it('should create session with correct parameters', async () => {
      const adUser = {
        dn: 'CN=Test User,OU=Users,DC=company,DC=com',
        sAMAccountName: 'testuser',
        mail: 'test@company.com',
      };

      const user = {
        id: 'user-id-123',
        email: 'test@company.com',
        name: 'Test User',
        status: 'ACTIVE',
      };

      mockAuthenticateAD.mockResolvedValue({ success: true, user: adUser });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      mockPrisma.user.update.mockResolvedValue(user);
      mockCreateSessionWithLimitEnforcement.mockResolvedValue({ enforcementResult: { revokedCount: 0 } });

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'validpassword' },
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      await POST(request);

      expect(mockCreateSessionWithLimitEnforcement).toHaveBeenCalledWith(
        'mocked-session-token-12345',
        'user-id-123',
        expect.any(String), // user agent
        expect.objectContaining({ ipAddress: '192.168.1.100' }),
        expect.any(Date) // expiry
      );
    });

    it('should set httpOnly secure cookie', async () => {
      const adUser = {
        dn: 'CN=Test User,OU=Users,DC=company,DC=com',
        sAMAccountName: 'testuser',
        mail: 'test@company.com',
      };

      const user = {
        id: 'user-id-123',
        email: 'test@company.com',
        name: 'Test User',
        status: 'ACTIVE',
      };

      mockAuthenticateAD.mockResolvedValue({ success: true, user: adUser });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      mockPrisma.user.update.mockResolvedValue(user);
      mockCreateSessionWithLimitEnforcement.mockResolvedValue({ enforcementResult: { revokedCount: 0 } });

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'validpassword' },
      });

      await POST(request);

      expect(mockCookiesSet).toHaveBeenCalledWith(
        'session-token',
        'mocked-session-token-12345',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });

    it('should update last login timestamp', async () => {
      const adUser = {
        dn: 'CN=Test User,OU=Users,DC=company,DC=com',
        sAMAccountName: 'testuser',
        mail: 'test@company.com',
      };

      const user = {
        id: 'user-id-123',
        email: 'test@company.com',
        name: 'Test User',
        status: 'ACTIVE',
      };

      mockAuthenticateAD.mockResolvedValue({ success: true, user: adUser });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      mockPrisma.user.update.mockResolvedValue(user);
      mockCreateSessionWithLimitEnforcement.mockResolvedValue({ enforcementResult: { revokedCount: 0 } });

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'validpassword' },
      });

      await POST(request);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('Response Format', () => {
    it('should return user data and expiry on successful login', async () => {
      const adUser = {
        dn: 'CN=Test User,OU=Users,DC=company,DC=com',
        sAMAccountName: 'testuser',
        mail: 'test@company.com',
      };

      const user = {
        id: 'user-id-123',
        email: 'test@company.com',
        name: 'Test User',
        status: 'ACTIVE',
      };

      mockAuthenticateAD.mockResolvedValue({ success: true, user: adUser });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      mockPrisma.user.update.mockResolvedValue(user);
      mockCreateSessionWithLimitEnforcement.mockResolvedValue({ enforcementResult: { revokedCount: 0 } });

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'validpassword' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        user: {
          id: 'user-id-123',
          name: 'Test User',
          email: 'test@company.com',
        },
        expiresAt: expect.any(String),
      });
    });

    it('should not expose sensitive data in response', async () => {
      const adUser = {
        dn: 'CN=Test User,OU=Users,DC=company,DC=com',
        sAMAccountName: 'testuser',
        mail: 'test@company.com',
      };

      const user = {
        id: 'user-id-123',
        email: 'test@company.com',
        name: 'Test User',
        status: 'ACTIVE',
        passwordHash: 'secret-hash', // Should not be exposed
      };

      mockAuthenticateAD.mockResolvedValue({ success: true, user: adUser });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      mockPrisma.user.update.mockResolvedValue(user);
      mockCreateSessionWithLimitEnforcement.mockResolvedValue({ enforcementResult: { revokedCount: 0 } });

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'validpassword' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.user.passwordHash).toBeUndefined();
      expect(data.data.user.status).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockAuthenticateAD.mockRejectedValue(new Error('Database connection failed'));

      const { POST } = await import('@/app/api/auth/login/route');
      const request = createRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'validpassword' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Login failed');
    });
  });
});
