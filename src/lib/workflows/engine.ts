import { prisma } from "@/lib/prisma";
import {
  WorkflowStatus,
  TriggerType,
  ActionType,
  Priority,
  TaskStatus,
  ActivityType,
} from "@prisma/client";

interface ExecutionContext {
  entityType: string;
  entityId: string;
  entity: Record<string, unknown>;
  previousValues?: Record<string, unknown>;
  userId?: string;
}

interface ActionResult {
  actionId: string;
  actionType: ActionType;
  status: "success" | "failed" | "skipped";
  result?: unknown;
  error?: string;
}

// Check if a workflow should be triggered
export async function checkWorkflowTriggers(
  triggerType: TriggerType,
  context: ExecutionContext
): Promise<void> {
  try {
    // Find active workflows for this entity and trigger type
    const workflows = await prisma.workflow.findMany({
      where: {
        entity: context.entityType,
        status: WorkflowStatus.ACTIVE,
        triggers: {
          some: {
            type: triggerType,
          },
        },
      },
      include: {
        triggers: true,
        actions: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { runOrder: "asc" },
    });

    for (const workflow of workflows) {
      // Check if workflow should run (runOnce check)
      if (workflow.runOnce) {
        const previousExecution = await prisma.workflowExecution.findFirst({
          where: {
            workflowId: workflow.id,
            entityType: context.entityType,
            entityId: context.entityId,
            status: "completed",
          },
        });
        if (previousExecution) continue;
      }

      // Check if trigger conditions are met
      const shouldTrigger = await evaluateTriggers(
        workflow.triggers,
        triggerType,
        context
      );

      if (shouldTrigger) {
        // Execute workflow asynchronously
        executeWorkflow(workflow.id, triggerType, context).catch(console.error);
      }
    }
  } catch (error) {
    console.error("Error checking workflow triggers:", error);
  }
}

// Evaluate if trigger conditions are met
async function evaluateTriggers(
  triggers: Array<{
    type: TriggerType;
    field: string | null;
    fromValue: string | null;
    toValue: string | null;
    conditions: unknown;
  }>,
  triggerType: TriggerType,
  context: ExecutionContext
): Promise<boolean> {
  const relevantTriggers = triggers.filter((t) => t.type === triggerType);

  for (const trigger of relevantTriggers) {
    // For field changed triggers, check specific field conditions
    if (triggerType === TriggerType.FIELD_CHANGED && trigger.field) {
      const currentValue = String(context.entity[trigger.field] ?? "");
      const previousValue = String(context.previousValues?.[trigger.field] ?? "");

      if (currentValue === previousValue) continue;

      if (trigger.fromValue && previousValue !== trigger.fromValue) continue;
      if (trigger.toValue && currentValue !== trigger.toValue) continue;
    }

    // For stage changed triggers (specific to deals)
    if (triggerType === TriggerType.STAGE_CHANGED) {
      if (context.entityType !== "deals") continue;

      const currentStage = String(context.entity.stage || context.entity.stageId || "");
      const previousStage = String(context.previousValues?.stage || context.previousValues?.stageId || "");

      if (currentStage === previousStage) continue;

      if (trigger.toValue && currentStage !== trigger.toValue) continue;
    }

    // Evaluate additional conditions
    const conditions = (trigger.conditions || []) as Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;

    if (conditions.length > 0) {
      const conditionsMet = evaluateConditions(conditions, context.entity);
      if (!conditionsMet) continue;
    }

    // If we reach here, trigger conditions are met
    return true;
  }

  return false;
}

// Evaluate filter conditions against an entity
export function evaluateConditions(
  conditions: Array<{ field: string; operator: string; value: unknown }>,
  entity: Record<string, unknown>
): boolean {
  for (const condition of conditions) {
    const fieldValue = entity[condition.field];
    const compareValue = condition.value;

    switch (condition.operator) {
      case "equals":
        if (fieldValue !== compareValue) return false;
        break;
      case "not_equals":
        if (fieldValue === compareValue) return false;
        break;
      case "contains":
        if (!String(fieldValue || "").toLowerCase().includes(String(compareValue || "").toLowerCase())) return false;
        break;
      case "not_contains":
        if (String(fieldValue || "").toLowerCase().includes(String(compareValue || "").toLowerCase())) return false;
        break;
      case "starts_with":
        if (!String(fieldValue || "").toLowerCase().startsWith(String(compareValue || "").toLowerCase())) return false;
        break;
      case "ends_with":
        if (!String(fieldValue || "").toLowerCase().endsWith(String(compareValue || "").toLowerCase())) return false;
        break;
      case "greater_than":
        if (Number(fieldValue) <= Number(compareValue)) return false;
        break;
      case "less_than":
        if (Number(fieldValue) >= Number(compareValue)) return false;
        break;
      case "greater_than_or_equals":
        if (Number(fieldValue) < Number(compareValue)) return false;
        break;
      case "less_than_or_equals":
        if (Number(fieldValue) > Number(compareValue)) return false;
        break;
      case "is_empty":
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== "") return false;
        break;
      case "is_not_empty":
        if (fieldValue === null || fieldValue === undefined || fieldValue === "") return false;
        break;
      case "in":
        if (!Array.isArray(compareValue) || !compareValue.includes(fieldValue)) return false;
        break;
      case "not_in":
        if (Array.isArray(compareValue) && compareValue.includes(fieldValue)) return false;
        break;
    }
  }

  return true;
}

