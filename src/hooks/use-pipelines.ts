import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pipeline } from "@/types";

interface PipelinesResponse {
  success: boolean;
  data: Pipeline[];
  error?: { message: string };
}

interface PipelineResponse {
  success: boolean;
  data: Pipeline;
  error?: { message: string };
}

// Fetch all pipelines
export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: async (): Promise<Pipeline[]> => {
      const response = await fetch("/api/pipelines");
      const data: PipelinesResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch pipelines");
      }

      return data.data;
    },
  });
}

// Fetch single pipeline by ID
export function usePipeline(id: string) {
  return useQuery({
    queryKey: ["pipelines", id],
    queryFn: async (): Promise<Pipeline> => {
      const response = await fetch(`/api/pipelines/${id}`);
      const data: PipelineResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch pipeline");
      }

      return data.data;
    },
    enabled: !!id,
  });
}
