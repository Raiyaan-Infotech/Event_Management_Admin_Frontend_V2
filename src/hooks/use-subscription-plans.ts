import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/** Subscription Plans — the 6-step wizard, the Plans list and the view page. */

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

export interface PlanMenuRow {
    id?: number;
    menu_id: number;
    sort_order?: number;
    menu?: {
        id: number;
        name: string;
        slug: string;
        icon: string | null;
        color: string | null;
    } | null;
}

export interface SubscriptionPlan {
    id: number;
    name: string;
    plan_code: string;
    plan_type_id: number | null;
    plan_badge_id: number | null;
    billing_cycle: BillingCycle;
    short_description: string | null;
    event_category_id: number | null;
    /** Plan limits (wizard step 4). null = unlimited. No RSVP limit — the guest limit caps it. */
    max_events: number | null;
    max_guests_per_event: number | null;
    /** RSVPs allowed per event — QR scanners included. NULL = unlimited. */
    max_rsvp_per_event: number | null;
    max_photos: number | null;
    max_videos: number | null;
    /** 1-100 in storage_unit; both null = unlimited. */
    storage_limit: number | null;
    storage_unit: 'MB' | 'GB' | null;
    currency_code: string;
    price: string | number;
    trial_days: number;
    is_visible: number;
    is_active: boolean | number;
    sort_order: number;
    /** Derived by the backend: price 0 + a trial period shows the Trial badge. */
    is_trial: boolean;
    total_menus: number;
    planType?: { id: number; name: string } | null;
    /** The plan's own badge, joined from plan_badges. */
    planBadge?: { id: number; text: string; style: string; color: string } | null;
    category?: { id: number; name: string; color: string | null } | null;
    planMenus?: PlanMenuRow[];
    /** Detail read only — the list does not join these. */
    creator?: { id: number; full_name: string } | null;
    updater?: { id: number; full_name: string } | null;
    deactivator?: { id: number; full_name: string } | null;
    deleter?: { id: number; full_name: string } | null;
    deactivation_reason?: string | null;
    deactivation_comments?: string | null;
    deactivated_at?: string | null;
    deletion_reason?: string | null;
    deletion_comments?: string | null;
    deleted_at?: string | null;
    has_pending_approval?: boolean;
    created_at: string;
    updated_at?: string;
}

export type SubscriptionPlanPayload = {
    name: string;
    plan_code: string;
    plan_type_id?: number | null;
    plan_badge_id?: number | null;
    billing_cycle: BillingCycle;
    short_description?: string | null;
    event_category_id?: number | null;
    max_events?: number | null;
    max_guests_per_event?: number | null;
    max_rsvp_per_event?: number | null;
    max_photos?: number | null;
    max_videos?: number | null;
    storage_limit?: number | null;
    storage_unit?: 'MB' | 'GB' | null;
    currency_code?: string;
    price?: number;
    trial_days?: number;
    is_visible?: number | boolean;
    is_active?: number | boolean;
    sort_order?: number;
    /** Omit entirely to leave the plan's menu selection untouched. */
    menus?: Array<{
        menu_id: number;
        sort_order?: number;
    }>;
};

export interface Paginated<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    } | null;
}

const KEY = ['subscription-plans'];

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<SubscriptionPlan>> => {
        const response = await apiClient.get('/subscription-plans', { params: { page: 1, limit: 10, ...params } });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getById: async (id: number | string): Promise<SubscriptionPlan> => {
        const response = await apiClient.get(`/subscription-plans/${id}`);
        return response.data.data?.subscriptionPlan ?? response.data.data;
    },
    create: async (data: SubscriptionPlanPayload): Promise<SubscriptionPlan> => {
        const response = await apiClient.post('/subscription-plans', data);
        return response.data.data?.subscriptionPlan ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: Partial<SubscriptionPlanPayload> }): Promise<SubscriptionPlan> => {
        const response = await apiClient.put(`/subscription-plans/${id}`, data);
        return response.data.data?.subscriptionPlan ?? response.data.data;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<SubscriptionPlan> => {
        const response = await apiClient.patch(`/subscription-plans/${id}/status`, { is_active });
        return response.data.data?.subscriptionPlan ?? response.data.data;
    },
    duplicate: async (id: number): Promise<SubscriptionPlan> => {
        const response = await apiClient.post(`/subscription-plans/${id}/duplicate`);
        return response.data.data?.subscriptionPlan ?? response.data.data;
    },
    remove: async (id: number): Promise<void> => {
        await apiClient.delete(`/subscription-plans/${id}`);
    },
    getReasons: async (): Promise<{ deactivation: string[]; deletion: string[] }> => {
        const res = await apiClient.get('/subscription-plans/reasons');
        return res.data.data?.reasons ?? { deactivation: [], deletion: [] };
    },
    deactivate: async ({ id, reason, comments }: { id: number; reason: string; comments?: string }) => {
        const res = await apiClient.patch(`/subscription-plans/${id}/deactivate`, { reason, comments });
        return res.data.data?.subscriptionPlan as SubscriptionPlan;
    },
    reactivate: async (id: number) => {
        const res = await apiClient.patch(`/subscription-plans/${id}/reactivate`);
        return res.data.data?.subscriptionPlan as SubscriptionPlan;
    },
    // POST, not DELETE: it carries a body, and the response is the
    // pre-deletion snapshot the success screen renders.
    deleteWithReason: async ({ id, reason, comments }: { id: number; reason: string; comments?: string }) => {
        const res = await apiClient.post(`/subscription-plans/${id}/delete`, { reason, comments });
        return res.data.data?.subscriptionPlan as SubscriptionPlan;
    },
};

