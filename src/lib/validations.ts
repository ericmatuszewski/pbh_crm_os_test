import { z } from "zod";

// Contact validation schemas
export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  title: z.string().max(100).optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  status: z.enum(["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "PARTNER"]).default("LEAD"),
  source: z.string().max(100).optional().or(z.literal("")),
  ownerId: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

// Company validation schemas
export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  size: z.enum(["STARTUP", "SMALL", "MEDIUM", "ENTERPRISE"]).optional().nullable(),
  address: z.string().max(500).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
});

export const updateCompanySchema = createCompanySchema.partial();

// Deal validation schemas
export const createDealSchema = z.object({
  title: z.string().min(1, "Deal title is required").max(200),
  value: z.number().min(0, "Value must be positive"),
  currency: z.string().default("USD"),
  stage: z.enum([
    "QUALIFICATION",
    "DISCOVERY",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ]).default("QUALIFICATION"),
  probability: z.number().min(0).max(100).default(0),
  expectedCloseDate: z.string().optional().nullable(),
  contactId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  ownerId: z.string().min(1, "Owner is required"),
});

export const updateDealSchema = createDealSchema.partial();

// Task validation schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("TODO"),
  assigneeId: z.string().min(1, "Assignee is required"),
  relatedType: z.string().optional(),
  relatedId: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// Activity validation schemas
export const createActivitySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE", "TASK", "DEAL_UPDATE"]),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  userId: z.string().min(1, "User is required"),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});

// Note validation schema
export const createNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  authorId: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const contactFiltersSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "PARTNER"]).optional(),
  companyId: z.string().optional(),
});

export const dealFiltersSchema = paginationSchema.extend({
  search: z.string().optional(),
  stage: z.enum([
    "QUALIFICATION",
    "DISCOVERY",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ]).optional(),
  ownerId: z.string().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
});

export const taskFiltersSchema = paginationSchema.extend({
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
});

// Type exports
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
