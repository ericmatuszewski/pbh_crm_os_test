"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Plus,
  Trash2,
  GripVertical,
  ArrowDown,
  Mail,
  CheckSquare,
  Edit3,
  Webhook,
  UserPlus,
  Tag,
  Clock,
  GitBranch,
  Activity,
  Save,
  Play,
} from "lucide-react";

// Trigger types matching the Prisma enum
const TRIGGER_TYPES = [
  { value: "RECORD_CREATED", label: "Record Created", icon: Plus },
  { value: "FIELD_CHANGED", label: "Field Changed", icon: Edit3 },
  { value: "STAGE_CHANGED", label: "Deal Stage Changed", icon: ArrowDown },
  { value: "DATE_BASED", label: "Date-Based", icon: Clock },
] as const;

// Action types matching the Prisma enum
const ACTION_TYPES = [
  { value: "SEND_EMAIL", label: "Send Email", icon: Mail },
  { value: "CREATE_TASK", label: "Create Task", icon: CheckSquare },
  { value: "UPDATE_FIELD", label: "Update Field", icon: Edit3 },
  { value: "SEND_WEBHOOK", label: "Send Webhook", icon: Webhook },
  { value: "ASSIGN_OWNER", label: "Assign Owner", icon: UserPlus },
  { value: "ADD_TAG", label: "Add Tag", icon: Tag },
  { value: "REMOVE_TAG", label: "Remove Tag", icon: Tag },
  { value: "CREATE_ACTIVITY", label: "Create Activity", icon: Activity },
  { value: "WAIT_DELAY", label: "Wait / Delay", icon: Clock },
  { value: "CONDITION_BRANCH", label: "Condition Branch", icon: GitBranch },
] as const;

// Entity types
const ENTITY_TYPES = [
  { value: "contacts", label: "Contacts" },
  { value: "deals", label: "Deals" },
  { value: "companies", label: "Companies" },
] as const;

// Condition operators
const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
] as const;

interface Trigger {
  id: string;
  type: string;
  field?: string;
  fromValue?: string;
  toValue?: string;
  conditions: Condition[];
}

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
}

interface WorkflowData {
  name: string;
  description: string;
  entity: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED";
  runOnce: boolean;
  triggers: Trigger[];
  actions: Action[];
}

// Exported types for use in other components
export type { Trigger, Action, WorkflowData };

interface WorkflowBuilderProps {
  initialData?: Record<string, unknown>;
  onSave: (data: WorkflowData) => Promise<void>;
  onCancel: () => void;
}

