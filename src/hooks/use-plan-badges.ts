import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export type BadgeStyle = 'default' | 'rounded' | 'pill' | 'outline' | 'soft' | 'dashed';
export type BadgeApplyTo = 'all' | 'selected';

export interface PlanBadge {
    id: number;
    text: string;
    style: BadgeStyle;
    color: string;
    apply_to: BadgeApplyTo;
    is_active: boolean | number;
    sort_order: number;
    /** Flattened from the join — empty when apply_to is 'all'. */
    plan_ids: number[];
    plans?: Array<{ id: number; name: string; plan_code: string }>;
    has_pending_approval?: boolean;
    created_at: string;
}

export interface BadgeSettings {
    enabled: boolean;
    position: string;
}

export interface BadgeSummary {
    total: number;
    active: number;
    inactive: number;
}

export interface RecommendedBadge {
    text: string;
    style: BadgeStyle;
    color: string;
}

export type PlanBadgePayload = {
    text: string;
    style?: BadgeStyle;
    color?: string;
    apply_to?: BadgeApplyTo;
    is_active?: boolean | number;
    sort_order?: number;
    /** Only read when apply_to is 'selected'. */
    plan_ids?: number[];
};

const KEY = ['plan-badges'];

const api = {
    getAll: async () => {
        const res = await apiClient.get('/plan-badges', { params: { limit: 200 } });
        return Array.isArray(res.data.data) ? (res.data.data as PlanBadge[]) : [];
    },
    getSettings: async (): Promise<BadgeSettings> => {
        const res = await apiClient.get('/plan-badges/settings');
        return res.data.data?.settings ?? { enabled: true, position: 'top_right' };
    },
    updateSettings: async (data: Partial<BadgeSettings>): Promise<BadgeSettings> => {
        const res = await apiClient.put('/plan-badges/settings', data);
        return res.data.data?.settings;
    },
    getSummary: async (): Promise<BadgeSummary> => {
        const res = await apiClient.get('/plan-badges/summary');
        return res.data.data?.summary ?? { total: 0, active: 0, inactive: 0 };
    },
    getRecommended: async (): Promise<RecommendedBadge[]> => {
        const res = await apiClient.get('/plan-badges/recommended');
        return res.data.data?.recommended ?? [];
    },
    create: async (data: PlanBadgePayload): Promise<PlanBadge> => {
        const res = await apiClient.post('/plan-badges', data);
        return res.data.data?.planBadge ?? res.data.data;
    },
    update: async ({ id, data }: { id: number; data: Partial<PlanBadgePayload> }): Promise<PlanBadge> => {
        const res = await apiClient.put(`/plan-badges/${id}`, data);
        return res.data.data?.planBadge ?? res.data.data;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }) => {
        const res = await apiClient.patch(`/plan-badges/${id}/status`, { is_active });
        return res.data.data?.planBadge;
    },
    remove: async (id: number) => {
        await apiClient.delete(`/plan-badges/${id}`);
    },
};

function onError(queryClient: ReturnType<typeof useQueryClient>, verb: string) {
    return (error: any) => {
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} badge`);
    };
}

export function usePlanBadges() {
    return useQuery({ queryKey: KEY, queryFn: api.getAll });
}

export function useBadgeSettings() {
    return useQuery({ queryKey: ['plan-badges', 'settings'], queryFn: api.getSettings });
}

export function useBadgeSummary() {
    return useQuery({ queryKey: ['plan-badges', 'summary'], queryFn: api.getSummary });
}

/** Static config — no need to refetch it constantly. */
export function useRecommendedBadges() {
    return useQuery({
        queryKey: ['plan-badges', 'recommended'],
        queryFn: api.getRecommended,
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateBadgeSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-badges', 'settings'] });
            toast.success('Badge settings updated');
        },
        onError: onError(queryClient, 'update'),
    });
}

/** Summary counts move whenever a badge is created/updated/deleted. */
const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['plan-badges', 'summary'] });
};

export function useCreatePlanBadge(onDone?: (badge: PlanBadge) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (badge) => {
            invalidateAll(queryClient);
            toast.success('Badge created successfully');
            onDone?.(badge);
        },
        onError: onError(queryClient, 'create'),
    });
}

export function useUpdatePlanBadge(onDone?: (badge: PlanBadge) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (badge) => {
            invalidateAll(queryClient);
            toast.success('Badge updated successfully');
            onDone?.(badge);
        },
        onError: onError(queryClient, 'update'),
    });
}

export function useUpdatePlanBadgeStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => invalidateAll(queryClient),
        onError: onError(queryClient, 'update'),
    });
}

export function useDeletePlanBadge() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: () => {
            invalidateAll(queryClient);
            toast.success('Badge deleted successfully');
        },
        onError: onError(queryClient, 'delete'),
    });
}

/* ------------------------------------------------------------- presentation */

export const BADGE_STYLES: Array<{ value: BadgeStyle; label: string }> = [
    { value: 'default', label: 'Default' },
    { value: 'rounded', label: 'Rounded' },
    { value: 'pill', label: 'Pill' },
    { value: 'outline', label: 'Outline' },
    { value: 'soft', label: 'Soft' },
    { value: 'dashed', label: 'Dashed' },
];

export const BADGE_COLORS = [
    '#6E22FE', '#16A34A', '#2563EB', '#F97316',
    '#E11D48', '#0D9488', '#F59E0B', '#64748B',
];

export const BADGE_POSITIONS = [
    { value: 'top_right', label: 'Top Right Corner' },
    { value: 'top_left', label: 'Top Left Corner' },
    { value: 'bottom_right', label: 'Bottom Right Corner' },
    { value: 'bottom_left', label: 'Bottom Left Corner' },
    { value: 'inline', label: 'Inline with Plan Name' },
];

/**
 * Style → classes + inline colour. The colour is admin-picked so it cannot be a
 * Tailwind class; only the shape and fill treatment are.
 */
export function badgeStyleProps(style: BadgeStyle, color: string): {
    className: string;
    style: React.CSSProperties;
} {
    const base = 'inline-flex items-center px-2.5 py-1 text-xs font-semibold';
    switch (style) {
        case 'rounded':
            return { className: `${base} rounded-lg text-white`, style: { backgroundColor: color } };
        case 'pill':
            return { className: `${base} rounded-full text-white`, style: { backgroundColor: color } };
        case 'outline':
            return {
                className: `${base} rounded-md border bg-transparent`,
                style: { color, borderColor: color },
            };
        case 'soft':
            // 1A ≈ 10% alpha — a tint of the picked colour rather than a second token.
            return { className: `${base} rounded-md`, style: { color, backgroundColor: `${color}1A` } };
        case 'dashed':
            return {
                className: `${base} rounded-md border border-dashed bg-transparent`,
                style: { color, borderColor: color },
            };
        default:
            return { className: `${base} rounded-md text-white`, style: { backgroundColor: color } };
    }
}
