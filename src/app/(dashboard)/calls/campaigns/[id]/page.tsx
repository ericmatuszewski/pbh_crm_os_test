"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Play,
  Pause,
  Users,
  Plus,
  Phone,
  CheckCircle2,
  Target,
  Settings,
  Search,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { CallQueueDialer } from "@/components/calls/CallQueueDialer";
import { CampaignForm } from "@/components/calls/CampaignForm";

interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  priority: string;
  totalCalls: number;
  completedCalls: number;
  successfulCalls: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string | null } | null;
  queueItems?: QueueItem[];
}

interface QueueItem {
  id: string;
  position: number;
  status: string;
  outcome?: string | null;
  attempts: number;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    company?: { id: string; name: string } | null;
  };
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company?: { name: string } | null;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddContactsDialog, setShowAddContactsDialog] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isAddingContacts, setIsAddingContacts] = useState(false);

  const fetchCampaign = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calls/campaigns/${campaignId}`);
      const data = await response.json();
      if (data.success) {
        setCampaign(data.data);
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts?limit=200");
      const data = await response.json();
      if (data.success) {
        // Filter out contacts already in campaign
        const existingIds = new Set(
          campaign?.queueItems?.map((item) => item.contact.id) || []
        );
        const availableContacts = data.data.filter(
          (c: Contact) => !existingIds.has(c.id) && c.phone
        );
        setContacts(availableContacts);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const updateCampaignStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/calls/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        fetchCampaign();
      }
    } catch (error) {
      console.error("Error updating campaign:", error);
    }
  };

  const addContactsToCampaign = async () => {
    if (selectedContactIds.size === 0) return;

    setIsAddingContacts(true);
    try {
      const response = await fetch(
        `/api/calls/campaigns/${campaignId}/contacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactIds: Array.from(selectedContactIds),
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setShowAddContactsDialog(false);
        setSelectedContactIds(new Set());
        fetchCampaign();
      }
    } catch (error) {
      console.error("Error adding contacts:", error);
    } finally {
      setIsAddingContacts(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    fetchCampaign();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      ACTIVE: "bg-green-100 text-green-800",
      PAUSED: "bg-yellow-100 text-yellow-800",
      COMPLETED: "bg-blue-100 text-blue-800",
      ARCHIVED: "bg-gray-100 text-gray-600",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  const getOutcomeBadge = (outcome: string) => {
    const variants: Record<string, string> = {
      ANSWERED: "bg-green-100 text-green-800",
      NO_ANSWER: "bg-yellow-100 text-yellow-800",
      VOICEMAIL: "bg-blue-100 text-blue-800",
      BUSY: "bg-orange-100 text-orange-800",
      CALLBACK_REQUESTED: "bg-purple-100 text-purple-800",
      NOT_INTERESTED: "bg-red-100 text-red-800",
      WRONG_NUMBER: "bg-gray-100 text-gray-800",
      DO_NOT_CALL: "bg-red-100 text-red-800",
    };
    return variants[outcome] || "bg-gray-100 text-gray-800";
  };

  if (isLoading || !campaign) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Campaign" subtitle="Loading..." />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const progress =
    campaign.totalCalls > 0
      ? Math.round((campaign.completedCalls / campaign.totalCalls) * 100)
      : 0;

  const scheduledItems =
    campaign.queueItems?.filter((item) => item.status === "SCHEDULED") || [];
  const completedItems =
    campaign.queueItems?.filter((item) => item.status !== "SCHEDULED") || [];

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={campaign.name}
          subtitle={`${campaign.status} • ${campaign.completedCalls}/${campaign.totalCalls} completed`}
          actions={
            <div className="flex items-center gap-2">
              {campaign.status === "DRAFT" && (
                <Button onClick={() => updateCampaignStatus("ACTIVE")}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Campaign
                </Button>
              )}
              {campaign.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  onClick={() => updateCampaignStatus("PAUSED")}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              )}
              {campaign.status === "PAUSED" && (
                <Button onClick={() => updateCampaignStatus("ACTIVE")}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Back Link */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calls/campaigns">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Campaigns
                </Link>
              </Button>
              <Badge variant="secondary" className={getStatusBadge(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Contacts</span>
            </div>
            <div className="text-2xl font-bold mt-2">{campaign.totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <div className="text-2xl font-bold mt-2">{campaign.completedCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Successful</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-green-600">
              {campaign.successfulCalls}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {campaign.completedCalls > 0
                ? Math.round(
                    (campaign.successfulCalls / campaign.completedCalls) * 100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Campaign Progress</span>
            <span className="text-sm text-muted-foreground">
              {campaign.completedCalls} / {campaign.totalCalls} contacts
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {progress}% complete • {campaign.totalCalls - campaign.completedCalls}{" "}
            remaining
          </p>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue={campaign.status === "ACTIVE" ? "dialer" : "queue"}>
        <TabsList>
          <TabsTrigger value="dialer">
            <Phone className="mr-2 h-4 w-4" />
            Dialer
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Users className="mr-2 h-4 w-4" />
            Queue ({scheduledItems.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Completed ({completedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dialer" className="mt-6">
          {campaign.status === "ACTIVE" ? (
            <CallQueueDialer
              campaign={campaign}
              onCampaignUpdate={fetchCampaign}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Campaign Not Active</h3>
                <p className="text-muted-foreground mb-4">
                  Start the campaign to begin making calls
                </p>
                <Button onClick={() => updateCampaignStatus("ACTIVE")}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Call Queue</CardTitle>
                <Button
                  onClick={() => {
                    fetchContacts();
                    setShowAddContactsDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contacts
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {scheduledItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No contacts in queue</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      fetchContacts();
                      setShowAddContactsDialog(true);
                    }}
                  >
                    Add contacts to get started
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduledItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-8">
                          #{item.position}
                        </span>
                        <div>
                          <p className="font-medium">
                            {item.contact.firstName} {item.contact.lastName}
                          </p>
                          {item.contact.company && (
                            <p className="text-sm text-muted-foreground">
                              {item.contact.company.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.attempts > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {item.attempts} attempts
                          </span>
                        )}
                        {item.contact.phone && (
                          <span className="text-sm text-muted-foreground">
                            {item.contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {completedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed calls yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {completedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">
                            {item.contact.firstName} {item.contact.lastName}
                          </p>
                          {item.contact.company && (
                            <p className="text-sm text-muted-foreground">
                              {item.contact.company.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {item.attempts} attempt{item.attempts !== 1 && "s"}
                        </span>
                        {item.outcome && (
                          <Badge
                            variant="secondary"
                            className={getOutcomeBadge(item.outcome)}
                          >
                            {item.outcome.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Campaign Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <CampaignForm
            campaign={campaign}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Contacts Dialog */}
      <Dialog
        open={showAddContactsDialog}
        onOpenChange={setShowAddContactsDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Contacts to Campaign</DialogTitle>
            <DialogDescription>
              Select contacts with phone numbers to add to this campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Command className="border rounded-lg">
              <CommandInput placeholder="Search contacts..." />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No contacts available</CommandEmpty>
                <CommandGroup>
                  {contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={`${contact.firstName} ${contact.lastName}`}
                      onSelect={() => toggleContactSelection(contact.id)}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedContactIds.has(contact.id)}
                        className="mr-2"
                      />
                      <div className="flex-1">
                        <p>
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.phone}
                          {contact.company && ` • ${contact.company.name}`}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedContactIds.size} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddContactsDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addContactsToCampaign}
                  disabled={selectedContactIds.size === 0 || isAddingContacts}
                >
                  {isAddingContacts ? "Adding..." : "Add to Campaign"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
