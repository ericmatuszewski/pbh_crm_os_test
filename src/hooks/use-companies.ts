import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Company } from "@/types";

interface CompaniesResponse {
  success: boolean;
  data: Company[];
  error?: { message: string };
}

interface CompanyResponse {
  success: boolean;
  data: Company;
  error?: { message: string };
}

interface CreateCompanyInput {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  address?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

// Fetch all companies
export function useCompanies(filters?: { search?: string }) {
  return useQuery({
    queryKey: ["companies", filters],
    queryFn: async (): Promise<Company[]> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);

      const response = await fetch(`/api/companies?${params.toString()}`);
      const data: CompaniesResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch companies");
      }

      return data.data;
    },
  });
}

// Fetch single company by ID
export function useCompany(id: string) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: async (): Promise<Company> => {
      const response = await fetch(`/api/companies/${id}`);
      const data: CompanyResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch company");
      }

      return data.data;
    },
    enabled: !!id,
  });
}

// Create company mutation
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyInput): Promise<Company> => {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data: CompanyResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to create company");
      }

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

// Update company mutation
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCompanyInput> }): Promise<Company> => {
      const response = await fetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result: CompanyResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to update company");
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["companies", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

// Delete company mutation
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to delete company");
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["companies", id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

// Prefetch company
export function usePrefetchCompany() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["companies", id],
      queryFn: async () => {
        const response = await fetch(`/api/companies/${id}`);
        const data: CompanyResponse = await response.json();
        if (!data.success) throw new Error(data.error?.message);
        return data.data;
      },
    });
  };
}
