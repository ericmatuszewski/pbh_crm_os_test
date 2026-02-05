"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Briefcase,
  CheckSquare,
  Calendar,
  Edit,
  Trash2,
  ExternalLink,
  User,
  Tag,
  Clock,
  TrendingUp,
  MoreHorizontal,
  Plus,
  PhoneCall,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { toast } from "sonner";

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  source: string | null;
  leadScore: number;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    website: string | null;
    industry: string | null;
  } | null;
  tags: { id: string; name: string; color: string }[];
  deals: {
    id: string;
    title: string;
    value: number | null;
    probability: number;
    pipelineStage: { id: string; name: string; probability: number } | null;
    owner: { id: string; name: string } | null;
    createdAt: string;
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    assignee: { id: string; name: string } | null;
  }[];
  scheduledCalls: {
    id: string;
    scheduledAt: string;
    status: string;
    assignedTo: { id: string; name: string } | null;
  }[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
  }[];
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  QUALIFIED: "bg-green-100 text-green-800",
  UNQUALIFIED: "bg-gray-100 text-gray-800",
  CUSTOMER: "bg-purple-100 text-purple-800",
  CHURNED: "bg-red-100 text-red-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const taskStatusColors: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      const data = await res.json();
      if (data.success) {
        setContact(data.data);
      } else {
        toast.error("Contact not found");
        router.push("/contacts");
      }
    } catch (error) {
      console.error("Failed to fetch contact:", error);
      toast.error("Failed to load contact");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  const handleDelete = async () => {
    if (!contact) return;
    if (!window.confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Contact deleted");
        router.push("/contacts");
      }
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Loading..." />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  const totalDealValue = contact.deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const pendingTasks = contact.tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;
  const upcomingCalls = contact.scheduledCalls.length;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={`${contact.firstName} ${contact.lastName}`}
          subtitle={contact.title || contact.company?.name || "Contact"}
          actions={
            <div className="flex items-center gap-2">
              {contact.phone && (
                <Button variant="outline" asChild>
                  <a href={`tel:${contact.phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </a>
                </Button>
              )}
              {contact.email && (
                <Button variant="outline" asChild>
                  <a href={`mailto:${contact.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </a>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/contacts?edit=${id}`)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Contact
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/deals?create=true&contactId=${id}`)}>
                    <Briefcase className="w-4 h-4 mr-2" />
                    Create Deal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/tasks?create=true&contactId=${id}`)}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Create Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/calls?schedule=true&contactId=${id}`)}>
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Schedule Call
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Contact
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <Link
              href="/contacts"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Contacts
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Contact Info */}
            <div className="space-y-6">
              {/* Contact Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                    <Badge className={statusColors[contact.status] || "bg-gray-100"}>
                      {contact.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.title && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{contact.title}</span>
                    </div>
                  )}
                  {contact.source && (
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Source: {contact.source}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Created {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Lead Score */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Lead Score</span>
                      <span className="text-lg font-bold text-primary">{contact.leadScore}</span>
                    </div>
                    <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(contact.leadScore, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  {contact.tags.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        {contact.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            style={{ borderColor: tag.color, color: tag.color }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Company Card */}
              {contact.company && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Company
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={`/companies/${contact.company.id}`}
                      className="block hover:bg-muted/50 -m-2 p-2 rounded-lg transition-colors"
                    >
                      <h4 className="font-medium">{contact.company.name}</h4>
                      {contact.company.industry && (
                        <p className="text-sm text-muted-foreground">{contact.company.industry}</p>
                      )}
                      {contact.company.website && (
                        <p className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                          {contact.company.website}
                          <ExternalLink className="w-3 h-3" />
                        </p>
                      )}
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{contact.deals.length}</div>
                      <div className="text-xs text-muted-foreground">Deals</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{pendingTasks}</div>
                      <div className="text-xs text-muted-foreground">Open Tasks</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{upcomingCalls}</div>
                      <div className="text-xs text-muted-foreground">Scheduled</div>
                    </div>
                  </div>
                  {totalDealValue > 0 && (
                    <div className="mt-4 pt-4 border-t text-center">
                      <div className="text-2xl font-bold">
                        £{totalDealValue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Deal Value</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Deals, Tasks, Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="deals" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="deals" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Deals ({contact.deals.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Tasks ({contact.tasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="calls" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Calls ({upcomingCalls})
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Notes ({contact.notes.length})
                  </TabsTrigger>
                </TabsList>

                {/* Deals Tab */}
                <TabsContent value="deals" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Deals</CardTitle>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/deals?create=true&contactId=${id}`}>
                          <Plus className="w-4 h-4 mr-1" />
                          New Deal
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {contact.deals.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No deals yet</p>
                      ) : (
                        <div className="space-y-3">
                          {contact.deals.map((deal) => (
                            <Link
                              key={deal.id}
                              href={`/deals/${deal.id}`}
                              className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{deal.title}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {deal.pipelineStage?.name || "No stage"} • {deal.owner?.name || "Unassigned"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {deal.value && (
                                    <div className="font-medium">£{deal.value.toLocaleString()}</div>
                                  )}
                                  <div className="text-sm text-muted-foreground">
                                    {deal.probability}% probability
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Tasks</CardTitle>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/tasks?create=true&contactId=${id}`}>
                          <Plus className="w-4 h-4 mr-1" />
                          New Task
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {contact.tasks.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No tasks yet</p>
                      ) : (
                        <div className="space-y-3">
                          {contact.tasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-3 border rounded-lg ${
                                task.status === "COMPLETED" ? "opacity-60" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      task.priority === "URGENT"
                                        ? "bg-red-500"
                                        : task.priority === "HIGH"
                                        ? "bg-orange-500"
                                        : "bg-gray-400"
                                    }`}
                                  />
                                  <div>
                                    <h4 className={`font-medium ${task.status === "COMPLETED" ? "line-through" : ""}`}>
                                      {task.title}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {task.assignee?.name || "Unassigned"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={taskStatusColors[task.status]}>
                                    {task.status.replace(/_/g, " ")}
                                  </Badge>
                                  {task.dueDate && (
                                    <span
                                      className={`text-xs ${
                                        isPast(new Date(task.dueDate)) && task.status !== "COMPLETED"
                                          ? "text-red-600 font-medium"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {format(new Date(task.dueDate), "MMM d")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Calls Tab */}
                <TabsContent value="calls" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Scheduled Calls</CardTitle>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/calls?schedule=true&contactId=${id}`}>
                          <Plus className="w-4 h-4 mr-1" />
                          Schedule Call
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {contact.scheduledCalls.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No scheduled calls</p>
                      ) : (
                        <div className="space-y-3">
                          {contact.scheduledCalls.map((call) => (
                            <div key={call.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <h4 className="font-medium">
                                      {format(new Date(call.scheduledAt), "EEEE, MMMM d")}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(call.scheduledAt), "h:mm a")} •{" "}
                                      {call.assignedTo?.name || "Unassigned"}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline">{call.status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Notes</CardTitle>
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Note
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {contact.notes.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No notes yet</p>
                      ) : (
                        <div className="space-y-3">
                          {contact.notes.map((note) => (
                            <div key={note.id} className="p-3 border rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Activity Timeline */}
              <ActivityTimeline contactId={id} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
