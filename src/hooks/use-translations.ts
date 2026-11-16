import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type {
  TranslationKey,
  TranslationMap,
  TranslationStats,
  CreateTranslationKeyDto,
  UpdateTranslationKeyDto,
  UpdateTranslationDto,
  BulkImportResult,
} from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// API functions
const translationsApi = {
  // Public - Get translations for a language
  getForLanguage: async (langCode: string): Promise<TranslationMap> => {
    const response = await apiClient.get(`/translations/${langCode}`);
    return response.data.data.translations;
  },

  // Public - Get translations for a language by group
  getByGroup: async (langCode: string, group: string): Promise<TranslationMap> => {
    const response = await apiClient.get(`/translations/${langCode}/${group}`);
    return response.data.data.translations;
  },

  // Get translation statistics
  getStats: async (): Promise<TranslationStats> => {
    const response = await apiClient.get('/translations/stats');
    return response.data.data.stats;
  },

  // Get all groups
  getGroups: async (): Promise<string[]> => {
    const response = await apiClient.get('/translations/groups');
    return response.data.data.groups;
  },

  // Export all translations
  exportAll: async (): Promise<unknown[]> => {
    const response = await apiClient.get('/translations/export');
    return response.data.data.data;
  },

  // Translate all keys to a language
  translateAllToLanguage: async (languageId: number): Promise<{ count: number }> => {
    const response = await apiClient.post('/translations/translate-all', { language_id: languageId });
    return response.data.data;
  },
};