// Execute a workflow
export async function executeWorkflow(
  workflowId: string,
  triggerType: TriggerType,
  context: ExecutionContext,
  triggeredBy?: string
): Promise<string> {
  // Create execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      triggerType,
      triggeredBy,
      entityType: context.entityType,
      entityId: context.entityId,
      status: "running",
    },
  });

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        actions: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const actionResults: ActionResult[] = [];
    let actionsExecuted = 0;

    // Execute actions in order
    for (const action of workflow.actions) {
      // Skip branch actions that are children of condition actions
      if (action.parentActionId) continue;

      const result = await executeAction(action, context);
      actionResults.push(result);

      if (result.status === "success") {
        actionsExecuted++;
      } else if (result.status === "failed") {
        // Stop execution on failure
        break;
      }
    }

    // Update execution record
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        actionsExecuted,
        actionResults: JSON.parse(JSON.stringify(actionResults)),
        completedAt: new Date(),
      },
    });

    // Update workflow stats
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        totalExecutions: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });

    return execution.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

// Execute a single action
async function executeAction(
  action: {
    id: string;
    type: ActionType;
    config: unknown;
    workflowId: string;
  },
  context: ExecutionContext
): Promise<ActionResult> {
  const config = (action.config || {}) as Record<string, unknown>;

  try {
    switch (action.type) {
      case ActionType.SEND_EMAIL:
        // Log email to be sent (actual sending would require email service)
        const recipientEmail = getFieldValue(context.entity, String(config.toField || "email"));
        await prisma.emailLog.create({
          data: {
            subject: processTemplate(String(config.subject || "Workflow Email"), context.entity),
            body: processTemplate(String(config.body || ""), context.entity),
            fromEmail: "workflow@system.local",
            toEmails: recipientEmail ? [recipientEmail] : [],
            source: "workflow",
            sentAt: new Date(),
            contactId: context.entityType === "contacts" ? context.entityId : null,
            dealId: context.entityType === "deals" ? context.entityId : null,
          },
        });
        return { actionId: action.id, actionType: action.type, status: "success" };

      case ActionType.CREATE_TASK:
        const dueDate = config.dueInDays
          ? new Date(Date.now() + Number(config.dueInDays) * 24 * 60 * 60 * 1000)
          : null;

        await prisma.task.create({
          data: {
            title: processTemplate(String(config.title || "Workflow Task"), context.entity),
            description: config.description
              ? processTemplate(String(config.description), context.entity)
              : null,
            priority: (config.priority as Priority) || Priority.MEDIUM,
            status: TaskStatus.TODO,
            assigneeId: String(config.assigneeId || context.userId || "system"),
            dueDate,
            relatedType: context.entityType,
            relatedId: context.entityId,
          },
        });
        return { actionId: action.id, actionType: action.type, status: "success" };

      case ActionType.UPDATE_FIELD:
        const field = String(config.field);
        const value = config.value;

        await updateEntityField(context.entityType, context.entityId, field, value);
        return { actionId: action.id, actionType: action.type, status: "success" };

      case ActionType.SEND_WEBHOOK:
        // Send webhook (fire and forget)
        const webhookUrl = String(config.url);
        const method = String(config.method || "POST");
        const headers = (config.headers || {}) as Record<string, string>;
        const body = config.bodyTemplate
          ? processTemplate(String(config.bodyTemplate), context.entity)
          : JSON.stringify(context.entity);

        fetch(webhookUrl, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body,
        }).catch(console.error);

        return { actionId: action.id, actionType: action.type, status: "success" };

      case ActionType.ASSIGN_OWNER:
        const ownerId = await getAssignedOwner(config, context);
        if (ownerId) {
          await updateEntityField(context.entityType, context.entityId, "ownerId", ownerId);
        }
        return { actionId: action.id, actionType: action.type, status: "success", result: { ownerId } };

      case ActionType.ADD_TAG:
        if (context.entityType === "contacts" && config.tagName) {
          const tag = await prisma.tag.upsert({
            where: { name: String(config.tagName) },
            update: {},
            create: { name: String(config.tagName) },
          });
          await prisma.contact.update({
            where: { id: context.entityId },
            data: { tags: { connect: { id: tag.id } } },
          });
        }
        return { actionId: action.id, actionType: action.type, status: "success" };

      case ActionType.REMOVE_TAG:
        if (context.entityType === "contacts" && config.tagName) {
          const tag = await prisma.tag.findUnique({ where: { name: String(config.tagName) } });
          if (tag) {
            await prisma.contact.update({
              where: { id: context.entityId },
              data: { tags: { disconnect: { id: tag.id } } },
            });
          }
        }
        return { actionId: action.id, actionType: action.type, status: "success" };

      case ActionType.CREATE_ACTIVITY:
        await prisma.activity.create({
          data: {
            type: (config.activityType as ActivityType) || ActivityType.NOTE,
            title: processTemplate(String(config.activityTitle || "Workflow Activity"), context.entity),
            description: config.description
              ? processTemplate(String(config.description), context.entity)
              : null,
            userId: context.userId || "system",
            contactId: context.entityType === "contacts" ? context.entityId : null,
            dealId: context.entityType === "deals" ? context.entityId : null,
          },
        });
        return { actionId: action.id, actionType: action.type, status: "success" };

      case ActionType.WAIT_DELAY:
        // In a real implementation, this would schedule the next action
        // For now, we just skip it
        return { actionId: action.id, actionType: action.type, status: "skipped" };

      case ActionType.CONDITION_BRANCH:
        // Evaluate conditions and execute appropriate branch
        const conditions = (config.conditions || []) as Array<{
          field: string;
          operator: string;
          value: unknown;
        }>;
        const conditionsMet = evaluateConditions(conditions, context.entity);

        // In a full implementation, we would execute the appropriate branch actions
        return {
          actionId: action.id,
          actionType: action.type,
          status: "success",
          result: { conditionsMet },
        };

      default:
        return { actionId: action.id, actionType: action.type, status: "skipped" };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { actionId: action.id, actionType: action.type, status: "failed", error: errorMessage };
  }
}

