import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';

export interface FaqCategory {
    id: number;
    company_id: number;
    name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export type CreateFaqCategoryDto = Omit<FaqCategory, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
export type UpdateFaqCategoryDto = Partial<CreateFaqCategoryDto>;

const faqCategoriesApi = {
    getAll: async (params?: Record<string, any>): Promise<{ data: FaqCategory[]; pagination: any }> => {
        const response = await apiClient.get('/faq-categories', { params: { page: 1, limit: 10, ...params } });
        return { data: response.data.data || [], pagination: response.data.pagination };
    },
    getById: async (id: number): Promise<FaqCategory> => {
        const response = await apiClient.get(`/faq-categories/${id}`);
        return response.data.data?.faqCategory || response.data.faqCategory;
    },
    create: async (data: CreateFaqCategoryDto): Promise<FaqCategory> => {
        const response = await apiClient.post('/faq-categories', data);
        return response.data.data?.faqCategory || response.data.faqCategory;
    },
    update: async ({ id, data }: { id: number; data: UpdateFaqCategoryDto }): Promise<FaqCategory> => {
        const response = await apiClient.put(`/faq-categories/${id}`, data);
        return response.data.data?.faqCategory || response.data.faqCategory;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: number }): Promise<FaqCategory> => {
        const response = await apiClient.patch(`/faq-categories/${id}/status`, { is_active });
        return response.data.data?.faqCategory || response.data.faqCategory;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/faq-categories/${id}`);
    },
};

export function useFaqCategories(params?: Record<string, any>) {
    return useQuery({
        queryKey: queryKeys.faqCategories.list(params ?? {}),
        queryFn: () => faqCategoriesApi.getAll(params),
        staleTime: 2 * 60 * 1000,
    });
}

export function useFaqCategory(id: number) {
    return useQuery({
        queryKey: queryKeys.faqCategories.detail(id),
        queryFn: () => faqCategoriesApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateFaqCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: faqCategoriesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories.all });
            toast.success('FAQ Category created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create FAQ Category');
        },
    });
}

export function useUpdateFaqCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: faqCategoriesApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories.detail(vars.id) });
            toast.success('FAQ Category updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update FAQ Category');
        },
    });
}

export function useUpdateFaqCategoryStatus() {
    const queryClient = useQueryClient();
    return useMutation<FaqCategory, any, { id: number; is_active: number }>({
        mutationFn: faqCategoriesApi.updateStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories.all });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteFaqCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: faqCategoriesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories.all });
            toast.success('FAQ Category deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete FAQ Category');
        },
    });
}