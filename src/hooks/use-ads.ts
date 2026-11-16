import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';

export interface Ad {
    id: number;
    name: string;
    title: string | null;
    subtitle: string | null;
    button_label: string | null;
    key: string;
    sort_order: number;
    ads_type: 'custom' | 'google_adsense';
    url: string | null;
    target: string;
    image: string | null;
    tablet_image: string | null;
    mobile_image: string | null;
    google_adsense_slot_id: string | null;
    location: string;
    banner_id: number | null;
    banner?: {
        id: number;
        name: string;
        type: 'desktop' | 'tablet' | 'mobile' | 'all';
        desktop_width: number;
        desktop_height: number;
        tablet_width: number;
        tablet_height: number;
        mobile_width: number;
        mobile_height: number;
    } | null;
    started_at: string | null;
    expired_at: string | null;
    is_scheduled: number;
    clicked: number;
    is_active: number;
    created_at: string;
    updated_at: string;
}

export const useAds = (params?: any) => {
    return useQuery({
        queryKey: queryKeys.ads.list(params ?? {}),
        queryFn: async () => {
            const res = await apiClient.get('/ads', { params });
            const raw = res.data.data;
            if (Array.isArray(raw)) return { data: raw, pagination: res.data.pagination };
            return { data: raw?.data || [], pagination: raw?.pagination || res.data.pagination };
        },
    });
};

export const useCreateAd = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<Ad>) => {
            const res = await apiClient.post('/ads', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ads.all });
            toast.success('Ad created successfully');
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.ads.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create ad');
        },
    });
};

export const useUpdateAd = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Ad> }) => {
            const res = await apiClient.put(`/ads/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ads.all });
            toast.success('Ad updated successfully');
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.ads.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update ad');
        },
    });
};

export const useDeleteAd = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiClient.delete(`/ads/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.ads.all });
            toast.success('Ad deleted successfully');
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.ads.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete ad');
        },
    });
};