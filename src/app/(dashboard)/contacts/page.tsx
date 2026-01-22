"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ContactTable } from "@/components/contacts/ContactTable";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ImportDialog } from "@/components/import";
import { EmptyState } from "@/components/shared";
import { Plus, Users, Upload } from "lucide-react";
import { Contact, ContactStatus, CreateContactInput } from "@/types";

// Sample data for demonstration
const sampleContacts: Contact[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@acmecorp.com",
    phone: "+1 (555) 123-4567",
    title: "VP of Sales",
    status: ContactStatus.CUSTOMER,
    companyId: "1",
    company: { id: "1", name: "Acme Corp", website: null, industry: "Technology", size: null, address: null, city: null, county: null, postcode: null, country: null, createdAt: new Date(), updatedAt: new Date() },
    source: "Website",
    ownerId: null,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date(),
  },
  {
    id: "2",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.j@techstart.io",
    phone: "+1 (555) 234-5678",
    title: "CEO",
    status: ContactStatus.QUALIFIED,
    companyId: "2",
    company: { id: "2", name: "TechStart Inc", website: null, industry: "SaaS", size: null, address: null, city: null, county: null, postcode: null, country: null, createdAt: new Date(), updatedAt: new Date() },
    source: "Referral",
    ownerId: null,
    createdAt: new Date("2024-01-18"),
    updatedAt: new Date(),
  },
  {
    id: "3",
    firstName: "Michael",
    lastName: "Chen",
    email: "m.chen@globaltech.com",
    phone: "+1 (555) 345-6789",
    title: "Procurement Manager",
    status: ContactStatus.LEAD,
    companyId: "3",
    company: { id: "3", name: "GlobalTech", website: null, industry: "Manufacturing", size: null, address: null, city: null, county: null, postcode: null, country: null, createdAt: new Date(), updatedAt: new Date() },
    source: "Trade Show",
    ownerId: null,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date(),
  },
  {
    id: "4",
    firstName: "Emily",
    lastName: "Davis",
    email: "emily@innovate.co",
    phone: "+1 (555) 456-7890",
    title: "Product Director",
    status: ContactStatus.CUSTOMER,
    companyId: "4",
    company: { id: "4", name: "Innovate Co", website: null, industry: "Consulting", size: null, address: null, city: null, county: null, postcode: null, country: null, createdAt: new Date(), updatedAt: new Date() },
    source: "LinkedIn",
    ownerId: null,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date(),
  },
  {
    id: "5",
    firstName: "Robert",
    lastName: "Williams",
    email: "r.williams@enterprise.net",
    phone: "+1 (555) 567-8901",
    title: "CTO",
    status: ContactStatus.PARTNER,
    companyId: "5",
    company: { id: "5", name: "Enterprise Net", website: null, industry: "IT Services", size: null, address: null, city: null, county: null, postcode: null, country: null, createdAt: new Date(), updatedAt: new Date() },
    source: "Cold Email",
    ownerId: null,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date(),
  },
];

const sampleCompanies = [
  { id: "1", name: "Acme Corp" },
  { id: "2", name: "TechStart Inc" },
  { id: "3", name: "GlobalTech" },
  { id: "4", name: "Innovate Co" },
  { id: "5", name: "Enterprise Net" },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(sampleContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      !search ||
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.company?.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || statusFilter === "all" || contact.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateContact = async (data: CreateContactInput) => {
    const newContact: Contact = {
      id: `${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      title: data.title || null,
      status: data.status || ContactStatus.LEAD,
      companyId: data.companyId || null,
      company: data.companyId
        ? sampleCompanies.find((c) => c.id === data.companyId)
          ? { id: data.companyId, name: sampleCompanies.find((c) => c.id === data.companyId)!.name, website: null, industry: null, size: null, address: null, city: null, county: null, postcode: null, country: null, createdAt: new Date(), updatedAt: new Date() }
          : undefined
        : undefined,
      source: data.source || null,
      ownerId: data.ownerId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setContacts([newContact, ...contacts]);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleUpdateContact = async (data: CreateContactInput) => {
    if (!editingContact) return;

    setContacts(
      contacts.map((c) =>
        c.id === editingContact.id
          ? {
              ...c,
              ...data,
              email: data.email || null,
              phone: data.phone || null,
              title: data.title || null,
              companyId: data.companyId || null,
              source: data.source || null,
              updatedAt: new Date(),
            }
          : c
      )
    );
    setEditingContact(null);
  };

  const handleDeleteContact = (contact: Contact) => {
    if (window.confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`)) {
      setContacts(contacts.filter((c) => c.id !== contact.id));
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingContact(null);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Contacts"
          subtitle={`${contacts.length} total contacts`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <ContactFilters
              search={search}
              onSearchChange={setSearch}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              onClear={() => {
                setSearch("");
                setStatusFilter("");
              }}
            />

            {filteredContacts.length > 0 ? (
              <ContactTable
                contacts={filteredContacts}
                onEdit={handleEditContact}
                onDelete={handleDeleteContact}
              />
            ) : (
              <div className="bg-white rounded-lg border">
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No contacts found"
                  description={
                    search || statusFilter
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by adding your first contact."
                  }
                  action={
                    !search && !statusFilter
                      ? { label: "Add Contact", onClick: () => setIsFormOpen(true) }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <ContactForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingContact ? handleUpdateContact : handleCreateContact}
        initialData={
          editingContact
            ? {
                firstName: editingContact.firstName,
                lastName: editingContact.lastName,
                email: editingContact.email || "",
                phone: editingContact.phone || "",
                title: editingContact.title || "",
                companyId: editingContact.companyId || "",
                status: editingContact.status,
                source: editingContact.source || "",
              }
            : undefined
        }
        companies={sampleCompanies}
        isEdit={!!editingContact}
      />

      <ImportDialog
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => {
          // In a real app, you would refetch contacts here
          setIsImportOpen(false);
        }}
      />
    </div>
  );
}
