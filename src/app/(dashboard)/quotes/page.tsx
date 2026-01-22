"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { QuoteTable } from "@/components/quotes";
import { EmptyState } from "@/components/shared";
import { Plus, FileText } from "lucide-react";
import { Quote, QuoteStatus } from "@/types";
import { useBusiness } from "@/contexts/BusinessContext";
import Link from "next/link";

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentBusiness, isLoading: isBusinessLoading } = useBusiness();

  const fetchQuotes = useCallback(async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/quotes", {
        headers: {
          "x-business-id": currentBusiness.id,
        },
      });
      const data = await response.json();
      if (data.success) {
        setQuotes(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleDelete = async (quote: Quote) => {
    if (!confirm(`Are you sure you want to delete quote ${quote.quoteNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setQuotes(quotes.filter((q) => q.id !== quote.id));
      }
    } catch (error) {
      console.error("Failed to delete quote:", error);
    }
  };

  const handleSend = async (quote: Quote) => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuotes(quotes.map((q) => (q.id === quote.id ? data.data : q)));
      }
    } catch (error) {
      console.error("Failed to update quote status:", error);
    }
  };

  const handleDownload = (quote: Quote) => {
    window.open(`/api/quotes/${quote.id}/pdf?download=true`, "_blank");
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Quotes"
          subtitle={currentBusiness ? `${quotes.length} quotes in ${currentBusiness.name}` : `${quotes.length} total quotes`}
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
          {isLoading || isBusinessLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : quotes.length > 0 ? (
            <QuoteTable
              quotes={quotes}
              onDelete={handleDelete}
              onSend={handleSend}
              onDownload={handleDownload}
            />
          ) : (
            <div className="bg-white rounded-lg border">
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="No quotes yet"
                description="Create your first quote to send to clients."
                action={{
                  label: "Create Quote",
                  onClick: () => (window.location.href = "/quotes/new"),
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
