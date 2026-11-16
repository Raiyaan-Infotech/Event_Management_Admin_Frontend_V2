import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { ActivityLog } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

interface ActivityLogParams extends PaginationParams {
  userId?: number;
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}

// API functions
const activityLogsApi = {
  getAll: async (params?: ActivityLogParams): Promise<PaginatedResponse<ActivityLog>> => {
    const response = await apiClient.get('/activity-logs', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ActivityLog> => {
    const response = await apiClient.get(`/activity-logs/${id}`);
    return response.data.data.log;
  },

  getByUser: async (userId: number, params?: PaginationParams): Promise<PaginatedResponse<ActivityLog>> => {
    const response = await apiClient.get(`/activity-logs/user/${userId}`, { params });
    return response.data;
  },

  clearOld: async (days: number): Promise<{ deleted: number }> => {
    const response = await apiClient.delete(`/activity-logs/clear`, { params: { days } });
    return response.data.data;
  },
};

// Get all activity logs with pagination and filters
export function useActivityLogs(params?: ActivityLogParams) {
  return useQuery({
    queryKey: queryKeys.activityLogs.list((params || {}) as Record<string, unknown>),
    queryFn: () => activityLogsApi.getAll(params),
  });
}

// Get single activity log
export function useActivityLog(id: number) {
  return useQuery({
    queryKey: queryKeys.activityLogs.detail(id),
    queryFn: () => activityLogsApi.getById(id),
    enabled: !!id,
  });
}

// Get activity logs for a specific user
export function useUserActivityLogs(userId: number, params?: PaginationParams) {
  return useQuery({
    queryKey: [...queryKeys.activityLogs.list((params || {}) as Record<string, unknown>), 'user', userId],
    queryFn: () => activityLogsApi.getByUser(userId, params),
    enabled: !!userId,
  });
}

// Clear old activity logs older than N days
export function useClearOldLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days: number) => activityLogsApi.clearOld(days),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs.lists() });
      toast.success(`Cleared ${data?.deleted ?? 0} old activity log entries`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to clear logs');
    },
  });
}
