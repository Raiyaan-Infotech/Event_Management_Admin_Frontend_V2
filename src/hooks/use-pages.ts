import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { queryKeys } from '@/lib/query-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageTranslation {
    id: number;
    page_id: number;
    lang_code: string;
    name: string | null;
    content: string | null;
    description: string | null;
    seo_title: string | null;
    seo_description: string | null;
}

export interface Page {
    id: number;
    company_id: number | null;
    name: string;
    slug: string;
    template: string;
    content: string | null;       // JSON string of sections array
    description: string | null;
    featured_image: string | null;
    status: 0 | 1 | 2;
    is_featured: number;
    sort_order: number;
    seo_title: string | null;
    seo_description: string | null;
    seo_keywords: string | null;
    og_image: string | null;
    created_by: number | null;
    updated_by: number | null;
    created_at: string;
    updated_at: string;
    translations?: PageTranslation[];
}

export type CreatePageDto = {
    name: string;
    slug?: string;
    template?: string;
    content?: string | null;
    description?: string | null;
    featured_image?: string | null;
    status?: 0 | 1 | 2;
    is_featured?: number;
    sort_order?: number;
    seo_title?: string | null;
    seo_description?: string | null;
    seo_keywords?: string | null;
    og_image?: string | null;
};

export type UpdatePageDto = Partial<CreatePageDto>;

export interface PageListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: number;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
    [key: string]: unknown;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const pagesApi = {
    getAll: async (params?: PageListParams) => {
        const res = await apiClient.get('/pages', { params: { limit: 100, ...params } });
        return res.data.data ?? res.data;
    },
    getById: async (id: number | string): Promise<Page> => {
        const res = await apiClient.get(`/pages/${id}`);
        return res.data.data?.page ?? res.data.page;
    },
    create: async (data: CreatePageDto): Promise<Page> => {
        const res = await apiClient.post('/pages', data);
        return res.data.data?.page ?? res.data.page;
    },
    update: async ({ id, data }: { id: number; data: UpdatePageDto }): Promise<Page> => {
        const res = await apiClient.put(`/pages/${id}`, data);
        return res.data.data?.page ?? res.data.page;
    },
    updateStatus: async ({ id, status }: { id: number; status: 0 | 1 | 2 }): Promise<Page> => {
        const res = await apiClient.patch(`/pages/${id}/status`, { status });
        return res.data.data?.page ?? res.data.page;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/pages/${id}`);
    },
    getTranslations: async (id: number | string): Promise<PageTranslation[]> => {
        const res = await apiClient.get(`/pages/${id}/translations`);
        return res.data.data?.translations ?? [];
    },
    upsertTranslation: async ({
        pageId, lang, data,
    }: { pageId: number; lang: string; data: Partial<PageTranslation> }) => {
        const res = await apiClient.put(`/pages/${pageId}/translations/${lang}`, data);
        return res.data.data?.translation;
    },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePages(params?: PageListParams) {
    return useQuery({
        queryKey: queryKeys.pages.list(params ?? {}),
        queryFn: () => pagesApi.getAll(params),
    });
}

export function usePage(id: number | string) {
    return useQuery({
        queryKey: queryKeys.pages.detail(id),
        queryFn: () => pagesApi.getById(id),
        enabled: !!id,
    });
}

export function useCreatePage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: pagesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.pages.lists() });
            toast.success('Page created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.pages.lists() });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create page');
        },
    });
}

export function useUpdatePage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: pagesApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.pages.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(vars.id) });
            toast.success('Page updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.pages.lists() });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update page');
        },
    });
}

export function useUpdatePageStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: pagesApi.updateStatus,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.pages.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(vars.id) });
            toast.success('Page status updated');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeletePage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: pagesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.pages.lists() });
            toast.success('Page deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.pages.lists() });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete page');
        },
    });
}

export function usePageTranslations(pageId: number | string) {
    return useQuery({
        queryKey: queryKeys.pages.translations(pageId),
        queryFn: () => pagesApi.getTranslations(pageId),
        enabled: !!pageId,
    });
}

export function useUpsertPageTranslation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: pagesApi.upsertTranslation,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.pages.translations(vars.pageId) });
            toast.success('Translation saved');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save translation');
        },
    });
}

// ─── Blocks API ───────────────────────────────────────────────────────────────

export function useBlocks() {
    return useQuery({
        queryKey: ['blocks'],
        queryFn: async () => {
            const res = await apiClient.get('/blocks');
            return res.data?.data?.blocks ?? res.data?.blocks ?? [];
        },
    });
}
