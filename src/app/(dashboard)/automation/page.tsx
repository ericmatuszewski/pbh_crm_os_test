"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Workflow as WorkflowIcon,
  Users,
  Clock,
  AlertTriangle,
  Plus,
  Play,
  Pause,
  Trash2,
  Settings,
  Zap,
  GitBranch,
  Mail,
  CheckSquare,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { WorkflowStatus, TriggerType, ActionType, AssignmentMethod, SequenceStatus } from "@/types";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  status: WorkflowStatus;
  runOnce: boolean;
  totalExecutions: number;
  lastExecutedAt: string | null;
  triggers: Array<{ id: string; type: TriggerType }>;
  actions: Array<{ id: string; type: ActionType; position: number }>;
  createdAt: string;
}

interface AssignmentRule {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  isActive: boolean;
  priority: number;
  method: AssignmentMethod;
  createdAt: string;
}

interface FollowUpSequence {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  status: SequenceStatus;
  totalEnrolled: number;
  totalCompleted: number;
  steps: Array<{ id: string; name: string; position: number }>;
  createdAt: string;
}

interface SLAPolicy {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  isActive: boolean;
  targetDateField: string;
  escalations: Array<{ id: string; level: number; thresholdHours: number }>;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

const triggerLabels: Record<TriggerType, string> = {
  RECORD_CREATED: "Record Created",
  RECORD_UPDATED: "Record Updated",
  FIELD_CHANGED: "Field Changed",
  STAGE_CHANGED: "Stage Changed",
  DATE_BASED: "Date Based",
  MANUAL: "Manual",
};

const actionLabels: Record<ActionType, string> = {
  SEND_EMAIL: "Send Email",
  CREATE_TASK: "Create Task",
  UPDATE_FIELD: "Update Field",
  SEND_WEBHOOK: "Send Webhook",
  ASSIGN_OWNER: "Assign Owner",
  ADD_TAG: "Add Tag",
  REMOVE_TAG: "Remove Tag",
  CREATE_ACTIVITY: "Create Activity",
  WAIT_DELAY: "Wait/Delay",
  CONDITION_BRANCH: "Condition",
};

const methodLabels: Record<AssignmentMethod, string> = {
  ROUND_ROBIN: "Round Robin",
  TERRITORY: "Territory",
  LOAD_BALANCED: "Load Balanced",
  SPECIFIC_USER: "Specific User",
};

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState("workflows");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>([]);
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false);
  const [slaDialogOpen, setSlaDialogOpen] = useState(false);

  // Form states
  const [workflowForm, setWorkflowForm] = useState({
    name: "",
    description: "",
    entity: "contacts",
    runOnce: false,
    triggerType: "RECORD_CREATED" as TriggerType,
    actionType: "CREATE_TASK" as ActionType,
    actionConfig: {} as Record<string, string>,
  });

  const [assignmentForm, setAssignmentForm] = useState({
    name: "",
    description: "",
    entity: "contacts",
    method: "ROUND_ROBIN" as AssignmentMethod,
    userIds: [] as string[],
  });

  const [sequenceForm, setSequenceForm] = useState({
    name: "",
    description: "",
    entity: "contacts",
    steps: [{ name: "Step 1", delayDays: 1, actionType: "SEND_EMAIL" as ActionType }],
  });

  const [slaForm, setSlaForm] = useState({
    name: "",
    description: "",
    entity: "deals",
    targetDateField: "expectedCloseDate",
    escalations: [{ level: 1, thresholdHours: 24, thresholdType: "before" }],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "workflows":
          const workflowRes = await fetch("/api/workflows");
          const workflowData = await workflowRes.json();
          if (workflowData.success) setWorkflows(workflowData.data);
          break;
        case "assignments":
          const assignmentRes = await fetch("/api/assignment-rules");
          const assignmentData = await assignmentRes.json();
          if (assignmentData.success) setAssignmentRules(assignmentData.data);
          break;
        case "sequences":
          const sequenceRes = await fetch("/api/sequences");
          const sequenceData = await sequenceRes.json();
          if (sequenceData.success) setSequences(sequenceData.data);
          break;
        case "sla":
          const slaRes = await fetch("/api/sla-policies");
          const slaData = await slaRes.json();
          if (slaData.success) setSlaPolicies(slaData.data);
          break;
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createWorkflow = async () => {
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowForm.name,
          description: workflowForm.description,
          entity: workflowForm.entity,
          runOnce: workflowForm.runOnce,
          triggers: [{ type: workflowForm.triggerType, conditions: [] }],
          actions: [{ type: workflowForm.actionType, position: 0, config: workflowForm.actionConfig }],
        }),
      });

      if (response.ok) {
        setWorkflowDialogOpen(false);
        setWorkflowForm({
          name: "",
          description: "",
          entity: "contacts",
          runOnce: false,
          triggerType: "RECORD_CREATED",
          actionType: "CREATE_TASK",
          actionConfig: {},
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  const updateWorkflowStatus = async (id: string, status: WorkflowStatus) => {
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update workflow:", error);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    }
  };

  const createAssignmentRule = async () => {
    try {
      const response = await fetch("/api/assignment-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentForm),
      });

      if (response.ok) {
        setAssignmentDialogOpen(false);
        setAssignmentForm({
          name: "",
          description: "",
          entity: "contacts",
          method: "ROUND_ROBIN",
          userIds: [],
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create assignment rule:", error);
    }
  };

  const toggleAssignmentRule = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/assignment-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to toggle assignment rule:", error);
    }
  };

  const createSequence = async () => {
    try {
      const response = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sequenceForm,
          steps: sequenceForm.steps.map((s, i) => ({
            ...s,
            position: i,
            actionConfig: {},
          })),
        }),
      });

      if (response.ok) {
        setSequenceDialogOpen(false);
        setSequenceForm({
          name: "",
          description: "",
          entity: "contacts",
          steps: [{ name: "Step 1", delayDays: 1, actionType: "SEND_EMAIL" }],
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create sequence:", error);
    }
  };

  const updateSequenceStatus = async (id: string, status: SequenceStatus) => {
    try {
      await fetch(`/api/sequences/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update sequence:", error);
    }
  };

  const createSlaPolicy = async () => {
    try {
      const response = await fetch("/api/sla-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...slaForm,
          escalations: slaForm.escalations.map((e) => ({
            ...e,
            actionType: "CREATE_TASK",
            actionConfig: { title: `SLA Escalation Level ${e.level}` },
          })),
        }),
      });

      if (response.ok) {
        setSlaDialogOpen(false);
        setSlaForm({
          name: "",
          description: "",
          entity: "deals",
          targetDateField: "expectedCloseDate",
          escalations: [{ level: 1, thresholdHours: 24, thresholdType: "before" }],
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create SLA policy:", error);
    }
  };

  const toggleSlaPolicy = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/sla-policies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to toggle SLA policy:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Automation</h1>
          <p className="text-muted-foreground">
            Automate workflows, assignments, and follow-ups
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.filter((w) => w.status === "ACTIVE").length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {workflows.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assignment Rules</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignmentRules.filter((r) => r.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">active rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sequences.filter((s) => s.status === "ACTIVE").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {sequences.reduce((sum, s) => sum + s.totalEnrolled, 0)} enrolled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLA Policies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {slaPolicies.filter((p) => p.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">active policies</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignment Rules
          </TabsTrigger>
          <TabsTrigger value="sequences" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="sla" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            SLA Policies
          </TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Automate actions based on triggers like record creation or field changes
            </p>
            <Button onClick={() => setWorkflowDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Triggers</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : workflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No workflows created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  workflows.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{workflow.name}</p>
                          {workflow.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{workflow.entity}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {workflow.triggers.map((t) => (
                            <Badge key={t.id} variant="outline" className="text-xs">
                              {triggerLabels[t.type]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {workflow.actions.map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-xs">
                              {actionLabels[a.type]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[workflow.status]}>
                          {workflow.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{workflow.totalExecutions}</TableCell>
                      <TableCell>
                        {workflow.lastExecutedAt
                          ? format(new Date(workflow.lastExecutedAt), "MMM d, h:mm a")
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {workflow.status === "ACTIVE" ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateWorkflowStatus(workflow.id, "PAUSED")}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateWorkflowStatus(workflow.id, "ACTIVE")}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteWorkflow(workflow.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Assignment Rules Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Automatically assign leads and deals to users based on rules
            </p>
            <Button onClick={() => setAssignmentDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : assignmentRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No assignment rules created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  assignmentRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{rule.entity}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{methodLabels[rule.method]}</Badge>
                      </TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>
                        <Badge className={rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(rule.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleAssignmentRule(rule.id, rule.isActive)}
                        >
                          {rule.isActive ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Sequences Tab */}
        <TabsContent value="sequences" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create automated follow-up sequences with timed steps
            </p>
            <Button onClick={() => setSequenceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Sequence
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : sequences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sequences created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  sequences.map((sequence) => (
                    <TableRow key={sequence.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sequence.name}</p>
                          {sequence.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {sequence.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{sequence.entity}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {sequence.steps.slice(0, 3).map((step, i) => (
                            <span key={step.id} className="flex items-center">
                              {i > 0 && <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />}
                              <Badge variant="outline" className="text-xs">
                                {step.name}
                              </Badge>
                            </span>
                          ))}
                          {sequence.steps.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{sequence.steps.length - 3} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{sequence.totalEnrolled}</TableCell>
                      <TableCell>{sequence.totalCompleted}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[sequence.status]}>
                          {sequence.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {sequence.status === "ACTIVE" ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateSequenceStatus(sequence.id, "PAUSED")}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateSequenceStatus(sequence.id, "ACTIVE")}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* SLA Policies Tab */}
        <TabsContent value="sla" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Set up escalation rules based on date-based SLAs
            </p>
            <Button onClick={() => setSlaDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Target Field</TableHead>
                  <TableHead>Escalations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : slaPolicies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No SLA policies created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  slaPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{policy.name}</p>
                          {policy.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {policy.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{policy.entity}</TableCell>
                      <TableCell>{policy.targetDateField}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {policy.escalations.map((e) => (
                            <Badge key={e.id} variant="outline" className="text-xs">
                              L{e.level}: {e.thresholdHours}h
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={policy.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {policy.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSlaPolicy(policy.id, policy.isActive)}
                        >
                          {policy.isActive ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Workflow Dialog */}
      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
            <DialogDescription>
              Set up an automated workflow with triggers and actions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={workflowForm.name}
                onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                placeholder="e.g., Welcome new leads"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={workflowForm.description}
                onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                placeholder="What does this workflow do?"
              />
            </div>
            <div>
              <Label>Entity</Label>
              <Select
                value={workflowForm.entity}
                onValueChange={(value) => setWorkflowForm({ ...workflowForm, entity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                  <SelectItem value="companies">Companies</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                  <SelectItem value="quotes">Quotes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trigger</Label>
              <Select
                value={workflowForm.triggerType}
                onValueChange={(value) => setWorkflowForm({ ...workflowForm, triggerType: value as TriggerType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Action</Label>
              <Select
                value={workflowForm.actionType}
                onValueChange={(value) => setWorkflowForm({ ...workflowForm, actionType: value as ActionType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {workflowForm.actionType === "CREATE_TASK" && (
              <div>
                <Label>Task Title</Label>
                <Input
                  value={workflowForm.actionConfig.title || ""}
                  onChange={(e) =>
                    setWorkflowForm({
                      ...workflowForm,
                      actionConfig: { ...workflowForm.actionConfig, title: e.target.value },
                    })
                  }
                  placeholder="e.g., Follow up with {{firstName}}"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkflowDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createWorkflow}>Create Workflow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Rule Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assignment Rule</DialogTitle>
            <DialogDescription>
              Automatically assign records to users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={assignmentForm.name}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, name: e.target.value })}
                placeholder="e.g., Round Robin Lead Assignment"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Entity</Label>
              <Select
                value={assignmentForm.entity}
                onValueChange={(value) => setAssignmentForm({ ...assignmentForm, entity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assignment Method</Label>
              <Select
                value={assignmentForm.method}
                onValueChange={(value) => setAssignmentForm({ ...assignmentForm, method: value as AssignmentMethod })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createAssignmentRule}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sequence Dialog */}
      <Dialog open={sequenceDialogOpen} onOpenChange={setSequenceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Follow-Up Sequence</DialogTitle>
            <DialogDescription>
              Set up automated follow-up steps
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={sequenceForm.name}
                onChange={(e) => setSequenceForm({ ...sequenceForm, name: e.target.value })}
                placeholder="e.g., New Lead Nurturing"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={sequenceForm.description}
                onChange={(e) => setSequenceForm({ ...sequenceForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Entity</Label>
              <Select
                value={sequenceForm.entity}
                onValueChange={(value) => setSequenceForm({ ...sequenceForm, entity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Steps</Label>
              <div className="space-y-2">
                {sequenceForm.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={step.name}
                      onChange={(e) => {
                        const newSteps = [...sequenceForm.steps];
                        newSteps[index].name = e.target.value;
                        setSequenceForm({ ...sequenceForm, steps: newSteps });
                      }}
                      placeholder="Step name"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={step.delayDays}
                      onChange={(e) => {
                        const newSteps = [...sequenceForm.steps];
                        newSteps[index].delayDays = parseInt(e.target.value) || 0;
                        setSequenceForm({ ...sequenceForm, steps: newSteps });
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSequenceForm({
                      ...sequenceForm,
                      steps: [
                        ...sequenceForm.steps,
                        {
                          name: `Step ${sequenceForm.steps.length + 1}`,
                          delayDays: 1,
                          actionType: "SEND_EMAIL",
                        },
                      ],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSequenceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSequence}>Create Sequence</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create SLA Policy Dialog */}
      <Dialog open={slaDialogOpen} onOpenChange={setSlaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create SLA Policy</DialogTitle>
            <DialogDescription>
              Set up escalation rules based on deadlines
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={slaForm.name}
                onChange={(e) => setSlaForm({ ...slaForm, name: e.target.value })}
                placeholder="e.g., Deal Close Date SLA"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={slaForm.description}
                onChange={(e) => setSlaForm({ ...slaForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Entity</Label>
              <Select
                value={slaForm.entity}
                onValueChange={(value) => setSlaForm({ ...slaForm, entity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deals">Deals</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Date Field</Label>
              <Select
                value={slaForm.targetDateField}
                onValueChange={(value) => setSlaForm({ ...slaForm, targetDateField: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {slaForm.entity === "deals" ? (
                    <SelectItem value="expectedCloseDate">Expected Close Date</SelectItem>
                  ) : (
                    <SelectItem value="dueDate">Due Date</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Escalation Levels</Label>
              <div className="space-y-2">
                {slaForm.escalations.map((esc, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-8">L{esc.level}</span>
                    <Input
                      type="number"
                      value={esc.thresholdHours}
                      onChange={(e) => {
                        const newEscalations = [...slaForm.escalations];
                        newEscalations[index].thresholdHours = parseInt(e.target.value) || 0;
                        setSlaForm({ ...slaForm, escalations: newEscalations });
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">hours</span>
                    <Select
                      value={esc.thresholdType}
                      onValueChange={(value) => {
                        const newEscalations = [...slaForm.escalations];
                        newEscalations[index].thresholdType = value;
                        setSlaForm({ ...slaForm, escalations: newEscalations });
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before">before</SelectItem>
                        <SelectItem value="after">after</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSlaForm({
                      ...slaForm,
                      escalations: [
                        ...slaForm.escalations,
                        {
                          level: slaForm.escalations.length + 1,
                          thresholdHours: 48,
                          thresholdType: "before",
                        },
                      ],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Level
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlaDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSlaPolicy}>Create Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
