import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { queryKeys } from '@/lib/query-client';

export interface Testimonial {
    id: number;
    company_id: number;
    name: string;
    designation: string;
    content: string;
    image: string;
    sort_order: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export type CreateTestimonialDto = Omit<Testimonial, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
export type UpdateTestimonialDto = Partial<CreateTestimonialDto>;

const testimonialsApi = {
    getAll: async (params?: Record<string, any>): Promise<{ data: Testimonial[]; pagination: any }> => {
        const response = await apiClient.get('/testimonials', { params: { page: 1, limit: 10, ...params } });
        return { data: response.data.data || [], pagination: response.data.pagination };
    },
    getById: async (id: number | string): Promise<Testimonial> => {
        const response = await apiClient.get(`/testimonials/${id}`);
        return response.data.data?.testimonial || response.data.testimonial;
    },
    create: async (data: CreateTestimonialDto): Promise<Testimonial> => {
        const response = await apiClient.post('/testimonials', data);
        return response.data.data?.testimonial || response.data.testimonial;
    },
    update: async ({ id, data }: { id: number; data: UpdateTestimonialDto }): Promise<Testimonial> => {
        const response = await apiClient.put(`/testimonials/${id}`, data);
        return response.data.data?.testimonial || response.data.testimonial;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/testimonials/${id}`);
    },
};

const QUERY_KEY = queryKeys.testimonials.all;

export function useTestimonials(params?: Record<string, any>) {
    return useQuery({
        queryKey: [...QUERY_KEY, params ?? {}],
        queryFn: () => testimonialsApi.getAll(params),
    });
}

export function useTestimonial(id: number | string) {
    return useQuery({
        queryKey: queryKeys.testimonials.detail(id),
        queryFn: () => testimonialsApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateTestimonial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: testimonialsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Testimonial created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create testimonial');
        },
    });
}

export function useUpdateTestimonial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: testimonialsApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: queryKeys.testimonials.detail(vars.id) });
            toast.success('Testimonial updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update testimonial');
        },
    });
}

export function useDeleteTestimonial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: testimonialsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Testimonial deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete testimonial');
        },
    });
}
