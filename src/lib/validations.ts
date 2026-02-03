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
  county: z.string().max(100).optional().or(z.literal("")),
  postcode: z.string().max(15).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
});

export const updateCompanySchema = createCompanySchema.partial();

// Deal validation schemas
export const createDealSchema = z.object({
  title: z.string().min(1, "Deal title is required").max(200),
  value: z.number().min(0, "Value must be positive"),
  currency: z.string().default("GBP"),
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
  pipelineId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
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
  dependsOnId: z.string().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.string().optional().nullable(),
  recurrenceInterval: z.number().optional().nullable(),
  recurrenceEndDate: z.string().optional().nullable(),
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
  page: z.preprocess((val) => (val === null || val === "" ? undefined : val), z.coerce.number().min(1).default(1)),
  limit: z.preprocess((val) => (val === null || val === "" ? undefined : val), z.coerce.number().min(1).max(100).default(20)),
});

export const contactFiltersSchema = paginationSchema.extend({
  search: z.string().nullish(),
  status: z.enum(["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "PARTNER"]).nullish(),
  companyId: z.string().nullish(),
  ownerId: z.string().nullish(),
  tagId: z.string().nullish(),
  source: z.string().nullish(),
  createdAfter: z.string().nullish(),
  createdBefore: z.string().nullish(),
  sortBy: z.enum(["createdAt", "firstName", "lastName", "email", "status"]).nullish(),
  sortOrder: z.enum(["asc", "desc"]).nullish(),
});

export const dealFiltersSchema = paginationSchema.extend({
  search: z.string().nullish(),
  stage: z.enum([
    "QUALIFICATION",
    "DISCOVERY",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ]).nullish(),
  ownerId: z.string().nullish(),
  minValue: z.preprocess((val) => (val === null || val === "" ? undefined : val), z.coerce.number().optional()),
  maxValue: z.preprocess((val) => (val === null || val === "" ? undefined : val), z.coerce.number().optional()),
  pipelineId: z.string().nullish(),
  stageId: z.string().nullish(),
  companyId: z.string().nullish(),
  contactId: z.string().nullish(),
  status: z.enum(["OPEN", "WON", "LOST"]).nullish(),
  createdAfter: z.string().nullish(),
  createdBefore: z.string().nullish(),
  expectedCloseAfter: z.string().nullish(),
  expectedCloseBefore: z.string().nullish(),
  sortBy: z.enum(["createdAt", "title", "value", "expectedCloseDate", "stage"]).nullish(),
  sortOrder: z.enum(["asc", "desc"]).nullish(),
});

export const taskFiltersSchema = paginationSchema.extend({
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).nullish(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullish(),
  assigneeId: z.string().nullish(),
});

// ==================== QUOTE VALIDATION SCHEMAS ====================

export const createQuoteItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
});

export const createQuoteSchema = z.object({
  title: z.string().min(1, "Quote title is required").max(200),
  contactId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  dealId: z.string().optional().or(z.literal("")),
  validUntil: z.string().min(1, "Valid until date is required"),
  currency: z.string().default("GBP"),
  discountType: z.enum(["percentage", "fixed"]).optional().nullable(),
  discountValue: z.number().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  termsConditions: z.string().max(5000).optional().or(z.literal("")),
  paymentTerms: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  companyName: z.string().max(200).optional().or(z.literal("")),
  companyAddress: z.string().max(500).optional().or(z.literal("")),
  items: z.array(createQuoteItemSchema).min(1, "At least one line item is required"),
});

export const updateQuoteSchema = createQuoteSchema.partial().extend({
  items: z.array(createQuoteItemSchema).min(1, "At least one line item is required").optional(),
});

export const updateQuoteStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"]),
});

