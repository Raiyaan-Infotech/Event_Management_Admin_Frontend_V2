import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface HowItWorksStep {
    id?: number | string;
    step_number: number;
    title: string;
    description: string;
    highlight_title?: string;
    highlight_subtext?: string;
    icon?: string;
    illustration_url?: string;
    is_active?: boolean;
    sort_order?: number;
}

export function useHowItWorksData() {
    return useQuery({
        queryKey: ['website-builder-how-it-works'],
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/how-it-works');
            return (res.data?.data || res.data || []) as HowItWorksStep[];
        },
    });
}

export function useHowItWorksStepDetail(id: string | number | null | undefined) {
    return useQuery({
        queryKey: ['website-builder-how-it-works', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await apiClient.get(`/website-builder/how-it-works/${id}`);
            return (res.data?.data || res.data) as HowItWorksStep;
        },
        enabled: !!id,
    });
}


export function useCreateHowItWorksStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: HowItWorksStep) => {
            const res = await apiClient.post('/website-builder/how-it-works', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Step added successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-how-it-works'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error creating step.');
        },
    });
}

export function useUpdateHowItWorksStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string | number; payload: Partial<HowItWorksStep> }) => {
            const res = await apiClient.put(`/website-builder/how-it-works/${id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Step updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-how-it-works'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error updating step.');
        },
    });
}

export function useDeleteHowItWorksStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string | number) => {
            const res = await apiClient.delete(`/website-builder/how-it-works/${id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Step deleted successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-how-it-works'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error deleting step.');
        },
    });
}

export function useSaveHowItWorksSteps() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (items: HowItWorksStep[]) => {
            const res = await apiClient.put('/website-builder/how-it-works', { items });
            return res.data;
        },
        onSuccess: () => {
            toast.success('How It Works steps saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-how-it-works'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error saving steps.');
        },
    });
}

export function useToggleHowItWorksStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, is_active }: { id: string | number; is_active: boolean }) => {
            const res = await apiClient.patch(`/website-builder/how-it-works/${id}/status`, { is_active });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Step status updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-how-it-works'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Error updating step status.');
        },
    });
}