export function WorkflowBuilder({
  initialData,
  onSave,
  onCancel,
}: WorkflowBuilderProps) {
  // Convert initial data to full types
  const convertTriggers = (triggers?: unknown[]): Trigger[] => {
    if (!triggers || !Array.isArray(triggers)) return [];
    return triggers.map((t, index) => {
      const trigger = t as Partial<Trigger>;
      return {
        id: trigger.id || `trigger-${index}`,
        type: trigger.type || "RECORD_CREATED",
        field: trigger.field,
        fromValue: trigger.fromValue,
        toValue: trigger.toValue,
        conditions: trigger.conditions || [],
      };
    });
  };

  const convertActions = (actions?: unknown[]): Action[] => {
    if (!actions || !Array.isArray(actions)) return [];
    return actions.map((a, index) => {
      const action = a as Partial<Action>;
      return {
        id: action.id || `action-${index}`,
        type: action.type || "SEND_EMAIL",
        position: action.position ?? index,
        config: action.config || {},
      };
    });
  };

  const [workflow, setWorkflow] = useState<WorkflowData>({
    name: String(initialData?.name || ""),
    description: String(initialData?.description || ""),
    entity: String(initialData?.entity || "contacts"),
    status: (initialData?.status as "DRAFT" | "ACTIVE" | "PAUSED") || "DRAFT",
    runOnce: Boolean(initialData?.runOnce),
    triggers: convertTriggers(initialData?.triggers as unknown[]),
    actions: convertActions(initialData?.actions as unknown[]),
  });

  const [isSaving, setIsSaving] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Trigger management
  const addTrigger = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      triggers: [
        ...prev.triggers,
        {
          id: generateId(),
          type: "RECORD_CREATED",
          conditions: [],
        },
      ],
    }));
  }, []);

  const updateTrigger = useCallback((id: string, updates: Partial<Trigger>) => {
    setWorkflow((prev) => ({
      ...prev,
      triggers: prev.triggers.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  }, []);

  const removeTrigger = useCallback((id: string) => {
    setWorkflow((prev) => ({
      ...prev,
      triggers: prev.triggers.filter((t) => t.id !== id),
    }));
  }, []);

  // Action management
  const addAction = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          id: generateId(),
          type: "SEND_EMAIL",
          position: prev.actions.length,
          config: {},
        },
      ],
    }));
  }, []);

  const updateAction = useCallback((id: string, updates: Partial<Action>) => {
    setWorkflow((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  }, []);

  const removeAction = useCallback((id: string) => {
    setWorkflow((prev) => ({
      ...prev,
      actions: prev.actions
        .filter((a) => a.id !== id)
        .map((a, i) => ({ ...a, position: i })),
    }));
  }, []);

  const moveAction = useCallback((id: string, direction: "up" | "down") => {
    setWorkflow((prev) => {
      const index = prev.actions.findIndex((a) => a.id === id);
      if (
        (direction === "up" && index === 0) ||
        (direction === "down" && index === prev.actions.length - 1)
      ) {
        return prev;
      }

      const newActions = [...prev.actions];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      [newActions[index], newActions[newIndex]] = [
        newActions[newIndex],
        newActions[index],
      ];

      return {
        ...prev,
        actions: newActions.map((a, i) => ({ ...a, position: i })),
      };
    });
  }, []);

  // Condition management
  const addCondition = useCallback((triggerId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      triggers: prev.triggers.map((t) =>
        t.id === triggerId
          ? {
              ...t,
              conditions: [
                ...t.conditions,
                { field: "", operator: "equals", value: "" },
              ],
            }
          : t
      ),
    }));
  }, []);

  const updateCondition = useCallback(
    (triggerId: string, index: number, updates: Partial<Condition>) => {
      setWorkflow((prev) => ({
        ...prev,
        triggers: prev.triggers.map((t) =>
          t.id === triggerId
            ? {
                ...t,
                conditions: t.conditions.map((c, i) =>
                  i === index ? { ...c, ...updates } : c
                ),
              }
            : t
        ),
      }));
    },
    []
  );

  const removeCondition = useCallback((triggerId: string, index: number) => {
    setWorkflow((prev) => ({
      ...prev,
      triggers: prev.triggers.map((t) =>
        t.id === triggerId
          ? { ...t, conditions: t.conditions.filter((_, i) => i !== index) }
          : t
      ),
    }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(workflow);
    } finally {
      setIsSaving(false);
    }
  };

  const getActionIcon = (type: string) => {
    const actionType = ACTION_TYPES.find((a) => a.value === type);
    return actionType?.icon || Zap;
  };

  const getTriggerIcon = (type: string) => {
    const triggerType = TRIGGER_TYPES.find((t) => t.value === type);
    return triggerType?.icon || Zap;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Builder</h2>
          <p className="text-muted-foreground">
            Automate actions based on triggers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Workflow"}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                value={workflow.name}
                onChange={(e) =>
                  setWorkflow((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Welcome New Leads"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity">Entity</Label>
              <Select
                value={workflow.entity}
                onValueChange={(value) =>
                  setWorkflow((prev) => ({ ...prev, entity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={workflow.description}
              onChange={(e) =>
                setWorkflow((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe what this workflow does..."
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="runOnce"
                checked={workflow.runOnce}
                onCheckedChange={(checked) =>
                  setWorkflow((prev) => ({ ...prev, runOnce: checked }))
                }
              />
              <Label htmlFor="runOnce">Run only once per record</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select
                value={workflow.status}
                onValueChange={(value: "DRAFT" | "ACTIVE" | "PAUSED") =>
                  setWorkflow((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Triggers
          </CardTitle>
          <Button size="sm" onClick={addTrigger}>
            <Plus className="h-4 w-4 mr-1" />
            Add Trigger
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {workflow.triggers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No triggers configured. Add a trigger to start the workflow.
            </div>
          ) : (
            workflow.triggers.map((trigger) => {
              const TriggerIcon = getTriggerIcon(trigger.type);
              return (
                <Card key={trigger.id} className="bg-muted/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <TriggerIcon className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          <Select
                            value={trigger.type}
                            onValueChange={(value) =>
                              updateTrigger(trigger.id, { type: value })
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRIGGER_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {trigger.type === "FIELD_CHANGED" && (
                            <>
                              <Input
                                placeholder="Field name"
                                value={trigger.field || ""}
                                onChange={(e) =>
                                  updateTrigger(trigger.id, {
                                    field: e.target.value,
                                  })
                                }
                                className="w-40"
                              />
                              <Input
                                placeholder="From value (optional)"
                                value={trigger.fromValue || ""}
                                onChange={(e) =>
                                  updateTrigger(trigger.id, {
                                    fromValue: e.target.value,
                                  })
                                }
                                className="w-36"
                              />
                              <Input
                                placeholder="To value (optional)"
                                value={trigger.toValue || ""}
                                onChange={(e) =>
                                  updateTrigger(trigger.id, {
                                    toValue: e.target.value,
                                  })
                                }
                                className="w-36"
                              />
                            </>
                          )}
                          {trigger.type === "STAGE_CHANGED" && (
                            <Input
                              placeholder="To stage (optional)"
                              value={trigger.toValue || ""}
                              onChange={(e) =>
                                updateTrigger(trigger.id, {
                                  toValue: e.target.value,
                                })
                              }
                              className="w-48"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTrigger(trigger.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {/* Conditions */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Additional conditions:
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addCondition(trigger.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Condition
                            </Button>
                          </div>
                          {trigger.conditions.map((condition, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 ml-4"
                            >
                              <Input
                                placeholder="Field"
                                value={condition.field}
                                onChange={(e) =>
                                  updateCondition(trigger.id, idx, {
                                    field: e.target.value,
                                  })
                                }
                                className="w-32"
                              />
                              <Select
                                value={condition.operator}
                                onValueChange={(value) =>
                                  updateCondition(trigger.id, idx, {
                                    operator: value,
                                  })
                                }
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OPERATORS.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Value"
                                value={condition.value}
                                onChange={(e) =>
                                  updateCondition(trigger.id, idx, {
                                    value: e.target.value,
                                  })
                                }
                                className="w-32"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCondition(trigger.id, idx)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Connection Line */}
      {workflow.triggers.length > 0 && workflow.actions.length > 0 && (
        <div className="flex justify-center">
          <ArrowDown className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-500" />
            Actions
          </CardTitle>
          <Button size="sm" onClick={addAction}>
            <Plus className="h-4 w-4 mr-1" />
            Add Action
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {workflow.actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No actions configured. Add actions to execute when triggered.
            </div>
          ) : (
            workflow.actions.map((action, index) => {
              const ActionIcon = getActionIcon(action.type);
              return (
                <div key={action.id}>
                  {index > 0 && (
                    <div className="flex justify-center my-2">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline">{index + 1}</Badge>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                          <ActionIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-4">
                            <Select
                              value={action.type}
                              onValueChange={(value) =>
                                updateAction(action.id, { type: value, config: {} })
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1 ml-auto">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveAction(action.id, "up")}
                                disabled={index === 0}
                              >
                                <ArrowDown className="h-4 w-4 rotate-180" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveAction(action.id, "down")}
                                disabled={index === workflow.actions.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAction(action.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* Action-specific config */}
                          <ActionConfigEditor
                            type={action.type}
                            config={action.config}
                            onChange={(config) =>
                              updateAction(action.id, { config })
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Action-specific configuration editor
function ActionConfigEditor({
  type,
  config,
  onChange,
}: {
  type: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const updateConfig = (key: string, value: unknown) => {
    onChange({ ...config, [key]: value });
  };

  switch (type) {
    case "SEND_EMAIL":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>To Field</Label>
            <Input
              placeholder="e.g., email"
              value={String(config.toField || "")}
              onChange={(e) => updateConfig("toField", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              placeholder="Email subject"
              value={String(config.subject || "")}
              onChange={(e) => updateConfig("subject", e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Body</Label>
            <Textarea
              placeholder="Email body (supports {{field}} placeholders)"
              value={String(config.body || "")}
              onChange={(e) => updateConfig("body", e.target.value)}
              rows={3}
            />
          </div>
        </div>
      );

    case "CREATE_TASK":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Task Title</Label>
            <Input
              placeholder="Task title"
              value={String(config.title || "")}
              onChange={(e) => updateConfig("title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Due In (days)</Label>
            <Input
              type="number"
              placeholder="e.g., 3"
              value={String(config.dueInDays || "")}
              onChange={(e) => updateConfig("dueInDays", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={String(config.priority || "MEDIUM")}
              onValueChange={(value) => updateConfig("priority", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Task description"
              value={String(config.description || "")}
              onChange={(e) => updateConfig("description", e.target.value)}
              rows={2}
            />
          </div>
        </div>
      );

    case "UPDATE_FIELD":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Field</Label>
            <Input
              placeholder="Field name to update"
              value={String(config.field || "")}
              onChange={(e) => updateConfig("field", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              placeholder="New value"
              value={String(config.value || "")}
              onChange={(e) => updateConfig("value", e.target.value)}
            />
          </div>
        </div>
      );

    case "SEND_WEBHOOK":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              placeholder="https://..."
              value={String(config.url || "")}
              onChange={(e) => updateConfig("url", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={String(config.method || "POST")}
              onValueChange={(value) => updateConfig("method", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "ASSIGN_OWNER":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assignment Method</Label>
            <Select
              value={String(config.method || "SPECIFIC_USER")}
              onValueChange={(value) => updateConfig("method", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SPECIFIC_USER">Specific User</SelectItem>
                <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                <SelectItem value="TERRITORY">Territory Based</SelectItem>
                <SelectItem value="LOAD_BALANCED">Load Balanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {config.method === "SPECIFIC_USER" && (
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                placeholder="User ID"
                value={String(config.userId || "")}
                onChange={(e) => updateConfig("userId", e.target.value)}
              />
            </div>
          )}
        </div>
      );

    case "ADD_TAG":
    case "REMOVE_TAG":
      return (
        <div className="space-y-2">
          <Label>Tag Name</Label>
          <Input
            placeholder="Tag name"
            value={String(config.tagName || "")}
            onChange={(e) => updateConfig("tagName", e.target.value)}
          />
        </div>
      );

    case "WAIT_DELAY":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Delay</Label>
            <Input
              type="number"
              placeholder="e.g., 24"
              value={String(config.delayValue || "")}
              onChange={(e) => updateConfig("delayValue", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select
              value={String(config.delayUnit || "hours")}
              onValueChange={(value) => updateConfig("delayUnit", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          No additional configuration required.
        </div>
      );
  }
}

export default WorkflowBuilder;
