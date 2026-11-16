import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface Faq {
    id: number;
    company_id: number;
    faq_category_id: number;
    question: string;
    answer: string;
    sort_order: number;
    is_active: boolean | number;
    category?: {
        id: number;
        name: string;
    };
    created_at?: string;
    updated_at?: string;
}

export type CreateFaqDto = Omit<Faq, 'id' | 'company_id' | 'category' | 'created_at' | 'updated_at'>;
export type UpdateFaqDto = Partial<CreateFaqDto>;

const faqsApi = {
    getAll: async (params?: Record<string, any>): Promise<{ data: Faq[]; pagination: any }> => {
        const response = await apiClient.get('/faqs', { params: { page: 1, limit: 10, ...params } });
        return { data: response.data.data || [], pagination: response.data.pagination };
    },
    getById: async (id: number): Promise<Faq> => {
        const response = await apiClient.get(`/faqs/${id}`);
        return response.data.data?.faq || response.data.faq;
    },
    create: async (data: CreateFaqDto): Promise<Faq> => {
        const response = await apiClient.post('/faqs', data);
        return response.data.data?.faq || response.data.faq;
    },
    update: async ({ id, data }: { id: number; data: UpdateFaqDto }): Promise<Faq> => {
        const response = await apiClient.put(`/faqs/${id}`, data);
        return response.data.data?.faq || response.data.faq;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/faqs/${id}`);
    },
};

const QUERY_KEY = ['faqs'];

export function useFaqs(params?: Record<string, any>) {
    return useQuery({
        queryKey: [...QUERY_KEY, params ?? {}],
        queryFn: () => faqsApi.getAll(params),
    });
}

export function useFaq(id: number) {
    return useQuery({
        queryKey: [...QUERY_KEY, id],
        queryFn: () => faqsApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateFaq() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: faqsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('FAQ created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create FAQ');
        },
    });
}

export function useUpdateFaq() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: faqsApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, vars.id] });
            toast.success('FAQ updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update FAQ');
        },
    });
}

export function useDeleteFaq() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: faqsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('FAQ deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete FAQ');
        },
    });
}
