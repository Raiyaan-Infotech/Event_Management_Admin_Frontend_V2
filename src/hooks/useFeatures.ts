import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface FeatureItem {
    id?: number | string;
    title: string;
    description?: string;
    short_description: string;
    detailed_description?: string;
    icon: string;
    custom_icon_url?: string;
    feature_image_url?: string;
    image_url?: string;
    bullet_points_json: string[];
    show_in_menu: boolean;
    menu_order: number;
    status: 'Active' | 'Inactive' | 'Draft';
    sort_order?: number;
    is_active?: boolean;
    created_by?: string;
    created_on?: string;
}

export function useFeaturesData() {
    return useQuery({
        queryKey: ['website-builder-features'],
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/features');
            return res.data.data as FeatureItem[];
        },
    });
}

export function useCreateFeature() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: FeatureItem) => {
            const res = await apiClient.post('/website-builder/features', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Feature created successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error creating feature.');
        },
    });
}

export function useUpdateFeature() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string | number; payload: Partial<FeatureItem> }) => {
            const res = await apiClient.put(`/website-builder/features/${id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Feature updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error updating feature.');
        },
    });
}

export function useDeleteFeature() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string | number) => {
            const res = await apiClient.delete(`/website-builder/features/${id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Feature deleted successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error deleting feature.');
        },
    });
}

export function useSaveFeaturesList() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (items: FeatureItem[]) => {
            const res = await apiClient.put('/website-builder/features', { items });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Features list saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error saving features.');
        },
    });
}

export function useToggleFeatureStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, is_active, status }: { id: string | number; is_active?: boolean; status?: string }) => {
            try {
                const res = await apiClient.patch(`/website-builder/features/${id}/status`, { is_active, status });
                return res.data;
            } catch (err: any) {
                if (err?.response?.status === 404) {
                    const res = await apiClient.put(`/website-builder/features/${id}`, { is_active, status });
                    return res.data;
                }
                throw err;
            }
        },
        onSuccess: () => {
            toast.success('Feature status updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error updating feature status.');
        },
    });
}

export function useToggleFeatureMenu() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, show_in_menu }: { id: string | number; show_in_menu: boolean }) => {
            const res = await apiClient.put(`/website-builder/features/${id}`, { show_in_menu });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Menu visibility updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error updating menu visibility.');
        },
    });
}
