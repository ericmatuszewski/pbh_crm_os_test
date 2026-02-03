import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Deal } from "@/types";

interface DealsResponse {
  success: boolean;
  data: Deal[];
  error?: { message: string };
}

interface DealResponse {
  success: boolean;
  data: Deal;
  error?: { message: string };
}

interface CreateDealInput {
  title: string;
  value: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  pipelineId?: string;
  stageId?: string;
}

// Fetch all deals
export function useDeals(filters?: { search?: string; stage?: string; ownerId?: string }) {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: async (): Promise<Deal[]> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.stage) params.set("stage", filters.stage);
      if (filters?.ownerId) params.set("ownerId", filters.ownerId);

      const response = await fetch(`/api/deals?${params.toString()}`);
      const data: DealsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch deals");
      }

      return data.data;
    },
  });
}

// Fetch single deal by ID
export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: async (): Promise<Deal> => {
      const response = await fetch(`/api/deals/${id}`);
      const data: DealResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch deal");
      }

      return data.data;
    },
    enabled: !!id,
  });
}

// Create deal mutation
export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDealInput): Promise<Deal> => {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data: DealResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to create deal");
      }

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      // Also invalidate related contacts and companies
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

// Update deal mutation
export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateDealInput> }): Promise<Deal> => {
      const response = await fetch(`/api/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result: DealResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to update deal");
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["deals", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// Delete deal mutation
export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/deals/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to delete deal");
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["deals", id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// Prefetch deal
export function usePrefetchDeal() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["deals", id],
      queryFn: async () => {
        const response = await fetch(`/api/deals/${id}`);
        const data: DealResponse = await response.json();
        if (!data.success) throw new Error(data.error?.message);
        return data.data;
      },
    });
  };
}
