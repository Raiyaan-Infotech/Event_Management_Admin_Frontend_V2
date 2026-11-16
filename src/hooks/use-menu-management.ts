import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/**
 * Menu Management — event menus and the taxonomies around them.
 *
 * Event Categories and the guest-registration lists are the same resource
 * shape, so they share one hook factory instead of near-identical files. Event
 * Menus has its own set below because of its filters, per-platform toggles,
 * duplicate and reorder actions.
 */

/* ------------------------------------------------------------------ types -- */

export interface TaxonomyRecord {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean | number;
    company_id: number | null;
    has_pending_approval?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface EventCategory extends TaxonomyRecord {}

/**
 * One value in a guest-registration dropdown on the mobile app.
 *
 * `event_category_id` is NULLABLE: a null row is the
 * fallback list, offered when an event has no category or its category has no
 * list of its own. Without it the form could open with an empty dropdown.
 */
export interface GuestOption extends TaxonomyRecord {
    event_category_id: number | null;
    category?: { id: number; name: string; color: string | null } | null;
}


export interface EventMenu {
    id: number;
    name: string;
    slug: string;
    /** Core / Additional / Custom — drives the Manage Plan Menus sections. */
    /** 'portal' = a client-portal sidebar section; 'app' = a mobile app feature. Neither is an event feature. */
    menu_group?: 'core' | 'addon' | 'quick_action';
    description?: string | null;
    remarks?: string | null;
    company_id?: number | null;
    /** Detail read only — the list does not join these. */
    creator?: { id: number; full_name: string } | null;
    updater?: { id: number; full_name: string } | null;
    /** A menu is scoped by category only (no event type / religion / menu type). */
    event_category_id: number | null;
    /** 1 = default menu (new plans start with it ticked); 0 = add-on feature. */
    is_default: number;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean | number;
    category?: { id: number; name: string; color: string | null } | null;
    has_pending_approval?: boolean;
    created_at: string;
    updated_at?: string;
}

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

export type TaxonomyPayload = {
    name: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    sort_order?: number;
    is_active?: boolean | number;
    /** Scoped lists only (guest-registration options). */
    event_category_id?: number | null;
};

/* -------------------------------------------------------- taxonomy factory -- */

/**
 * `resourceKey` is the key the backend wraps a single record in
 * ({ eventCategory: {...} }); the `?? response.data.data` fallbacks keep this
 * working if a route is ever changed to return the record bare.
 */
export function createTaxonomyHooks<T extends TaxonomyRecord>(config: {
    path: string;
    queryKey: string;
    resourceKey: string;
    label: string;
}) {
    const { path, queryKey, resourceKey, label } = config;
    const KEY = [queryKey];

    const api = {
        getAll: async (params?: Record<string, unknown>): Promise<Paginated<T>> => {
            const response = await apiClient.get(path, { params: { page: 1, limit: 10, ...params } });
            return {
                data: Array.isArray(response.data.data) ? response.data.data : [],
                pagination: response.data.pagination ?? null,
            };
        },
        getById: async (id: number | string): Promise<T> => {
            const response = await apiClient.get(`${path}/${id}`);
            return response.data.data?.[resourceKey] ?? response.data.data;
        },
        create: async (data: TaxonomyPayload): Promise<T> => {
            const response = await apiClient.post(path, data);
            return response.data.data?.[resourceKey] ?? response.data.data;
        },
        update: async ({ id, data }: { id: number; data: Partial<TaxonomyPayload> }): Promise<T> => {
            const response = await apiClient.put(`${path}/${id}`, data);
            return response.data.data?.[resourceKey] ?? response.data.data;
        },
        updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<T> => {
            const response = await apiClient.patch(`${path}/${id}/status`, { is_active });
            return response.data.data?.[resourceKey] ?? response.data.data;
        },
        remove: async (id: number): Promise<void> => {
            await apiClient.delete(`${path}/${id}`);
        },
    };

    /**
     * Approval-required is not an error to surface — the request was accepted
     * and is now queued, and api-client already toasts that. Just refresh.
     */
    const onError = (queryClient: ReturnType<typeof useQueryClient>, verb: string) =>
        (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
                return;
            }
            toast.error(error?.response?.data?.message || `Failed to ${verb} ${label.toLowerCase()}`);
        };

