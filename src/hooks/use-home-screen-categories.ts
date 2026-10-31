import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from 'sonner';

/**
 * Home Screen Categories - the style master for mobile app home screen templates
 * (Classic, Royal, Minimal...). Admin -> Template -> Home Screen Categories.
 * Separate from the invitation Template Categories.
 *
 * Backend: `/api/v1/home-screen-categories` (homeScreenCategory.service.js).
 */

/* ------------------------------------------------------------------ types -- */

export interface HomeScreenCategory {
    id: number;
    company_id: number | null;
    name: string;
    /** Derived from the name unless explicitly sent. Unique per company. */
    slug: string;
    sort_order: number;
    is_active: boolean | number;
    /** How many home screen templates use this category. Read-only. */
    templates_count?: number;
    has_pending_approval?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface Paginated<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    } | null;
}

export type HomeScreenCategoryPayload = {
    name: string;
    /**
     * Optional. Omit it and the backend derives one from the name.
     *
     * Sending it on an UPDATE regenerates it — renaming alone deliberately does
     * not, because templates are grouped by the slug and a silent
     * change stops them matching with no error.
     */
    slug?: string;
    sort_order?: number;
    is_active?: number;
};

/* -------------------------------------------------------------------- api -- */

const KEY = ['home-screen-categories'];
const PATH = '/home-screen-categories';

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<HomeScreenCategory>> => {
        const response = await apiClient.get(PATH, {
            params: { page: 1, limit: 10, ...params },
        });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getById: async (id: number | string): Promise<HomeScreenCategory> => {
        const response = await apiClient.get(`${PATH}/${id}`);
        return response.data.data?.category ?? response.data.data;
    },
    create: async (data: HomeScreenCategoryPayload): Promise<HomeScreenCategory> => {
        const response = await apiClient.post(PATH, data);
        return response.data.data?.category ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: HomeScreenCategoryPayload }): Promise<HomeScreenCategory> => {
        const response = await apiClient.put(`${PATH}/${id}`, data);
        return response.data.data?.category ?? response.data.data;
    },
    // One column per request — a switch flip must not round-trip the whole row.
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<HomeScreenCategory> => {
        const response = await apiClient.patch(`${PATH}/${id}/status`, { is_active });
        return response.data.data?.category ?? response.data.data;
    },
    reorder: async (items: Array<{ id: number; sort_order: number }>): Promise<{ updated: number }> => {
        const response = await apiClient.patch(`${PATH}/reorder`, { items });
        return response.data.data;
    },
    remove: async (id: number): Promise<{ orphaned_templates?: number } & Record<string, unknown>> => {
        const response = await apiClient.delete(`${PATH}/${id}`);
        return { ...(response.data.data ?? {}), message: response.data.message };
    },
};

function categoryError(queryClient: ReturnType<typeof useQueryClient>, verb: string) {
    return (error: any) => {
        // An approval-gated action is not a failure — the request was recorded.
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} category`);
    };
}

/* ------------------------------------------------------------------ hooks -- */

export function useHomeScreenCategories(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: [...KEY, params ?? {}],
        queryFn: () => api.getAll(params),
    });
}

export function useHomeScreenCategory(id: number | string | undefined) {
    return useQuery({
        queryKey: [...KEY, 'detail', id],
        queryFn: () => api.getById(id!),
        enabled: !!id,
    });
}

export function useCreateHomeScreenCategory(onSuccess?: (category: HomeScreenCategory) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (category) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['home-screen-templates'], refetchType: 'all' });
            toast.success('Category created successfully');
            onSuccess?.(category);
        },
        onError: categoryError(queryClient, 'create'),
    });
}

export function useUpdateHomeScreenCategory(onSuccess?: (category: HomeScreenCategory) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (category) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['home-screen-templates'], refetchType: 'all' });
            toast.success('Category updated successfully');
            onSuccess?.(category);
        },
        onError: categoryError(queryClient, 'update'),
    });
}

export function useUpdateHomeScreenCategoryStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['home-screen-templates'], refetchType: 'all' });
        },
        onError: categoryError(queryClient, 'update'),
    });
}

/**
 * Persists a drag-and-drop reorder.
 *
 * Without this the drag is local state that a refresh throws away — a control
 * that appears to work and does not, which is worse than not having it.
 */
export function useReorderHomeScreenCategories() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.reorder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Category order updated');
        },
        onError: categoryError(queryClient, 'reorder'),
    });
}

export function useDeleteHomeScreenCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['home-screen-templates'], refetchType: 'all' });
            toast.success((result as any)?.message || 'Category deleted successfully');
        },
        onError: categoryError(queryClient, 'delete'),
    });
}