// Process template strings with entity data
function processTemplate(template: string, entity: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)(?:\.(\w+))?\}\}/g, (match, obj, field) => {
    if (field) {
      // Handle nested like {{contact.firstName}}
      const nestedObj = entity[obj] as Record<string, unknown> | undefined;
      return String(nestedObj?.[field] ?? match);
    }
    return String(entity[obj] ?? match);
  });
}

// Get field value from entity (supports dot notation)
function getFieldValue(entity: Record<string, unknown>, fieldPath: string): string {
  const parts = fieldPath.split(".");
  let value: unknown = entity;

  for (const part of parts) {
    if (value && typeof value === "object") {
      value = (value as Record<string, unknown>)[part];
    } else {
      return "";
    }
  }

  return String(value ?? "");
}

// Update a field on an entity
async function updateEntityField(
  entityType: string,
  entityId: string,
  field: string,
  value: unknown
): Promise<void> {
  const data = { [field]: value };

  switch (entityType) {
    case "contacts":
      await prisma.contact.update({ where: { id: entityId }, data });
      break;
    case "deals":
      await prisma.deal.update({ where: { id: entityId }, data });
      break;
    case "companies":
      await prisma.company.update({ where: { id: entityId }, data });
      break;
    case "tasks":
      await prisma.task.update({ where: { id: entityId }, data });
      break;
  }
}