    return {
        useList(params?: Record<string, unknown>) {
            return useQuery({
                queryKey: [...KEY, params ?? {}],
                queryFn: () => api.getAll(params),
            });
        },
        useOne(id: number | string | undefined) {
            return useQuery({
                queryKey: [queryKey, 'detail', id],
                queryFn: () => api.getById(id!),
                enabled: !!id,
            });
        },
        useCreate() {
            const queryClient = useQueryClient();
            return useMutation({
                mutationFn: api.create,
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
                    toast.success(`${label} created successfully`);
                },
                onError: onError(queryClient, 'create'),
            });
        },
        useUpdate() {
            const queryClient = useQueryClient();
            return useMutation({
                mutationFn: api.update,
                onSuccess: (_, vars) => {
                    queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: [queryKey, 'detail', vars.id] });
                    toast.success(`${label} updated successfully`);
                },
                onError: onError(queryClient, 'update'),
            });
        },
        useUpdateStatus() {
            const queryClient = useQueryClient();
            return useMutation({
                mutationFn: api.updateStatus,
                onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
                onError: onError(queryClient, 'update'),
            });
        },
        useDelete() {
            const queryClient = useQueryClient();
            return useMutation({
                mutationFn: api.remove,
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
                    toast.success(`${label} deleted successfully`);
                },
                onError: onError(queryClient, 'delete'),
            });
        },
    };
}

/* -------------------------------------------------------- event categories -- */

const eventCategoryHooks = createTaxonomyHooks<EventCategory>({
    path: '/event-categories',
    queryKey: 'event-categories',
    resourceKey: 'eventCategory',
    label: 'Event category',
});

export const useEventCategories = eventCategoryHooks.useList;
export const useEventCategory = eventCategoryHooks.useOne;
export const useCreateEventCategory = eventCategoryHooks.useCreate;
export const useUpdateEventCategory = eventCategoryHooks.useUpdate;
export const useUpdateEventCategoryStatus = eventCategoryHooks.useUpdateStatus;
export const useDeleteEventCategory = eventCategoryHooks.useDelete;

/* ----------------------------------------------- guest registration lists -- */

/**
 * The two dropdowns on the mobile app's guest registration form.
 *
 * Same resource shape as the taxonomies above, so they reuse the same factory.
 * They are admin-managed rather than hardcoded because the dropdowns render in
 * a FLUTTER build — a hardcoded list changes only by shipping through app-store
 * review, which is days to add one food option.
 */
const guestRelationshipHooks = createTaxonomyHooks<GuestOption>({
    path: '/guest-relationship-options',
    queryKey: 'guest-relationship-options',
    resourceKey: 'relationshipOption',
    label: 'Relationship',
});

export const useGuestRelationshipOptions = guestRelationshipHooks.useList;
export const useGuestRelationshipOption = guestRelationshipHooks.useOne;
export const useCreateGuestRelationshipOption = guestRelationshipHooks.useCreate;
export const useUpdateGuestRelationshipOption = guestRelationshipHooks.useUpdate;
export const useUpdateGuestRelationshipOptionStatus = guestRelationshipHooks.useUpdateStatus;
export const useDeleteGuestRelationshipOption = guestRelationshipHooks.useDelete;

const guestFoodHooks = createTaxonomyHooks<GuestOption>({
    path: '/guest-food-preference-options',
    queryKey: 'guest-food-preference-options',
    resourceKey: 'foodPreferenceOption',
    label: 'Food preference',
});

export const useGuestFoodPreferenceOptions = guestFoodHooks.useList;
export const useGuestFoodPreferenceOption = guestFoodHooks.useOne;
export const useCreateGuestFoodPreferenceOption = guestFoodHooks.useCreate;
export const useUpdateGuestFoodPreferenceOption = guestFoodHooks.useUpdate;
export const useUpdateGuestFoodPreferenceOptionStatus = guestFoodHooks.useUpdateStatus;
export const useDeleteGuestFoodPreferenceOption = guestFoodHooks.useDelete;

/**
 * Menu Management → Responsibilities (Jamal, 2026-10-27): the Contact Person
 * responsibilities (label name + description) per event category. Was a field
 * on the Menu form; the app's Contact Person profile reads this list.
 */
const responsibilityHooks = createTaxonomyHooks<GuestOption>({
    path: '/event-responsibilities',
    queryKey: 'event-responsibilities',
    resourceKey: 'responsibility',
    label: 'Responsibility',
});

export const useResponsibilities = responsibilityHooks.useList;
export const useCreateResponsibility = responsibilityHooks.useCreate;
export const useUpdateResponsibility = responsibilityHooks.useUpdate;
export const useUpdateResponsibilityStatus = responsibilityHooks.useUpdateStatus;
export const useDeleteResponsibility = responsibilityHooks.useDelete;

/* ------------------------------------------------------------- event menus -- */

