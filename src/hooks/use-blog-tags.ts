import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';

export interface BlogTag {
    id: number;
    company_id: number;
    name: string;
    slug: string;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export type CreateBlogTagDto = Omit<BlogTag, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
export type UpdateBlogTagDto = Partial<CreateBlogTagDto>;

const blogTagsApi = {
    getAll: async (params?: Record<string, any>): Promise<{ data: BlogTag[]; pagination: any }> => {
        const response = await apiClient.get('/blog-tags', { params: { page: 1, limit: 10, ...params } });
        return { data: response.data.data || [], pagination: response.data.pagination };
    },
    getById: async (id: number): Promise<BlogTag> => {
        const response = await apiClient.get(`/blog-tags/${id}`);
        return response.data.data?.blogTag || response.data.blogTag;
    },
    create: async (data: CreateBlogTagDto): Promise<BlogTag> => {
        const response = await apiClient.post('/blog-tags', data);
        return response.data.data?.blogTag || response.data.blogTag;
    },
    update: async ({ id, data }: { id: number; data: UpdateBlogTagDto }): Promise<BlogTag> => {
        const response = await apiClient.put(`/blog-tags/${id}`, data);
        return response.data.data?.blogTag || response.data.blogTag;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: number }): Promise<BlogTag> => {
        const response = await apiClient.patch(`/blog-tags/${id}/status`, { is_active });
        return response.data.data?.blogTag || response.data.blogTag;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/blog-tags/${id}`);
    },
};

export function useBlogTags(params?: Record<string, any>) {
    return useQuery({
        queryKey: queryKeys.blogTags.list(params ?? {}),
        queryFn: () => blogTagsApi.getAll(params),
        staleTime: 2 * 60 * 1000,
    });
}

export function useBlogTag(id: number) {
    return useQuery({
        queryKey: queryKeys.blogTags.detail(id),
        queryFn: () => blogTagsApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateBlogTag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogTagsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogTags.all });
            toast.success('Blog tag created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogTags.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create blog tag');
        },
    });
}

export function useUpdateBlogTag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogTagsApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogTags.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.blogTags.detail(vars.id) });
            toast.success('Blog tag updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogTags.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update blog tag');
        },
    });
}

export function useUpdateBlogTagStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogTagsApi.updateStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogTags.all });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteBlogTag() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogTagsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogTags.all });
            toast.success('Blog tag deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogTags.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete blog tag');
        },
    });
}