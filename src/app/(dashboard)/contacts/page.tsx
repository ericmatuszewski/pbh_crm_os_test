"use client";

import { useState, useMemo, Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ContactTable } from "@/components/contacts/ContactTable";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ImportDialog } from "@/components/import";
import { EmptyState, LoadingState } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Users, Upload, AlertCircle } from "lucide-react";
import { Contact, CreateContactInput } from "@/types";
import { toast } from "sonner";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from "@/hooks";
import { useCompanies } from "@/hooks";
import { useDebounce, useUrlFilters } from "@/hooks";

function ContactsPageContent() {
  // URL-based persistent filters
  const { values: filters, setValues: setFilters, clearAll } = useUrlFilters({
    search: "",
    status: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  // Debounce search for better performance
  const debouncedSearch = useDebounce(filters.search, 300);

  // React Query hooks for data fetching
  const {
    data: contacts = [],
    isLoading,
    error,
    refetch: refetchContacts
  } = useContacts({ search: debouncedSearch, status: filters.status });

  const { data: companiesData = [] } = useCompanies();

  // Transform companies for the form
  const companies = useMemo(() =>
    companiesData.map((c) => ({ id: c.id, name: c.name })),
    [companiesData]
  );

  // Mutations
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();

  const handleCreateContact = async (data: CreateContactInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Contact created successfully");
      setIsFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create contact");
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleUpdateContact = async (data: CreateContactInput) => {
    if (!editingContact) return;

    try {
      await updateMutation.mutateAsync({ id: editingContact.id, data });
      toast.success("Contact updated successfully");
      setEditingContact(null);
      setIsFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update contact");
    }
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;

    try {
      await deleteMutation.mutateAsync(contactToDelete.id);
      toast.success("Contact deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact");
    } finally {
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const handleBulkDeleteClick = (ids: string[]) => {
    setBulkDeleteIds(ids);
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      await Promise.all(bulkDeleteIds.map((id) => deleteMutation.mutateAsync(id)));
      toast.success(`${bulkDeleteIds.length} contacts deleted successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contacts");
    } finally {
      setBulkDeleteDialogOpen(false);
      setBulkDeleteIds([]);
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
              search={filters.search}
              onSearchChange={(value) => setFilters({ search: value })}
              status={filters.status}
              onStatusChange={(value) => setFilters({ status: value })}
              onClear={clearAll}
              autoFocus
            />

            {isLoading ? (
              <div className="bg-white rounded-lg border p-8">
                <LoadingState message="Loading contacts..." />
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg border p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Error loading contacts</h3>
                  <p className="text-sm text-slate-500 mb-4">{error instanceof Error ? error.message : "Unknown error"}</p>
                  <Button variant="outline" onClick={() => refetchContacts()}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : contacts.length > 0 ? (
              <ContactTable
                contacts={contacts}
                onEdit={handleEditContact}
                onDelete={handleDeleteClick}
                onBulkDelete={handleBulkDeleteClick}
              />
            ) : (
              <div className="bg-white rounded-lg border">
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No contacts found"
                  description={
                    filters.search || filters.status
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by adding your first contact."
                  }
                  action={
                    !filters.search && !filters.status
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
        companies={companies}
        isEdit={!!editingContact}
      />

      <ImportDialog
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => {
          setIsImportOpen(false);
          refetchContacts();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contactToDelete?.firstName} {contactToDelete?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContactToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {bulkDeleteIds.length} Contacts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bulkDeleteIds.length} contacts? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkDeleteIds([])}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Contacts" subtitle="Loading..." />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-white rounded-lg border p-8">
              <LoadingState message="Loading contacts..." />
            </div>
          </main>
        </div>
      </div>
    }>
      <ContactsPageContent />
    </Suspense>
  );
}
