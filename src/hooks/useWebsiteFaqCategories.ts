import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { WebsiteFaqCategory } from './useWebsiteFaqs';

export type CreateWebsiteFaqCategoryPayload = {
    name: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    sort_order?: number;
    is_active?: boolean;
};

export type UpdateWebsiteFaqCategoryPayload = Partial<CreateWebsiteFaqCategoryPayload>;

const QUERY_KEY = ['website-faq-categories'];

export function useWebsiteFaqCategories() {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/faq-categories');
            return (res.data?.data || []) as WebsiteFaqCategory[];
        },
        staleTime: 0,
        refetchOnMount: 'always',
    });
}

export function useCreateWebsiteFaqCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateWebsiteFaqCategoryPayload) => {
            const res = await apiClient.post('/website-builder/faq-categories', payload);
            return res.data?.data as WebsiteFaqCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, exact: false });
            queryClient.refetchQueries({ queryKey: QUERY_KEY, type: 'active' });
            queryClient.invalidateQueries({ queryKey: ['website-faqs'], exact: false });
            queryClient.refetchQueries({ queryKey: ['website-faqs'], type: 'active' });
            toast.success('FAQ Category created successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create FAQ Category');
        },
    });
}

export function useUpdateWebsiteFaqCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateWebsiteFaqCategoryPayload }) => {
            const res = await apiClient.put(`/website-builder/faq-categories/${id}`, data);
            return res.data?.data as WebsiteFaqCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, exact: false });
            queryClient.refetchQueries({ queryKey: QUERY_KEY, type: 'active' });
            queryClient.invalidateQueries({ queryKey: ['website-faqs'], exact: false });
            queryClient.refetchQueries({ queryKey: ['website-faqs'], type: 'active' });
            toast.success('FAQ Category updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update FAQ Category');
        },
    });
}

export function useDeleteWebsiteFaqCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/website-builder/faq-categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, exact: false });
            queryClient.refetchQueries({ queryKey: QUERY_KEY, type: 'active' });
            queryClient.invalidateQueries({ queryKey: ['website-faqs'], exact: false });
            queryClient.refetchQueries({ queryKey: ['website-faqs'], type: 'active' });
            toast.success('FAQ Category deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete FAQ Category');
        },
    });
}
