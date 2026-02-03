"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import {
  ArrowLeft,
  Building2,
  User,
  DollarSign,
  Calendar,
  FileText,
  CheckSquare,
  Quote,
  MoreVertical,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Plus,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
}

interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
}

interface QuoteItem {
  id: string;
  quoteNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  closedAt: string | null;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact | null;
  company: Company | null;
  owner: { id: string; name: string; email: string; image: string | null } | null;
  pipeline: { id: string; name: string } | null;
  pipelineStage: { id: string; name: string; probability: number; color: string | null } | null;
  notes: Note[];
  tasks: Task[];
  quotes: QuoteItem[];
}

export default function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/deals/${id}`);
        const data = await response.json();

        if (data.success) {
          setDeal(data.data);
        } else {
          setError(data.error?.message || "Failed to fetch deal");
          if (data.error?.code === "NOT_FOUND") {
            toast.error("Deal not found");
            router.push("/deals");
          }
        }
      } catch (err) {
        setError("Failed to fetch deal");
        console.error("Error fetching deal:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeal();
  }, [id, router]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this deal?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/deals/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Deal deleted");
        router.push("/deals");
      } else {
        toast.error(data.error?.message || "Failed to delete deal");
      }
    } catch (err) {
      toast.error("Failed to delete deal");
      console.error("Error deleting deal:", err);
    }
  };

  const formatCurrency = (value: number, currency: string = "GBP") => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      QUALIFICATION: "bg-slate-100 text-slate-800",
      DISCOVERY: "bg-blue-100 text-blue-800",
      PROPOSAL: "bg-purple-100 text-purple-800",
      NEGOTIATION: "bg-orange-100 text-orange-800",
      CLOSED_WON: "bg-green-100 text-green-800",
      CLOSED_LOST: "bg-red-100 text-red-800",
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  const getTaskStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      TODO: "bg-slate-100 text-slate-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getQuoteStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-slate-100 text-slate-800",
      SENT: "bg-blue-100 text-blue-800",
      ACCEPTED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      EXPIRED: "bg-orange-100 text-orange-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Loading..." />
          <main className="flex-1 overflow-y-auto p-6">
            <LoadingState message="Loading deal details..." />
          </main>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Error" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="text-center py-12">
              <p className="text-slate-500">{error || "Deal not found"}</p>
              <Button variant="outline" onClick={() => router.push("/deals")} className="mt-4">
                Back to Deals
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const openTasks = deal.tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
  const isWon = deal.stage === "CLOSED_WON";
  const isLost = deal.stage === "CLOSED_LOST";
  const isClosed = isWon || isLost;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={deal.title}
          subtitle="Deal"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href={`/quotes?create=true&dealId=${deal.id}`}>
                  <Quote className="w-4 h-4 mr-2" />
                  Create Quote
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Deal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Deal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link
            href="/deals"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Deals
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Deal Info */}
            <div className="space-y-6">
              {/* Deal Value Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge className={getStageColor(deal.pipelineStage?.name || deal.stage)}>
                    {deal.pipelineStage?.name || deal.stage.replace("_", " ")}
                  </Badge>
                  {isClosed && (
                    <Badge className={isWon ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {isWon ? "WON" : "LOST"}
                    </Badge>
                  )}
                </div>

                <div className="text-3xl font-bold text-slate-900 mb-2">
                  {formatCurrency(deal.value, deal.currency)}
                </div>

                {!isClosed && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Probability</span>
                      <span className="font-medium">{deal.pipelineStage?.probability || deal.probability}%</span>
                    </div>
                    <Progress value={deal.pipelineStage?.probability || deal.probability} className="h-2" />
                    <div className="text-sm text-slate-500">
                      Weighted: {formatCurrency(deal.value * ((deal.pipelineStage?.probability || deal.probability) / 100), deal.currency)}
                    </div>
                  </div>
                )}

                {deal.expectedCloseDate && !isClosed && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Expected close: {format(new Date(deal.expectedCloseDate), "d MMM yyyy")}</span>
                  </div>
                )}

                {deal.closedAt && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Closed: {format(new Date(deal.closedAt), "d MMM yyyy")}</span>
                  </div>
                )}
              </div>

              {/* Contact Card */}
              {deal.contact && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Contact
                  </h3>
                  <Link
                    href={`/contacts/${deal.contact.id}`}
                    className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {deal.contact.firstName} {deal.contact.lastName}
                        </div>
                        {deal.contact.title && (
                          <div className="text-sm text-slate-500">{deal.contact.title}</div>
                        )}
                      </div>
                    </div>
                    {deal.contact.email && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{deal.contact.email}</span>
                      </div>
                    )}
                    {deal.contact.phone && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{deal.contact.phone}</span>
                      </div>
                    )}
                  </Link>
                </div>
              )}

              {/* Company Card */}
              {deal.company && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Company
                  </h3>
                  <Link
                    href={`/companies/${deal.company.id}`}
                    className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{deal.company.name}</div>
                        {deal.company.industry && (
                          <div className="text-sm text-slate-500">{deal.company.industry}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Owner Card */}
              {deal.owner && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Owner
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{deal.owner.name}</div>
                      <div className="text-sm text-slate-500">{deal.owner.email}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-white rounded-lg border p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{openTasks.length}</div>
                    <div className="text-xs text-slate-500">Open Tasks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{deal.notes.length}</div>
                    <div className="text-xs text-slate-500">Notes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{deal.quotes.length}</div>
                    <div className="text-xs text-slate-500">Quotes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Tabs */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border">
                <Tabs defaultValue="tasks" className="w-full">
                  <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
                    <TabsTrigger
                      value="tasks"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Tasks ({deal.tasks.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="quotes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <Quote className="w-4 h-4 mr-2" />
                      Quotes ({deal.quotes.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Notes ({deal.notes.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tasks" className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Tasks</h3>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/tasks?create=true&dealId=${deal.id}`}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Task
                          </Link>
                        </Button>
                      </div>

                      {deal.tasks.length > 0 ? (
                        <div className="divide-y">
                          {deal.tasks.map((task) => (
                            <div key={task.id} className="py-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-slate-900">{task.title}</div>
                                  {task.description && (
                                    <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                    {task.dueDate && (
                                      <span>Due: {format(new Date(task.dueDate), "d MMM yyyy")}</span>
                                    )}
                                    {task.assignee && <span>- {task.assignee.name}</span>}
                                  </div>
                                </div>
                                <Badge className={getTaskStatusColor(task.status)}>
                                  {task.status.replace("_", " ")}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">No tasks yet</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="quotes" className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Quotes</h3>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/quotes?create=true&dealId=${deal.id}`}>
                            <Plus className="w-4 h-4 mr-1" />
                            Create Quote
                          </Link>
                        </Button>
                      </div>

                      {deal.quotes.length > 0 ? (
                        <div className="divide-y">
                          {deal.quotes.map((quote) => (
                            <Link
                              key={quote.id}
                              href={`/quotes/${quote.id}`}
                              className="block py-3 hover:bg-slate-50 -mx-4 px-4 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-slate-900">
                                    {quote.quoteNumber}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {format(new Date(quote.createdAt), "d MMM yyyy")}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-slate-900">
                                    {formatCurrency(Number(quote.total), deal.currency)}
                                  </div>
                                  <Badge className={getQuoteStatusColor(quote.status)}>
                                    {quote.status}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">No quotes yet</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Notes</h3>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Note
                        </Button>
                      </div>

                      {deal.notes.length > 0 ? (
                        <div className="space-y-3">
                          {deal.notes.map((note) => (
                            <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {note.content}
                              </p>
                              <p className="text-xs text-slate-400 mt-2">
                                {format(new Date(note.createdAt), "d MMM yyyy 'at' HH:mm")}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">No notes yet</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white rounded-lg border p-6">
                <ActivityTimeline dealId={deal.id} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
