import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

/**
 * Event Availability (2026-11-12) — how many events clients may create on each date.
 * Super Admin -> Event Availability (Daily Booking, Configs, Special Limits Override).
 *
 * Backend: `/api/v1/event-availability` (eventAvailability.service.js). The daily list is worked
 * out on the server from config + overrides + the real event count.
 */

/* ------------------------------------------------------------------ types -- */

export type DayStatus = 'available' | 'low' | 'full' | 'disabled';
export type OverrideType = 'custom' | 'increase' | 'reduce' | 'block' | 'full' | 'disabled';

export interface AvailabilityConfig {
    id: number;
    name: string;
    event_category_id: number | null;
    category_name: string | null;
    applies_to: string;
    config_type: string;
    start_date: string;
    end_date: string;
    daily_max: number;
    allow_single_date: boolean | number;
    allow_multi_date: boolean | number;
    auto_full: boolean | number;
    block_weekends: boolean | number;
    exclude_holidays: boolean | number;
    holidays: string[] | null;
    notes: string | null;
    is_active: boolean | number;
    publish_status: 'draft' | 'published';
    total_days: number;
    override_count?: number;
    available_days?: number;
    total_capacity?: number;
    total_booked?: number;
    created_at: string;
    updated_at: string;
}

export type ConfigPayload = {
    name: string;
    event_category_id: number | null;
    start_date: string;
    end_date: string;
    daily_max: number | string;
    allow_single_date: boolean;
    allow_multi_date: boolean;
    auto_full: boolean;
    block_weekends: boolean;
    exclude_holidays: boolean;
    holidays: string[];
    notes: string;
    is_active: boolean;
    publish_status: 'draft' | 'published';
};

export interface BookedEvent {
    id: number;
    name: string;
    client_name: string | null;
    start_date: string;
    end_date: string;
    start_time: string | null;
    venue_name: string | null;
    status: string;
}

export interface DayRow {
    date: string;
    day: string;
    config_id: number;
    config_name: string;
    event_category_id: number | null;
    category_name: string;
    default_limit: number;
    daily_max: number;
    booked: number;
    balance: number;
    status: DayStatus;
    disabled_reason: string | null;
    override_id: number | null;
    override_mode: string | null;
    notes: string | null;
    last_updated: string | null;
}

export interface DayDetails extends DayRow {
    applies_to: string;
    config: AvailabilityConfig;
    events: BookedEvent[];
}

export interface DailyResult {
    range: { from: string; to: string };
    stats: { configured: number; available: number; fully_booked: number; disabled: number; total_booked: number };
    data: DayRow[];
    pagination: Pagination;
}

export interface Pagination { page: number; limit: number; total: number; totalPages: number }

export interface AvailabilityOverride {
    id: number;
    code: string;
    config_id: number;
    config_name: string;
    event_category_id: number | null;
    category_name: string | null;
    start_date: string;
    end_date: string;
    mode: 'limit' | 'full' | 'disabled' | 'removed';
    type: OverrideType | 'removed';
    daily_limit: number | null;
    default_limit: number;
    override_limit: number | null;
    booked: number;
    balance: number;
    utilization: number | null;
    reason: string | null;
    is_active: boolean | number;
    created_by_name?: string | null;
    created_at: string;
    updated_at: string;
}

export type OverridePayload = {
    config_id: number;
    start_date: string;
    end_date: string;
    override_type: OverrideType;
    daily_limit?: number | string | null;
    reason?: string;
    is_active: boolean;
};

export type DayAction =
    | { action: 'limit'; daily_limit: number; reason?: string }
    | { action: 'increase'; increase_by: number; reason: string }
    | { action: 'full'; reason?: string }
    | { action: 'disable'; reason: string }
    | { action: 'enable' }
    | { action: 'remove' };

/** One date the backend refused a lower limit on, with the events already booked there. */
export interface BlockingDate { date: string; limit: number; booked: number; events: BookedEvent[] }

/* ---------------------------------------------------------------- helpers -- */

export const errorMessage = (error: any, fallback = 'Something went wrong') =>
    error?.response?.data?.message || error?.message || fallback;

/** The booked-events list some refusals carry (limit below the booked count). */
export const blockingDates = (error: any): BlockingDate[] =>
    Array.isArray(error?.response?.data?.errors) ? error.response.data.errors : [];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2026-11-25" -> "25 Nov 2026" */
