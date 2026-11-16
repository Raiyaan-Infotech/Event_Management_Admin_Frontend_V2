import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Language, CreateLanguageDto, UpdateLanguageDto } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// API functions
const languagesApi = {
  getActive: async (): Promise<Language[]> => {
    const response = await apiClient.get('/languages/active');
    return response.data.data.languages;
  },

  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Language>> => {
    const response = await apiClient.get('/languages', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Language> => {
    const response = await apiClient.get(`/languages/${id}`);
    return response.data.data.language;
  },

  create: async (data: CreateLanguageDto): Promise<Language> => {
    const response = await apiClient.post('/languages', data);
    return response.data.data.language;
  },

  update: async ({ id, data }: { id: number; data: UpdateLanguageDto }): Promise<Language> => {
    const response = await apiClient.put(`/languages/${id}`, data);
    return response.data.data.language;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/languages/${id}`);
  },

  setDefault: async (id: number): Promise<Language> => {
    const response = await apiClient.patch(`/languages/${id}/default`);
    return response.data.data.language;
  },
};

// Get active languages (public)
export function useActiveLanguages() {
  return useQuery({
    queryKey: queryKeys.languages.active(),
    queryFn: languagesApi.getActive,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Get all languages with pagination
export function useLanguages(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.languages.list((params || {}) as Record<string, unknown>),
    queryFn: () => languagesApi.getAll(params),
  });
}

// Get single language
export function useLanguage(id: number) {
  return useQuery({
    queryKey: queryKeys.languages.detail(id),
    queryFn: () => languagesApi.getById(id),
    enabled: !!id,
  });
}

// Create language mutation
export function useCreateLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: languagesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.languages.all });
      toast.success('Language created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create language');
    },
  });
}

// Update language mutation
export function useUpdateLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: languagesApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.languages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.languages.detail(variables.id) });
      toast.success('Language updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update language');
    },
  });
}

// Delete language mutation
export function useDeleteLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: languagesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.languages.all });
      toast.success('Language deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete language');
    },
  });
}

// Set default language mutation
export function useSetDefaultLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: languagesApi.setDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.languages.all });
      toast.success('Default language updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to set default language');
    },
  });
}

export function useToggleLanguageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      languagesApi.update({
        id,
        data: { is_active },
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.languages.all });
      toast.success("Language status updated");
    },

    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });
}