const translationKeysApi = {
  // Get all translation keys (paginated)
  getAll: async (params?: PaginationParams & { group?: string }): Promise<PaginatedResponse<TranslationKey>> => {
    const response = await apiClient.get('/translation-keys', { params });
    return response.data;
  },

  // Get translation key by ID
  getById: async (id: number): Promise<TranslationKey> => {
    const response = await apiClient.get(`/translation-keys/${id}`);
    return response.data.data.key;
  },

  // Create translation key
  create: async (data: CreateTranslationKeyDto): Promise<TranslationKey> => {
    const response = await apiClient.post('/translation-keys', data);
    return response.data.data.key;
  },

  // Update translation key
  update: async ({ id, data }: { id: number; data: UpdateTranslationKeyDto }): Promise<TranslationKey> => {
    const response = await apiClient.put(`/translation-keys/${id}`, data);
    return response.data.data.key;
  },

  // Delete translation key
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/translation-keys/${id}`);
  },

  // Update translations for a key
  updateTranslations: async ({ id, translations }: { id: number; translations: UpdateTranslationDto[] }): Promise<void> => {
    await apiClient.put(`/translation-keys/${id}/translations`, { translations });
  },

  // Re-translate a key to a specific language
  retranslate: async ({ id, languageId }: { id: number; languageId: number }): Promise<void> => {
    await apiClient.post(`/translation-keys/${id}/retranslate`, { language_id: languageId });
  },

  // Re-translate a key to all languages
  retranslateAll: async (id: number): Promise<void> => {
    await apiClient.post(`/translation-keys/${id}/retranslate-all`);
  },

  // Bulk import keys
  bulkImport: async (data: { keys: CreateTranslationKeyDto[]; auto_translate?: boolean }): Promise<BulkImportResult> => {
    const response = await apiClient.post('/translation-keys/bulk-import', data);
    return response.data.data;
  },
};

// ==================== PUBLIC HOOKS ====================

// Get translations for a language (used by TranslationProvider)
export function useTranslationsForLanguage(langCode: string) {
  return useQuery({
    queryKey: queryKeys.translations.forLanguage(langCode),
    queryFn: () => translationsApi.getForLanguage(langCode),
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!langCode,
  });
}

// Get translations by group
export function useTranslationsByGroup(langCode: string, group: string) {
  return useQuery({
    queryKey: queryKeys.translations.forLanguageGroup(langCode, group),
    queryFn: () => translationsApi.getByGroup(langCode, group),
    enabled: !!langCode && !!group,
  });
}

// Get translation statistics
export function useTranslationStats() {
  return useQuery({
    queryKey: queryKeys.translations.stats(),
    queryFn: translationsApi.getStats,
  });
}

// Get all groups
export function useTranslationGroups() {
  return useQuery({
    queryKey: queryKeys.translations.groups(),
    queryFn: translationsApi.getGroups,
  });
}

// ==================== ADMIN HOOKS ====================

// Get all translation keys (paginated)
export function useTranslationKeys(params?: PaginationParams & { group?: string }) {
  return useQuery({
    queryKey: queryKeys.translationKeys.list((params || {}) as Record<string, unknown>),
    queryFn: () => translationKeysApi.getAll(params),
  });
}

// Get single translation key
export function useTranslationKey(id: number) {
  return useQuery({
    queryKey: queryKeys.translationKeys.detail(id),
    queryFn: () => translationKeysApi.getById(id),
    enabled: !!id,
  });
}

// Create translation key mutation
export function useCreateTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationKeysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success('Translation key created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create translation key');
    },
  });
}

// Update translation key mutation
export function useUpdateTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationKeysApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success('Translation key updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update translation key');
    },
  });
}

// Delete translation key mutation
export function useDeleteTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationKeysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success('Translation key deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete translation key');
    },
  });
}

// Update translations for a key mutation
export function useUpdateTranslations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationKeysApi.updateTranslations,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success('Translations updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update translations');
    },
  });
}

// Re-translate key mutation
export function useRetranslateKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationKeysApi.retranslate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success('Translation updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to re-translate');
    },
  });
}

// Re-translate key to all languages mutation
export function useRetranslateKeyToAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationKeysApi.retranslateAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success('All translations updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to re-translate');
    },
  });
}

// Translate all keys to a language mutation
export function useTranslateAllToLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationsApi.translateAllToLanguage,
    onSuccess: (data: { count: number; failed?: number; reactivated?: number; quotaExceeded?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });

      if (data.quotaExceeded) {
        toast.error(`API quota exceeded! ${data.count} created, ${data.failed} skipped. Try again tomorrow.`);
      } else if (data.failed && data.failed > 0) {
        toast.warning(`${data.count} translations created, ${data.failed} failed`);
      } else {
        toast.success(`${data.count} translations created successfully`);
      }
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to translate');
    },
  });
}

// Bulk import mutation
export function useBulkImportTranslationKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: translationKeysApi.bulkImport,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success(`Import completed: ${data.created} created, ${data.skipped} skipped`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to import');
    },
  });
}

// Export all translations
export function useExportTranslations() {
  return useQuery({
    queryKey: queryKeys.translations.export(),
    queryFn: translationsApi.exportAll,
    enabled: false, // Manual trigger only
  });
}

// ==================== MISSING KEYS API ====================

export interface MissingTranslationKey {
  id: number;
  key: string;
  default_value: string | null;
  page_url: string | null;
  report_count: number;
  first_reported_at: string;
  last_reported_at: string;
  is_active: number; // 0=resolved/ignored, 1=pending, 2=in-progress
  created_at: string;
  updated_at: string;
}

const missingKeysApi = {
  // Get all missing keys (paginated)
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<MissingTranslationKey>> => {
    const response = await apiClient.get('/translations/missing', { params });
    return response.data;
  },

  // Get missing keys count
  getCount: async (): Promise<{ count: number; unresolved: number }> => {
    const response = await apiClient.get('/translations/missing/count');
    return response.data.data;
  },

  // Create translation key from missing entry
  createFromMissing: async ({ id, data }: { id: number; data?: { group?: string; description?: string } }): Promise<TranslationKey> => {
    const response = await apiClient.post(`/translations/missing/${id}/create`, data || {});
    return response.data.data.key;
  },

  // Create all missing keys with auto-translate
  createAll: async (): Promise<{ created: number; failed: number }> => {
    const response = await apiClient.post('/translations/missing/create-all');
    return response.data.data;
  },

  // Delete a missing key entry
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/translations/missing/${id}`);
  },

  // Ignore a missing key (mark as resolved without creating)
  ignore: async (id: number): Promise<void> => {
    await apiClient.post(`/translations/missing/${id}/ignore`);
  },
};

// ==================== MISSING KEYS HOOKS ====================

// Get all missing keys (paginated)
export function useMissingTranslationKeys(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.missingTranslationKeys.list((params || {}) as Record<string, unknown>),
    queryFn: () => missingKeysApi.getAll(params),
  });
}

// Get missing keys count (for dashboard alert)
export function useMissingTranslationKeysCount() {
  return useQuery({
    queryKey: queryKeys.missingTranslationKeys.count(),
    queryFn: missingKeysApi.getCount,
    refetchInterval: 60000, // Refetch every minute
  });
}

// Create translation key from missing entry
export function useCreateKeyFromMissing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: missingKeysApi.createFromMissing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missingTranslationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success('Translation key created and translated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create translation key');
    },
  });
}

// Create all missing keys with auto-translate
export function useCreateAllMissingKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: missingKeysApi.createAll,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missingTranslationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translationKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.translations.all });
      toast.success(`Created ${data.created} translation keys`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create translation keys');
    },
  });
}

// Delete missing key entry
export function useDeleteMissingKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: missingKeysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missingTranslationKeys.all });
      toast.success('Missing key deleted');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete missing key');
    },
  });
}

// Ignore missing key (mark as resolved)
export function useIgnoreMissingKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: missingKeysApi.ignore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missingTranslationKeys.all });
      toast.success('Missing key ignored');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to ignore missing key');
    },
  });
}
