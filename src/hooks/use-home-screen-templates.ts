import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from 'sonner';

/**
 * Home Screen Templates — the mobile app's event home screen design per event
 * category (Template → Home Screen Templates).
 *
 * Backend: `/api/v1/home-screen-templates` (homeScreenTemplate.service.js).
 */

/** Colour roles in order — MUST match COLOR_ROLES in the backend service. */
export const COLOR_ROLES = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' },
    { key: 'background', label: 'Background' },
    { key: 'text', label: 'Text' },
] as const;

export type ColorRoleKey = (typeof COLOR_ROLES)[number]['key'];

export interface TemplateColor {
    key: ColorRoleKey;
    label: string;
    hex: string;
}

export interface HomeScreenTemplate {
    id: number;
    name: string;
    description: string | null;
    event_category_id: number | null;
    template_category_id: number | null;
    image_url: string | null;
    image_name: string | null;
    image_size: number | null;
    color_count: number;
    colors: TemplateColor[];
    notes: string | null;
    /** 1 active, 0 inactive, 2 pending approval. */
    is_active: number | boolean;
    sort_order: number;
    eventCategory?: { id: number; name: string; icon?: string | null } | null;
    style?: { id: number; name: string; slug: string } | null;
    creator?: { id: number; full_name: string } | null;
    updater?: { id: number; full_name: string } | null;
    has_pending_approval?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface HomeScreenTemplateStats {
    total: number;
    active: number;
    inactive: number;
}

export type HomeScreenTemplatePayload = {
    name: string;
    description: string;
    event_category_id: number;
    template_category_id: number;
    image_url: string;
    image_name?: string | null;
    image_size?: number | null;
    color_count: number;
    colors: { key: string; hex: string }[];
    notes?: string | null;
    is_active?: number;
};

interface Paginated<T> {
    data: T[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number } | null;
}

const KEY = ['home-screen-templates'];
const PATH = '/home-screen-templates';

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<HomeScreenTemplate>> => {
        const response = await apiClient.get(PATH, { params: { page: 1, limit: 10, ...params } });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getStats: async (): Promise<HomeScreenTemplateStats> => {
        const response = await apiClient.get(`${PATH}/stats`);
        return response.data.data?.stats ?? { total: 0, active: 0, inactive: 0 };
    },
    getById: async (id: number | string): Promise<HomeScreenTemplate> => {
        const response = await apiClient.get(`${PATH}/${id}`);
        return response.data.data?.homeScreenTemplate ?? response.data.data;
    },
    create: async (data: HomeScreenTemplatePayload): Promise<HomeScreenTemplate> => {
        const response = await apiClient.post(PATH, data);
        return response.data.data?.homeScreenTemplate ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: HomeScreenTemplatePayload }): Promise<HomeScreenTemplate> => {
        const response = await apiClient.put(`${PATH}/${id}`, data);
        return response.data.data?.homeScreenTemplate ?? response.data.data;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }) => {
        const response = await apiClient.patch(`${PATH}/${id}/status`, { is_active });
        return response.data.data?.homeScreenTemplate ?? response.data.data;
    },
    remove: async (id: number): Promise<void> => {
        await apiClient.delete(`${PATH}/${id}`);
    },
};

function onError(queryClient: ReturnType<typeof useQueryClient>, verb: string) {
    return (error: any) => {
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} template`);
    };
}

export function useHomeScreenTemplates(params?: Record<string, unknown>) {
    return useQuery({ queryKey: [...KEY, params ?? {}], queryFn: () => api.getAll(params) });
}

export function useHomeScreenTemplateStats() {
    return useQuery({ queryKey: [...KEY, 'stats'], queryFn: api.getStats });
}

export function useHomeScreenTemplate(id: number | string | undefined) {
    return useQuery({
        queryKey: [...KEY, 'detail', id],
        queryFn: () => api.getById(id!),
        enabled: !!id,
    });
}

/** `onSuccess` is a callback — navigation belongs to the component. */
export function useCreateHomeScreenTemplate(onSuccess?: (row: HomeScreenTemplate) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (row) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Template created successfully');
            onSuccess?.(row);
        },
        onError: onError(queryClient, 'create'),
    });
}

export function useUpdateHomeScreenTemplate(onSuccess?: (row: HomeScreenTemplate) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (row) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Template updated successfully');
            onSuccess?.(row);
        },
        onError: onError(queryClient, 'update'),
    });
}

export function useUpdateHomeScreenTemplateStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
        onError: onError(queryClient, 'update'),
    });
}

export function useDeleteHomeScreenTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Template deleted successfully');
        },
        onError: onError(queryClient, 'delete'),
    });
}

/** `#abc` → `#AABBCC`; invalid → null. Mirrors the backend. */
export const normaliseHex = (raw: string): string | null => {
    const body = String(raw || '').trim().replace(/^#/, '');
    if (!/^[0-9a-fA-F]+$/.test(body)) return null;
    if (body.length === 3) return `#${body.split('').map((c) => c + c).join('').toUpperCase()}`;
    if (body.length === 6) return `#${body.toUpperCase()}`;
    return null;
};
