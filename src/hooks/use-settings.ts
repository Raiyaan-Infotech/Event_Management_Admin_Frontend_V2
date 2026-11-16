import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Setting, UpdateSettingDto, BulkUpdateSettingsDto } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// API functions
const settingsApi = {
  getPublic: async (): Promise<Record<string, string>> => {
    const response = await apiClient.get('/settings/public');
    return response.data.data.settings;
  },

  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Setting>> => {
    const response = await apiClient.get('/settings', { params });
    return response.data;
  },

  getByGroup: async (group: string): Promise<Setting[]> => {
    const response = await apiClient.get(`/settings/group/${group}`);
    return response.data.data.settings;
  },

  getByKey: async (key: string): Promise<Setting> => {
    const response = await apiClient.get(`/settings/${key}`);
    return response.data.data.setting;
  },

  update: async ({ key, data }: { key: string; data: UpdateSettingDto }): Promise<Setting> => {
    const response = await apiClient.put(`/settings/${key}`, data);
    return response.data.data.setting;
  },

  bulkUpdate: async (data: BulkUpdateSettingsDto): Promise<Setting[]> => {
    const response = await apiClient.post('/settings/bulk', data);
    return response.data.data.settings;
  },
};

// Get public settings (for frontend use)
export function usePublicSettings() {
  return useQuery({
    queryKey: queryKeys.settings.public(),
    queryFn: settingsApi.getPublic,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Get all settings with pagination
export function useSettings(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.settings.list((params || {}) as Record<string, unknown>),
    queryFn: () => settingsApi.getAll(params),
  });
}

// Get settings by group
export function useSettingsByGroup(group: string) {
  return useQuery({
    queryKey: queryKeys.settings.group(group),
    queryFn: () => settingsApi.getByGroup(group),
    enabled: !!group,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

// Get single setting by key
export function useSetting(key: string) {
  return useQuery({
    queryKey: queryKeys.settings.detail(key),
    queryFn: () => settingsApi.getByKey(key),
    enabled: !!key,
  });
}

// Update setting mutation
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      toast.success('Setting updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update setting');
    },
  });
}

// Bulk update settings mutation
export function useBulkUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.bulkUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      toast.success('Settings updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });
}
