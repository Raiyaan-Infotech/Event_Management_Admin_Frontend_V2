import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type {
  EmailCampaign,
  CreateEmailCampaignDto,
  UpdateEmailCampaignDto,
  Holiday,
  QueueStats,
  CampaignStatistics,
  VariableMapping,
} from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

const emailCampaignsApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<EmailCampaign>> => {
    const response = await apiClient.get('/email-campaigns', { params });
    return response.data;
  },

  getById: async (id: number): Promise<EmailCampaign> => {
    const response = await apiClient.get(`/email-campaigns/${id}`);
    return response.data.data.campaign;
  },

  create: async (data: CreateEmailCampaignDto): Promise<EmailCampaign> => {
    const response = await apiClient.post('/email-campaigns', data);
    return response.data.data.campaign;
  },

  update: async ({ id, data }: { id: number; data: UpdateEmailCampaignDto }): Promise<EmailCampaign> => {
    const response = await apiClient.put(`/email-campaigns/${id}`, data);
    return response.data.data.campaign;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/email-campaigns/${id}`);
  },

  getHolidays: async (): Promise<Holiday[]> => {
    const response = await apiClient.get('/email-campaigns/holidays');
    return response.data.data.holidays;
  },

  getVariableMappings: async (): Promise<Record<string, VariableMapping>> => {
    const response = await apiClient.get('/email-campaigns/variable-mappings');
    return response.data.data.mappings;
  },

  getStatistics: async (id: number): Promise<CampaignStatistics> => {
    const response = await apiClient.get(`/email-campaigns/${id}/statistics`);
    return response.data.data.statistics;
  },

  getQueueStats: async (): Promise<QueueStats> => {
    const response = await apiClient.get('/email-campaigns/queue/stats');
    return response.data.data.stats;
  },

  activate: async (id: number): Promise<EmailCampaign> => {
    const response = await apiClient.post(`/email-campaigns/${id}/activate`);
    return response.data.data.campaign;
  },

  pause: async (id: number): Promise<EmailCampaign> => {
    const response = await apiClient.post(`/email-campaigns/${id}/pause`);
    return response.data.data.campaign;
  },

  trigger: async (id: number): Promise<{ queued: number; skipped: number; errors: number }> => {
    const response = await apiClient.post(`/email-campaigns/${id}/trigger`);
    return response.data.data.result;
  },

  processQueue: async (): Promise<{ processed: number; sent: number; failed: number }> => {
    const response = await apiClient.post('/email-campaigns/queue/process');
    return response.data.data.result;
  },
};

export function useEmailCampaigns(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.list((params || {}) as Record<string, unknown>),
    queryFn: () => emailCampaignsApi.getAll(params),
  });
}

export function useEmailCampaign(id: number) {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.detail(id),
    queryFn: () => emailCampaignsApi.getById(id),
    enabled: !!id,
  });
}

export function useHolidays() {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.holidays(),
    queryFn: emailCampaignsApi.getHolidays,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useVariableMappings() {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.variableMappings(),
    queryFn: emailCampaignsApi.getVariableMappings,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useCampaignStatistics(id: number) {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.statistics(id),
    queryFn: () => emailCampaignsApi.getStatistics(id),
    enabled: !!id,
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.queueStats(),
    queryFn: emailCampaignsApi.getQueueStats,
    refetchInterval: 60000, // Refresh every 60 seconds (reduced frequency)
    staleTime: 50000, // Consider data fresh for 50 seconds
  });
}

export function useCreateEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailCampaignsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.lists() });
      toast.success('Email campaign created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create email campaign');
    },
  });
}

export function useUpdateEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailCampaignsApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.detail(variables.id) });
      toast.success('Email campaign updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update email campaign');
    },
  });
}

export function useDeleteEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailCampaignsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.lists() });
      toast.success('Email campaign deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete email campaign');
    },
  });
}

export function useActivateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailCampaignsApi.activate,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.detail(id) });
      toast.success('Campaign activated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to activate campaign');
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailCampaignsApi.pause,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.detail(id) });
      toast.success('Campaign paused successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to pause campaign');
    },
  });
}

export function useTriggerCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailCampaignsApi.trigger,
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.queueStats() });
      toast.success(`Campaign triggered: ${result.queued} emails queued, ${result.skipped} skipped`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to trigger campaign');
    },
  });
}

export function useProcessQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailCampaignsApi.processQueue,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.queueStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.lists() });
      toast.success(`Queue processed: ${result.sent} sent, ${result.failed} failed`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to process queue');
    },
  });
}
