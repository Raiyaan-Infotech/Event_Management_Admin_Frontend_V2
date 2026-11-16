import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface UiBlockPayloadItem {
    id: string;
    label: string;
    description: string;
    visible: boolean;
    locked: boolean;
    required: boolean;
    sort_order: number;
}

export function useUiBlocksData(pageSlug?: string) {
    return useQuery({
        queryKey: ['website-builder-ui-blocks', pageSlug || 'all'],
        queryFn: async () => {
            const endpoint = pageSlug
                ? `/website-builder/ui-blocks?page_slug=${pageSlug}`
                : '/website-builder/ui-blocks';
            const res = await apiClient.get(endpoint);
            // DB rows use block_key column; normalize to id for consistency with the in-memory block definitions
            const rows = (res.data?.data ?? res.data ?? []) as Array<Record<string, unknown>>;
            return rows.map((row) => ({
                ...row,
                id: (row.block_key ?? row.id) as string,
                visible: row.is_visible === 1 || row.is_visible === true || row.visible === true,
            })) as UiBlockPayloadItem[];
        },
    });
}

export function useSaveUiBlocks(pageSlug?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (blocks: UiBlockPayloadItem[]) => {
            const payload = pageSlug
                ? { page_slug: pageSlug, items: blocks }
                : { items: blocks };
            const res = await apiClient.put('/website-builder/ui-blocks', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('UI blocks order & visibility saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-ui-blocks'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Failed to save UI blocks');
        },
    });
}
