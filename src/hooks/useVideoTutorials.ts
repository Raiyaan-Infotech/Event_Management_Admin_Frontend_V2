// src/hooks/useVideoTutorials.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface VideoTutorialCategory {
    id: number;
    company_id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export interface VideoTutorialSubCategory {
    id: number;
    company_id: number;
    category_id: number;
    category_name?: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export interface VideoTutorialDifficultyLevel {
    id: number;
    company_id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export interface VideoTutorialType {
    id: number;
    company_id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export interface VideoTutorial {
    id: number;
    company_id: number;
    title: string;
    short_description: string | null;
    category_id: number | null;
    subcategory_id: number | null;
    tags_json: string[] | null;
    tags?: string | null;
    video_source: 'upload' | 'youtube' | 'vimeo';
    video_url: string | null;
    video_file_url: string | null;
    duration_seconds: number;
    difficulty_level_id: number | null;
    tutorial_type_id: number | null;
    key_takeaways: string | null;
    thumbnail_url: string | null;
    is_featured: boolean | number;
    publish_date: string | null;
    sort_order: number;
    is_active: boolean | number;
    category_name?: string;
    subcategory_name?: string;
    difficulty_name?: string;
    difficulty_color?: string;
    type_name?: string;
    created_at?: string;
    updated_at?: string;
}

type TaxonomyPayload = {
    name: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    sort_order?: number;
    is_active?: boolean;
};

export type CreateVideoTutorialCategoryPayload = TaxonomyPayload;
export type UpdateVideoTutorialCategoryPayload = Partial<TaxonomyPayload>;

export type CreateVideoTutorialSubCategoryPayload = TaxonomyPayload & { category_id: number };
export type UpdateVideoTutorialSubCategoryPayload = Partial<CreateVideoTutorialSubCategoryPayload>;

export type CreateVideoTutorialDifficultyLevelPayload = TaxonomyPayload;
export type UpdateVideoTutorialDifficultyLevelPayload = Partial<TaxonomyPayload>;

export type CreateVideoTutorialTypePayload = TaxonomyPayload;
export type UpdateVideoTutorialTypePayload = Partial<TaxonomyPayload>;

export type CreateVideoTutorialPayload = {
    title: string;
    short_description?: string;
    category_id?: number | null;
    subcategory_id?: number | null;
    tags_json?: string[] | null;
    tags?: string | null;
    video_source?: 'upload' | 'youtube' | 'vimeo';
    video_url?: string | null;
    video_file_url?: string | null;
    duration_seconds?: number;
    difficulty_level_id?: number | null;
    tutorial_type_id?: number | null;
    key_takeaways?: string | null;
    thumbnail_url?: string | null;
    is_featured?: boolean;
    publish_date?: string | null;
    sort_order?: number;
    is_active?: boolean;
};
export type UpdateVideoTutorialPayload = Partial<CreateVideoTutorialPayload>;

function extractArrayData<T>(resData: any): T[] {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData.data)) return resData.data;
    if (Array.isArray(resData.data?.data)) return resData.data.data;
    if (Array.isArray(resData.result)) return resData.result;
    return [];
}

/* ------------------------------------------------------------------ */
/*  Video Tutorial Categories                                          */
/* ------------------------------------------------------------------ */
const CATEGORY_KEY = ['video-tutorial-categories'];

export function useVideoTutorialCategories() {
    return useQuery({
        queryKey: CATEGORY_KEY,
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/video-tutorial-categories');
            return extractArrayData<VideoTutorialCategory>(res.data);
        },
    });
}

export function useCreateVideoTutorialCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateVideoTutorialCategoryPayload) => {
            const res = await apiClient.post('/website-builder/video-tutorial-categories', payload);
            return res.data?.data as VideoTutorialCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATEGORY_KEY });
            toast.success('Category created successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create category');
        },
    });
}

export function useUpdateVideoTutorialCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateVideoTutorialCategoryPayload }) => {
            const res = await apiClient.put(`/website-builder/video-tutorial-categories/${id}`, data);
            return res.data?.data as VideoTutorialCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATEGORY_KEY });
            toast.success('Category updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update category');
        },
    });
}

export function useUpdateVideoTutorialCategoryStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            const res = await apiClient.patch(`/website-builder/video-tutorial-categories/${id}/status`, { is_active });
            return res.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATEGORY_KEY });
            toast.success('Status updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteVideoTutorialCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/website-builder/video-tutorial-categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATEGORY_KEY });
            toast.success('Category deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete category');
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Video Tutorial Sub Categories                                      */
/* ------------------------------------------------------------------ */
const SUBCATEGORY_KEY = ['video-tutorial-subcategories'];

export function useVideoTutorialSubCategories(params?: { category_id?: number | string }) {
    return useQuery({
        queryKey: [...SUBCATEGORY_KEY, params ?? {}],
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/video-tutorial-subcategories', { params });
            return extractArrayData<VideoTutorialSubCategory>(res.data);
        },
    });
}

export function useCreateVideoTutorialSubCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateVideoTutorialSubCategoryPayload) => {
            const res = await apiClient.post('/website-builder/video-tutorial-subcategories', payload);
            return res.data?.data as VideoTutorialSubCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBCATEGORY_KEY });
            toast.success('Sub category created successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create sub category');
        },
    });
}

export function useUpdateVideoTutorialSubCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateVideoTutorialSubCategoryPayload }) => {
            const res = await apiClient.put(`/website-builder/video-tutorial-subcategories/${id}`, data);
            return res.data?.data as VideoTutorialSubCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBCATEGORY_KEY });
            toast.success('Sub category updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update sub category');
        },
    });
}

export function useUpdateVideoTutorialSubCategoryStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            const res = await apiClient.patch(`/website-builder/video-tutorial-subcategories/${id}/status`, { is_active });
            return res.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBCATEGORY_KEY });
            toast.success('Status updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteVideoTutorialSubCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/website-builder/video-tutorial-subcategories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBCATEGORY_KEY });
            toast.success('Sub category deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete sub category');
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Video Tutorial Difficulty Levels                                   */
/* ------------------------------------------------------------------ */
const DIFFICULTY_KEY = ['video-tutorial-difficulty-levels'];

export function useVideoTutorialDifficultyLevels() {
    return useQuery({
        queryKey: DIFFICULTY_KEY,
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/video-tutorial-difficulty-levels');
            return extractArrayData<VideoTutorialDifficultyLevel>(res.data);
        },
    });
}

export function useCreateVideoTutorialDifficultyLevel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateVideoTutorialDifficultyLevelPayload) => {
            const res = await apiClient.post('/website-builder/video-tutorial-difficulty-levels', payload);
            return res.data?.data as VideoTutorialDifficultyLevel;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DIFFICULTY_KEY });
            toast.success('Difficulty level created successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create difficulty level');
        },
    });
}

export function useUpdateVideoTutorialDifficultyLevel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateVideoTutorialDifficultyLevelPayload }) => {
            const res = await apiClient.put(`/website-builder/video-tutorial-difficulty-levels/${id}`, data);
            return res.data?.data as VideoTutorialDifficultyLevel;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DIFFICULTY_KEY });
            toast.success('Difficulty level updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update difficulty level');
        },
    });
}

export function useUpdateVideoTutorialDifficultyLevelStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            const res = await apiClient.patch(`/website-builder/video-tutorial-difficulty-levels/${id}/status`, { is_active });
            return res.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DIFFICULTY_KEY });
            toast.success('Status updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteVideoTutorialDifficultyLevel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/website-builder/video-tutorial-difficulty-levels/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DIFFICULTY_KEY });
            toast.success('Difficulty level deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete difficulty level');
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Video Tutorial Types                                               */
/* ------------------------------------------------------------------ */
const TYPE_KEY = ['video-tutorial-types'];

export function useVideoTutorialTypes() {
    return useQuery({
        queryKey: TYPE_KEY,
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/video-tutorial-types');
            return extractArrayData<VideoTutorialType>(res.data);
        },
    });
}

export function useCreateVideoTutorialType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateVideoTutorialTypePayload) => {
            const res = await apiClient.post('/website-builder/video-tutorial-types', payload);
            return res.data?.data as VideoTutorialType;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TYPE_KEY });
            toast.success('Tutorial type created successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create tutorial type');
        },
    });
}

export function useUpdateVideoTutorialType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateVideoTutorialTypePayload }) => {
            const res = await apiClient.put(`/website-builder/video-tutorial-types/${id}`, data);
            return res.data?.data as VideoTutorialType;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TYPE_KEY });
            toast.success('Tutorial type updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update tutorial type');
        },
    });
}

export function useUpdateVideoTutorialTypeStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            const res = await apiClient.patch(`/website-builder/video-tutorial-types/${id}/status`, { is_active });
            return res.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TYPE_KEY });
            toast.success('Status updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteVideoTutorialType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/website-builder/video-tutorial-types/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TYPE_KEY });
            toast.success('Tutorial type deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete tutorial type');
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Video Tutorials (main entity)                                      */
/* ------------------------------------------------------------------ */
const VIDEO_TUTORIAL_KEY = ['video-tutorials'];

export function useVideoTutorials(params?: {
    search?: string;
    category_id?: string | number;
    subcategory_id?: string | number;
    difficulty_level_id?: string | number;
    tutorial_type_id?: string | number;
    is_active?: string;
}) {
    return useQuery({
        queryKey: [...VIDEO_TUTORIAL_KEY, params ?? {}],
        queryFn: async () => {
            const res = await apiClient.get('/website-builder/video-tutorials', { params });
            return extractArrayData<VideoTutorial>(res.data);
        },
    });
}

export function useVideoTutorial(id?: number) {
    return useQuery({
        queryKey: [...VIDEO_TUTORIAL_KEY, id],
        queryFn: async () => {
            if (!id) return null;
            const res = await apiClient.get(`/website-builder/video-tutorials/${id}`);
            return (res.data?.data || null) as VideoTutorial | null;
        },
        enabled: !!id,
    });
}

export function useCreateVideoTutorial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateVideoTutorialPayload) => {
            const res = await apiClient.post('/website-builder/video-tutorials', payload);
            return res.data?.data as VideoTutorial;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: VIDEO_TUTORIAL_KEY });
            toast.success('Video tutorial created successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create video tutorial');
        },
    });
}

export function useUpdateVideoTutorial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateVideoTutorialPayload }) => {
            const res = await apiClient.put(`/website-builder/video-tutorials/${id}`, data);
            return res.data?.data as VideoTutorial;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: VIDEO_TUTORIAL_KEY });
            queryClient.invalidateQueries({ queryKey: [...VIDEO_TUTORIAL_KEY, vars.id] });
            toast.success('Video tutorial updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update video tutorial');
        },
    });
}

export function useUpdateVideoTutorialStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            const res = await apiClient.patch(`/website-builder/video-tutorials/${id}/status`, { is_active });
            return res.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: VIDEO_TUTORIAL_KEY });
            toast.success('Status updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update status');
        },
    });
}

export function useDeleteVideoTutorial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/website-builder/video-tutorials/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: VIDEO_TUTORIAL_KEY });
            toast.success('Video tutorial deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete video tutorial');
        },
    });
}