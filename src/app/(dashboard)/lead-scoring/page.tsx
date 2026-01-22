"use client";

import { useState, useEffect } from "react";
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
  TrendingUp,
  Plus,
  Star,
  Award,
  Target,
  BarChart3,
  Users,
  Megaphone,
  DollarSign,
  Settings,
  Trash2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import {
  ScoringEventType,
  MarketingCampaignStatus,
  MarketingCampaignType,
} from "@/types";

interface LeadScoringModel {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  qualifiedThreshold: number;
  customerThreshold: number;
  rules: ScoringRule[];
  createdAt: string;
}

interface ScoringRule {
  id: string;
  name: string;
  description: string | null;
  eventType: ScoringEventType;
  isActive: boolean;
  points: number;
  maxOccurrences: number | null;
  cooldownHours: number | null;
}

interface LeadSource {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  totalLeads: number;
  totalConverted: number;
  totalRevenue: number;
  _count: { campaigns: number };
  createdAt: string;
}

interface MarketingCampaign {
  id: string;
  name: string;
  description: string | null;
  type: MarketingCampaignType;
  status: MarketingCampaignStatus;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  actualCost: number | null;
  totalLeads: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number | null;
  roi: number | null;
  trackingCode: string | null;
  source: LeadSource | null;
  _count: { contacts: number };
  createdAt: string;
}

const eventTypeLabels: Record<ScoringEventType, string> = {
  EMAIL_OPENED: "Email Opened",
  EMAIL_CLICKED: "Email Clicked",
  EMAIL_REPLIED: "Email Replied",
  MEETING_BOOKED: "Meeting Booked",
  MEETING_ATTENDED: "Meeting Attended",
  CALL_ANSWERED: "Call Answered",
  CALL_POSITIVE_OUTCOME: "Call Positive Outcome",
  FORM_SUBMITTED: "Form Submitted",
  PAGE_VISITED: "Page Visited",
  DOCUMENT_VIEWED: "Document Viewed",
  DEMO_REQUESTED: "Demo Requested",
  TRIAL_STARTED: "Trial Started",
  QUOTE_REQUESTED: "Quote Requested",
  DEAL_CREATED: "Deal Created",
  STAGE_ADVANCED: "Stage Advanced",
  CUSTOM: "Custom",
};

const campaignTypeLabels: Record<MarketingCampaignType, string> = {
  EMAIL: "Email",
  SOCIAL: "Social Media",
  PAID_ADS: "Paid Ads",
  CONTENT: "Content",
  EVENT: "Event",
  WEBINAR: "Webinar",
  REFERRAL: "Referral",
  OTHER: "Other",
};

const campaignStatusColors: Record<MarketingCampaignStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

