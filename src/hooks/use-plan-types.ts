import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface PlanType {
    id: number;
    name: string;
    description: string | null;
    menu_ids: number[];
    price: number;
    discounted_price: number | null;
    validity: number | null;
    features: string | null;
    sort_order: number;
    is_active: boolean | number;
    is_custom: boolean | number;
    vendor_id: number | null;
    company_id: number | null;
    label_color: string | null;
    created_at?: string;
    updated_at?: string;
}

/**
 * menu_ids, price, discounted_price, validity and label_color are no longer
 * editable from the admin panel — they moved out of this form and are all
 * optional here.
 *
 * The columns still exist and still carry their existing values: the public
 * website pricing section reads price / discounted_price / label_color /
 * features (vendorWebsiteBuilder.service.js), so dropping them from the DB
 * would blank that section.
 */
export type CreatePlanTypeDto = {
    name: string;
    description?: string;
    menu_ids?: number[];
    price?: number;
    discounted_price?: number | null;
    validity?: number;
    features?: string;
    sort_order?: number;
    is_active: boolean;
    is_custom?: boolean;
    vendor_id?: number | null;
    label_color?: string | null;
};
export type UpdatePlanTypeDto = Partial<CreatePlanTypeDto>;

const QUERY_KEY = ['plan-types'];

const planTypesApi = {
    getAll: async (params?: Record<string, any>): Promise<{ data: PlanType[]; pagination: any }> => {
        const response = await apiClient.get('/plan-types', { params: { page: 1, limit: 10, ...params } });
        return { data: Array.isArray(response.data.data) ? response.data.data : [], pagination: response.data.pagination };
    },
    getById: async (id: number | string): Promise<PlanType> => {
        const response = await apiClient.get(`/plan-types/${id}`);
        return response.data.data?.planType || response.data.data;
    },
    create: async (data: CreatePlanTypeDto): Promise<PlanType> => {
        const response = await apiClient.post('/plan-types', data);
        return response.data.data?.planType || response.data.data;
    },
    update: async ({ id, data }: { id: number; data: UpdatePlanTypeDto }): Promise<PlanType> => {
        const response = await apiClient.put(`/plan-types/${id}`, data);
        return response.data.data?.planType || response.data.data;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: number }): Promise<PlanType> => {
        const response = await apiClient.patch(`/plan-types/${id}/status`, { is_active });
        return response.data.data?.planType || response.data.data;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/plan-types/${id}`);
    },
};

export function usePlanTypes(params?: Record<string, any>) {
    return useQuery({
        queryKey: [...QUERY_KEY, params ?? {}],
        queryFn: () => planTypesApi.getAll(params),
    });
}

export function useCreatePlanType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: planTypesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: 'all' });
            toast.success('Plan type created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: 'all' });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create plan type');
        },
    });
}

export function useUpdatePlanType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: planTypesApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['plan-types', 'detail', vars.id] });
            toast.success('Plan type updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: 'all' });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update plan type');
        },
    });
}

export function useUpdatePlanTypeStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: planTypesApi.updateStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: 'all' });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeletePlanType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: planTypesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: 'all' });
            toast.success('Plan type deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: 'all' });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete plan type');
        },
    });
}