export const prettyDate = (d?: string | null) => {
    if (!d) return '—';
    const [y, m, day] = d.slice(0, 10).split('-').map(Number);
    return `${String(day).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
};
export const prettyRange = (a: string, b: string) => (a === b ? prettyDate(a) : `${prettyDate(a)} – ${prettyDate(b)}`);
export const weekday = (d: string) => DAYS[new Date(`${d.slice(0, 10)}T00:00:00Z`).getUTCDay()];
export const prettyDateTime = (v?: string | null) => {
    if (!v) return '—';
    const x = new Date(v);
    if (Number.isNaN(x.getTime())) return '—';
    const h = x.getHours();
    return `${prettyDate(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`)}, ${String(h % 12 || 12).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
export const prettyTime = (t?: string | null) => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
export const daysInclusive = (a: string, b: string) =>
    !a || !b || b < a ? 0 : Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;

/* -------------------------------------------------------------------- api -- */

const KEY = ['event-availability'];
const PATH = '/event-availability';

const api = {
    daily: async (params: Record<string, unknown>): Promise<DailyResult> => (await apiClient.get(`${PATH}/daily`, { params })).data.data,
    day: async (configId: number, date: string): Promise<DayDetails> => (await apiClient.get(`${PATH}/daily/${configId}/${date}`)).data.data,
    dayAction: async ({ configId, date, body }: { configId: number; date: string; body: DayAction }) =>
        (await apiClient.post(`${PATH}/daily/${configId}/${date}/action`, body)).data as { data: DayDetails; message: string },

    configs: async (params: Record<string, unknown>): Promise<{ data: AvailabilityConfig[]; pagination: Pagination }> =>
        (await apiClient.get(`${PATH}/configs`, { params })).data.data,
    config: async (id: number | string): Promise<AvailabilityConfig> => (await apiClient.get(`${PATH}/configs/${id}`)).data.data,
    createConfig: async (data: ConfigPayload) => (await apiClient.post(`${PATH}/configs`, data)).data as { data: AvailabilityConfig; message: string },
    updateConfig: async ({ id, data }: { id: number; data: Partial<ConfigPayload> }) =>
        (await apiClient.put(`${PATH}/configs/${id}`, data)).data as { data: AvailabilityConfig; message: string },
    configStatus: async ({ id, is_active }: { id: number; is_active: boolean }) => (await apiClient.patch(`${PATH}/configs/${id}/status`, { is_active })).data,
    deleteConfig: async (id: number) => (await apiClient.delete(`${PATH}/configs/${id}`)).data,

    overrides: async (params: Record<string, unknown>): Promise<{ data: AvailabilityOverride[]; pagination: Pagination }> =>
        (await apiClient.get(`${PATH}/overrides`, { params })).data.data,
    override: async (id: number): Promise<AvailabilityOverride> => (await apiClient.get(`${PATH}/overrides/${id}`)).data.data,
    createOverride: async (data: OverridePayload) => (await apiClient.post(`${PATH}/overrides`, data)).data,
    updateOverride: async ({ id, data }: { id: number; data: OverridePayload }) => (await apiClient.put(`${PATH}/overrides/${id}`, data)).data,
    overrideStatus: async ({ id, is_active }: { id: number; is_active: boolean }) => (await apiClient.patch(`${PATH}/overrides/${id}/status`, { is_active })).data,
    deleteOverride: async (id: number) => (await apiClient.delete(`${PATH}/overrides/${id}`)).data,
    bulkOverrides: async (body: { ids: number[]; action: 'activate' | 'deactivate' | 'delete' }) =>
        (await apiClient.post(`${PATH}/overrides/bulk`, body)).data as { data: { done: number; skipped: { id: number; reason: string }[] }; message: string },
};

/* ------------------------------------------------------------------ hooks -- */

export function useAvailabilityDaily(params: Record<string, unknown>) {
    return useQuery({ queryKey: [...KEY, 'daily', params], queryFn: () => api.daily(params) });
}

export function useAvailabilityDay(configId?: number, date?: string) {
    return useQuery({
        queryKey: [...KEY, 'day', configId, date],
        queryFn: () => api.day(configId!, date!),
        enabled: !!configId && !!date,
    });
}

export function useAvailabilityConfigs(params: Record<string, unknown>) {
    return useQuery({ queryKey: [...KEY, 'configs', params], queryFn: () => api.configs(params) });
}

export function useAvailabilityConfig(id?: number | string) {
    return useQuery({ queryKey: [...KEY, 'config', id], queryFn: () => api.config(id!), enabled: !!id });
}

export function useAvailabilityOverrides(params: Record<string, unknown>) {
    return useQuery({ queryKey: [...KEY, 'overrides', params], queryFn: () => api.overrides(params) });
}

export function useAvailabilityOverride(id?: number) {
    return useQuery({ queryKey: [...KEY, 'override', id], queryFn: () => api.override(id!), enabled: !!id });
}

/**
 * Mutations: every one refreshes the whole module (a limit change moves the daily list, the
 * overrides and the config summary together). Errors are NOT toasted here — the caller shows them
 * in the panel, with the booked events when the backend sends them.
 */
function useAvailabilityMutation<TVars, TResult>(fn: (v: TVars) => Promise<TResult>, success?: (r: TResult) => string | null) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: fn,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            const msg = success ? success(result) : ((result as any)?.message ?? null);
            if (msg) toast.success(msg);
        },
    });
}

export const useDayAction = () => useAvailabilityMutation(api.dayAction);
export const useCreateConfig = () => useAvailabilityMutation(api.createConfig);
export const useUpdateConfig = () => useAvailabilityMutation(api.updateConfig);
export const useConfigStatus = () => useAvailabilityMutation(api.configStatus);
export const useDeleteConfig = () => useAvailabilityMutation(api.deleteConfig);
export const useCreateOverride = () => useAvailabilityMutation(api.createOverride);
export const useUpdateOverride = () => useAvailabilityMutation(api.updateOverride);
export const useOverrideStatus = () => useAvailabilityMutation(api.overrideStatus);
export const useDeleteOverride = () => useAvailabilityMutation(api.deleteOverride);
export const useBulkOverrides = () => useAvailabilityMutation(api.bulkOverrides);

/* --------------------------------------------------- allocation requests -- */

/** `cancelled` = the client withdrew a pending request (to raise a new one for the same date). */
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface AllocationRequest {
    id: number;
    ticket_no: string;
    booking_type: 'single' | 'multiple';
    start_date: string;
    end_date: string;
    unavailable_dates: { date: string; status: string }[];
    contact_method: 'call' | 'email';
    contact_name: string;
    contact_mobile: string | null;
    contact_email: string | null;
    preferred_call_time: string | null;
    subject: string | null;
    message: string;
    attachment_url: string | null;
    attachment_name: string | null;
    status: RequestStatus;
    decision_reason: string | null;
    decision: {
        dates?: string[]; exception_slots?: number; expiry_hours?: number; expires_at?: string;
        capacity_checked?: boolean; category?: string; used_event_id?: number; used_at?: string;
    } | null;
    decided_at: string | null;
    decided_by_name?: string | null;
    created_at: string;
    client: { id: number; name: string | null; email: string | null; mobile: string | null; company_name: string | null };
    days?: { date: string; day: string; status: string; daily_max: number; booked: number; balance: number }[];
}

export const REJECT_CATEGORIES = ['No capacity available', 'Date blocked by admin', 'Incomplete information', 'Duplicate request', 'Other'];

const reqApi = {
    list: async (params: Record<string, unknown>): Promise<{ stats: { total: number; pending: number; approved: number; rejected: number; cancelled?: number }; data: AllocationRequest[]; pagination: Pagination }> =>
        (await apiClient.get(`${PATH}/requests`, { params })).data.data,
    one: async (id: number | string): Promise<AllocationRequest> => (await apiClient.get(`${PATH}/requests/${id}`)).data.data,
    approve: async ({ id, body }: { id: number; body: { exception_slots: number; expiry_hours: number; capacity_checked: boolean; reason: string; dates?: string[] } }) =>
        (await apiClient.post(`${PATH}/requests/${id}/approve`, body)).data,
    reject: async ({ id, body }: { id: number; body: { category: string; reason: string } }) =>
        (await apiClient.post(`${PATH}/requests/${id}/reject`, body)).data,
};

export function useAllocationRequests(params: Record<string, unknown>) {
    return useQuery({ queryKey: [...KEY, 'requests', params], queryFn: () => reqApi.list(params) });
}
export function useAllocationRequest(id?: number | string) {
    return useQuery({ queryKey: [...KEY, 'request', id], queryFn: () => reqApi.one(id!), enabled: !!id });
}
export const useApproveRequest = () => useAvailabilityMutation(reqApi.approve);
export const useRejectRequest = () => useAvailabilityMutation(reqApi.reject);
