/**
 * API Integration Tests for Tasks Routes
 */

import { NextRequest } from 'next/server';

// Mock Prisma before importing routes
const mockPrisma = {
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

describe('Tasks API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('should return tasks list', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Follow up with client',
          description: 'Call about proposal',
          status: 'PENDING',
          priority: 'HIGH',
          dueDate: new Date('2026-02-10'),
          createdAt: new Date(),
          assignee: { id: 'user-1', name: 'John Doe' },
          contact: null,
          deal: null,
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);
      mockPrisma.task.count.mockResolvedValue(1);

      const { GET } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Follow up with client');
    });

    it('should filter tasks by status', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks?status=COMPLETED');
      await GET(request);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should filter tasks by assignee', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks?assigneeId=user-1');
      await GET(request);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId: 'user-1',
          }),
        })
      );
    });

    it('should filter tasks by priority', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks?priority=URGENT');
      await GET(request);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'URGENT',
          }),
        })
      );
    });

    it('should filter overdue tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const { GET } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks?overdue=true');
      await GET(request);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({
              lt: expect.any(Date),
            }),
            status: expect.objectContaining({
              not: 'COMPLETED',
            }),
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database error'));

      const { GET } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task with valid data', async () => {
      const newTask = {
        id: 'new-task-id',
        title: 'New Task',
        description: 'Task description',
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: new Date('2026-02-15'),
        createdAt: new Date(),
      };

      mockPrisma.task.create.mockResolvedValue(newTask);

      const { POST } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: {
          title: 'New Task',
          description: 'Task description',
          priority: 'MEDIUM',
          dueDate: '2026-02-15',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('New Task');
    });

    it('should create a recurring task', async () => {
      const recurringTask = {
        id: 'recurring-task-id',
        title: 'Weekly Report',
        isRecurring: true,
        recurrencePattern: 'weekly',
        recurrenceInterval: 1,
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockPrisma.task.create.mockResolvedValue(recurringTask);

      const { POST } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: {
          title: 'Weekly Report',
          isRecurring: true,
          recurrencePattern: 'weekly',
          recurrenceInterval: 1,
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.isRecurring).toBe(true);
    });

    it('should return validation error for missing title', async () => {
      const { POST } = await import('@/app/api/tasks/route');
      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: {
          description: 'No title provided',
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return task by ID', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Follow up with client',
        description: 'Call about proposal',
        status: 'PENDING',
        priority: 'HIGH',
        assignee: { id: 'user-1', name: 'John Doe' },
        contact: null,
        deal: null,
      };

      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      const { GET } = await import('@/app/api/tasks/[id]/route');
      const request = createRequest('http://localhost:3000/api/tasks/task-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('task-1');
    });

    it('should return 404 for non-existent task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const { GET } = await import('@/app/api/tasks/[id]/route');
      const request = createRequest('http://localhost:3000/api/tasks/non-existent');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task status', async () => {
      const updatedTask = {
        id: 'task-1',
        title: 'Follow up with client',
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      mockPrisma.task.update.mockResolvedValue(updatedTask);

      const { PUT } = await import('@/app/api/tasks/[id]/route');
      const request = createRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: {
          status: 'COMPLETED',
        },
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('COMPLETED');
    });

    it('should update task priority', async () => {
      const updatedTask = {
        id: 'task-1',
        title: 'Urgent task',
        priority: 'URGENT',
      };

      mockPrisma.task.update.mockResolvedValue(updatedTask);

      const { PUT } = await import('@/app/api/tasks/[id]/route');
      const request = createRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: {
          priority: 'URGENT',
        },
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.priority).toBe('URGENT');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      mockPrisma.task.delete.mockResolvedValue({ id: 'task-1' });

      const { DELETE } = await import('@/app/api/tasks/[id]/route');
      const request = createRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'task-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('Task Due Date Handling', () => {
  it('should handle tasks without due date', async () => {
    const taskWithoutDueDate = {
      id: 'task-1',
      title: 'No due date task',
      dueDate: null,
      status: 'PENDING',
      createdAt: new Date(),
    };

    mockPrisma.task.findMany.mockResolvedValue([taskWithoutDueDate]);
    mockPrisma.task.count.mockResolvedValue(1);

    const { GET } = await import('@/app/api/tasks/route');
    const request = createRequest('http://localhost:3000/api/tasks');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data[0].dueDate).toBeNull();
  });

  it('should handle past due dates', async () => {
    const overdueTask = {
      id: 'task-1',
      title: 'Overdue task',
      dueDate: new Date('2025-01-01'),
      status: 'PENDING',
      createdAt: new Date(),
    };

    mockPrisma.task.findMany.mockResolvedValue([overdueTask]);
    mockPrisma.task.count.mockResolvedValue(1);

    const { GET } = await import('@/app/api/tasks/route');
    const request = createRequest('http://localhost:3000/api/tasks');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Task is returned, client handles overdue styling
    expect(data.data).toHaveLength(1);
  });
});