function onError(queryClient: ReturnType<typeof useQueryClient>, verb: string) {
    return (error: any) => {
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} subscription plan`);
    };
}

export function useSubscriptionPlans(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: [...KEY, params ?? {}],
        queryFn: () => api.getAll(params),
    });
}

export function useSubscriptionPlan(id: number | string | undefined) {
    return useQuery({
        queryKey: ['subscription-plans', 'detail', id],
        queryFn: () => api.getById(id!),
        enabled: !!id,
    });
}

export function useCreateSubscriptionPlan(onSuccess?: (plan: SubscriptionPlan) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (plan) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            onSuccess?.(plan);
        },
        onError: onError(queryClient, 'create'),
    });
}

export function useUpdateSubscriptionPlan(onSuccess?: (plan: SubscriptionPlan) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (plan, vars) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['subscription-plans', 'detail', vars.id] });
            onSuccess?.(plan);
        },
        onError: onError(queryClient, 'update'),
    });
}

export function useUpdateSubscriptionPlanStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
        onError: onError(queryClient, 'update'),
    });
}

/** `onSuccess` receives the NEW plan — the caller needs its id to navigate. */
export function useDuplicateSubscriptionPlan(onSuccess?: (plan: SubscriptionPlan) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.duplicate,
        onSuccess: (plan) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Plan duplicated successfully');
            onSuccess?.(plan);
        },
        onError: onError(queryClient, 'duplicate'),
    });
}

/** Static config. */
export function usePlanReasons() {
    return useQuery({
        queryKey: ['subscription-plans', 'reasons'],
        queryFn: api.getReasons,
        staleTime: 5 * 60 * 1000,
    });
}

export function useDeactivatePlan(onSuccess?: (plan: SubscriptionPlan) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.deactivate,
        onSuccess: (plan, vars) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['subscription-plans', 'detail', vars.id] });
            onSuccess?.(plan);
        },
        onError: onError(queryClient, 'deactivate'),
    });
}

export function useReactivatePlan(onSuccess?: (plan: SubscriptionPlan) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.reactivate,
        onSuccess: (plan, id) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['subscription-plans', 'detail', id] });
            toast.success('Plan activated successfully');
            onSuccess?.(plan);
        },
        onError: onError(queryClient, 'activate'),
    });
}

export function useDeletePlanWithReason(onSuccess?: (plan: SubscriptionPlan) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.deleteWithReason,
        onSuccess: (plan) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            onSuccess?.(plan);
        },
        onError: onError(queryClient, 'delete'),
    });
}

export function useDeleteSubscriptionPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Plan deleted successfully');
        },
        onError: onError(queryClient, 'delete'),
    });
}

/** Shared display helpers — the list, wizard review and view page all need these. */
export const BILLING_CYCLES: Array<{ value: BillingCycle; label: string; suffix: string }> = [
    { value: 'monthly', label: 'Monthly', suffix: '/ Month' },
    { value: 'quarterly', label: 'Quarterly', suffix: '/ Quarter' },
    { value: 'yearly', label: 'Yearly', suffix: '/ Year' },
    { value: 'lifetime', label: 'Lifetime', suffix: 'one-time' },
];

export const CURRENCIES = [
    { code: 'INR', label: 'INR (₹)', symbol: '₹' },
    { code: 'USD', label: 'USD ($)', symbol: '$' },
    { code: 'EUR', label: 'EUR (€)', symbol: '€' },
    { code: 'GBP', label: 'GBP (£)', symbol: '£' },
];

export const currencySymbol = (code?: string) =>
    CURRENCIES.find((c) => c.code === code)?.symbol ?? code ?? '';

export function formatPlanPrice(plan: Pick<SubscriptionPlan, 'price' | 'currency_code' | 'billing_cycle' | 'trial_days' | 'is_trial'>) {
    const symbol = currencySymbol(plan.currency_code);
    const amount = Number(plan.price || 0).toLocaleString();
    // A free trial reads as "₹0 / 7 Days" in the mockup rather than a cycle.
    if (plan.is_trial) return `${symbol} 0 / ${plan.trial_days} Days`;
    const suffix = BILLING_CYCLES.find((c) => c.value === plan.billing_cycle)?.suffix ?? '';
    return `${symbol} ${amount} ${suffix}`.trim();
}
