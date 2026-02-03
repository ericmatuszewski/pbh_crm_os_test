import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Quote } from "@/types";

interface QuotesResponse {
  success: boolean;
  data: Quote[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
  error?: { message: string };
}

interface QuoteResponse {
  success: boolean;
  data: Quote;
  error?: { message: string };
}

// Fetch all quotes with optional filters
export function useQuotes(filters?: { search?: string; status?: string; businessId?: string }) {
  return useQuery({
    queryKey: ["quotes", filters],
    queryFn: async (): Promise<Quote[]> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.status) params.set("status", filters.status);

      const headers: Record<string, string> = {};
      if (filters?.businessId) {
        headers["x-business-id"] = filters.businessId;
      }

      const response = await fetch(`/api/quotes?${params.toString()}`, { headers });
      const data: QuotesResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch quotes");
      }

      return data.data;
    },
  });
}

// Fetch single quote by ID
export function useQuote(id: string) {
  return useQuery({
    queryKey: ["quotes", id],
    queryFn: async (): Promise<Quote> => {
      const response = await fetch(`/api/quotes/${id}`);
      const data: QuoteResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch quote");
      }

      return data.data;
    },
    enabled: !!id,
  });
}

// Delete quote mutation
export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/quotes/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to delete quote");
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

// Update quote status mutation
export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }): Promise<Quote> => {
      const response = await fetch(`/api/quotes/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data: QuoteResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to update quote status");
      }

      return data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["quotes", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}
