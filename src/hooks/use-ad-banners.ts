import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';

export interface AdBanner {
    id: number;
    name: string;
    description: string | null;
    type: string[];
    desktop_width: number;
    desktop_height: number;
    tablet_width: number;
    tablet_height: number;
    mobile_width: number;
    mobile_height: number;
    is_active: number;
    created_at?: string;
}

interface AdBannersParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDesc?: boolean;
}

// ─── List ──────────────────────────────────────────────────────────────────────
export const useAdBanners = (params: AdBannersParams = {}) => {
    return useQuery({
        queryKey: queryKeys.adBanners.list(params as Record<string, unknown>),
        queryFn: async () => {
            const res = await apiClient.get('/ad-banners', { params });
            const raw = res.data.data;
            if (Array.isArray(raw)) return { data: raw, pagination: res.data.pagination };
            return { data: raw?.data || [], pagination: raw?.pagination || res.data.pagination };
        },
    });
};

// ─── Single ────────────────────────────────────────────────────────────────────
export const useAdBanner = (id: number | null) => {
    return useQuery({
        queryKey: queryKeys.adBanners.detail(id!),
        queryFn: async () => {
            const res = await apiClient.get(`/ad-banners/${id}`);
            return res.data.data?.banner as AdBanner;
        },
        enabled: !!id,
    });
};

// ─── Create ────────────────────────────────────────────────────────────────────
export const useCreateAdBanner = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<AdBanner>) => {
            const res = await apiClient.post('/ad-banners', data);
            return res.data.data?.banner as AdBanner;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.adBanners.all });
            toast.success('Banner created successfully');
        },
        onError: (e: Error & { response?: { data?: { message?: string } } }) => {
            if (isApprovalRequired(e)) {
                qc.invalidateQueries({ queryKey: queryKeys.adBanners.all });
                return;
            }
            toast.error(e?.response?.data?.message || 'Failed to create banner');
        },
    });
};

// ─── Update ────────────────────────────────────────────────────────────────────
export const useUpdateAdBanner = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<AdBanner> }) => {
            const res = await apiClient.put(`/ad-banners/${id}`, data);
            return res.data.data?.banner as AdBanner;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.adBanners.all });
            toast.success('Banner updated successfully');
        },
        onError: (e: Error & { response?: { data?: { message?: string } } }) => {
            if (isApprovalRequired(e)) {
                qc.invalidateQueries({ queryKey: queryKeys.adBanners.all });
                return;
            }
            toast.error(e?.response?.data?.message || 'Failed to update banner');
        },
    });
};

// ─── Delete ────────────────────────────────────────────────────────────────────
export const useDeleteAdBanner = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/ad-banners/${id}`);
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.adBanners.all });
            toast.success('Banner deleted successfully');
        },
        onError: (e: Error & { response?: { data?: { message?: string } } }) => {
            if (isApprovalRequired(e)) {
                qc.invalidateQueries({ queryKey: queryKeys.adBanners.all });
                return;
            }
            toast.error(e?.response?.data?.message || 'Failed to delete banner');
        },
    });
};