export default function LeadScoringPage() {
  const [activeTab, setActiveTab] = useState("models");
  const [models, setModels] = useState<LeadScoringModel[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LeadScoringModel | null>(null);

  // Form states
  const [modelForm, setModelForm] = useState({
    name: "",
    description: "",
    qualifiedThreshold: 50,
    customerThreshold: 100,
  });

  const [sourceForm, setSourceForm] = useState({
    name: "",
    description: "",
    category: "",
    costPerLead: "",
  });

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    type: "EMAIL" as MarketingCampaignType,
    budget: "",
    startDate: "",
    endDate: "",
    sourceId: "",
    targetLeads: "",
    targetConversions: "",
    targetRevenue: "",
  });

  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    eventType: "EMAIL_OPENED" as ScoringEventType,
    points: 5,
    maxOccurrences: "",
    cooldownHours: "",
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "models":
          const modelRes = await fetch("/api/lead-scoring");
          const modelData = await modelRes.json();
          if (modelData.success) setModels(modelData.data);
          break;
        case "sources":
          const sourceRes = await fetch("/api/lead-sources");
          const sourceData = await sourceRes.json();
          if (sourceData.success) setSources(sourceData.data);
          break;
        case "campaigns":
          const campaignRes = await fetch("/api/marketing-campaigns");
          const campaignData = await campaignRes.json();
          if (campaignData.success) setCampaigns(campaignData.data);
          break;
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createModel = async () => {
    try {
      const response = await fetch("/api/lead-scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...modelForm,
          isDefault: models.length === 0,
        }),
      });

      if (response.ok) {
        setModelDialogOpen(false);
        setModelForm({ name: "", description: "", qualifiedThreshold: 50, customerThreshold: 100 });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create model:", error);
    }
  };

  const setDefaultModel = async (id: string) => {
    try {
      await fetch(`/api/lead-scoring/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to set default model:", error);
    }
  };

  const toggleModelActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/lead-scoring/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to toggle model:", error);
    }
  };

  const addRuleToModel = async () => {
    if (!selectedModel) return;

    try {
      const existingRules = selectedModel.rules.map((r) => ({
        name: r.name,
        eventType: r.eventType,
        points: r.points,
        isActive: r.isActive,
        maxOccurrences: r.maxOccurrences,
        cooldownHours: r.cooldownHours,
      }));

      const newRule = {
        name: ruleForm.name,
        eventType: ruleForm.eventType,
        points: ruleForm.points,
        isActive: true,
        maxOccurrences: ruleForm.maxOccurrences ? parseInt(ruleForm.maxOccurrences) : null,
        cooldownHours: ruleForm.cooldownHours ? parseInt(ruleForm.cooldownHours) : null,
      };

      await fetch(`/api/lead-scoring/${selectedModel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: [...existingRules, newRule] }),
      });

      setRuleDialogOpen(false);
      setRuleForm({
        name: "",
        description: "",
        eventType: "EMAIL_OPENED",
        points: 5,
        maxOccurrences: "",
        cooldownHours: "",
      });
      setSelectedModel(null);
      fetchData();
    } catch (error) {
      console.error("Failed to add rule:", error);
    }
  };

  const createSource = async () => {
    try {
      const response = await fetch("/api/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sourceForm,
          costPerLead: sourceForm.costPerLead ? parseFloat(sourceForm.costPerLead) : null,
        }),
      });

      if (response.ok) {
        setSourceDialogOpen(false);
        setSourceForm({ name: "", description: "", category: "", costPerLead: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create source:", error);
    }
  };

  const createCampaign = async () => {
    try {
      const response = await fetch("/api/marketing-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignForm.name,
          description: campaignForm.description,
          type: campaignForm.type,
          budget: campaignForm.budget ? parseFloat(campaignForm.budget) : null,
          startDate: campaignForm.startDate || null,
          endDate: campaignForm.endDate || null,
          sourceId: campaignForm.sourceId || null,
          targetLeads: campaignForm.targetLeads ? parseInt(campaignForm.targetLeads) : null,
          targetConversions: campaignForm.targetConversions ? parseInt(campaignForm.targetConversions) : null,
          targetRevenue: campaignForm.targetRevenue ? parseFloat(campaignForm.targetRevenue) : null,
        }),
      });

      if (response.ok) {
        setCampaignDialogOpen(false);
        setCampaignForm({
          name: "",
          description: "",
          type: "EMAIL",
          budget: "",
          startDate: "",
          endDate: "",
          sourceId: "",
          targetLeads: "",
          targetConversions: "",
          targetRevenue: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
    }
  };

  const updateCampaignStatus = async (id: string, status: MarketingCampaignStatus) => {
    try {
      await fetch(`/api/marketing-campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update campaign status:", error);
    }
  };

  // Calculate totals
  const totalLeadsFromSources = sources.reduce((sum, s) => sum + s.totalLeads, 0);
  const totalConversions = sources.reduce((sum, s) => sum + s.totalConverted, 0);
  const totalRevenue = sources.reduce((sum, s) => sum + Number(s.totalRevenue), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lead Scoring & Campaigns</h1>
          <p className="text-muted-foreground">
            Score leads automatically and track marketing campaign ROI
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.filter((m) => m.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {models.reduce((sum, m) => sum + m.rules.length, 0)} total rules
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeadsFromSources}</div>
            <p className="text-xs text-muted-foreground">
              from {sources.length} sources
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions}</div>
            <p className="text-xs text-muted-foreground">
              {totalLeadsFromSources > 0
                ? ((totalConversions / totalLeadsFromSources) * 100).toFixed(1)
                : 0}
              % rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              from {campaigns.filter((c) => c.status === "COMPLETED").length} completed campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Scoring Models
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Lead Sources
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        {/* Scoring Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Define scoring rules to automatically qualify leads
            </p>
            <Button onClick={() => setModelDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Model
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 text-center py-8">Loading...</div>
            ) : models.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No scoring models created yet
              </div>
            ) : (
              models.map((model) => (
                <Card key={model.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                        {model.isDefault && (
                          <Badge className="bg-primary text-primary-foreground">Default</Badge>
                        )}
                        <Badge className={model.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {model.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {!model.isDefault && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDefaultModel(model.id)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleModelActive(model.id, model.isActive)}
                        >
                          {model.isActive ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </div>
                    {model.description && (
                      <CardDescription>{model.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Qualified at:</span>{" "}
                          <Badge variant="outline">{model.qualifiedThreshold} pts</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Customer at:</span>{" "}
                          <Badge variant="outline">{model.customerThreshold} pts</Badge>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">Scoring Rules ({model.rules.length})</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedModel(model);
                              setRuleDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Rule
                          </Button>
                        </div>
                        {model.rules.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No rules defined</p>
                        ) : (
                          <div className="space-y-2">
                            {model.rules.map((rule) => (
                              <div
                                key={rule.id}
                                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {eventTypeLabels[rule.eventType]}
                                  </Badge>
                                  <span className="text-sm">{rule.name}</span>
                                </div>
                                <Badge
                                  className={
                                    rule.points > 0
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }
                                >
                                  {rule.points > 0 ? "+" : ""}
                                  {rule.points} pts
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Lead Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Track where your leads come from and their performance
            </p>
            <Button onClick={() => setSourceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Total Leads</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Conv. Rate</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : sources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No lead sources created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{source.name}</p>
                          {source.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {source.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {source.category && (
                          <Badge variant="outline">{source.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{source.totalLeads}</TableCell>
                      <TableCell>{source.totalConverted}</TableCell>
                      <TableCell>${Number(source.totalRevenue).toLocaleString()}</TableCell>
                      <TableCell>
                        {source.totalLeads > 0
                          ? ((source.totalConverted / source.totalLeads) * 100).toFixed(1)
                          : 0}
                        %
                      </TableCell>
                      <TableCell>{source._count.campaigns}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            source.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {source.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Track marketing campaign performance and ROI
            </p>
            <Button onClick={() => setCampaignDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No campaigns created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          {campaign.trackingCode && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {campaign.trackingCode}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaignTypeLabels[campaign.type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={campaignStatusColors[campaign.status]}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.totalLeads}</TableCell>
                      <TableCell>
                        {campaign.totalConversions}
                        {campaign.conversionRate && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Number(campaign.conversionRate).toFixed(1)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>${Number(campaign.totalRevenue).toLocaleString()}</TableCell>
                      <TableCell>
                        {campaign.roi !== null ? (
                          <Badge
                            className={
                              Number(campaign.roi) >= 0
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {Number(campaign.roi).toFixed(1)}%
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={campaign.status}
                          onValueChange={(value) =>
                            updateCampaignStatus(campaign.id, value as MarketingCampaignStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="PAUSED">Paused</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Model Dialog */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Scoring Model</DialogTitle>
            <DialogDescription>
              Define thresholds for automatic lead qualification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={modelForm.name}
                onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                placeholder="e.g., Standard Lead Scoring"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={modelForm.description}
                onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Qualified Threshold</Label>
                <Input
                  type="number"
                  value={modelForm.qualifiedThreshold}
                  onChange={(e) =>
                    setModelForm({ ...modelForm, qualifiedThreshold: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Points needed to become QUALIFIED
                </p>
              </div>
              <div>
                <Label>Customer Threshold</Label>
                <Input
                  type="number"
                  value={modelForm.customerThreshold}
                  onChange={(e) =>
                    setModelForm({ ...modelForm, customerThreshold: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Points needed to become CUSTOMER
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createModel}>Create Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Scoring Rule</DialogTitle>
            <DialogDescription>
              Define when and how many points to award
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="e.g., Email engagement"
              />
            </div>
            <div>
              <Label>Event Type</Label>
              <Select
                value={ruleForm.eventType}
                onValueChange={(value) => setRuleForm({ ...ruleForm, eventType: value as ScoringEventType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Points</Label>
              <Input
                type="number"
                value={ruleForm.points}
                onChange={(e) => setRuleForm({ ...ruleForm, points: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Positive for increase, negative for decrease
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Occurrences</Label>
                <Input
                  type="number"
                  value={ruleForm.maxOccurrences}
                  onChange={(e) => setRuleForm({ ...ruleForm, maxOccurrences: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label>Cooldown (hours)</Label>
                <Input
                  type="number"
                  value={ruleForm.cooldownHours}
                  onChange={(e) => setRuleForm({ ...ruleForm, cooldownHours: e.target.value })}
                  placeholder="None"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addRuleToModel}>Add Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Source Dialog */}
      <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Lead Source</DialogTitle>
            <DialogDescription>
              Track where your leads come from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={sourceForm.name}
                onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                placeholder="e.g., Google Ads"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={sourceForm.description}
                onChange={(e) => setSourceForm({ ...sourceForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={sourceForm.category}
                  onValueChange={(value) => setSourceForm({ ...sourceForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organic">Organic</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cost Per Lead</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={sourceForm.costPerLead}
                  onChange={(e) => setSourceForm({ ...sourceForm, costPerLead: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSourceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSource}>Add Source</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Set up a marketing campaign to track ROI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="e.g., Q1 2024 Email Campaign"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={campaignForm.type}
                  onValueChange={(value) => setCampaignForm({ ...campaignForm, type: value as MarketingCampaignType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(campaignTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={campaignForm.startDate}
                  onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={campaignForm.endDate}
                  onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                />
              </div>
            </div>
            {sources.length > 0 && (
              <div>
                <Label>Lead Source</Label>
                <Select
                  value={campaignForm.sourceId}
                  onValueChange={(value) => setCampaignForm({ ...campaignForm, sourceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Target Leads</Label>
                <Input
                  type="number"
                  value={campaignForm.targetLeads}
                  onChange={(e) => setCampaignForm({ ...campaignForm, targetLeads: e.target.value })}
                />
              </div>
              <div>
                <Label>Target Conversions</Label>
                <Input
                  type="number"
                  value={campaignForm.targetConversions}
                  onChange={(e) => setCampaignForm({ ...campaignForm, targetConversions: e.target.value })}
                />
              </div>
              <div>
                <Label>Target Revenue</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={campaignForm.targetRevenue}
                  onChange={(e) => setCampaignForm({ ...campaignForm, targetRevenue: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createCampaign}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
