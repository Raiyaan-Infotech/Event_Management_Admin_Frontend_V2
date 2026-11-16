import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Paginated } from '@/hooks/use-menu-management';

export type NotificationChannel = 'in_app' | 'push';

export interface NotificationTemplate {
    id: number;
    name: string;
    trigger_key: string | null;
    notification_category_id: number;
    event_category_id: number | null;
    title: string;
    content: string;
    variables_used: string[] | null;
    image_url: string | null;
    channels: NotificationChannel[];
    is_active: boolean | number;
    sort_order: number;
    has_pending_approval?: boolean;
    notificationCategory?: { id: number; name: string; icon: string | null; color: string | null } | null;
    category?: { id: number; name: string } | null;
    created_at: string;
    updated_at?: string;
}

export interface NotificationVariable {
    key: string;
    label: string;
}

export interface SystemTrigger {
    key: string;
    label: string;
}

export type NotificationTemplatePayload = {
    name: string;
    trigger_key?: string | null;
    notification_category_id: number;
    event_category_id?: number | null;
    title: string;
    content: string;
    image_url?: string | null;
    channels?: NotificationChannel[];
    is_active?: boolean | number;
};

const KEY = ['notification-templates'];

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<NotificationTemplate>> => {
        const response = await apiClient.get('/notification-templates', { params: { page: 1, limit: 10, ...params } });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getById: async (id: number | string): Promise<NotificationTemplate> => {
        const response = await apiClient.get(`/notification-templates/${id}`);
        return response.data.data?.template ?? response.data.data;
    },
    getVariables: async (): Promise<NotificationVariable[]> => {
        const response = await apiClient.get('/notification-templates/variables');
        return response.data.data?.variables ?? [];
    },
    getSystemTriggers: async (): Promise<SystemTrigger[]> => {
        const response = await apiClient.get('/notification-templates/system-triggers');
        return response.data.data?.triggers ?? [];
    },
    create: async (data: NotificationTemplatePayload): Promise<NotificationTemplate> => {
        const response = await apiClient.post('/notification-templates', data);
        return response.data.data?.template ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: Partial<NotificationTemplatePayload> }): Promise<NotificationTemplate> => {
        const response = await apiClient.put(`/notification-templates/${id}`, data);
        return response.data.data?.template ?? response.data.data;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<NotificationTemplate> => {
        const response = await apiClient.patch(`/notification-templates/${id}/status`, { is_active });
        return response.data.data?.template ?? response.data.data;
    },
    duplicate: async (id: number): Promise<NotificationTemplate> => {
        const response = await apiClient.post(`/notification-templates/${id}/duplicate`);
        return response.data.data?.template ?? response.data.data;
    },
    remove: async (id: number): Promise<void> => {
        await apiClient.delete(`/notification-templates/${id}`);
    },
};

const onError = (queryClient: ReturnType<typeof useQueryClient>, verb: string) =>
    (error: any) => {
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} notification template`);
    };

export function useNotificationTemplates(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: [...KEY, params ?? {}],
        queryFn: () => api.getAll(params),
    });
}

export function useNotificationTemplate(id: number | string | undefined) {
    return useQuery({
        queryKey: ['notification-templates', 'detail', id],
        queryFn: () => api.getById(id!),
        enabled: !!id,
    });
}

export function useNotificationVariables() {
    return useQuery({
        queryKey: ['notification-templates', 'variables'],
        queryFn: api.getVariables,
        staleTime: Infinity,
    });
}

export function useSystemTriggers() {
    return useQuery({
        queryKey: ['notification-templates', 'system-triggers'],
        queryFn: api.getSystemTriggers,
        staleTime: Infinity,
    });
}

export function useCreateNotificationTemplate(onSuccess?: (template: NotificationTemplate) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (template) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Notification template created successfully');
            onSuccess?.(template);
        },
        onError: onError(queryClient, 'create'),
    });
}

export function useUpdateNotificationTemplate(onSuccess?: (template: NotificationTemplate) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (template, vars) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['notification-templates', 'detail', vars.id] });
            toast.success('Notification template updated successfully');
            onSuccess?.(template);
        },
        onError: onError(queryClient, 'update'),
    });
}

export function useUpdateNotificationTemplateStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
        onError: onError(queryClient, 'update'),
    });
}

export function useDuplicateNotificationTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.duplicate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Notification template duplicated successfully');
        },
        onError: onError(queryClient, 'duplicate'),
    });
}

export function useDeleteNotificationTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Notification template deleted successfully');
        },
        onError: onError(queryClient, 'delete'),
    });
}
