"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Webhook,
  Plug,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Check,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";

interface ApiKeyData {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  allowedIps: string[];
  rateLimit: number;
  lastUsedAt: string | null;
  usageCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface WebhookData {
  id: string;
  name: string;
  description: string | null;
  url: string;
  events: string[];
  isActive: boolean;
  isPaused: boolean;
  failureCount: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  createdAt: string;
}

interface IntegrationData {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  isActive: boolean;
  isConnected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
}

const AVAILABLE_SCOPES = [
  { value: "read", label: "Read", description: "Read-only access to data" },
  { value: "write", label: "Write", description: "Create and update records" },
  { value: "delete", label: "Delete", description: "Delete records" },
  { value: "admin", label: "Admin", description: "Full administrative access" },
];

const WEBHOOK_EVENTS = [
  { value: "contact.created", label: "Contact Created" },
  { value: "contact.updated", label: "Contact Updated" },
  { value: "contact.deleted", label: "Contact Deleted" },
  { value: "company.created", label: "Company Created" },
  { value: "company.updated", label: "Company Updated" },
  { value: "company.deleted", label: "Company Deleted" },
  { value: "deal.created", label: "Deal Created" },
  { value: "deal.updated", label: "Deal Updated" },
  { value: "deal.deleted", label: "Deal Deleted" },
  { value: "deal.stage_changed", label: "Deal Stage Changed" },
  { value: "deal.won", label: "Deal Won" },
  { value: "deal.lost", label: "Deal Lost" },
  { value: "quote.created", label: "Quote Created" },
  { value: "quote.sent", label: "Quote Sent" },
  { value: "quote.accepted", label: "Quote Accepted" },
  { value: "task.created", label: "Task Created" },
  { value: "task.completed", label: "Task Completed" },
];

const INTEGRATION_PROVIDERS = [
  { value: "zapier", label: "Zapier", description: "Connect to 5000+ apps" },
  { value: "make", label: "Make (Integromat)", description: "Advanced automation workflows" },
  { value: "n8n", label: "n8n", description: "Self-hosted automation" },
  { value: "custom", label: "Custom", description: "Custom API integration" },
];

export default function ApiSettingsPage() {
  // Current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [apiKeyForm, setApiKeyForm] = useState({
    name: "",
    description: "",
    scopes: ["read"],
    rateLimit: 1000,
  });

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    description: "",
    url: "",
    events: [] as string[],
    secret: "",
  });

  // Integrations state
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [integrationForm, setIntegrationForm] = useState({
    name: "",
    description: "",
    provider: "zapier",
  });

  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.success && data.data?.user?.id) {
          setCurrentUserId(data.data.user.id);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const [apiKeysRes, webhooksRes, integrationsRes] = await Promise.all([
        fetch(`/api/api-keys?userId=${currentUserId}`),
        fetch(`/api/webhooks?userId=${currentUserId}`),
        fetch(`/api/integrations?userId=${currentUserId}`),
      ]);

      const [apiKeysData, webhooksData, integrationsData] = await Promise.all([
        apiKeysRes.json(),
        webhooksRes.json(),
        integrationsRes.json(),
      ]);

      if (apiKeysData.success) setApiKeys(apiKeysData.data);
      if (webhooksData.success) setWebhooks(webhooksData.data);
      if (integrationsData.success) setIntegrations(integrationsData.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // API Key handlers
  const createApiKey = async () => {
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...apiKeyForm,
          userId: currentUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewApiKey(data.data.key);
        setApiKeys([{ ...data.data, key: undefined }, ...apiKeys]);
        setApiKeyForm({ name: "", description: "", scopes: ["read"], rateLimit: 1000 });
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    try {
      const res = await fetch("/api/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setApiKeys(apiKeys.filter((k) => k.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  };

  // Webhook handlers
  const createWebhook = async () => {
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...webhookForm,
          userId: currentUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks([data.data, ...webhooks]);
        setWebhookDialogOpen(false);
        setWebhookForm({ name: "", description: "", url: "", events: [], secret: "" });
      }
    } catch (error) {
      console.error("Failed to create webhook:", error);
    }
  };

  const toggleWebhookPause = async (webhook: WebhookData) => {
    try {
      const res = await fetch("/api/webhooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: webhook.id,
          isPaused: !webhook.isPaused,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks(webhooks.map((w) => (w.id === webhook.id ? data.data : w)));
      }
    } catch (error) {
      console.error("Failed to update webhook:", error);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;
    try {
      const res = await fetch("/api/webhooks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks(webhooks.filter((w) => w.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete webhook:", error);
    }
  };

  // Integration handlers
  const createIntegration = async () => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...integrationForm,
          userId: currentUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIntegrations([data.data, ...integrations]);
        setIntegrationDialogOpen(false);
        setIntegrationForm({ name: "", description: "", provider: "zapier" });
      }
    } catch (error) {
      console.error("Failed to create integration:", error);
    }
  };

  const testIntegration = async (id: string) => {
    try {
      const res = await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setIntegrations(integrations.map((i) => (i.id === id ? data.data : i)));
      }
    } catch (error) {
      console.error("Failed to test integration:", error);
    }
  };

  const deleteIntegration = async (id: string) => {
    if (!confirm("Are you sure you want to delete this integration?")) return;
    try {
      const res = await fetch("/api/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setIntegrations(integrations.filter((i) => i.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete integration:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API & Integrations</h1>
        <p className="text-muted-foreground">
          Manage API keys, webhooks, and third-party integrations
        </p>
      </div>

      <Tabs defaultValue="api-keys">
        <TabsList>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              API keys allow external applications to access the CRM API.
            </p>
            <Button onClick={() => setApiKeyDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>

          <div className="border rounded-lg divide-y">
            {apiKeys.length === 0 ? (
              <div className="p-8 text-center">
                <Key className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <p className="mt-2 text-muted-foreground">No API keys yet</p>
              </div>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{key.name}</h3>
                      {!key.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <code className="bg-muted px-1 rounded">{key.keyPrefix}...</code>
                      <span className="mx-2">|</span>
                      Scopes: {key.scopes.join(", ")}
                      {key.lastUsedAt && (
                        <>
                          <span className="mx-2">|</span>
                          Last used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteApiKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Webhooks send real-time notifications when events occur.
            </p>
            <Button onClick={() => setWebhookDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </div>

          <div className="border rounded-lg divide-y">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center">
                <Webhook className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <p className="mt-2 text-muted-foreground">No webhooks configured</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{webhook.name}</h3>
                        {webhook.isPaused ? (
                          <Badge variant="secondary">Paused</Badge>
                        ) : webhook.failureCount > 0 ? (
                          <Badge variant="destructive">
                            {webhook.failureCount} failures
                          </Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {webhook.url}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleWebhookPause(webhook)}
                        title={webhook.isPaused ? "Resume" : "Pause"}
                      >
                        {webhook.isPaused ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Connect with third-party automation platforms.
            </p>
            <Button onClick={() => setIntegrationDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTEGRATION_PROVIDERS.map((provider) => {
              const existing = integrations.find(
                (i) => i.provider === provider.value
              );
              return (
                <div
                  key={provider.value}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{provider.label}</h3>
                    {existing ? (
                      existing.isConnected ? (
                        <Badge variant="default">Connected</Badge>
                      ) : (
                        <Badge variant="secondary">Configured</Badge>
                      )
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>
                  {existing ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testIntegration(existing.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteIntegration(existing.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIntegrationForm({
                          ...integrationForm,
                          provider: provider.value,
                          name: provider.label,
                        });
                        setIntegrationDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newApiKey ? "API Key Created" : "Create API Key"}
            </DialogTitle>
            <DialogDescription>
              {newApiKey
                ? "Copy your API key now. It won't be shown again."
                : "Create a new API key for external access."}
            </DialogDescription>
          </DialogHeader>
          {newApiKey ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                <code className="flex-1 text-sm break-all">{newApiKey}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(newApiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Store this key securely. You won't be able to see it again.
              </p>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setApiKeyDialogOpen(false);
                    setNewApiKey(null);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Name</Label>
                <Input
                  id="keyName"
                  value={apiKeyForm.name}
                  onChange={(e) =>
                    setApiKeyForm({ ...apiKeyForm, name: e.target.value })
                  }
                  placeholder="My API Key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyDescription">Description (optional)</Label>
                <Input
                  id="keyDescription"
                  value={apiKeyForm.description}
                  onChange={(e) =>
                    setApiKeyForm({ ...apiKeyForm, description: e.target.value })
                  }
                  placeholder="Used for..."
                />
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="space-y-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-start gap-2">
                      <Checkbox
                        id={`scope-${scope.value}`}
                        checked={apiKeyForm.scopes.includes(scope.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setApiKeyForm({
                              ...apiKeyForm,
                              scopes: [...apiKeyForm.scopes, scope.value],
                            });
                          } else {
                            setApiKeyForm({
                              ...apiKeyForm,
                              scopes: apiKeyForm.scopes.filter(
                                (s) => s !== scope.value
                              ),
                            });
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`scope-${scope.value}`} className="font-medium">
                          {scope.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {scope.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createApiKey} disabled={!apiKeyForm.name}>
                  Create Key
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure a webhook to receive real-time event notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhookName">Name</Label>
              <Input
                id="webhookName"
                value={webhookForm.name}
                onChange={(e) =>
                  setWebhookForm({ ...webhookForm, name: e.target.value })
                }
                placeholder="My Webhook"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">URL</Label>
              <Input
                id="webhookUrl"
                value={webhookForm.url}
                onChange={(e) =>
                  setWebhookForm({ ...webhookForm, url: e.target.value })
                }
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`event-${event.value}`}
                      checked={webhookForm.events.includes(event.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setWebhookForm({
                            ...webhookForm,
                            events: [...webhookForm.events, event.value],
                          });
                        } else {
                          setWebhookForm({
                            ...webhookForm,
                            events: webhookForm.events.filter(
                              (e) => e !== event.value
                            ),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`event-${event.value}`} className="text-sm">
                      {event.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Secret (optional)</Label>
              <Input
                id="webhookSecret"
                value={webhookForm.secret}
                onChange={(e) =>
                  setWebhookForm({ ...webhookForm, secret: e.target.value })
                }
                placeholder="Signing secret for payload verification"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createWebhook}
              disabled={!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0}
            >
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Integration Dialog */}
      <Dialog open={integrationDialogOpen} onOpenChange={setIntegrationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Integration</DialogTitle>
            <DialogDescription>
              Connect to a third-party automation platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="integrationProvider">Provider</Label>
              <Select
                value={integrationForm.provider}
                onValueChange={(v) =>
                  setIntegrationForm({
                    ...integrationForm,
                    provider: v,
                    name: INTEGRATION_PROVIDERS.find((p) => p.value === v)?.label || v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="integrationName">Name</Label>
              <Input
                id="integrationName"
                value={integrationForm.name}
                onChange={(e) =>
                  setIntegrationForm({ ...integrationForm, name: e.target.value })
                }
                placeholder="Integration name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integrationDescription">Description (optional)</Label>
              <Textarea
                id="integrationDescription"
                value={integrationForm.description}
                onChange={(e) =>
                  setIntegrationForm({ ...integrationForm, description: e.target.value })
                }
                placeholder="What this integration does..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntegrationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createIntegration} disabled={!integrationForm.name}>
              Add Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
