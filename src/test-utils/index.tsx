import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a new QueryClient for each test to ensure isolation
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface TestProviderProps {
  children: React.ReactNode;
}

function TestProviders({ children }: TestProviderProps) {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Custom render function that includes providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render with custom render
export { customRender as render };

// Mock data factories
export const mockUser = (overrides = {}) => ({
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  role: 'REP' as const,
  teamId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockContact = (overrides = {}) => ({
  id: 'test-contact-id',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0100',
  title: 'CEO',
  companyId: 'test-company-id',
  status: 'LEAD' as const,
  source: 'Website',
  ownerId: 'test-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockCompany = (overrides = {}) => ({
  id: 'test-company-id',
  name: 'Acme Corp',
  website: 'https://acme.com',
  industry: 'Technology',
  size: 'MEDIUM' as const,
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  country: 'USA',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockDeal = (overrides = {}) => ({
  id: 'test-deal-id',
  title: 'Enterprise License',
  value: 50000,
  currency: 'USD',
  stage: 'QUALIFICATION' as const,
  probability: 20,
  expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  closedAt: null,
  closedReason: null,
  contactId: 'test-contact-id',
  companyId: 'test-company-id',
  ownerId: 'test-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockTask = (overrides = {}) => ({
  id: 'test-task-id',
  title: 'Follow up call',
  description: 'Call to discuss proposal',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  priority: 'MEDIUM' as const,
  status: 'TODO' as const,
  assigneeId: 'test-user-id',
  relatedType: 'deal',
  relatedId: 'test-deal-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
