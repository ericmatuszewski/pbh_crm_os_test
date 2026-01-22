"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { QuoteForm } from "@/components/quotes";
import { QuoteItemInput } from "@/components/quotes/QuoteItemsTable";

export default function NewQuotePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    // Fetch contacts and companies for the dropdowns
    Promise.all([
      fetch("/api/contacts?limit=100").then((r) => r.json()),
      fetch("/api/companies?limit=100").then((r) => r.json()),
    ]).then(([contactsData, companiesData]) => {
      if (contactsData.success) {
        setContacts(
          contactsData.data.map((c: { id: string; firstName: string; lastName: string }) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
          }))
        );
      }
      if (companiesData.success) {
        setCompanies(
          companiesData.data.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }
    });
  }, []);

  const handleSubmit = async (data: {
    title: string;
    contactId?: string;
    companyId?: string;
    validUntil: string;
    currency: string;
    discountType: "percentage" | "fixed" | "none";
    discountValue?: number;
    taxRate?: number;
    termsConditions?: string;
    paymentTerms?: string;
    notes?: string;
    companyName?: string;
    companyAddress?: string;
    items: QuoteItemInput[];
  }) => {
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        discountType: data.discountType === "none" ? null : data.discountType,
        discountValue: data.discountType === "none" ? null : data.discountValue,
        items: data.items.map((item) => ({
          name: item.name,
          description: item.description || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      }),
    });

    if (response.ok) {
      router.push("/quotes");
    } else {
      const error = await response.json();
      alert(error.error?.message || "Failed to create quote");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="New Quote"
          subtitle="Create a new quote for a client"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            <QuoteForm
              onSubmit={handleSubmit}
              contacts={contacts}
              companies={companies}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
