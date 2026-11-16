import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface TemplateCategory {
    id?: number;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    sort_order?: number;
    is_active?: boolean;
    templates_count?: number;
}

export interface Template {
    id?: number;
    category_id?: number | null;
    category_name?: string;
    template_name: string;
    slug?: string;
    description?: string;
    template_type: 'wedding' | 'engagement' | 'birthday' | 'anniversary' | 'baby_shower' | 'corporate' | 'festival' | 'other';
    design_style: 'classic' | 'modern' | 'minimal' | 'floral' | 'traditional';
    primary_color: string;
    thumbnail_url?: string;
    template_file_url?: string;
    preview_url?: string;
    is_active?: boolean;
    allow_customize?: boolean;
    is_draft?: boolean;
    is_popular?: boolean;
    sort_order?: number;
}

// ─── TEMPLATE CATEGORIES HOOKS ────────────────────────────────────────────────

export function useTemplateCategories() {
    return useQuery({
        queryKey: ['website-builder-template-categories'],
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/templates/categories');
            return res.data.data as TemplateCategory[];
        },
    });
}

export function useSaveTemplateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (category: Partial<TemplateCategory>) => {
            if (category.id) {
                const res = await apiClient.put(`/website-builder/templates/categories/${category.id}`, category);
                return res.data;
            } else {
                const res = await apiClient.post('/website-builder/templates/categories', category);
                return res.data;
            }
        },
        onSuccess: (_, variables) => {
            toast.success(variables.id ? 'Template category updated!' : 'Template category created!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-template-categories'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to save template category');
        },
    });
}

export function useDeleteTemplateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiClient.delete(`/website-builder/templates/categories/${id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Template category deleted');
            queryClient.invalidateQueries({ queryKey: ['website-builder-template-categories'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to delete template category');
        },
    });
}

export function useToggleTemplateCategoryStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            try {
                const res = await apiClient.patch(`/website-builder/templates/categories/${id}/status`, { is_active });
                return res.data;
            } catch (err: any) {
                if (err?.response?.status === 404) {
                    const res = await apiClient.put(`/website-builder/templates/categories/${id}`, { is_active });
                    return res.data;
                }
                throw err;
            }
        },
        onSuccess: () => {
            toast.success('Template category status updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-template-categories'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to update category status');
        },
    });
}

// ─── TEMPLATES HOOKS ──────────────────────────────────────────────────────────

export function useTemplates(params?: { category_id?: number; template_type?: string; search?: string }) {
    return useQuery({
        queryKey: ['website-builder-templates', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.category_id) searchParams.append('category_id', String(params.category_id));
            if (params?.template_type && params.template_type !== 'all') searchParams.append('template_type', params.template_type);
            if (params?.search) searchParams.append('search', params.search);

            const queryString = searchParams.toString();
            const url = `/website-builder/templates${queryString ? `?${queryString}` : ''}`;
            const res = await apiClient.get(url);
            return res.data.data as Template[];
        },
    });
}

export function useTemplateById(id?: number) {
    return useQuery({
        queryKey: ['website-builder-template', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await apiClient.get(`/website-builder/templates/${id}`);
            return res.data.data as Template;
        },
        enabled: !!id,
    });
}

export function useSaveTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (template: Partial<Template>) => {
            if (template.id) {
                const res = await apiClient.put(`/website-builder/templates/${template.id}`, template);
                return res.data;
            } else {
                const res = await apiClient.post('/website-builder/templates', template);
                return res.data;
            }
        },
        onSuccess: (_, variables) => {
            toast.success(variables.id ? 'Template updated successfully!' : 'Template created successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-templates'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to save template');
        },
    });
}

export function useDeleteTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiClient.delete(`/website-builder/templates/${id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Template deleted');
            queryClient.invalidateQueries({ queryKey: ['website-builder-templates'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to delete template');
        },
    });
}

export function useToggleTemplateStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            try {
                const res = await apiClient.patch(`/website-builder/templates/${id}/status`, { is_active });
                return res.data;
            } catch (err: any) {
                if (err?.response?.status === 404) {
                    const res = await apiClient.put(`/website-builder/templates/${id}`, { is_active });
                    return res.data;
                }
                throw err;
            }
        },
        onSuccess: () => {
            toast.success('Template status updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['website-builder-templates'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Failed to update template status');
        },
    });
}
