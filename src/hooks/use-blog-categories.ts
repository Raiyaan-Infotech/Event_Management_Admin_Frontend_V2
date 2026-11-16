import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';

export interface BlogCategory {
    id: number;
    company_id: number;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    sort_order: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export type CreateBlogCategoryDto = Omit<BlogCategory, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
export type UpdateBlogCategoryDto = Partial<CreateBlogCategoryDto>;

const blogCategoriesApi = {
    getAll: async (params?: Record<string, any>): Promise<{ data: BlogCategory[]; pagination: any }> => {
        const response = await apiClient.get('/blog-categories', { params: { page: 1, limit: 10, ...params } });
        return { data: response.data.data || [], pagination: response.data.pagination };
    },
    getById: async (id: number): Promise<BlogCategory> => {
        const response = await apiClient.get(`/blog-categories/${id}`);
        return response.data.data?.blogCategory || response.data.blogCategory;
    },
    create: async (data: CreateBlogCategoryDto): Promise<BlogCategory> => {
        const response = await apiClient.post('/blog-categories', data);
        return response.data.data?.blogCategory || response.data.blogCategory;
    },
    update: async ({ id, data }: { id: number; data: UpdateBlogCategoryDto }): Promise<BlogCategory> => {
        const response = await apiClient.put(`/blog-categories/${id}`, data);
        return response.data.data?.blogCategory || response.data.blogCategory;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: number }): Promise<BlogCategory> => {
        const response = await apiClient.patch(`/blog-categories/${id}/status`, { is_active });
        return response.data.data?.blogCategory || response.data.blogCategory;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/blog-categories/${id}`);
    },
};

export function useBlogCategories(params?: Record<string, any>) {
    return useQuery({
        queryKey: queryKeys.blogCategories.list(params ?? {}),
        queryFn: () => blogCategoriesApi.getAll(params),
        staleTime: 2 * 60 * 1000,
    });
}

export function useBlogCategory(id: number) {
    return useQuery({
        queryKey: queryKeys.blogCategories.detail(id),
        queryFn: () => blogCategoriesApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateBlogCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogCategoriesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogCategories.all });
            toast.success('Blog category created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogCategories.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create blog category');
        },
    });
}

export function useUpdateBlogCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogCategoriesApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogCategories.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.blogCategories.detail(vars.id) });
            toast.success('Blog category updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogCategories.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update blog category');
        },
    });
}

export function useUpdateBlogCategoryStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogCategoriesApi.updateStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogCategories.all });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteBlogCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogCategoriesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogCategories.all });
            toast.success('Blog category deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogCategories.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete blog category');
        },
    });
}