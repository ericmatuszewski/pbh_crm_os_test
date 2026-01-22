"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Plus,
  Users,
  Play,
  Pause,
  MoreHorizontal,
  Phone,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignForm } from "@/components/calls/CampaignForm";
import { cn } from "@/lib/utils";

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
  _count?: { queueItems: number };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/calls/campaigns");
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.data);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCampaignStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/calls/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error updating campaign:", error);
    }
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

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      LOW: "bg-slate-100 text-slate-800",
      MEDIUM: "bg-blue-100 text-blue-800",
      HIGH: "bg-orange-100 text-orange-800",
      URGENT: "bg-red-100 text-red-800",
    };
    return variants[priority] || "bg-gray-100 text-gray-800";
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    fetchCampaigns();
  };

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const totalContacts = campaigns.reduce((sum, c) => sum + c.totalCalls, 0);
  const totalCompleted = campaigns.reduce((sum, c) => sum + c.completedCalls, 0);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Call Campaigns"
          subtitle={`${campaigns.length} campaigns | ${activeCampaigns.length} active`}
          actions={
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Campaign</DialogTitle>
                </DialogHeader>
                <CampaignForm
                  onSuccess={handleCreateSuccess}
                  onCancel={() => setShowCreateDialog(false)}
                />
              </DialogContent>
            </Dialog>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Total Campaigns
                    </span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{campaigns.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Active</span>
                  </div>
                  <div className="text-2xl font-bold mt-2 text-green-600">
                    {activeCampaigns.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Total Contacts
                    </span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{totalContacts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Completed</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{totalCompleted}</div>
                </CardContent>
              </Card>
            </div>

            {/* Campaigns Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No campaigns yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first calling campaign to get started
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Campaign
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => {
                        const progress =
                          campaign.totalCalls > 0
                            ? Math.round(
                                (campaign.completedCalls / campaign.totalCalls) * 100
                              )
                            : 0;

                        return (
                          <TableRow key={campaign.id}>
                            <TableCell>
                              <div>
                                <Link
                                  href={`/calls/campaigns/${campaign.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {campaign.name}
                                </Link>
                                {campaign.description && (
                                  <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                    {campaign.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={getStatusBadge(campaign.status)}
                              >
                                {campaign.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={getPriorityBadge(campaign.priority)}
                              >
                                {campaign.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="w-[150px]">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span>
                                    {campaign.completedCalls} / {campaign.totalCalls}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {progress}%
                                  </span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {campaign.startDate && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(campaign.startDate), "MMM d")}
                                    {campaign.endDate && (
                                      <span>
                                        {" "}-{" "}
                                        {format(new Date(campaign.endDate), "MMM d")}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {!campaign.startDate && (
                                  <span className="text-muted-foreground">
                                    No dates set
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {campaign.status === "ACTIVE" && (
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/calls/campaigns/${campaign.id}`}>
                                      <Phone className="h-4 w-4 mr-1" />
                                      Dial
                                    </Link>
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/calls/campaigns/${campaign.id}`}>
                                        View Details
                                      </Link>
                                    </DropdownMenuItem>
                                    {campaign.status === "DRAFT" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateCampaignStatus(campaign.id, "ACTIVE")
                                        }
                                      >
                                        <Play className="mr-2 h-4 w-4" />
                                        Start Campaign
                                      </DropdownMenuItem>
                                    )}
                                    {campaign.status === "ACTIVE" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateCampaignStatus(campaign.id, "PAUSED")
                                        }
                                      >
                                        <Pause className="mr-2 h-4 w-4" />
                                        Pause Campaign
                                      </DropdownMenuItem>
                                    )}
                                    {campaign.status === "PAUSED" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateCampaignStatus(campaign.id, "ACTIVE")
                                        }
                                      >
                                        <Play className="mr-2 h-4 w-4" />
                                        Resume Campaign
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
