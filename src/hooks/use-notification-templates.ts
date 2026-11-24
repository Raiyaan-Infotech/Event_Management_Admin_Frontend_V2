import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Paginated } from '@/hooks/use-menu-management';

export type NotificationChannel = 'email' | 'whatsapp' | 'in_app' | 'push';
export type TemplateAudience = 'organizer' | 'guest' | 'participant' | 'contact_person';
export type WhatsAppCategory = 'utility' | 'authentication' | 'marketing';
export type WhatsAppHeaderType = 'none' | 'text';

export interface WhatsAppButton {
    type: 'url' | 'copy_code';
    text: string;
    url: string;
}

export interface NotificationTemplate {
    id: number;
    name: string;
    trigger_key: string | null;
    notification_category_id: number;
    event_category_id: number | null;
    description: string | null;
    audience: TemplateAudience | null;
    title: string | null;
    content: string | null;
    variables_used: string[] | null;
    image_url: string | null;
    action_url: string | null;
    channels: NotificationChannel[];
    email_subject: string | null;
    email_preheader: string | null;
    email_heading: string | null;
    email_body: string | null;
    email_button_label: string | null;
    email_button_url: string | null;
    email_footer: string | null;
    whatsapp_template_name: string | null;
    whatsapp_category: WhatsAppCategory | null;
    whatsapp_header_type: WhatsAppHeaderType;
    whatsapp_header_text: string | null;
    whatsapp_body: string | null;
    whatsapp_footer: string | null;
    whatsapp_buttons: WhatsAppButton[] | null;
    sample_values: Record<string, string> | null;
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

export interface TriggerSuggestion {
    email?: {
        subject: string; preheader: string; heading: string; body: string;
        button_label: string; button_url: string; footer: string;
    };
    whatsapp?: {
        template_name: string; category: WhatsAppCategory; header_type: WhatsAppHeaderType;
        header_text: string; body: string; footer: string; buttons: WhatsAppButton[];
    };
    in_app?: { title: string; content: string };
}

/** One row of the Transactional Notifications sheet (backend notificationCatalog.json). */
export interface SystemTrigger {
    key: string;
    label: string;
    section: string;
    audience: TemplateAudience;
    also?: TemplateAudience[];
    /** Channels Jamal ticked for this trigger. */
    channels: NotificationChannel[];
    /** true = the system already fires this trigger today. */
    live: boolean;
    variables: string[];
    suggested: TriggerSuggestion | null;
}

export interface TriggerSection {
    code: string;
    name: string;
    to: string;
}

export interface TemplateCounts {
    all: number;
    email: number;
    whatsapp: number;
    in_app: number;
}

export interface TestSendPayload {
    channels: NotificationChannel[];
    email?: string;
    dial_code?: string;
    mobile?: string;
    sample_values?: Record<string, string>;
}

export interface TestSendResult {
    status: 'sent' | 'failed' | 'skipped';
    message: string;
}

export type NotificationTemplatePayload = {
    name: string;
    description?: string | null;
    trigger_key?: string | null;
    audience?: TemplateAudience | null;
    notification_category_id: number;
    event_category_id?: number | null;
    title?: string | null;
    content?: string | null;
    image_url?: string | null;
    action_url?: string | null;
    channels?: NotificationChannel[];
    is_active?: boolean | number;
    email_subject?: string | null;
    email_preheader?: string | null;
    email_heading?: string | null;
    email_body?: string | null;
    email_button_label?: string | null;
    email_button_url?: string | null;
    email_footer?: string | null;
    whatsapp_template_name?: string | null;
    whatsapp_category?: WhatsAppCategory | null;
    whatsapp_header_type?: WhatsAppHeaderType;
    whatsapp_header_text?: string | null;
    whatsapp_body?: string | null;
    whatsapp_footer?: string | null;
    whatsapp_buttons?: WhatsAppButton[] | null;
    sample_values?: Record<string, string> | null;
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
    getSystemTriggers: async (): Promise<{ triggers: SystemTrigger[]; sections: TriggerSection[] }> => {
        const response = await apiClient.get('/notification-templates/system-triggers');
        return {
            triggers: response.data.data?.triggers ?? [],
            sections: response.data.data?.sections ?? [],
        };
    },
    getCounts: async (): Promise<TemplateCounts> => {
        const response = await apiClient.get('/notification-templates/counts');
        return response.data.data?.counts ?? { all: 0, email: 0, whatsapp: 0, in_app: 0 };
    },
    testSend: async ({ id, data }: { id: number; data: TestSendPayload }): Promise<Record<string, TestSendResult>> => {
        const response = await apiClient.post(`/notification-templates/${id}/test-send`, data);
        return response.data.data?.results ?? {};
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

export function useNotificationTemplateCounts() {
    return useQuery({
        queryKey: [...KEY, 'counts'],
        queryFn: api.getCounts,
    });
}

/** Sends to test recipients only; the result says per channel what happened. */
export function useTestSendNotificationTemplate() {
    return useMutation({
        mutationFn: api.testSend,
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to send the test message');
        },
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
