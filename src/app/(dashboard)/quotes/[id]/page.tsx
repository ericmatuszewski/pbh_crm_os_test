"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { QuoteStatusBadge } from "@/components/quotes";
import { Quote, QuoteStatus, QuoteVersion } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Download,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  ArrowLeft,
  History,
  Target,
  Clock,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchQuote(params.id as string);
      fetchVersions(params.id as string);
    }
  }, [params?.id]);

  const fetchQuote = async (id: string) => {
    try {
      const response = await fetch(`/api/quotes/${id}`);
      const data = await response.json();
      if (data.success) {
        setQuote(data.data);
        setDealTitle(`Deal from ${data.data.title}`);
      }
    } catch (error) {
      console.error("Failed to fetch quote:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVersions = async (id: string) => {
    try {
      const response = await fetch(`/api/quotes/${id}/versions`);
      const data = await response.json();
      if (data.success) {
        setVersions(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    }
  };

  const updateStatus = async (status: QuoteStatus) => {
    if (!quote) return;

    try {
      const response = await fetch(`/api/quotes/${quote.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuote(data.data);
        toast({
          title: "Success",
          description: `Quote status updated to ${status.toLowerCase()}`,
        });
      }
    } catch (error) {
      console.error("Failed to update quote status:", error);
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (quote) {
      window.open(`/api/quotes/${quote.id}/pdf?download=true`, "_blank");
    }
  };

  const handleCreateVersion = async () => {
    if (!quote) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/quotes/${quote.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeNotes: versionNotes,
          changedBy: "Current User", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Version ${data.data.version} created successfully`,
        });
        setIsVersionDialogOpen(false);
        setVersionNotes("");
        fetchVersions(quote.id);
        fetchQuote(quote.id);
      } else {
        throw new Error(data.error?.message || "Failed to create version");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create version",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToDeal = async () => {
    if (!quote) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/quotes/${quote.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dealTitle,
          stage: "CLOSED_WON",
          probability: 100,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Quote converted to deal successfully",
        });
        setIsConvertDialogOpen(false);
        // Navigate to the new deal
        router.push(`/deals`);
      } else {
        throw new Error(data.error?.message || "Failed to convert to deal");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert to deal",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-500">Quote not found</p>
            <Button asChild className="mt-4">
              <Link href="/quotes">Back to Quotes</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={quote.quoteNumber}
          subtitle={quote.title}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => setIsVersionDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Save Version
              </Button>
              {quote.status === "DRAFT" && (
                <Button onClick={() => updateStatus(QuoteStatus.SENT)}>
                  <Send className="w-4 h-4 mr-2" />
                  Mark as Sent
                </Button>
              )}
              {quote.status === "SENT" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(QuoteStatus.ACCEPTED)}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(QuoteStatus.DECLINED)}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </>
              )}
              {quote.status === "ACCEPTED" && !quote.deal && (
                <Button onClick={() => setIsConvertDialogOpen(true)}>
                  <Target className="w-4 h-4 mr-2" />
                  Convert to Deal
                </Button>
              )}
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <Link
              href="/quotes"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Quotes
            </Link>
          </div>

          <div className="max-w-4xl space-y-6">
            {/* Status and Summary */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">Quote Details</h2>
                  <Badge variant="outline">Version {quote.version || 1}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <QuoteStatusBadge status={quote.status} />
                  {versions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsVersionHistoryOpen(true)}
                    >
                      <History className="w-4 h-4 mr-1" />
                      {versions.length} version{versions.length !== 1 ? "s" : ""}
                    </Button>
                  )}
                </div>
              </div>

              {/* Converted Deal Notice */}
              {quote.deal && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">
                      This quote has been converted to a deal:
                      <Link href={`/deals`} className="ml-1 font-medium underline">
                        {quote.deal.title}
                      </Link>
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">
                    {quote.contact
                      ? `${quote.contact.firstName} ${quote.contact.lastName}`
                      : quote.company?.name || "-"}
                  </p>
                  {quote.contact && quote.company && (
                    <p className="text-sm text-gray-500">{quote.company.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Issue Date</p>
                  <p className="font-medium">{formatDate(quote.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valid Until</p>
                  <p className="font-medium">{formatDate(quote.validUntil)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(quote.total, quote.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Line Items</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Item
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {quote.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-gray-500">{item.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(item.unitPrice, quote.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.total, quote.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
                  </div>
                  {quote.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount{" "}
                        {quote.discountType === "percentage" &&
                          quote.discountValue &&
                          `(${quote.discountValue}%)`}
                      </span>
                      <span>
                        -{formatCurrency(quote.discountAmount, quote.currency)}
                      </span>
                    </div>
                  )}
                  {quote.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Tax {quote.taxRate && `(${quote.taxRate}%)`}
                      </span>
                      <span>{formatCurrency(quote.taxAmount, quote.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(quote.total, quote.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            {(quote.paymentTerms || quote.termsConditions || quote.notes) && (
              <div className="bg-white rounded-lg border p-6 space-y-4">
                <h3 className="text-lg font-semibold">Terms & Notes</h3>

                {quote.paymentTerms && (
                  <div>
                    <p className="text-sm text-gray-500">Payment Terms</p>
                    <p>{quote.paymentTerms}</p>
                  </div>
                )}

                {quote.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p>{quote.notes}</p>
                  </div>
                )}

                {quote.termsConditions && (
                  <div>
                    <p className="text-sm text-gray-500">Terms & Conditions</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {quote.termsConditions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Version Dialog */}
      <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Quote Version</DialogTitle>
            <DialogDescription>
              Create a snapshot of the current quote state. This helps track changes over time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="versionNotes">Change Notes (optional)</Label>
              <Textarea
                id="versionNotes"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVersionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVersion} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Deal Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Quote to Deal</DialogTitle>
            <DialogDescription>
              Create a new deal from this accepted quote. The deal will be marked as won.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quote Total</span>
                <span className="font-semibold">
                  {formatCurrency(quote.total, quote.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span>
                  {quote.contact
                    ? `${quote.contact.firstName} ${quote.contact.lastName}`
                    : quote.company?.name || "-"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dealTitle">Deal Title</Label>
              <Input
                id="dealTitle"
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                placeholder="Enter deal title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvertToDeal} disabled={isSubmitting || !dealTitle}>
              {isSubmitting ? "Converting..." : "Convert to Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Track changes made to this quote over time
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {versions.length > 0 ? (
              <div className="space-y-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">v{version.version}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(version.createdAt)}
                          </span>
                        </div>
                        {version.changedBy && (
                          <p className="text-sm text-muted-foreground mt-1">
                            by {version.changedBy}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(version.total, quote.currency)}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {version.status.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                    {version.changeNotes && (
                      <p className="text-sm bg-muted/50 p-2 rounded mt-2">
                        {version.changeNotes}
                      </p>
                    )}
                    <div className="mt-2 text-sm text-muted-foreground">
                      {version.items.length} item{version.items.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No version history yet</p>
                <p className="text-sm">Save a version to start tracking changes</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
