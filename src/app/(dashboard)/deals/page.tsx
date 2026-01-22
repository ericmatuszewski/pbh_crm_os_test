"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealTable, DealKanban, PipelineAnalytics } from "@/components/deals";
import { StageConfig } from "@/components/deals/DealKanban";
import { EmptyState } from "@/components/shared";
import { Plus, Target, Search, LayoutGrid, List, BarChart3, Settings2 } from "lucide-react";
import { Deal, DealStage, Contact, Company, Pipeline } from "@/types";
import Link from "next/link";

const stageLabels: Record<DealStage, string> = {
  QUALIFICATION: "Qualification",
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

const stageProbabilities: Record<DealStage, number> = {
  QUALIFICATION: 10,
  DISCOVERY: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "analytics">("kanban");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    value: "",
    currency: "USD",
    stage: "QUALIFICATION" as DealStage | string,
    probability: "10",
    expectedCloseDate: "",
    contactId: "",
    companyId: "",
    pipelineId: "",
    stageId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dealsRes, contactsRes, companiesRes, pipelinesRes] = await Promise.all([
        fetch("/api/deals"),
        fetch("/api/contacts"),
        fetch("/api/companies"),
        fetch("/api/pipelines"),
      ]);

      const dealsData = await dealsRes.json();
      const contactsData = await contactsRes.json();
      const companiesData = await companiesRes.json();
      const pipelinesData = await pipelinesRes.json();

      if (dealsData.success) setDeals(dealsData.data);
      if (contactsData.success) setContacts(contactsData.data);
      if (companiesData.success) setCompanies(companiesData.data);
      if (pipelinesData.success) {
        setPipelines(pipelinesData.data);
        // Select default pipeline
        const defaultPipeline = pipelinesData.data.find((p: Pipeline) => p.isDefault);
        if (defaultPipeline) {
          setSelectedPipelineId(defaultPipeline.id);
        } else if (pipelinesData.data.length > 0) {
          setSelectedPipelineId(pipelinesData.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get the selected pipeline and its stages
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const pipelineStages: StageConfig[] = selectedPipeline?.stages?.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    probability: s.probability,
    isClosed: s.isClosed,
    isWon: s.isWon,
  })) || [];

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      !search ||
      deal.title.toLowerCase().includes(search.toLowerCase()) ||
      deal.contact?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      deal.company?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStage =
      !stageFilter || stageFilter === "all" || deal.stage === stageFilter || deal.stageId === stageFilter;

    // Filter by pipeline if one is selected
    const matchesPipeline =
      !selectedPipelineId || deal.pipelineId === selectedPipelineId || !deal.pipelineId;

    return matchesSearch && matchesStage && matchesPipeline;
  });

  const handleOpenForm = (deal?: Deal) => {
    if (deal) {
      setEditingDeal(deal);
      setFormData({
        title: deal.title,
        value: deal.value.toString(),
        currency: deal.currency,
        stage: deal.stageId || deal.stage,
        probability: deal.probability.toString(),
        expectedCloseDate: deal.expectedCloseDate
          ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
          : "",
        contactId: deal.contactId || "",
        companyId: deal.companyId || "",
        pipelineId: deal.pipelineId || selectedPipelineId || "",
        stageId: deal.stageId || "",
      });
    } else {
      // Get the first non-closed stage from the selected pipeline
      const firstStage = pipelineStages.find(s => !s.isClosed);
      setEditingDeal(null);
      setFormData({
        title: "",
        value: "",
        currency: "USD",
        stage: firstStage?.id || "QUALIFICATION",
        probability: firstStage?.probability?.toString() || "10",
        expectedCloseDate: "",
        contactId: "",
        companyId: "",
        pipelineId: selectedPipelineId || "",
        stageId: firstStage?.id || "",
      });
    }
    setIsFormOpen(true);
  };

  const handleStageChange = (stageIdOrValue: string) => {
    // Check if it's a pipeline stage ID or a DealStage enum value
    const pipelineStage = pipelineStages.find(s => s.id === stageIdOrValue);
    if (pipelineStage) {
      setFormData({
        ...formData,
        stage: stageIdOrValue,
        stageId: stageIdOrValue,
        probability: pipelineStage.probability.toString(),
      });
    } else {
      // It's a DealStage enum value
      setFormData({
        ...formData,
        stage: stageIdOrValue,
        stageId: "",
        probability: stageProbabilities[stageIdOrValue as DealStage]?.toString() || "10",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingDeal ? `/api/deals/${editingDeal.id}` : "/api/deals";
      const method = editingDeal ? "PUT" : "POST";

      // Determine if we're using a pipeline stage or the legacy DealStage enum
      const isUsingPipelineStage = formData.stageId && pipelineStages.some(s => s.id === formData.stageId);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          value: parseFloat(formData.value),
          currency: formData.currency,
          stage: isUsingPipelineStage ? "QUALIFICATION" : formData.stage, // Fallback for legacy field
          stageId: isUsingPipelineStage ? formData.stageId : null,
          pipelineId: formData.pipelineId || null,
          probability: parseInt(formData.probability),
          expectedCloseDate: formData.expectedCloseDate || null,
          contactId: formData.contactId || null,
          companyId: formData.companyId || null,
          ownerId: "user-1", // TODO: Get from auth
        }),
      });

      if (res.ok) {
        fetchData();
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Failed to save deal:", error);
    }
  };

  const handleDelete = async (deal: Deal) => {
    if (!window.confirm(`Are you sure you want to delete "${deal.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete deal:", error);
    }
  };

  const handleStageDrop = async (dealId: string, newStage: string, probability: number) => {
    try {
      // Check if newStage is a pipeline stage ID or a DealStage enum value
      const isStageId = !Object.values(DealStage).includes(newStage as DealStage);

      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isStageId ? { stageId: newStage } : { stage: newStage }),
          probability,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update deal stage:", error);
    }
  };

  // Calculate pipeline metrics
  const pipelineValue = deals
    .filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage))
    .reduce((sum, d) => sum + d.value, 0);

  const weightedValue = deals
    .filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage))
    .reduce((sum, d) => sum + d.value * (d.probability / 100), 0);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Deals"
          subtitle={`${deals.length} deals | Pipeline: $${pipelineValue.toLocaleString()} | Weighted: $${weightedValue.toLocaleString()}`}
          actions={
            <Button onClick={() => handleOpenForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Filters and View Toggle */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search deals..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {pipelines.length > 0 && (
                  <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={stageFilter || "all"} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {pipelineStages.length > 0
                      ? pipelineStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))
                      : Object.entries(stageLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === "kanban" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("kanban")}
                    title="Kanban view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    title="Table view"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "analytics" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("analytics")}
                    title="Analytics"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                Loading...
              </div>
            ) : viewMode === "analytics" ? (
              <PipelineAnalytics deals={deals} />
            ) : filteredDeals.length > 0 ? (
              viewMode === "kanban" ? (
                <DealKanban
                  deals={filteredDeals}
                  onEdit={handleOpenForm}
                  onDelete={handleDelete}
                  onStageChange={handleStageDrop}
                  stages={pipelineStages.length > 0 ? pipelineStages : undefined}
                />
              ) : (
                <DealTable
                  deals={filteredDeals}
                  onEdit={handleOpenForm}
                  onDelete={handleDelete}
                />
              )
            ) : (
              <div className="bg-white rounded-lg border">
                <EmptyState
                  icon={<Target className="h-12 w-12" />}
                  title="No deals found"
                  description={
                    search || stageFilter
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by adding your first deal."
                  }
                  action={
                    !search && !stageFilter
                      ? { label: "Add Deal", onClick: () => handleOpenForm() }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Deal Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDeal ? "Edit Deal" : "Add Deal"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Deal Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Enterprise License Agreement"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stageId || formData.stage}
                  onValueChange={handleStageChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineStages.length > 0
                      ? pipelineStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))
                      : Object.entries(stageLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Win Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) =>
                    setFormData({ ...formData, probability: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) =>
                  setFormData({ ...formData, expectedCloseDate: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactId">Contact</Label>
                <Select
                  value={formData.contactId || "_none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contactId: value === "_none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Company</Label>
                <Select
                  value={formData.companyId || "_none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, companyId: value === "_none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingDeal ? "Update" : "Create"} Deal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
