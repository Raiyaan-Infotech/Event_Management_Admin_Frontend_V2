import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Plugin, PluginGrouped } from '@/types';

// ─── API ─────────────────────────────────────────────────────────────────────

const pluginsApi = {
    getAll: async (): Promise<PluginGrouped> => {
        const response = await apiClient.get('/plugins');
        return response.data.data;
    },

    getBySlug: async (slug: string): Promise<{ plugin: Plugin; config: { key: string; value: string | null; type: string; description: string | null }[] }> => {
        const response = await apiClient.get(`/plugins/${slug}`);
        return response.data.data;
    },

    toggle: async (slug: string): Promise<Plugin> => {
        const response = await apiClient.put(`/plugins/${slug}/toggle`, {});
        return response.data.data.plugin;
    },
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Fetch all plugins, grouped by category */
export function usePlugins() {
    return useQuery({
        queryKey: queryKeys.plugins.list(),
        queryFn: pluginsApi.getAll,
        staleTime: 5 * 60 * 1000,
    });
}

/** Fetch a single plugin by slug (includes its config settings) */
export function usePlugin(slug: string) {
    return useQuery({
        queryKey: queryKeys.plugins.detail(slug),
        queryFn: () => pluginsApi.getBySlug(slug),
        enabled: !!slug,
    });
}

/** Toggle a plugin enabled / disabled */
export function useTogglePlugin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: pluginsApi.toggle,
        onSuccess: (updatedPlugin) => {
            const stateLabel = updatedPlugin.is_active === 1 ? 'enabled' : 'disabled';
            toast.success(`Plugin ${stateLabel} successfully`);
            // Invalidate list + detail
            queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all });
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(error.response?.data?.message || 'Failed to update plugin');
        },
    });
}

/**
 * Returns true if the given plugin slug is currently active.
 * Defaults to true while loading or on error, so settings pages don't flash empty.
 */
export function useIsPluginActive(slug: string): boolean {
    const { data, isLoading, isError } = usePlugins();

    if (isLoading || isError || !data) return true; // default: show the section
    const plugin = data.plugins.find((p) => p.slug === slug);
    if (!plugin) return true; // not seeded yet → show by default
    return plugin.is_active === 1;
}

