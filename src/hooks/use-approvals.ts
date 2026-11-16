import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { ApprovalRequest, ApprovalFilters, CreateApprovalDto } from '@/types';
import type { PaginatedResponse } from '@/lib/api-client';

// API functions
const approvalsApi = {
  getAll: async (filters: ApprovalFilters = {}): Promise<PaginatedResponse<ApprovalRequest>> => {
    const params = new URLSearchParams();
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters.module_slug) params.append('module_slug', filters.module_slug);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/approvals?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<ApprovalRequest> => {
    const response = await apiClient.get(`/approvals/${id}`);
    return response.data.data;
  },

  getPendingCount: async (): Promise<number> => {
    const response = await apiClient.get('/approvals/pending');
    return response.data.count;
  },

  create: async (data: CreateApprovalDto): Promise<ApprovalRequest> => {
    const response = await apiClient.post('/approvals', data);
    return response.data.data;
  },

  approve: async ({ id, review_notes }: { id: number; review_notes?: string }): Promise<ApprovalRequest> => {
    const response = await apiClient.patch(`/approvals/${id}/approve`, { review_notes });
    return response.data.data;
  },

  reject: async ({ id, review_notes }: { id: number; review_notes?: string }): Promise<ApprovalRequest> => {
    const response = await apiClient.patch(`/approvals/${id}/reject`, { review_notes });
    return response.data.data;
  },

  cancel: async (id: number): Promise<void> => {
    await apiClient.delete(`/approvals/${id}`);
  },
};

/**
 * Get all approval requests
 */
export function useApprovals(filters: ApprovalFilters = {}) {
  return useQuery({
    queryKey: queryKeys.approvals.list(filters as Record<string, unknown>),
    queryFn: () => approvalsApi.getAll(filters),
  });
}

/**
 * Get single approval request
 */
export function useApprovalRequest(id: number) {
  return useQuery({
    queryKey: queryKeys.approvals.detail(id),
    queryFn: () => approvalsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Get pending approvals count
 */
export function usePendingCount() {
  return useQuery({
    queryKey: queryKeys.approvals.pending(),
    queryFn: approvalsApi.getPendingCount,
    refetchInterval: 60000, // Refetch every 60 seconds (reduced frequency)
    staleTime: 50000, // Consider data fresh for 50 seconds
  });
}

/**
 * Create approval request
 */
export function useCreateApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approvalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending() });
      toast.info('Approval request submitted');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to create approval request');
    },
  });
}

/**
 * Approve request
 */
export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approvalsApi.approve,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending() });
      toast.success('Request approved');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    },
  });
}

/**
 * Reject request
 */
export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approvalsApi.reject,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending() });
      toast.success('Request rejected');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    },
  });
}

/**
 * Cancel request (by requester)
 */
export function useCancelRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approvalsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending() });
      toast.success('Request cancelled');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    },
  });
}
