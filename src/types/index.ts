import {
  UserRole,
  ContactStatus,
  CompanySize,
  DealStage,
  Priority,
  TaskStatus,
  ActivityType,
  QuoteStatus,
  CallOutcome,
  ScheduledCallStatus,
  CampaignStatus,
  ProductType,
  ProductStatus,
  PricingType,
  SignatureStatus,
  WorkflowStatus,
  TriggerType,
  ActionType,
  AssignmentMethod,
  SequenceStatus,
  ScoringEventType,
  MarketingCampaignStatus,
  MarketingCampaignType,
  CustomFieldType,
  RoleType,
  PermissionAction,
  RecordAccess,
  AuditAction as PrismaAuditAction,
  NotificationType as PrismaNotificationType,
  NotificationPriority as PrismaNotificationPriority,
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
  QuoteStatus,
  CallOutcome,
  ScheduledCallStatus,
  CampaignStatus,
  ProductType,
  ProductStatus,
  PricingType,
  SignatureStatus,
  WorkflowStatus,
  TriggerType,
  ActionType,
  AssignmentMethod,
  SequenceStatus,
  ScoringEventType,
  MarketingCampaignStatus,
  MarketingCampaignType,
  CustomFieldType,
  RoleType,
  PermissionAction,
  RecordAccess,
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
  stage: DealStage | string;
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
  pipelineId?: string | null;
  pipeline?: Pipeline;
  stageId?: string | null;
  pipelineStage?: PipelineStage;
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

// ==================== QUOTE TYPES ====================

export interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  status: QuoteStatus;
  version: number;
  subtotal: number;
  discountType: "percentage" | "fixed" | null;
  discountValue: number | null;
  discountAmount: number;
  taxRate: number | null;
  taxAmount: number;
  total: number;
  currency: string;
  issueDate: Date;
  validUntil: Date;
  termsConditions: string | null;
  paymentTerms: string | null;
  notes: string | null;
  logoUrl: string | null;
  companyName: string | null;
  companyAddress: string | null;
  contactId: string | null;
  contact?: Contact;
  companyId: string | null;
  company?: Company;
  dealId: string | null;
  deal?: Deal;
  templateId: string | null;
  template?: QuoteTemplate;
  convertedToDealId: string | null;
  createdById: string;
  createdBy?: User;
  items: QuoteItem[];
  sentAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  sortOrder: number;
}

export interface CreateQuoteInput {
  title: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  validUntil: string; // ISO date string
  currency?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  taxRate?: number;
  termsConditions?: string;
  paymentTerms?: string;
  notes?: string;
  logoUrl?: string;
  companyName?: string;
  companyAddress?: string;
  items: CreateQuoteItemInput[];
}

