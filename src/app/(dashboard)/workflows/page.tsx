"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Zap,
  Plus,
  Play,
  Pause,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Activity,
  Users,
  Building2,
  Target,
} from "lucide-react";
import WorkflowBuilder from "@/components/workflows/WorkflowBuilder";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED";
  runOnce: boolean;
  totalExecutions: number;
  lastExecutedAt: string | null;
  _count: {
    triggers: number;
    actions: number;
  };
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, unknown> | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleSaveWorkflow = async (data: {
    name: string;
    description: string;
    entity: string;
    status: "DRAFT" | "ACTIVE" | "PAUSED";
    runOnce: boolean;
    triggers: unknown[];
    actions: unknown[];
  }) => {
    const url = editingWorkflow
      ? `/api/workflows/${editingWorkflow}`
      : "/api/workflows";
    const method = editingWorkflow ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setShowBuilder(false);
      setEditingWorkflow(null);
      setEditingData(null);
      fetchWorkflows();
    }
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatus = workflow.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/workflows/${workflow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      fetchWorkflows();
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;

    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchWorkflows();
    }
  };

  const handleEdit = async (workflow: Workflow) => {
    // Fetch full workflow data with triggers and actions
    const res = await fetch(`/api/workflows/${workflow.id}`);
    if (res.ok) {
      const data = await res.json();
      // Convert null to empty string for compatibility
      const workflowData = {
        ...data.data,
        description: data.data.description || "",
      };
      setEditingData(workflowData);
      setEditingWorkflow(workflow.id);
      setShowBuilder(true);
    }
  };

  const handleDuplicate = async (workflow: Workflow) => {
    const res = await fetch(`/api/workflows/${workflow.id}`);
    if (res.ok) {
      const data = await res.json();
      const duplicateData = {
        ...data.data,
        name: `${data.data.name} (Copy)`,
        status: "DRAFT",
      };
      delete duplicateData.id;

      const createRes = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicateData),
      });

      if (createRes.ok) {
        fetchWorkflows();
      }
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case "contacts":
        return Users;
      case "deals":
        return Target;
      case "companies":
        return Building2;
      default:
        return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "PAUSED":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (showBuilder) {
    return (
      <div className="p-6">
        <WorkflowBuilder
          initialData={editingData || undefined}
          onSave={handleSaveWorkflow}
          onCancel={() => {
            setShowBuilder(false);
            setEditingWorkflow(null);
            setEditingData(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Workflow Automation
          </h1>
          <p className="text-muted-foreground">
            Automate repetitive tasks with powerful workflows
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{workflows.length}</div>
            <div className="text-sm text-muted-foreground">Total Workflows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {workflows.filter((w) => w.status === "ACTIVE").length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {workflows.reduce((sum, w) => sum + w.totalExecutions, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Executions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {workflows.reduce((sum, w) => sum + w._count.actions, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Actions</div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading workflows...
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first workflow to automate tasks
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => {
            const EntityIcon = getEntityIcon(workflow.entity);
            return (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Zap className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{workflow.name}</h3>
                          <Badge className={getStatusColor(workflow.status)}>
                            {workflow.status}
                          </Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {workflow.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <EntityIcon className="h-4 w-4" />
                            {workflow.entity}
                          </span>
                          <span>
                            {workflow._count.triggers} trigger
                            {workflow._count.triggers !== 1 ? "s" : ""}
                          </span>
                          <span>
                            {workflow._count.actions} action
                            {workflow._count.actions !== 1 ? "s" : ""}
                          </span>
                          <span>
                            {workflow.totalExecutions} execution
                            {workflow.totalExecutions !== 1 ? "s" : ""}
                          </span>
                          {workflow.runOnce && (
                            <Badge variant="outline">Run Once</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={workflow.status === "ACTIVE" ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleStatus(workflow)}
                      >
                        {workflow.status === "ACTIVE" ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(workflow)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(workflow)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(workflow.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
