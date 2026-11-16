import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, isApprovalRequired } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { toast } from "@/lib/toast";
import type {
  EmailConfig,
  CreateEmailConfigDto,
  UpdateEmailConfigDto,
} from "@/types";
import type { PaginatedResponse, PaginationParams } from "@/lib/api-client";

const emailConfigsApi = {
  getAll: async (
    params?: PaginationParams,
  ): Promise<PaginatedResponse<EmailConfig>> => {
    const response = await apiClient.get("/email-configs", { params });
    return response.data;
  },

  getById: async (id: number): Promise<EmailConfig> => {
    const response = await apiClient.get(`/email-configs/${id}`);
    return response.data.data.emailConfig;
  },

  create: async (data: CreateEmailConfigDto): Promise<EmailConfig> => {
    const response = await apiClient.post("/email-configs", data);
    return response.data.data.emailConfig;
  },

  update: async ({
    id,
    data,
  }: {
    id: number;
    data: UpdateEmailConfigDto;
  }): Promise<EmailConfig> => {
    const response = await apiClient.put(`/email-configs/${id}`, data);
    return response.data.data.emailConfig;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/email-configs/${id}`);
  },

  // ✅ UPDATED: Added template_id parameter
  testConnection: async ({
    id,
    test_email,
    template_id,
  }: {
    id: number;
    test_email?: string;
    template_id?: number;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/email-configs/${id}/test`, {
      test_email,
      template_id,
    });
    return response.data.data;
  },

  toggleActive: async (
    id: number,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.patch(`/email-configs/${id}/toggle`);
    return response.data;
  },
};

export function useEmailConfigs(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.emailConfigs.list(
      (params || {}) as Record<string, unknown>,
    ),
    queryFn: () => emailConfigsApi.getAll(params),
  });
}

export function useEmailConfig(id: number) {
  return useQuery({
    queryKey: queryKeys.emailConfigs.detail(id),
    queryFn: () => emailConfigsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailConfigsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailConfigs.lists(),
      });
      toast.success("Email configuration created successfully");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || "Failed to create email configuration");
    },
  });
}

export function useUpdateEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailConfigsApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailConfigs.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailConfigs.detail(variables.id),
      });
      toast.success("Email configuration updated successfully");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || "Failed to update email configuration");
    },
  });
}

export function useDeleteEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailConfigsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailConfigs.lists(),
      });
      toast.success("Email configuration deleted successfully");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || "Failed to delete email configuration");
    },
  });
}

export function useTestEmailConfig() {
  return useMutation({
    mutationFn: emailConfigsApi.testConnection,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Connection test successful");
      } else {
        toast.error(data.message || "Connection test failed");
      }
    },
    onError: (
      error: Error & { response?: { data?: { message?: string } } },
    ) => {
      toast.error(error.response?.data?.message || "Failed to test connection");
    },
  });
}

export function useToggleEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailConfigsApi.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailConfigs.lists(),
      });
      toast.success("Email configuration status updated");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || "Failed to update email configuration status");
    },
  });
}
