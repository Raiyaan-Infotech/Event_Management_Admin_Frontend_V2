import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Module } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// API functions
const modulesApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Module>> => {
    const response = await apiClient.get('/modules', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Module> => {
    const response = await apiClient.get(`/modules/${id}`);
    return response.data.data.module;
  },

  toggleStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<Module> => {
    const response = await apiClient.put(`/modules/${id}`, { is_active });
    return response.data.data.module;
  },

  toggleApproval: async ({ id, requires_approval }: { id: number; requires_approval: boolean }): Promise<Module> => {
    const response = await apiClient.put(`/modules/${id}/approval`, { requires_approval });
    return response.data.data.module;
  },
};

// Get all modules with pagination
export function useModules(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.modules.list((params || {}) as Record<string, unknown>),
    queryFn: () => modulesApi.getAll(params),
  });
}

// Get single module with permissions
export function useModule(id: number) {
  return useQuery({
    queryKey: queryKeys.modules.detail(id),
    queryFn: () => modulesApi.getById(id),
    enabled: !!id,
  });
}

// Toggle module status
export function useToggleModuleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: modulesApi.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
      toast.success('Module status updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update module status');
    },
  });
}

// Toggle module requires approval
export function useToggleModuleApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: modulesApi.toggleApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
      toast.success('Module approval requirement updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update approval requirement');
    },
  });
}
