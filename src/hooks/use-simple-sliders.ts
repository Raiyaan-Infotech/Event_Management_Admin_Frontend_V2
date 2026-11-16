import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { queryKeys } from '@/lib/query-client';

export interface SlideItem {
    id: string;
    title: string;
    subtitle?: string;
    link?: string;
    button_label?: string;
    description?: string;
    image: string;
    tablet_image?: string;
    mobile_image?: string;
    bg_color?: string;
    is_light_bg?: boolean;
    sort_order: number;
    is_active: 0 | 1; // 0=inactive/draft, 1=active
}

export interface SimpleSlider {
    id: number;
    name: string;
    key: string;
    description?: string;
    is_active: 0 | 1 | 2; // 0=inactive/draft, 1=active/published, 2=pending approval
    slider_items: SlideItem[];
    company_id: number;
    created_at: string;
    updated_at: string;
}

export interface GetSimpleSlidersParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    is_active?: number;
}

const simpleSlidersApi = {
    getAll: async (params?: GetSimpleSlidersParams) => {
        const response = await apiClient.get('/simple-sliders', { params });
        return response.data.data;
    },
    getById: async (id: string | number): Promise<SimpleSlider> => {
        const response = await apiClient.get(`/simple-sliders/${id}`);
        return response.data.data?.slider || response.data.data;
    },
    create: async (payload: Partial<SimpleSlider>): Promise<SimpleSlider> => {
        const response = await apiClient.post('/simple-sliders', payload);
        return response.data.data?.slider || response.data.data;
    },
    update: async ({ id, payload }: { id: number; payload: Partial<SimpleSlider> }): Promise<SimpleSlider> => {
        const response = await apiClient.put(`/simple-sliders/${id}`, payload);
        return response.data.data?.slider || response.data.data;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/simple-sliders/${id}`);
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: 0 | 1 }): Promise<SimpleSlider> => {
        const response = await apiClient.patch(`/simple-sliders/${id}/status`, { is_active });
        return response.data.data?.slider || response.data.data;
    },
};

export const useSimpleSliders = (params?: GetSimpleSlidersParams) => {
    return useQuery({
        queryKey: queryKeys.simpleSliders.list((params || {}) as Record<string, unknown>),
        queryFn: () => simpleSlidersApi.getAll(params),
    });
};

export const useSimpleSlider = (id: string | number) => {
    return useQuery({
        queryKey: queryKeys.simpleSliders.detail(id),
        queryFn: () => simpleSlidersApi.getById(id),
        enabled: !!id && id !== 'new',
    });
};

export const useCreateSimpleSlider = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: simpleSlidersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.all });
            toast.success('Simple Slider created successfully');
        },
        onError: (error: unknown) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.all });
                return;
            }
            const err = error as any;
            toast.error(err?.response?.data?.message || 'Failed to create slider');
        },
    });
};

export const useUpdateSimpleSlider = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: simpleSlidersApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.detail(vars.id) });
            toast.success('Simple Slider updated successfully');
        },
        onError: (error: unknown, vars) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.all });
                queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.detail(vars.id) });
                return;
            }
            const err = error as any;
            toast.error(err?.response?.data?.message || 'Failed to update slider');
        },
    });
};

export const useDeleteSimpleSlider = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: simpleSlidersApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.all });
            toast.success('Simple Slider deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete slider');
        },
    });
};

export const useUpdateSimpleSliderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: simpleSlidersApi.updateStatus,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.simpleSliders.detail(vars.id) });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
};