export interface CreateQuoteItemInput {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface QuoteFilters {
  status?: QuoteStatus;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  search?: string;
}

// ==================== CALL SCHEDULING TYPES ====================

export interface ScheduledCall {
  id: string;
  scheduledAt: Date;
  duration: number | null;
  status: ScheduledCallStatus;
  outcome: CallOutcome | null;
  notes: string | null;
  reminderMinutes: number | null;
  reminderSent: boolean;
  contactId: string;
  contact?: Contact;
  assignedToId: string;
  assignedTo?: User;
  activityId: string | null;
  activity?: Activity;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduledCallInput {
  contactId: string;
  scheduledAt: string; // ISO date string
  assignedToId?: string;
  reminderMinutes?: number;
  notes?: string;
}

export interface CompleteCallInput {
  outcome: CallOutcome;
  notes?: string;
  duration?: number;
  callbackAt?: string; // ISO date string for callback scheduling
}

export interface ScheduledCallFilters {
  assignedToId?: string;
  status?: ScheduledCallStatus;
  date?: string; // ISO date string
  startDate?: string;
  endDate?: string;
}

// ==================== CAMPAIGN TYPES ====================

export interface CallCampaign {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  startDate: Date | null;
  endDate: Date | null;
  priority: Priority;
  totalCalls: number;
  completedCalls: number;
  successfulCalls: number;
  createdById: string;
  createdBy?: User;
  queueItems?: CallQueueItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CallQueueItem {
  id: string;
  position: number;
  status: ScheduledCallStatus;
  outcome: CallOutcome | null;
  notes: string | null;
  attempts: number;
  lastAttempt: Date | null;
  callbackAt: Date | null;
  campaignId: string;
  campaign?: CallCampaign;
  contactId: string;
  contact?: Contact;
  assignedToId: string | null;
  assignedTo?: User;
  activityId: string | null;
  activity?: Activity;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  priority?: Priority;
  startDate?: string; // ISO date string
  endDate?: string;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  createdById?: string;
  search?: string;
}

export interface RecordOutcomeInput {
  outcome: CallOutcome;
  notes?: string;
  callbackAt?: string; // ISO date string
}

// ==================== IMPORT TYPES ====================

export interface ImportSession {
  id: string;
  fileName: string;
  columns: string[];
  rowCount: number;
  preview: ImportRow[];
  createdAt: Date;
}

export interface ImportRow {
  rowNumber: number;
  data: Record<string, string>;
  errors?: string[];
  isDuplicate?: boolean;
  duplicateOf?: string; // Contact ID
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: ImportError[];
}

export interface ImportError {
  rowNumber: number;
  field?: string;
  message: string;
}

// ==================== PIPELINE TYPES ====================

export interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  stages: PipelineStage[];
  _count?: {
    deals: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  probability: number;
  position: number;
  isClosed: boolean;
  isWon: boolean;
  pipelineId: string;
  pipeline?: Pipeline;
  _count?: {
    deals: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePipelineInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  stages: CreatePipelineStageInput[];
}

export interface CreatePipelineStageInput {
  name: string;
  color?: string;
  probability: number;
  position: number;
  isClosed?: boolean;
  isWon?: boolean;
}

// ==================== PRODUCT CATALOG TYPES ====================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type: ProductType;
  status: ProductStatus;
  basePrice: number;
  currency: string;
  pricingType: PricingType;
  category: string | null;
  tags: string[];
  trackInventory: boolean;
  stockQuantity: number | null;
  priceBookEntries?: PriceBookEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  type?: ProductType;
  status?: ProductStatus;
  basePrice: number;
  currency?: string;
  pricingType?: PricingType;
  category?: string;
  tags?: string[];
  trackInventory?: boolean;
  stockQuantity?: number;
}

export interface ProductFilters {
  search?: string;
  status?: ProductStatus;
  type?: ProductType;
  category?: string;
  pricingType?: PricingType;
}

// ==================== PRICE BOOK TYPES ====================

export interface PriceBook {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  companySize: CompanySize | null;
  industry: string | null;
  discountPercent: number | null;
  entries?: PriceBookEntry[];
  _count?: {
    entries: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceBookEntry {
  id: string;
  priceBookId: string;
  priceBook?: PriceBook;
  productId: string;
  product?: Product;
  price: number;
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePriceBookInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  companySize?: CompanySize;
  industry?: string;
  discountPercent?: number;
}

export interface CreatePriceBookEntryInput {
  productId: string;
  price: number;
  minQuantity?: number;
  maxQuantity?: number;
  discountPercent?: number;
  isActive?: boolean;
}

export interface PriceBookFilters {
  search?: string;
  isActive?: boolean;
  companySize?: CompanySize;
  industry?: string;
}

// ==================== QUOTE TEMPLATE TYPES ====================

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  headerHtml: string | null;
  footerHtml: string | null;
  termsConditions: string | null;
  paymentTerms: string | null;
  notes: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  defaultDiscountPercent: number | null;
  defaultTaxRate: number | null;
  quotes?: Quote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuoteTemplateInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  headerHtml?: string;
  footerHtml?: string;
  termsConditions?: string;
  paymentTerms?: string;
  notes?: string;
  logoUrl?: string;
  primaryColor?: string;
  defaultDiscountPercent?: number;
  defaultTaxRate?: number;
}

export interface QuoteTemplateFilters {
  search?: string;
  isActive?: boolean;
}

// ==================== QUOTE VERSION TYPES ====================

export interface QuoteVersion {
  id: string;
  quoteId: string;
  version: number;
  title: string;
  status: QuoteStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  items: QuoteVersionItem[];
  changedBy: string | null;
  changeNotes: string | null;
  createdAt: Date;
}

export interface QuoteVersionItem {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

// ==================== SIGNATURE REQUEST TYPES ====================

export interface SignatureRequest {
  id: string;
  quoteId: string;
  quote?: Quote;
  provider: string;
  externalId: string | null;
  status: SignatureStatus;
  signerEmail: string;
  signerName: string;
  sentAt: Date | null;
  viewedAt: Date | null;
  signedAt: Date | null;
  declinedAt: Date | null;
  signedDocumentUrl: string | null;
  lastWebhookAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSignatureRequestInput {
  quoteId: string;
  provider: string;
  signerEmail: string;
  signerName: string;
}

// ==================== SAVED REPORT TYPES ====================

export interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  filters: ReportFilter[];
  columns: string[];
  sortField: string | null;
  sortDirection: string | null;
  isScheduled: boolean;
  scheduleFrequency: string | null;
  scheduleDay: number | null;
  scheduleTime: string | null;
  recipients: string[];
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdById: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportFilter {
  field: string;
  operator: string;
  value: string | string[] | number | boolean | null;
}

export interface CreateSavedReportInput {
  name: string;
  description?: string;
  entity: string;
  filters?: ReportFilter[];
  columns?: string[];
  sortField?: string;
  sortDirection?: string;
  isPublic?: boolean;
  isScheduled?: boolean;
  scheduleFrequency?: string;
  scheduleDay?: number;
  scheduleTime?: string;
  recipients?: string[];
}

// ==================== EMAIL TEMPLATE TYPES ====================

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  isActive: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailTemplateInput {
  name: string;
  subject: string;
  body: string;
  category?: string;
  isActive?: boolean;
}

// ==================== EMAIL LOG TYPES ====================

export interface EmailLog {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  toEmail: string;
  ccEmails: string[];
  bccEmails: string[];
  status: string;
  sentAt: Date;
  openedAt: Date | null;
  clickedAt: Date | null;
  source: string;
  contactId: string | null;
  dealId: string | null;
  userId: string | null;
  templateId: string | null;
  createdAt: Date;
}

// ==================== MEETING TYPES ====================

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string;
  reminderMinutes: number | null;
  reminderSent: boolean;
  contactId: string | null;
  contact?: Contact;
  dealId: string | null;
  deal?: Deal;
  organizerId: string;
  activityId: string | null;
  attendees: MeetingAttendee[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingAttendee {
  email: string;
  name: string;
  status?: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  location?: string;
  meetingUrl?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  reminderMinutes?: number;
  contactId?: string;
  dealId?: string;
  organizerId: string;
  attendees?: MeetingAttendee[];
}

// ==================== TIMELINE TYPES ====================

export interface TimelineItem {
  id: string;
  type: "activity" | "email" | "meeting" | "call" | "note" | "deal_update";
  title: string;
  description: string | null;
  timestamp: Date;
  user?: { id: string; name: string | null };
  metadata?: Record<string, unknown>;
}

// ==================== WORKFLOW AUTOMATION TYPES ====================

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  status: WorkflowStatus;
  runOnce: boolean;
  runOrder: number;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  totalExecutions: number;
  lastExecutedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  id: string;
  workflowId: string;
  type: TriggerType;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
  dateField: string | null;
  offsetDays: number | null;
  offsetDirection: string | null;
  conditions: WorkflowCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowAction {
  id: string;
  workflowId: string;
  type: ActionType;
  position: number;
  config: WorkflowActionConfig;
  parentActionId: string | null;
  branchType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: string | number | boolean | null;
}

export interface WorkflowActionConfig {
  // SEND_EMAIL
  templateId?: string;
  subject?: string;
  body?: string;
  toField?: string;
  cc?: string[];
  bcc?: string[];
  // CREATE_TASK
  title?: string;
  description?: string;
  dueInDays?: number;
  assigneeId?: string;
  priority?: string;
  // UPDATE_FIELD
  field?: string;
  value?: string | number | boolean;
  // SEND_WEBHOOK
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
  // ASSIGN_OWNER
  assignmentRuleId?: string;
  userId?: string;
  roundRobin?: boolean;
  // ADD_TAG / REMOVE_TAG
  tagName?: string;
  // CREATE_ACTIVITY
  activityType?: string;
  activityTitle?: string;
  // WAIT_DELAY
  delayMinutes?: number;
  delayHours?: number;
  delayDays?: number;
  // CONDITION_BRANCH
  conditions?: WorkflowCondition[];
  trueActionId?: string;
  falseActionId?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflow?: Workflow;
  triggerType: TriggerType;
  triggeredBy: string | null;
  entityType: string;
  entityId: string;
  status: string;
  actionsExecuted: number;
  actionResults: WorkflowActionResult[];
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface WorkflowActionResult {
  actionId: string;
  actionType: ActionType;
  status: string;
  result?: unknown;
  error?: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  entity: string;
  runOnce?: boolean;
  runOrder?: number;
  triggers: CreateWorkflowTriggerInput[];
  actions: CreateWorkflowActionInput[];
}

export interface CreateWorkflowTriggerInput {
  type: TriggerType;
  field?: string;
  fromValue?: string;
  toValue?: string;
  dateField?: string;
  offsetDays?: number;
  offsetDirection?: string;
  conditions?: WorkflowCondition[];
}

export interface CreateWorkflowActionInput {
  type: ActionType;
  position: number;
  config: WorkflowActionConfig;
  parentActionId?: string;
  branchType?: string;
}

export interface WorkflowFilters {
  entity?: string;
  status?: WorkflowStatus;
  search?: string;
}

// ==================== ASSIGNMENT RULE TYPES ====================

export interface AssignmentRule {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  isActive: boolean;
  priority: number;
  method: AssignmentMethod;
  conditions: WorkflowCondition[];
  assignToUserId: string | null;
  teamId: string | null;
  userIds: string[];
  territoryField: string | null;
  territoryMap: Record<string, string>;
  lastAssignedIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssignmentRuleInput {
  name: string;
  description?: string;
  entity: string;
  isActive?: boolean;
  priority?: number;
  method: AssignmentMethod;
  conditions?: WorkflowCondition[];
  assignToUserId?: string;
  teamId?: string;
  userIds?: string[];
  territoryField?: string;
  territoryMap?: Record<string, string>;
}

// ==================== FOLLOW-UP SEQUENCE TYPES ====================

export interface FollowUpSequence {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  status: SequenceStatus;
  entryCriteria: WorkflowCondition[];
  exitCriteria: WorkflowCondition[];
  steps: FollowUpStep[];
  enrollments?: SequenceEnrollment[];
  totalEnrolled: number;
  totalCompleted: number;
  totalConverted: number;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpStep {
  id: string;
  sequenceId: string;
  position: number;
  name: string;
  delayDays: number;
  delayHours: number;
  actionType: ActionType;
  actionConfig: WorkflowActionConfig;
  skipConditions: WorkflowCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  status: string;
  nextStepAt: Date | null;
  stepsCompleted: number;
  enrolledAt: Date;
  completedAt: Date | null;
  exitedAt: Date | null;
  exitReason: string | null;
}

export interface CreateFollowUpSequenceInput {
  name: string;
  description?: string;
  entity: string;
  entryCriteria?: WorkflowCondition[];
  exitCriteria?: WorkflowCondition[];
  steps: CreateFollowUpStepInput[];
}

export interface CreateFollowUpStepInput {
  position: number;
  name: string;
  delayDays?: number;
  delayHours?: number;
  actionType: ActionType;
  actionConfig: WorkflowActionConfig;
  skipConditions?: WorkflowCondition[];
}

// ==================== SLA POLICY TYPES ====================

export interface SLAPolicy {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  isActive: boolean;
  targetDateField: string;
  conditions: WorkflowCondition[];
  escalations: SLAEscalation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SLAEscalation {
  id: string;
  policyId: string;
  level: number;
  thresholdHours: number;
  thresholdType: string;
  actionType: ActionType;
  actionConfig: WorkflowActionConfig;
  notifyUserIds: string[];
  notifyRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSLAPolicyInput {
  name: string;
  description?: string;
  entity: string;
  isActive?: boolean;
  targetDateField: string;
  conditions?: WorkflowCondition[];
  escalations: CreateSLAEscalationInput[];
}

export interface CreateSLAEscalationInput {
  level: number;
  thresholdHours: number;
  thresholdType: string;
  actionType: ActionType;
  actionConfig: WorkflowActionConfig;
  notifyUserIds?: string[];
  notifyRoles?: string[];
}

// ==================== LEAD SCORING TYPES ====================

export interface LeadScoringModel {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  qualifiedThreshold: number;
  customerThreshold: number;
  rules: ScoringRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoringRule {
  id: string;
  modelId: string;
  name: string;
  description: string | null;
  eventType: ScoringEventType;
  isActive: boolean;
  points: number;
  decayDays: number | null;
  decayPoints: number | null;
  conditions: WorkflowCondition[];
  maxOccurrences: number | null;
  cooldownHours: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadScoreHistory {
  id: string;
  contactId: string;
  previousScore: number;
  newScore: number;
  pointsChange: number;
  eventType: ScoringEventType;
  eventDescription: string | null;
  ruleId: string | null;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: Date;
}

export interface CreateLeadScoringModelInput {
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  qualifiedThreshold?: number;
  customerThreshold?: number;
  rules?: CreateScoringRuleInput[];
}

export interface CreateScoringRuleInput {
  name: string;
  description?: string;
  eventType: ScoringEventType;
  isActive?: boolean;
  points: number;
  decayDays?: number;
  decayPoints?: number;
  conditions?: WorkflowCondition[];
  maxOccurrences?: number;
  cooldownHours?: number;
}

// ==================== LEAD SOURCE & MARKETING CAMPAIGN TYPES ====================

export interface LeadSource {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  costPerLead: number | null;
  isTrackable: boolean;
  totalLeads: number;
  totalConverted: number;
  totalRevenue: number;
  campaigns?: MarketingCampaign[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  description: string | null;
  type: MarketingCampaignType;
  status: MarketingCampaignStatus;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  actualCost: number | null;
  trackingCode: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  sourceId: string | null;
  source?: LeadSource;
  targetLeads: number | null;
  targetConversions: number | null;
  targetRevenue: number | null;
  totalLeads: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number | null;
  roi: number | null;
  contacts?: CampaignContact[];
  _count?: { contacts: number };
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignContact {
  id: string;
  campaignId: string;
  campaign?: MarketingCampaign;
  contactId: string;
  contact?: Contact;
  firstTouchAt: Date;
  lastTouchAt: Date;
  touchCount: number;
  converted: boolean;
  convertedAt: Date | null;
  convertedDealId: string | null;
  emailsOpened: number;
  emailsClicked: number;
  pagesVisited: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadSourceInput {
  name: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  costPerLead?: number;
  isTrackable?: boolean;
}

export interface CreateMarketingCampaignInput {
  name: string;
  description?: string;
  type: MarketingCampaignType;
  status?: MarketingCampaignStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  trackingCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  sourceId?: string;
  targetLeads?: number;
  targetConversions?: number;
  targetRevenue?: number;
}

// ==================== CUSTOM FIELDS TYPES ====================

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  description: string | null;
  entity: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  showInList: boolean;
  position: number;
  defaultValue: unknown;
  options: CustomFieldOption[] | null;
  lookupEntity: string | null;
  lookupDisplayField: string | null;
  formula: string | null;
  validation: CustomFieldValidation | null;
  viewRoles: string[];
  editRoles: string[];
  groupName: string | null;
  groupPosition: number;
  isActive: boolean;
  isSystem: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface CustomFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export interface CustomFieldValue {
  id: string;
  fieldId: string;
  field?: CustomFieldDefinition;
  entityType: string;
  entityId: string;
  textValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
  dateValue: Date | null;
  jsonValue: unknown;
  computedValue: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldGroup {
  id: string;
  name: string;
  label: string;
  description: string | null;
  entity: string;
  position: number;
  isCollapsible: boolean;
  isCollapsed: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomFieldDefinitionInput {
  name: string;
  label: string;
  description?: string;
  entity: string;
  fieldType: CustomFieldType;
  isRequired?: boolean;
  isUnique?: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
  showInList?: boolean;
  position?: number;
  defaultValue?: unknown;
  options?: CustomFieldOption[];
  lookupEntity?: string;
  lookupDisplayField?: string;
  formula?: string;
  validation?: CustomFieldValidation;
  viewRoles?: string[];
  editRoles?: string[];
  groupName?: string;
  groupPosition?: number;
}

export interface UpdateCustomFieldDefinitionInput {
  label?: string;
  description?: string;
  isRequired?: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
  showInList?: boolean;
  position?: number;
  defaultValue?: unknown;
  options?: CustomFieldOption[];
  validation?: CustomFieldValidation;
  viewRoles?: string[];
  editRoles?: string[];
  groupName?: string;
  groupPosition?: number;
  isActive?: boolean;
}

export interface CreateCustomFieldGroupInput {
  name: string;
  label: string;
  description?: string;
  entity: string;
  position?: number;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
}

export interface SetCustomFieldValueInput {
  fieldId: string;
  entityType: string;
  entityId: string;
  value: unknown;
}

export interface CustomFieldFilters {
  entity?: string;
  fieldType?: CustomFieldType;
  isActive?: boolean;
  groupName?: string;
  search?: string;
}

// Helper type for entity custom field values
export interface EntityCustomFields {
  [fieldName: string]: unknown;
}

// ==================== RBAC TYPES ====================

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: RoleType;
  isActive: boolean;
  level: number;
  parentId: string | null;
  parent?: Role;
  children?: Role[];
  permissions?: RolePermission[];
  fieldPermissions?: FieldPermission[];
  userRoles?: UserRoleAssignment[];
  _count?: {
    permissions: number;
    userRoles: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  id: string;
  roleId: string;
  role?: Role;
  entity: string;
  action: PermissionAction;
  recordAccess: RecordAccess;
  conditions: WorkflowCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldPermission {
  id: string;
  roleId: string;
  role?: Role;
  entity: string;
  fieldName: string;
  canView: boolean;
  canEdit: boolean;
  maskValue: boolean;
  maskPattern: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  role?: Role;
  teamId: string | null;
  startsAt: Date;
  expiresAt: Date | null;
  assignedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSharingRule {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  isActive: boolean;
  shareConditions: WorkflowCondition[];
  shareWithType: string;
  shareWithId: string | null;
  accessLevel: RecordAccess;
  actions: PermissionAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Territory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parentId: string | null;
  parent?: Territory;
  children?: Territory[];
  level: number;
  criteria: TerritoryCriteria;
  isActive: boolean;
  assignments?: TerritoryAssignment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TerritoryCriteria {
  country?: string[];
  state?: string[];
  zip?: string[];
  industry?: string[];
}

export interface TerritoryAssignment {
  id: string;
  territoryId: string;
  territory?: Territory;
  userId: string;
  isPrimary: boolean;
  canManage: boolean;
  assignedAt: Date;
  assignedById: string | null;
}

export interface CreateRoleInput {
  name: string;
  displayName: string;
  description?: string;
  level?: number;
  parentId?: string;
  permissions?: CreateRolePermissionInput[];
  fieldPermissions?: CreateFieldPermissionInput[];
}

export interface CreateRolePermissionInput {
  entity: string;
  action: PermissionAction;
  recordAccess?: RecordAccess;
  conditions?: WorkflowCondition[];
}

export interface CreateFieldPermissionInput {
  entity: string;
  fieldName: string;
  canView?: boolean;
  canEdit?: boolean;
  maskValue?: boolean;
  maskPattern?: string;
}

export interface CreateDataSharingRuleInput {
  name: string;
  description?: string;
  entity: string;
  isActive?: boolean;
  shareConditions?: WorkflowCondition[];
  shareWithType: string;
  shareWithId?: string;
  accessLevel?: RecordAccess;
  actions?: PermissionAction[];
}

export interface CreateTerritoryInput {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  criteria?: TerritoryCriteria;
}

export interface RoleFilters {
  type?: RoleType;
  isActive?: boolean;
  search?: string;
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  recordAccess?: RecordAccess;
  fieldPermissions?: Record<string, { canView: boolean; canEdit: boolean; maskValue: boolean }>;
}

// ==================== Audit & Compliance Types ====================

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT"
  | "VIEW"
  | "SHARE";

export interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[];
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface LoginHistory {
  id: string;
  userId: string;
  email: string;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  sessionId: string | null;
  sessionDuration: number | null;
  createdAt: Date;
}

export interface FieldHistory {
  id: string;
  entity: string;
  entityId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  valueType: string;
  userId: string | null;
  userName: string | null;
  changeReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  userEmail: string;
  exportType: string;
  entity: string | null;
  filters: Record<string, unknown> | null;
  status: "pending" | "processing" | "completed" | "failed" | "expired";
  progress: number;
  error: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  expiresAt: Date | null;
  requestedAt: Date;
  completedAt: Date | null;
  downloadedAt: Date | null;
  ipAddress: string | null;
}

export interface DeletedRecord {
  id: string;
  entity: string;
  entityId: string;
  recordData: Record<string, unknown>;
  deletedById: string | null;
  deletedByName: string | null;
  deletedAt: Date;
  recoverable: boolean;
  recoveredAt: Date | null;
  recoveredById: string | null;
  purgeAfter: Date | null;
}

export interface AuditLogFilters {
  entity?: string;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

export interface LoginHistoryFilters {
  userId?: string;
  email?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

export interface CreateAuditLogInput {
  entity: string;
  entityId: string;
  action: AuditAction;
  userId?: string;
  userName?: string;
  userEmail?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateFieldHistoryInput {
  entity: string;
  entityId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  valueType?: string;
  userId?: string;
  userName?: string;
  changeReason?: string;
  metadata?: Record<string, unknown>;
}

// ==================== Notifications & Alerts Types ====================

export type NotificationType =
  | "DEAL_STAGE_CHANGE"
  | "TASK_ASSIGNED"
  | "TASK_DUE_SOON"
  | "TASK_OVERDUE"
  | "MENTION"
  | "QUOTE_STATUS_CHANGE"
  | "CALL_REMINDER"
  | "LEAD_SCORE_CHANGE"
  | "WORKFLOW_TRIGGERED"
  | "SYSTEM";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type NotificationChannel = "IN_APP" | "EMAIL" | "BOTH";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
  fromUserId: string | null;
  fromUserName: string | null;
  isRead: boolean;
  readAt: Date | null;
  isArchived: boolean;
  emailSent: boolean;
  emailSentAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: NotificationType;
  inApp: boolean;
  email: boolean;
  emailDigest: boolean;
  emailImmediate: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietTimezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  scheduledFor: Date;
  sent: boolean;
  sentAt: Date | null;
  repeatInterval: string | null;
  repeatUntil: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface Mention {
  id: string;
  mentionedUserId: string;
  mentionedById: string;
  mentionedByName: string | null;
  entityType: string;
  entityId: string;
  contextText: string | null;
  notified: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  isArchived?: boolean;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  link?: string;
  fromUserId?: string;
  fromUserName?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

// ==================== Advanced Search & Saved Views Types ====================

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  entity: string;
  filters: FilterCondition[];
  filterLogic: "AND" | "OR";
  sortField: string | null;
  sortDirection: string | null;
  columns: string[];
  isDefault: boolean;
  isShared: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "in"
  | "not_in"
  | "is_empty"
  | "is_not_empty"
  | "between";

export interface RecentlyViewed {
  id: string;
  userId: string;
  entity: string;
  entityId: string;
  entityName: string | null;
  viewedAt: Date;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  entity: string | null;
  resultsCount: number;
  searchedAt: Date;
}

export interface BulkAction {
  id: string;
  userId: string;
  action: string;
  entity: string;
  recordIds: string[];
  recordCount: number;
  actionData: Record<string, unknown> | null;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface GlobalSearchResult {
  entity: string;
  id: string;
  title: string;
  subtitle: string | null;
  score: number;
  highlights: Record<string, string[]>;
}

export interface SearchFilters {
  entity?: string;
  filters?: FilterCondition[];
  filterLogic?: "AND" | "OR";
  sortField?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateSavedViewInput {
  userId: string;
  name: string;
  description?: string;
  entity: string;
  filters: FilterCondition[];
  filterLogic?: "AND" | "OR";
  sortField?: string;
  sortDirection?: string;
  columns?: string[];
  isDefault?: boolean;
  isShared?: boolean;
}

export interface BulkActionInput {
  userId: string;
  action: "update" | "delete" | "email" | "export";
  entity: string;
  recordIds: string[];
  actionData?: Record<string, unknown>;
}

// ==================== DOCUMENT MANAGEMENT TYPES ====================

export type DocumentStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type FileType = "PDF" | "IMAGE" | "DOCUMENT" | "SPREADSHEET" | "PRESENTATION" | "VIDEO" | "AUDIO" | "OTHER";

export interface Document {
  id: string;
  name: string;
  description: string | null;
  filename: string;
  mimeType: string;
  size: number;
  fileType: FileType;
  storageKey: string;
  storageProvider: string;
  url: string | null;
  entityType: string;
  entityId: string;
  status: DocumentStatus;
  tags: string[];
  metadata: Record<string, unknown> | null;
  currentVersion: number;
  versions?: DocumentVersion[];
  uploadedById: string;
  uploadedBy?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  document?: Document;
  version: number;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  url: string | null;
  changeNote: string | null;
  uploadedById: string;
  createdAt: Date;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  format: string;
  mergeFields: MergeField[] | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdById: string;
  createdBy?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface MergeField {
  name: string;
  path: string;
  type: string;
  description?: string;
}

export interface GeneratedDocument {
  id: string;
  templateId: string | null;
  name: string;
  content: string;
  format: string;
  pdfStorageKey: string | null;
  pdfUrl: string | null;
  entityType: string;
  entityId: string;
  mergeData: Record<string, unknown> | null;
  status: string;
  sentAt: Date | null;
  signedAt: Date | null;
  expiresAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentFolder {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parent?: DocumentFolder;
  children?: DocumentFolder[];
  isPrivate: boolean;
  ownerId: string;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadDocumentInput {
  name: string;
  description?: string;
  entityType: string;
  entityId: string;
  tags?: string[];
  folderId?: string;
}

export interface CreateDocumentTemplateInput {
  name: string;
  description?: string;
  category: string;
  content: string;
  format?: string;
  mergeFields?: MergeField[];
  isActive?: boolean;
  isDefault?: boolean;
}

export interface GenerateDocumentInput {
  templateId: string;
  name: string;
  entityType: string;
  entityId: string;
  mergeData?: Record<string, unknown>;
}

export interface DocumentFilters {
  entityType?: string;
  entityId?: string;
  fileType?: FileType;
  status?: DocumentStatus;
  uploadedById?: string;
  search?: string;
  tags?: string[];
}

// ==================== API & INTEGRATIONS TYPES ====================

export type ApiScope = "read" | "write" | "delete" | "admin";

export interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: ApiScope[];
  allowedIps: string[];
  rateLimit: number;
  rateLimitWindow: number;
  lastUsedAt: Date | null;
  usageCount: number;
  isActive: boolean;
  expiresAt: Date | null;
  userId: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyInput {
  name: string;
  description?: string;
  scopes?: ApiScope[];
  allowedIps?: string[];
  rateLimit?: number;
  expiresAt?: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // The actual API key (shown only once)
}

export interface Webhook {
  id: string;
  name: string;
  description: string | null;
  url: string;
  events: string[];
  secret: string | null;
  headers: Record<string, string> | null;
  isActive: boolean;
  isPaused: boolean;
  maxRetries: number;
  retryDelay: number;
  failureCount: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
  userId: string;
  organizationId: string | null;
  deliveryLogs?: WebhookDeliveryLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: "pending" | "success" | "failed";
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  sentAt: Date | null;
  responseTime: number | null;
  retryCount: number;
  nextRetryAt: Date | null;
  createdAt: Date;
}

export interface CreateWebhookInput {
  name: string;
  description?: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

export type WebhookEvent =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "company.created"
  | "company.updated"
  | "company.deleted"
  | "deal.created"
  | "deal.updated"
  | "deal.deleted"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "quote.created"
  | "quote.updated"
  | "quote.sent"
  | "quote.accepted"
  | "quote.declined"
  | "task.created"
  | "task.updated"
  | "task.completed";

export interface OAuthApplication {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  clientId: string;
  redirectUris: string[];
  scopes: ApiScope[];
  grantTypes: string[];
  isActive: boolean;
  isPublic: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOAuthApplicationInput {
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  redirectUris: string[];
  scopes?: ApiScope[];
  grantTypes?: string[];
  isPublic?: boolean;
}

export interface OAuthApplicationWithSecret extends OAuthApplication {
  clientSecret: string; // Shown only once
}

export interface Integration {
  id: string;
  name: string;
  provider: "zapier" | "make" | "n8n" | "custom";
  description: string | null;
  config: Record<string, unknown> | null;
  isActive: boolean;
  isConnected: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSyncLog {
  id: string;
  integrationId: string;
  direction: "inbound" | "outbound";
  entity: string;
  action: "create" | "update" | "delete";
  recordId: string | null;
  status: "success" | "failed" | "skipped";
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ApiRequestContext {
  apiKeyId?: string;
  userId?: string;
  scopes: ApiScope[];
  rateLimit: number;
  rateLimitWindow: number;
}