export type EventMenuPayload = {
    name: string;
    description?: string | null;
    remarks?: string | null;
    event_category_id?: number | null;
    is_default?: boolean | number;
    /** 'quick_action' = Home Quick Actions only, never an event menu. */
    menu_group?: 'core' | 'addon' | 'quick_action';
    icon?: string | null;
    color?: string | null;
    sort_order?: number;
    is_active?: boolean | number;
};

export type EventMenuToggleField = 'is_active' | 'is_default';

const MENUS_KEY = ['event-menus'];

const eventMenusApi = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<EventMenu>> => {
        const response = await apiClient.get('/event-menus', { params: { page: 1, limit: 10, ...params } });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getById: async (id: number | string): Promise<EventMenu> => {
        const response = await apiClient.get(`/event-menus/${id}`);
        return response.data.data?.eventMenu ?? response.data.data;
    },
    create: async (data: EventMenuPayload): Promise<EventMenu> => {
        const response = await apiClient.post('/event-menus', data);
        return response.data.data?.eventMenu ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: Partial<EventMenuPayload> }): Promise<EventMenu> => {
        const response = await apiClient.put(`/event-menus/${id}`, data);
        return response.data.data?.eventMenu ?? response.data.data;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<EventMenu> => {
        const response = await apiClient.patch(`/event-menus/${id}/status`, { is_active });
        return response.data.data?.eventMenu ?? response.data.data;
    },
    // One column per request — a switch flip must not round-trip the whole row.
    toggle: async ({ id, field, value }: { id: number; field: EventMenuToggleField; value: boolean }): Promise<EventMenu> => {
        const response = await apiClient.patch(`/event-menus/${id}/toggle/${field}`, { value });
        return response.data.data?.eventMenu ?? response.data.data;
    },
    duplicate: async (id: number): Promise<EventMenu> => {
        const response = await apiClient.post(`/event-menus/${id}/duplicate`);
        return response.data.data?.eventMenu ?? response.data.data;
    },
    reorder: async (items: Array<{ id: number; sort_order: number }>): Promise<{ updated: number }> => {
        const response = await apiClient.patch('/event-menus/reorder', { items });
        return response.data.data;
    },
    remove: async (id: number): Promise<void> => {
        await apiClient.delete(`/event-menus/${id}`);
    },
};

function menuError(queryClient: ReturnType<typeof useQueryClient>, verb: string) {
    return (error: any) => {
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: MENUS_KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} menu`);
    };
}

export function useEventMenus(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: [...MENUS_KEY, params ?? {}],
        queryFn: () => eventMenusApi.getAll(params),
    });
}

export function useEventMenu(id: number | string | undefined) {
    return useQuery({
        queryKey: ['event-menus', 'detail', id],
        queryFn: () => eventMenusApi.getById(id!),
        enabled: !!id,
    });
}

/**
 * `onSuccess` is a callback rather than a router.push inside the hook —
 * navigation belongs to the component that knows where it wants to go.
 */
export function useCreateEventMenu(onSuccess?: (menu: EventMenu) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: eventMenusApi.create,
        onSuccess: (menu) => {
            queryClient.invalidateQueries({ queryKey: MENUS_KEY, refetchType: 'all' });
            toast.success('Menu created successfully');
            onSuccess?.(menu);
        },
        onError: menuError(queryClient, 'create'),
    });
}

export function useUpdateEventMenu(onSuccess?: (menu: EventMenu) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: eventMenusApi.update,
        onSuccess: (menu, vars) => {
            queryClient.invalidateQueries({ queryKey: MENUS_KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['event-menus', 'detail', vars.id] });
            toast.success('Menu updated successfully');
            onSuccess?.(menu);
        },
        onError: menuError(queryClient, 'update'),
    });
}

export function useUpdateEventMenuStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: eventMenusApi.updateStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MENUS_KEY, refetchType: 'all' }),
        onError: menuError(queryClient, 'update'),
    });
}

export function useToggleEventMenuFlag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: eventMenusApi.toggle,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MENUS_KEY, refetchType: 'all' }),
        onError: menuError(queryClient, 'update'),
    });
}

export function useDuplicateEventMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: eventMenusApi.duplicate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MENUS_KEY, refetchType: 'all' });
            toast.success('Menu duplicated successfully');
        },
        onError: menuError(queryClient, 'duplicate'),
    });
}

export function useReorderEventMenus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: eventMenusApi.reorder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MENUS_KEY, refetchType: 'all' });
            toast.success('Menu order updated');
        },
        onError: menuError(queryClient, 'reorder'),
    });
}

export function useDeleteEventMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: eventMenusApi.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MENUS_KEY, refetchType: 'all' });
            toast.success('Menu deleted successfully');
        },
        onError: menuError(queryClient, 'delete'),
    });
}
