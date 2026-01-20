import {
  UserRole,
  ContactStatus,
  CompanySize,
  DealStage,
  Priority,
  TaskStatus,
  ActivityType,
} from "@prisma/client";

// Re-export Prisma enums
export {
  UserRole,
  ContactStatus,
  CompanySize,
  DealStage,
  Priority,
  TaskStatus,
  ActivityType,
};

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Entity types (for frontend use)
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  companyId: string | null;
  company?: Company;
  status: ContactStatus;
  source: string | null;
  ownerId: string | null;
  tags?: Tag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: CompanySize | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate: Date | null;
  closedAt: Date | null;
  closedReason: string | null;
  contactId: string | null;
  contact?: Contact;
  companyId: string | null;
  company?: Company;
  ownerId: string;
  owner?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: Priority;
  status: TaskStatus;
  assigneeId: string;
  assignee?: User;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  userId: string;
  user?: User;
  contactId: string | null;
  contact?: Contact;
  dealId: string | null;
  deal?: Deal;
  createdAt: Date;
}

export interface Note {
  id: string;
  content: string;
  authorId: string | null;
  contactId: string | null;
  companyId: string | null;
  dealId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface Team {
  id: string;
  name: string;
  members?: User[];
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard metrics types
export interface DashboardMetrics {
  totalDeals: number;
  totalValue: number;
  dealsWon: number;
  dealsLost: number;
  conversionRate: number;
  averageDealSize: number;
  dealsByStage: Record<DealStage, number>;
  recentActivities: Activity[];
  upcomingTasks: Task[];
}

// Form input types
export interface CreateContactInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  companyId?: string;
  status?: ContactStatus;
  source?: string;
  ownerId?: string;
  tagIds?: string[];
}

export interface CreateDealInput {
  title: string;
  value: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expectedCloseDate?: Date;
  contactId?: string;
  companyId?: string;
  ownerId: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: Priority;
  status?: TaskStatus;
  assigneeId: string;
  relatedType?: string;
  relatedId?: string;
}

// Filter types
export interface ContactFilters {
  status?: ContactStatus;
  companyId?: string;
  search?: string;
  tagIds?: string[];
}

export interface DealFilters {
  stage?: DealStage;
  ownerId?: string;
  minValue?: number;
  maxValue?: number;
  search?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}
