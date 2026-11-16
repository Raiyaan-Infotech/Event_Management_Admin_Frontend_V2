import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/**
 * Clients — people who signed themselves up on a tenant's public website.
 *
 * Backed by the `website_clients` table, which is deliberately separate from
 * `vendor_clients` (those are created BY a vendor and given a portal login via
 * the handoff flow).
 *
 * A row here IS a client-portal account — it signs in at the portal with the
 * email and password on this row. That is why `password` is mandatory when an
 * admin creates one: there is no reset, set-password or invite flow anywhere,
 * so a row saved without one can never sign in. `has_password` reports whether
 * an existing row is in that state.
 */

/* ------------------------------------------------------------------ types -- */

export type WebsiteClientSource = 'website' | 'google' | 'facebook' | 'admin';

export interface WebsiteClient {
    id: number;
    vendor_id: number;
    company_id: number | null;
    name: string;
    email: string;
    dial_code: string | null;
    mobile: string | null;
    source: WebsiteClientSource;
    email_verified: number;
    mobile_verified: number;
    /** 0 = inactive, 1 = active, 2 = blocked. */
    is_active: number;
    /**
     * The plan this client is on. Drives what they may create in the client
     * portal: the plan is scoped to an event category and grants
     * a specific set of menus. NULL = no plan assigned yet.
     */
    subscription_plan_id: number | null;
    last_login_at: string | null;
    /**
     * Whether a password is set — i.e. whether this client can sign in at all.
     *
     * MySQL answers the underlying comparison as 1/0, not a boolean, so read it
     * for truthiness and never compare it against `false`.
     *
     * A `google` / `facebook` client has none by design and signs in through the
     * provider, so a falsy value only means "broken" for the `website` and
     * `admin` sources.
     */
    has_password?: boolean | number;
    vendor?: { id: number; company_name: string } | null;
    has_pending_approval?: boolean;
    // The model maps its timestamps to snake_case attributes, as every other
    // model here does, so the API answers `created_at` — which is also what
    // CommonTable's row constraint requires.
    created_at: string;
    updated_at?: string;
}

export interface WebsiteClientStats {
    total: number;
    active: number;
    inactive: number;
    blocked: number;
    /** Password-source accounts with no password — they cannot sign in at all. */
    cannot_sign_in: number;
}

export interface WebsiteClientListParams {
    page?: number;
    limit?: number;
    search?: string;
    source?: WebsiteClientSource | 'all';
    is_active?: number | 'all';
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
}

export interface WebsiteClientPayload {
    name: string;
    email: string;
    dial_code?: string;
    mobile?: string | null;
    password?: string;
    is_active?: number;
    vendor_id?: number;
    subscription_plan_id?: number | null;
}

/* -------------------------------------------------------------------- api -- */

const KEY = ['website-clients'];
const PATH = '/website-clients';

const api = {
    list: async (params?: WebsiteClientListParams) => {
        const response = await apiClient.get(PATH, { params: { page: 1, limit: 10, ...params } });
        return response.data;
    },
    stats: async () => {
        const response = await apiClient.get(`${PATH}/stats`);
        return response.data?.data?.stats as WebsiteClientStats;
    },
    detail: async (id: number | string) => {
        const response = await apiClient.get(`${PATH}/${id}`);
        return response.data?.data?.client as WebsiteClient;
    },
    create: async (data: WebsiteClientPayload) => {
        const response = await apiClient.post(PATH, data);
        return response.data;
    },
    update: async (id: number | string, data: Partial<WebsiteClientPayload>) => {
        const response = await apiClient.put(`${PATH}/${id}`, data);
        return response.data;
    },
    updateStatus: async (id: number | string, is_active: number) => {
        const response = await apiClient.patch(`${PATH}/${id}/status`, { is_active });
        return response.data;
    },
    remove: async (id: number | string) => {
        await apiClient.delete(`${PATH}/${id}`);
    },
};

// An approval-gated write is not a failure — the request was accepted and is
// waiting on someone. Refresh so the pending badge appears, and stay quiet.
const onError = (queryClient: ReturnType<typeof useQueryClient>, verb: string) =>
    (error: any) => {
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} client`);
    };

/* ------------------------------------------------------------------ hooks -- */

export function useWebsiteClients(params?: WebsiteClientListParams) {
    return useQuery({
        queryKey: [...KEY, params ?? {}],
        queryFn: () => api.list(params),
    });
}

export function useWebsiteClientStats() {
    return useQuery({
        queryKey: [...KEY, 'stats'],
        queryFn: api.stats,
    });
}

export function useWebsiteClient(id?: number | string) {
    return useQuery({
        queryKey: ['website-clients', 'detail', id],
        queryFn: () => api.detail(id!),
        enabled: !!id,
    });
}

export function useCreateWebsiteClient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: () => {
            // `refetchType: 'all'` because the list is often unmounted at this
            // moment, and an inactive query is otherwise only flagged stale —
            // with refetchOnMount:false it would then serve a stale cache (§142).
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Client created successfully');
        },
        onError: onError(queryClient, 'create'),
    });
}

export function useUpdateWebsiteClient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data: Partial<WebsiteClientPayload> }) =>
            api.update(id, data),
        onSuccess: (_result, vars) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['website-clients', 'detail', vars.id] });
            toast.success('Client updated successfully');
        },
        onError: onError(queryClient, 'update'),
    });
}

export function useUpdateWebsiteClientStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, is_active }: { id: number | string; is_active: number }) =>
            api.updateStatus(id, is_active),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
        onError: onError(queryClient, 'update'),
    });
}

export function useDeleteWebsiteClient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Client deleted successfully');
        },
        onError: onError(queryClient, 'delete'),
    });
}
