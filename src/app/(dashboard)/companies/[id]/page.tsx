"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Briefcase,
  Users,
  DollarSign,
  FileText,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  ExternalLink,
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
  leadScore: number;
  createdAt: string;
}

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  status: string;
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  pipelineStage: { id: string; name: string; probability: number } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}

interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
  contacts: Contact[];
  deals: Deal[];
  notes: Note[];
  activities: Activity[];
}

export default function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/companies/${id}`);
        const data = await response.json();

        if (data.success) {
          setCompany(data.data);
        } else {
          setError(data.error?.message || "Failed to fetch company");
          if (data.error?.code === "NOT_FOUND") {
            toast.error("Company not found");
            router.push("/companies");
          }
        }
      } catch (err) {
        setError("Failed to fetch company");
        console.error("Error fetching company:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [id, router]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${company?.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Company deleted");
        router.push("/companies");
      } else {
        toast.error(data.error?.message || "Failed to delete company");
      }
    } catch (err) {
      toast.error("Failed to delete company");
      console.error("Error deleting company:", err);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      LEAD: "bg-blue-100 text-blue-800",
      QUALIFIED: "bg-purple-100 text-purple-800",
      CUSTOMER: "bg-green-100 text-green-800",
      CHURNED: "bg-red-100 text-red-800",
      PARTNER: "bg-orange-100 text-orange-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getDealStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: "bg-blue-100 text-blue-800",
      WON: "bg-green-100 text-green-800",
      LOST: "bg-red-100 text-red-800",
      STALLED: "bg-yellow-100 text-yellow-800",
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
            <LoadingState message="Loading company details..." />
          </main>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Error" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="text-center py-12">
              <p className="text-slate-500">{error || "Company not found"}</p>
              <Button variant="outline" onClick={() => router.push("/companies")} className="mt-4">
                Back to Companies
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const openDeals = company.deals.filter((d) => d.status === "OPEN");
  const totalDealValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={company.name}
          subtitle="Company"
          actions={
            <div className="flex items-center gap-2">
              {company.website && (
                <Button variant="outline" asChild>
                  <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Company
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Company
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Link
            href="/companies"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Companies
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Company Info */}
            <div className="space-y-6">
              {/* Company Information Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  {company.industry && (
                    <Badge variant="outline">{company.industry}</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {company.website && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <a
                        href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {company.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {(company.address || company.city || company.postcode) && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div className="text-slate-600">
                        {company.address && <div>{company.address}</div>}
                        {(company.city || company.county || company.postcode) && (
                          <div>
                            {[company.city, company.county, company.postcode]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                        {company.country && <div>{company.country}</div>}
                      </div>
                    </div>
                  )}

                  {company.size && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{company.size} employees</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Added {formatDistanceToNow(new Date(company.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-lg border p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {company.contacts.length}
                    </div>
                    <div className="text-xs text-slate-500">Contacts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {openDeals.length}
                    </div>
                    <div className="text-xs text-slate-500">Open Deals</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalDealValue)}
                    </div>
                    <div className="text-xs text-slate-500">Pipeline Value</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Tabs */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border">
                <Tabs defaultValue="contacts" className="w-full">
                  <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
                    <TabsTrigger
                      value="contacts"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Contacts ({company.contacts.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="deals"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Deals ({company.deals.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Notes ({company.notes.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="contacts" className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Contacts</h3>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/contacts?create=true&companyId=${company.id}`}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Contact
                          </Link>
                        </Button>
                      </div>

                      {company.contacts.length > 0 ? (
                        <div className="divide-y">
                          {company.contacts.map((contact) => (
                            <Link
                              key={contact.id}
                              href={`/contacts/${contact.id}`}
                              className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-4 px-4 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                                  {contact.firstName[0]}{contact.lastName[0]}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900">
                                    {contact.firstName} {contact.lastName}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {contact.title || contact.email || "No details"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(contact.status)}>
                                  {contact.status}
                                </Badge>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">
                          No contacts yet
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="deals" className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Deals</h3>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/deals?create=true&companyId=${company.id}`}>
                            <Plus className="w-4 h-4 mr-1" />
                            New Deal
                          </Link>
                        </Button>
                      </div>

                      {company.deals.length > 0 ? (
                        <div className="divide-y">
                          {company.deals.map((deal) => (
                            <Link
                              key={deal.id}
                              href={`/deals/${deal.id}`}
                              className="block py-3 hover:bg-slate-50 -mx-4 px-4 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-slate-900">
                                    {deal.title}
                                  </div>
                                  <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                    {deal.contact && (
                                      <span>
                                        {deal.contact.firstName} {deal.contact.lastName}
                                      </span>
                                    )}
                                    {deal.pipelineStage && (
                                      <>
                                        <span>-</span>
                                        <span>{deal.pipelineStage.name}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-slate-900">
                                    {formatCurrency(deal.value)}
                                  </div>
                                  <Badge className={getDealStatusColor(deal.status)}>
                                    {deal.status}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">
                          No deals yet
                        </p>
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

                      {company.notes.length > 0 ? (
                        <div className="space-y-3">
                          {company.notes.map((note) => (
                            <div
                              key={note.id}
                              className="p-3 bg-slate-50 rounded-lg"
                            >
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
                        <p className="text-sm text-slate-500 text-center py-8">
                          No notes yet
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white rounded-lg border p-6">
                <ActivityTimeline companyId={company.id} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
