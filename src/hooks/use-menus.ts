import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface Menu {
    id: number;
    name: string;
    icon: string | null;
    icon_fill_color_light: string | null;
    icon_fill_color_dark: string | null;
    sort_order: number;
    is_active: boolean | number;
    display_status: boolean | number;
    company_id: number | null;
    created_at?: string;
    updated_at?: string;
}

export type CreateMenuDto = {
    name: string;
    icon?: string;
    icon_fill_color_light?: string;
    icon_fill_color_dark?: string;
    sort_order?: number;
    is_active: boolean;
    display_status: boolean;
};
export type UpdateMenuDto = Partial<CreateMenuDto>;

const QUERY_KEY = ['menus'];

const menusApi = {
    getAll: async (params?: Record<string, any>): Promise<{ data: Menu[]; pagination: any }> => {
        const response = await apiClient.get('/menus', { params: { page: 1, limit: 10, ...params } });
        return { data: Array.isArray(response.data.data) ? response.data.data : [], pagination: response.data.pagination };
    },
    getById: async (id: number | string): Promise<Menu> => {
        const response = await apiClient.get(`/menus/${id}`);
        return response.data.data?.menu || response.data.data;
    },
    create: async (data: CreateMenuDto): Promise<Menu> => {
        const response = await apiClient.post('/menus', data);
        return response.data.data?.menu || response.data.data;
    },
    update: async ({ id, data }: { id: number; data: UpdateMenuDto }): Promise<Menu> => {
        const response = await apiClient.put(`/menus/${id}`, data);
        return response.data.data?.menu || response.data.data;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: number }): Promise<Menu> => {
        const response = await apiClient.patch(`/menus/${id}/status`, { is_active });
        return response.data.data?.menu || response.data.data;
    },
    updateDisplayStatus: async ({ id, display_status }: { id: number; display_status: boolean }): Promise<Menu> => {
        const response = await apiClient.patch(`/menus/${id}/display-status`, { display_status });
        return response.data.data?.menu || response.data.data;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/menus/${id}`);
    },
};

export function useMenus(params?: Record<string, any>) {
    return useQuery({
        queryKey: [...QUERY_KEY, params ?? {}],
        queryFn: () => menusApi.getAll(params),
    });
}

export function useMenu(id: number | string) {
    return useQuery({
        queryKey: ['menus', 'detail', id],
        queryFn: () => menusApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: menusApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Menu created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create menu');
        },
    });
}

export function useUpdateMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: menusApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['menus', 'detail', vars.id] });
            toast.success('Menu updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update menu');
        },
    });
}

export function useUpdateMenuDisplayStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: menusApi.updateDisplayStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update display status');
        },
    });
}
export function useUpdateMenuStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: menusApi.updateStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: menusApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Menu deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete menu');
        },
    });
}
