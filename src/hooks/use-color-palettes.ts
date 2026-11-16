import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';

export interface ColorPalette {
    id: number;
    company_id?: number;
    name: string;
    primary_bg_color: string | null;
    primary_text_color: string | null;
    secondary_text_color: string | null;
    paragraph_color: string | null;
    is_active: boolean | number;
    created_at: string;
    updated_at?: string;
}

export type CreateColorPaletteDto = Omit<ColorPalette, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
export type UpdateColorPaletteDto = Partial<CreateColorPaletteDto>;

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<{ data: ColorPalette[]; pagination: unknown }> => {
        const response = await apiClient.get('/color-palettes', { params: { page: 1, limit: 100, ...params } });
        return { data: response.data.data || [], pagination: response.data.pagination };
    },
    getById: async (id: number): Promise<ColorPalette> => {
        const response = await apiClient.get(`/color-palettes/${id}`);
        return response.data.data?.palette || response.data.palette;
    },
    create: async (data: CreateColorPaletteDto): Promise<ColorPalette> => {
        const response = await apiClient.post('/color-palettes', data);
        return response.data.data?.palette || response.data.palette;
    },
    update: async ({ id, data }: { id: number; data: UpdateColorPaletteDto }): Promise<ColorPalette> => {
        const response = await apiClient.put(`/color-palettes/${id}`, data);
        return response.data.data?.palette || response.data.palette;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/color-palettes/${id}`);
    },
};

export function useColorPalettes(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: queryKeys.colorPalettes.list(params ?? {}),
        queryFn: () => api.getAll(params),
        staleTime: 5 * 60 * 1000,
    });
}

export function useColorPalette(id: number) {
    return useQuery({
        queryKey: queryKeys.colorPalettes.detail(id),
        queryFn: () => api.getById(id),
        enabled: !!id,
    });
}

export function useCreateColorPalette() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.colorPalettes.all });
            toast.success('Color palette created successfully');
        },
        onError: (error: unknown) => {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || 'Failed to create color palette');
        },
    });
}

export function useUpdateColorPalette() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.colorPalettes.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.colorPalettes.detail(vars.id) });
            toast.success('Color palette updated successfully');
        },
        onError: (error: unknown) => {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || 'Failed to update color palette');
        },
    });
}

export function useDeleteColorPalette() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.colorPalettes.all });
            toast.success('Color palette deleted successfully');
        },
        onError: (error: unknown) => {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || 'Failed to delete color palette');
        },
    });
}
