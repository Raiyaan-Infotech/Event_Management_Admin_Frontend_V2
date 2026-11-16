import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/**
 * Template categories — the DESIGN family a template or a frame belongs to
 * (Elegant, Floral, Minimal, Traditional, Royal).
 *
 * ── NOT ANY OF THE OTHER "CATEGORY" HOOKS ────────────────────────────────────
 * `use-event-categories`   what KIND OF EVENT it is — Wedding, Birthday.
 * Website Builder's own template categories live under
 * `/admin/website-builder/templates/categories` and describe WEBSITE themes.
 *
 * This one says nothing about the event: a Floral frame suits a wedding and a
 * birthday alike.
 *
 * Backend: `/api/v1/template-categories` (templateCategory.service.js).
 */

/* ------------------------------------------------------------------ types -- */

export interface TemplateCategory {
    id: number;
    company_id: number | null;
    name: string;
    /** Derived from the name unless explicitly sent. Unique per company. */
    slug: string;
    sort_order: number;
    is_active: boolean | number;
    /** How many frame styles are filed under this category. Read-only. */
    frame_styles_count?: number;
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

export type TemplateCategoryPayload = {
    name: string;
    /**
     * Optional. Omit it and the backend derives one from the name.
     *
     * Sending it on an UPDATE regenerates it — renaming alone deliberately does
     * not, because frames and templates are filtered by the slug and a silent
     * change stops them matching with no error.
     */
    slug?: string;
    sort_order?: number;
    is_active?: number;
};

/* -------------------------------------------------------------------- api -- */

const KEY = ['template-categories'];
const PATH = '/template-categories';

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<TemplateCategory>> => {
        const response = await apiClient.get(PATH, {
            params: { page: 1, limit: 10, ...params },
        });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getById: async (id: number | string): Promise<TemplateCategory> => {
        const response = await apiClient.get(`${PATH}/${id}`);
        return response.data.data?.category ?? response.data.data;
    },
    create: async (data: TemplateCategoryPayload): Promise<TemplateCategory> => {
        const response = await apiClient.post(PATH, data);
        return response.data.data?.category ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: TemplateCategoryPayload }): Promise<TemplateCategory> => {
        const response = await apiClient.put(`${PATH}/${id}`, data);
        return response.data.data?.category ?? response.data.data;
    },
    // One column per request — a switch flip must not round-trip the whole row.
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<TemplateCategory> => {
        const response = await apiClient.patch(`${PATH}/${id}/status`, { is_active });
        return response.data.data?.category ?? response.data.data;
    },
    reorder: async (items: Array<{ id: number; sort_order: number }>): Promise<{ updated: number }> => {
        const response = await apiClient.patch(`${PATH}/reorder`, { items });
        return response.data.data;
    },
    remove: async (id: number): Promise<{ orphaned_frame_styles?: number } & Record<string, unknown>> => {
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

export function useTemplateCategories(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: [...KEY, params ?? {}],
        queryFn: () => api.getAll(params),
    });
}

export function useTemplateCategory(id: number | string | undefined) {
    return useQuery({
        queryKey: [...KEY, 'detail', id],
        queryFn: () => api.getById(id!),
        enabled: !!id,
    });
}

export function useCreateTemplateCategory(onSuccess?: (category: TemplateCategory) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (category) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            // Frame style rows render the category as a badge, so a rename or a
            // new category has to reach that list too.
            queryClient.invalidateQueries({ queryKey: ['frame-styles'], refetchType: 'all' });
            toast.success('Category created successfully');
            onSuccess?.(category);
        },
        onError: categoryError(queryClient, 'create'),
    });
}

export function useUpdateTemplateCategory(onSuccess?: (category: TemplateCategory) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (category) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['frame-styles'], refetchType: 'all' });
            toast.success('Category updated successfully');
            onSuccess?.(category);
        },
        onError: categoryError(queryClient, 'update'),
    });
}

export function useUpdateTemplateCategoryStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['frame-styles'], refetchType: 'all' });
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
export function useReorderTemplateCategories() {
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

export function useDeleteTemplateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['frame-styles'], refetchType: 'all' });
            // The backend's message names how many frame styles became
            // uncategorised, which is the part worth reading.
            toast.success((result as any)?.message || 'Category deleted successfully');
        },
        onError: categoryError(queryClient, 'delete'),
    });
}
