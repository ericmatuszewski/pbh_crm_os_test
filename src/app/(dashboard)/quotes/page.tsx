"use client";

import { Suspense, useRef, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuoteTable } from "@/components/quotes";
import { EmptyState, LoadingState } from "@/components/shared";
import { Plus, FileText, Search } from "lucide-react";
import { Quote } from "@/types";
import { useBusiness } from "@/contexts/BusinessContext";
import Link from "next/link";
import { toast } from "sonner";
import { useQuotes, useDeleteQuote, useUpdateQuoteStatus, useUrlState } from "@/hooks";

function QuotesPageContent() {
  const [search, setSearch] = useUrlState("search", "");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentBusiness } = useBusiness();

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const {
    data: quotes = [],
    isLoading,
  } = useQuotes({
    search,
    businessId: currentBusiness?.id,
  });

  const deleteMutation = useDeleteQuote();
  const statusMutation = useUpdateQuoteStatus();

  const handleDelete = async (quote: Quote) => {
    if (!confirm(`Are you sure you want to delete quote ${quote.quoteNumber}?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(quote.id);
      toast.success("Quote deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete quote");
    }
  };

  const handleSend = async (quote: Quote) => {
    try {
      await statusMutation.mutateAsync({ id: quote.id, status: "SENT" });
      toast.success("Quote marked as sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update quote status");
    }
  };

  const handleDownload = (quote: Quote) => {
    window.open(`/api/quotes/${quote.id}/pdf?download=true`, "_blank");
  };

  const filteredQuotes = search
    ? quotes.filter(
        (q) =>
          q.title.toLowerCase().includes(search.toLowerCase()) ||
          q.quoteNumber.toLowerCase().includes(search.toLowerCase())
      )
    : quotes;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Quotes"
          subtitle={
            currentBusiness
              ? `${quotes.length} quotes in ${currentBusiness.name}`
              : `${quotes.length} total quotes`
          }
          actions={
            <Button asChild>
              <Link href="/quotes/new">
                <Plus className="w-4 h-4 mr-2" />
                New Quote
              </Link>
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="bg-white rounded-lg border p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search quotes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="bg-white rounded-lg border p-8">
                <LoadingState message="Loading quotes..." />
              </div>
            ) : filteredQuotes.length > 0 ? (
              <QuoteTable
                quotes={filteredQuotes}
                onDelete={handleDelete}
                onSend={handleSend}
                onDownload={handleDownload}
              />
            ) : (
              <div className="bg-white rounded-lg border">
                <EmptyState
                  icon={<FileText className="h-12 w-12" />}
                  title="No quotes found"
                  description={
                    search
                      ? "Try adjusting your search to find what you're looking for."
                      : "Create your first quote to send to clients."
                  }
                  action={
                    !search
                      ? {
                          label: "Create Quote",
                          onClick: () => (window.location.href = "/quotes/new"),
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function QuotesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header title="Quotes" subtitle="Loading..." />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-lg border p-8">
                <LoadingState message="Loading quotes..." />
              </div>
            </main>
          </div>
        </div>
      }
    >
      <QuotesPageContent />
    </Suspense>
  );
}
