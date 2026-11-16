import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface WebsiteFaqCategory {
    id: number;
    company_id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export interface WebsiteFaq {
    id: number;
    company_id: number;
    faq_category_id: number;
    question: string;
    answer: string;
    tags: string | null;
    is_featured: boolean | number;
    sort_order: number;
    is_active: boolean | number;
    category?: {
        id: number;
        name: string;
        icon?: string;
        color?: string;
    } | null;
    created_at?: string;
    updated_at?: string;
}

export type CreateWebsiteFaqPayload = {
    faq_category_id: number;
    question: string;
    answer: string;
    tags?: string | null;
    is_featured?: boolean;
    sort_order?: number;
    is_active?: boolean;
};

export type UpdateWebsiteFaqPayload = Partial<CreateWebsiteFaqPayload>;

const QUERY_KEY = ['website-faqs'];

export function useWebsiteFaqs(params?: { search?: string; category_id?: string; is_active?: string }) {
    return useQuery({
        queryKey: [...QUERY_KEY, params ?? {}],
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/faqs', { params });
            return (res.data?.data || []) as WebsiteFaq[];
        },
        staleTime: 0,
        refetchOnMount: 'always',
    });
}

export function useWebsiteFaq(id?: number) {
    return useQuery({
        queryKey: [...QUERY_KEY, id],
        queryFn: async () => {
            if (!id) return null;
            const res = await apiClient.get(`/website-builder/faqs/${id}`);
            return (res.data?.data || null) as WebsiteFaq | null;
        },
        enabled: !!id,
        staleTime: 0,
        refetchOnMount: 'always',
    });
}

export function useCreateWebsiteFaq() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateWebsiteFaqPayload) => {
            const res = await apiClient.post('/website-builder/faqs', payload);
            return res.data?.data as WebsiteFaq;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, exact: false });
            queryClient.refetchQueries({ queryKey: QUERY_KEY, type: 'active' });
            toast.success('FAQ created successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create FAQ');
        },
    });
}

export function useUpdateWebsiteFaq() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateWebsiteFaqPayload }) => {
            const res = await apiClient.put(`/website-builder/faqs/${id}`, data);
            return res.data?.data as WebsiteFaq;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, exact: false });
            queryClient.refetchQueries({ queryKey: QUERY_KEY, type: 'active' });
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, vars.id] });
            toast.success('FAQ updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update FAQ');
        },
    });
}

export function useDeleteWebsiteFaq() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/website-builder/faqs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, exact: false });
            queryClient.refetchQueries({ queryKey: QUERY_KEY, type: 'active' });
            toast.success('FAQ deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete FAQ');
        },
    });
}