export const quoteFiltersSchema = paginationSchema.extend({
  search: z.string().nullish(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"]).nullish(),
  contactId: z.string().nullish(),
  companyId: z.string().nullish(),
  dealId: z.string().nullish(),
});

// ==================== CALL SCHEDULING VALIDATION SCHEMAS ====================

// Outcomes that require notes to document the reason
const OUTCOMES_REQUIRING_NOTES = [
  "NOT_INTERESTED",
  "WRONG_NUMBER",
  "DO_NOT_CALL",
] as const;

export const createScheduledCallSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  scheduledAt: z.string().min(1, "Scheduled time is required"),
  assignedToId: z.string().min(1, "Assigned agent is required"), // Required - no system fallback
  reminderMinutes: z.number().int().min(5).max(1440).optional().nullable(), // 5 min to 24 hours
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export const updateScheduledCallSchema = createScheduledCallSchema.partial();

export const completeCallSchema = z.object({
  outcome: z.enum([
    "ANSWERED",
    "NO_ANSWER",
    "VOICEMAIL",
    "BUSY",
    "CALLBACK_REQUESTED",
    "NOT_INTERESTED",
    "WRONG_NUMBER",
    "DO_NOT_CALL",
  ]),
  notes: z.string().max(2000).optional().or(z.literal("")),
  duration: z.number().int().min(0).max(480).optional(), // Max 8 hours (480 minutes)
  callbackAt: z.string().optional(), // For CALLBACK_REQUESTED
}).refine(
  (data) => {
    // Require notes for negative outcomes
    if (OUTCOMES_REQUIRING_NOTES.includes(data.outcome as typeof OUTCOMES_REQUIRING_NOTES[number])) {
      return data.notes && data.notes.trim().length >= 10;
    }
    return true;
  },
  {
    message: "Notes are required (min 10 characters) when marking a call as Not Interested, Wrong Number, or Do Not Call",
    path: ["notes"],
  }
);

export const scheduledCallFiltersSchema = paginationSchema.extend({
  assignedToId: z.string().nullish(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "MISSED"]).nullish(),
  date: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
});

// ==================== CAMPAIGN VALIDATION SCHEMAS ====================

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const updateCampaignStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]),
});

export const addCampaignContactsSchema = z.object({
  contactIds: z.array(z.string()).min(1, "At least one contact is required"),
});

export const recordOutcomeSchema = z.object({
  outcome: z.enum([
    "ANSWERED",
    "NO_ANSWER",
    "VOICEMAIL",
    "BUSY",
    "CALLBACK_REQUESTED",
    "NOT_INTERESTED",
    "WRONG_NUMBER",
    "DO_NOT_CALL",
  ]),
  notes: z.string().max(2000).optional().or(z.literal("")),
  callbackAt: z.string().optional(),
});

// Alias for queue-specific outcome recording
export const recordQueueOutcomeSchema = recordOutcomeSchema;

export const campaignFiltersSchema = paginationSchema.extend({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).nullish(),
  createdById: z.string().nullish(),
  search: z.string().nullish(),
});

// ==================== IMPORT VALIDATION SCHEMAS ====================

export const importRowSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  title: z.string().max(100).optional().or(z.literal("")),
  companyName: z.string().max(200).optional().or(z.literal("")),
  status: z.enum(["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "PARTNER"]).optional(),
  source: z.string().max(100).optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")), // Comma-separated
});

export const executeImportSchema = z.object({
  importId: z.string().min(1),
  columnMapping: z.record(z.string()),
  skipDuplicates: z.boolean().default(true),
  updateDuplicates: z.boolean().default(false),
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

// Quote types
export type CreateQuoteItemInput = z.infer<typeof createQuoteItemSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;

// Call scheduling types
export type CreateScheduledCallInput = z.infer<typeof createScheduledCallSchema>;
export type UpdateScheduledCallInput = z.infer<typeof updateScheduledCallSchema>;
export type CompleteCallInput = z.infer<typeof completeCallSchema>;

// Campaign types
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type UpdateCampaignStatusInput = z.infer<typeof updateCampaignStatusSchema>;
export type AddCampaignContactsInput = z.infer<typeof addCampaignContactsSchema>;
export type RecordOutcomeInput = z.infer<typeof recordOutcomeSchema>;

// Import types
export type ImportRowInput = z.infer<typeof importRowSchema>;
export type ExecuteImportInput = z.infer<typeof executeImportSchema>;
