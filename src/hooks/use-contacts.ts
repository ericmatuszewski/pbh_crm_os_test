import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Contact, CreateContactInput } from "@/types";

interface ContactsResponse {
  success: boolean;
  data: Contact[];
  error?: { message: string };
}

interface ContactResponse {
  success: boolean;
  data: Contact;
  error?: { message: string };
}

// Fetch all contacts with optional filters
export function useContacts(filters?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: async (): Promise<Contact[]> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.status && filters.status !== "all") params.set("status", filters.status);

      const response = await fetch(`/api/contacts?${params.toString()}`);
      const data: ContactsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch contacts");
      }

      return data.data;
    },
  });
}

// Fetch single contact by ID
export function useContact(id: string) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: async (): Promise<Contact> => {
      const response = await fetch(`/api/contacts/${id}`);
      const data: ContactResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch contact");
      }

      return data.data;
    },
    enabled: !!id,
  });
}

// Create contact mutation
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContactInput): Promise<Contact> => {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data: ContactResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to create contact");
      }

      return data.data;
    },
    onSuccess: () => {
      // Invalidate contacts list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// Update contact mutation
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateContactInput> }): Promise<Contact> => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result: ContactResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to update contact");
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      // Update cache for specific contact
      queryClient.setQueryData(["contacts", variables.id], data);
      // Invalidate contacts list
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// Delete contact mutation
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to delete contact");
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["contacts", id] });
      // Invalidate contacts list
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// Prefetch contact for optimistic navigation
export function usePrefetchContact() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["contacts", id],
      queryFn: async () => {
        const response = await fetch(`/api/contacts/${id}`);
        const data: ContactResponse = await response.json();
        if (!data.success) throw new Error(data.error?.message);
        return data.data;
      },
    });
  };
}