// Get assigned owner based on assignment rule
async function getAssignedOwner(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<string | null> {
  // If specific user is configured
  if (config.userId) {
    return String(config.userId);
  }

  // If assignment rule is configured
  if (config.assignmentRuleId) {
    const rule = await prisma.assignmentRule.findUnique({
      where: { id: String(config.assignmentRuleId) },
    });

    if (rule && rule.isActive) {
      return applyAssignmentRule(rule, context);
    }
  }

  // If round robin is enabled with userIds
  if (config.roundRobin && Array.isArray(config.userIds) && config.userIds.length > 0) {
    // Simple round robin - would need state tracking for production
    const randomIndex = Math.floor(Math.random() * config.userIds.length);
    return String(config.userIds[randomIndex]);
  }

  return null;
}

// Apply an assignment rule to get the owner
async function applyAssignmentRule(
  rule: {
    id: string;
    method: string;
    assignToUserId: string | null;
    teamId: string | null;
    userIds: string[];
    territoryField: string | null;
    territoryMap: unknown;
    lastAssignedIndex: number;
  },
  context: ExecutionContext
): Promise<string | null> {
  switch (rule.method) {
    case "SPECIFIC_USER":
      return rule.assignToUserId;

    case "ROUND_ROBIN": {
      let userPool = rule.userIds;

      // If team is specified, get team members
      if (rule.teamId && userPool.length === 0) {
        const team = await prisma.team.findUnique({
          where: { id: rule.teamId },
          include: { members: true },
        });
        userPool = team?.members.map((m) => m.id) || [];
      }

      if (userPool.length === 0) return null;

      // Round robin assignment
      const nextIndex = (rule.lastAssignedIndex + 1) % userPool.length;
      await prisma.assignmentRule.update({
        where: { id: rule.id },
        data: { lastAssignedIndex: nextIndex },
      });

      return userPool[nextIndex];
    }

    case "TERRITORY": {
      if (!rule.territoryField) return null;

      const territoryValue = String(context.entity[rule.territoryField] || "");
      const territoryMap = (rule.territoryMap || {}) as Record<string, string>;

      return territoryMap[territoryValue] || null;
    }

    case "LOAD_BALANCED": {
      let userPool = rule.userIds;

      if (rule.teamId && userPool.length === 0) {
        const team = await prisma.team.findUnique({
          where: { id: rule.teamId },
          include: { members: true },
        });
        userPool = team?.members.map((m) => m.id) || [];
      }

      if (userPool.length === 0) return null;

      // Find user with least assigned records
      const entityModel = context.entityType === "contacts" ? "contact" : "deal";
      const counts = await Promise.all(
        userPool.map(async (userId) => {
          const count =
            entityModel === "contact"
              ? await prisma.contact.count({ where: { ownerId: userId } })
              : await prisma.deal.count({ where: { ownerId: userId } });
          return { userId, count };
        })
      );

      counts.sort((a, b) => a.count - b.count);
      return counts[0]?.userId || null;
    }

    default:
      return null;
  }
}
