import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface PricingPlan {
    id?: number;
    plan_name: string;
    subtitle?: string;
    target_type: 'individuals' | 'companies';
    currency: string;
    price_monthly: number;
    price_yearly: number;
    period_label?: string;
    badge_text?: string;
    badge_style?: 'filled' | 'outline' | 'soft-filled' | 'soft-outline';
    is_popular?: boolean;
    features_json: Array<{ label: string; included: boolean }>;
    is_active?: boolean;
    sort_order?: number;
}

export interface PricingSettings {
    section_title: string;
    section_subtitle: string;
    badge_text: string;
    individual_heading: string;
    individual_subheading: string;
    company_heading: string;
    company_subheading: string;
    yearly_discount_badge: string;
}

export interface PlanTierLimit {
    not_included?: boolean;
    limit?: string;
}

export interface PricingMatrixFeature {
    id?: number;
    feature_name: string;
    icon?: string;
    description?: string;
    category?: string;
    plan_values_json: Record<string, string | boolean | PlanTierLimit>;
    sort_order?: number;
    is_active?: boolean;
}

export function usePricingPlansData() {
    return useQuery({
        queryKey: ['website-builder-pricing-plans'],
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/pricing/plans');
            return (res.data?.data || []) as PricingPlan[];
        },
    });
}

export function useSavePricingPlans() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (plans: PricingPlan[]) => {
            const res = await apiClient.put('/website-builder/pricing/plans', { items: plans });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Pricing plans saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-plans'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error saving pricing plans.');
        },
    });
}

// Single-row create/update. Unlike `useSavePricingPlans` above (which deletes
// and reinserts every plan on every call, reassigning ids and orphaning every
// plan's saved translations), these touch only the one row being edited.
export function useCreatePricingPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<PricingPlan>) => {
            const res = await apiClient.post('/website-builder/pricing-plans', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Pricing plan created successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-plans'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error creating pricing plan.');
        },
    });
}

export function useUpdatePricingPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: number; payload: Partial<PricingPlan> }) => {
            const res = await apiClient.put(`/website-builder/pricing-plans/${id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Pricing plan updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-plans'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error updating pricing plan.');
        },
    });
}

export function useTogglePricingPlanStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            const res = await apiClient.patch(`/website-builder/pricing/plans/${id}/status`, { is_active });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Pricing plan status updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-plans'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error updating status.');
        },
    });
}

export function useSavePricingSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (settings: PricingSettings) => {
            const res = await apiClient.put('/website-builder/pricing/settings', settings);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Pricing section settings saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-settings'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error saving pricing settings.');
        },
    });
}

// Single-row create/update/delete. Same reasoning as the pricing plan pair
// above: the bulk save wipes and reinserts every feature row on every save.
export function useCreatePricingMatrixFeature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<PricingMatrixFeature>) => {
            const res = await apiClient.post('/website-builder/pricing/matrix-features', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Feature created successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-matrix-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error creating feature.');
        },
    });
}

export function useUpdatePricingMatrixFeature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: number; payload: Partial<PricingMatrixFeature> }) => {
            const res = await apiClient.put(`/website-builder/pricing/matrix-features/${id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Feature updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-matrix-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error updating feature.');
        },
    });
}

export function useDeletePricingMatrixFeature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiClient.delete(`/website-builder/pricing/matrix-features/${id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Feature removed successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-matrix-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error removing feature.');
        },
    });
}

export function usePricingMatrixFeaturesData() {
    return useQuery({
        queryKey: ['website-builder-pricing-matrix-features'],
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/pricing/matrix-features');
            return (res.data?.data || []) as PricingMatrixFeature[];
        },
    });
}

export function useSavePricingMatrixFeatures() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (items: PricingMatrixFeature[]) => {
            const res = await apiClient.put('/website-builder/pricing/matrix-features', { items });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Plan features saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-pricing-matrix-features'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error saving plan features.');
        },
    });
}
