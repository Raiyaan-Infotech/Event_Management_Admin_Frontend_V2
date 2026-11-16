import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { BlogCategory } from './use-blog-categories';
import type { BlogTag } from './use-blog-tags';

export interface BlogPostAuthor {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
}

export interface BlogPost {
    id: number;
    company_id: number;
    author_id: number | null;
    title: string;
    slug: string;
    description: string | null;
    content: string | null;
    image: string | null;
    is_featured: boolean | number;
    is_active: boolean | number;
    seo_title: string | null;
    seo_description: string | null;
    author?: BlogPostAuthor | null;
    categories?: BlogCategory[];
    tags?: BlogTag[];
    created_at?: string;
    updated_at?: string;
}

export interface CreateBlogPostDto {
    title: string;
    slug?: string;
    description?: string | null;
    content?: string | null;
    image?: string | null;
    is_featured?: boolean | number;
    is_active?: boolean | number;
    seo_title?: string | null;
    seo_description?: string | null;
    author_id?: number | null;
    category_ids?: number[];
    tag_ids?: number[];
}
export type UpdateBlogPostDto = Partial<CreateBlogPostDto>;

const blogPostsApi = {
    getAll: async (params?: Record<string, any>): Promise<{ data: BlogPost[]; pagination: any }> => {
        const response = await apiClient.get('/blog-posts', { params: { limit: 20, ...params } });
        return { data: response.data.data || [], pagination: response.data.pagination };
    },
    getById: async (id: number): Promise<BlogPost> => {
        const response = await apiClient.get(`/blog-posts/${id}`);
        return response.data.data?.blogPost || response.data.blogPost;
    },
    create: async (data: CreateBlogPostDto): Promise<BlogPost> => {
        const response = await apiClient.post('/blog-posts', data);
        return response.data.data?.blogPost || response.data.blogPost;
    },
    update: async ({ id, data }: { id: number; data: UpdateBlogPostDto }): Promise<BlogPost> => {
        const response = await apiClient.put(`/blog-posts/${id}`, data);
        return response.data.data?.blogPost || response.data.blogPost;
    },
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/blog-posts/${id}`);
    },
};

export function useBlogPosts(params?: Record<string, any>) {
    return useQuery({
        queryKey: queryKeys.blogPosts.list(params ?? {}),
        queryFn: () => blogPostsApi.getAll(params),
        staleTime: 2 * 60 * 1000,
    });
}

export function useBlogPost(id: number) {
    return useQuery({
        queryKey: queryKeys.blogPosts.detail(id),
        queryFn: () => blogPostsApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateBlogPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogPostsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.all });
            toast.success('Blog post created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create blog post');
        },
    });
}

export function useUpdateBlogPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogPostsApi.update,
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.detail(vars.id) });
            toast.success('Blog post updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update blog post');
        },
    });
}

export function useDeleteBlogPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: blogPostsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.all });
            toast.success('Blog post deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete blog post');
        },
    });
}