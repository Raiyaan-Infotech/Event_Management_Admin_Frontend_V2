import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface BuilderLanguage {
  id: number;
  company_id: number;
  code: string;
  name: string;
  native_name?: string | null;
  direction: 'ltr' | 'rtl';
  is_default: boolean | number;
  is_active: boolean | number;
  sort_order: number;
}

export interface CreateBuilderLanguagePayload {
  code: string;
  name: string;
  native_name?: string;
  direction?: 'ltr' | 'rtl';
  sort_order?: number;
}

// Field values per language: { [languageId]: { [fieldKey]: value } }
export type ContentTranslationMap = Record<number, Record<string, string>>;

const LANGUAGES_KEY = ['website-builder-languages'] as const;

export function useBuilderLanguages() {
  return useQuery({
    queryKey: LANGUAGES_KEY,
    queryFn: () => api.get<BuilderLanguage[]>('/website-builder/translations/languages'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBuilderLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBuilderLanguagePayload) =>
      api.post<BuilderLanguage>('/website-builder/translations/languages', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANGUAGES_KEY });
      toast.success('Language added');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add language');
    },
  });
}

export interface UpdateBuilderLanguagePayload {
  code?: string;
  name?: string;
  native_name?: string;
  direction?: 'ltr' | 'rtl';
  sort_order?: number;
  is_active?: boolean;
}

export function useUpdateBuilderLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBuilderLanguagePayload }) =>
      api.put<BuilderLanguage>(`/website-builder/translations/languages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANGUAGES_KEY });
      toast.success('Language updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update language');
    },
  });
}

export function useSetDefaultBuilderLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch<BuilderLanguage>(`/website-builder/translations/languages/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANGUAGES_KEY });
      toast.success('Default language updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to set default language');
    },
  });
}

export interface TranslateAllResult {
  created: number;
  failed: number;
  skipped: number;
  quotaExceeded: boolean;
}

// Translates every registered Website Builder key into one language.
export function useTranslateAllToLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (languageId: number) =>
      api.post<TranslateAllResult>(`/website-builder/translations/languages/${languageId}/translate-all`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['website-builder-translation-keys'] });
      queryClient.invalidateQueries({ queryKey: ['website-builder-translation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['website-builder-content-translations'] });

      if (data.quotaExceeded) {
        toast.error(`Daily API quota exceeded! ${data.created} translated, ${data.failed} skipped. Try again tomorrow.`);
      } else if (data.failed > 0) {
        toast.warning(`${data.created} translations created, ${data.failed} failed`);
      } else if (data.created === 0) {
        toast.info('No translatable fields yet. Save a Website Builder section first.');
      } else {
        toast.success(`${data.created} translations created successfully`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to translate');
    },
  });
}

export function useDeleteBuilderLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/website-builder/translations/languages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANGUAGES_KEY });
      toast.success('Language removed');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to remove language');
    },
  });
}

// ── Rendered-site consumption (public switcher + whole-site overlay) ────────

export interface PublicBuilderLanguage {
  id: number;
  code: string;
  name: string;
  native_name?: string | null;
  direction: 'ltr' | 'rtl';
  is_default: boolean;
}

// Active languages for the public language switcher, default first. Replaces
// the hardcoded en/hi list that used to drive the switcher.
export function usePublicBuilderLanguages() {
  return useQuery({
    queryKey: ['website-builder-public-languages'],
    queryFn: () => api.get<PublicBuilderLanguage[]>('/website-builder/translations/public-languages'),
    staleTime: 5 * 60 * 1000,
  });
}

export interface TranslationBundleResponse {
  language: PublicBuilderLanguage | null;
  // Keyed by slot: `section|page_slug|record_id`
  translations: Record<string, Record<string, string>>;
}

// Every translation for one language in a single request. The rendered site
// needs the whole set at once — fetching per slot would mean one request per
// FAQ, testimonial and pricing plan on the page.
export function useTranslationBundle(languageCode?: string | null) {
  const code = (languageCode || '').trim().toLowerCase();
  return useQuery({
    queryKey: ['website-builder-translation-bundle', code],
    queryFn: () =>
      api.get<TranslationBundleResponse>('/website-builder/translations/bundle', {
        params: { code },
      }),
    // No request for the source language — its content is already the base text.
    enabled: !!code && code !== 'en',
    staleTime: 60 * 1000,
  });
}

// Fetches per-language field values for one content slot (a section, optionally scoped to a page)
export function useContentTranslations(section: string, pageSlug?: string, recordId?: number) {
  return useQuery({
    queryKey: ['website-builder-content-translations', section, pageSlug || '', recordId || 0],
    queryFn: () =>
      api.get<ContentTranslationMap>('/website-builder/content-translations', {
        params: { section, page_slug: pageSlug, record_id: recordId },
      }),
    enabled: !!section,
    staleTime: 60 * 1000,
  });
}

export function useSaveContentTranslations(section: string, pageSlug?: string, recordId?: number) {
  const queryClient = useQueryClient();
  const queryKey = ['website-builder-content-translations', section, pageSlug || '', recordId || 0];

  return useMutation({
    mutationFn: (payload: { language_id: number; values: Record<string, string> }) =>
      api.put<ContentTranslationMap>('/website-builder/content-translations', {
        section,
        page_slug: pageSlug,
        record_id: recordId,
        ...payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['website-builder-translation-keys'] });
      toast.success('Translation saved');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save translation');
    },
  });
}

// ── Translation key registry (backs auto-translate + the language side card) ─

export interface TranslatableFieldInput {
  key: string;
  label: string;
  type?: 'input' | 'textarea';
  value: string;
  /**
   * Mirrors the `*` the form shows in English mode. A translation for a
   * required field cannot be saved empty — see the validation in
   * `useSectionTranslation.save()`. Only enforced when the English source has
   * text: with nothing to translate from, the backend registers no key and the
   * field could never be satisfied.
   */
  required?: boolean;
}

// Called after a section successfully saves its base (English) content, so the
// key catalog (used internally by auto-translate) always reflects the current
// fields and their English source text.
export function useRegisterTranslationKeys() {
  return useMutation({
    mutationFn: (payload: {
      section: string;
      page_slug?: string;
      record_id?: number;
      fields: TranslatableFieldInput[];
    }) => api.put('/website-builder/translation-keys/register', payload),
  });
}

// Machine-translates every registered field's English text into the target
// language and saves the result — same MyMemory-backed engine the admin's own
// Languages module uses for its "Translate All" button.
export function useAutoTranslateContent(section: string, pageSlug?: string, recordId?: number) {
  const queryClient = useQueryClient();
  const queryKey = ['website-builder-content-translations', section, pageSlug || '', recordId || 0];

  return useMutation({
    mutationFn: (languageId: number) =>
      api.post<ContentTranslationMap>('/website-builder/content-translations/auto-translate', {
        section,
        page_slug: pageSlug,
        record_id: recordId,
        language_id: languageId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['website-builder-translation-keys'] });
      queryClient.invalidateQueries({ queryKey: ['website-builder-translation-stats'] });
      toast.success('Translated from English');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to auto-translate');
    },
  });
}

// ── Central Translations module (mirrors admin Settings > Translations) ──────

export interface WBTranslationEntry {
  language_id: number;
  value: string;
  status: 'auto' | 'reviewed';
}

export interface WBTranslationKey {
  id: number;
  section: string;
  page_slug: string;
  record_id: number;
  field_key: string;
  field_label: string;
  default_value: string | null;
  sort_order: number;
  translations: WBTranslationEntry[];
}

export interface WBTranslationStats {
  total_keys: number;
  languages: {
    id: number;
    name: string;
    native_name?: string | null;
    total: number;
    reviewed: number;
    auto: number;
    missing: number;
    completion: number;
  }[];
}

const KEYS_QUERY_KEY = ['website-builder-translation-keys'];

function useInvalidateTranslationData() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: KEYS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['website-builder-translation-stats'] });
    queryClient.invalidateQueries({ queryKey: ['website-builder-content-translations'] });
  };
}

export function useTranslationSections() {
  return useQuery({
    queryKey: ['website-builder-translation-sections'],
    queryFn: () => api.get<string[]>('/website-builder/translation-keys/sections'),
    staleTime: 60 * 1000,
  });
}

// Both of these hit endpoints that re-run a full content scan (~23s and ~12s on
// production). With the React Query default of `staleTime: 0` they refetched on
// every mount, so simply navigating back to the Translations page paid the full
// cost again. A minute matches the backend's own sync throttle, and every
// mutation here already invalidates these keys explicitly, so an edit still
// shows up immediately.
const TRANSLATION_STALE_MS = 60 * 1000;

export function useWBTranslationKeys(params: { section?: string } = {}) {
  return useQuery({
    // `search` is filtered client-side — putting it in the key made every
    // keystroke trigger another full scan.
    queryKey: [...KEYS_QUERY_KEY, params.section || ''],
    queryFn: () =>
      api.get<WBTranslationKey[]>('/website-builder/translation-keys', {
        params: { section: params.section },
      }),
    staleTime: TRANSLATION_STALE_MS,
  });
}

export function useWBTranslationStats() {
  return useQuery({
    queryKey: ['website-builder-translation-stats'],
    queryFn: () => api.get<WBTranslationStats>('/website-builder/translation-keys/stats'),
    staleTime: TRANSLATION_STALE_MS,
  });
}

// Saves one key across many languages at once — backs the Edit Translations dialog.
export function useSaveKeyTranslations() {
  const invalidate = useInvalidateTranslationData();
  return useMutation({
    mutationFn: ({ id, translations }: { id: number; translations: { language_id: number; value: string }[] }) =>
      api.put(`/website-builder/translation-keys/${id}/translations`, { translations }),
    onSuccess: () => {
      invalidate();
      toast.success('Translations saved successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save translations');
    },
  });
}

export function useRetranslateKey() {
  const invalidate = useInvalidateTranslationData();
  return useMutation({
    mutationFn: (id: number) => api.post(`/website-builder/translation-keys/${id}/retranslate`),
    onSuccess: () => {
      invalidate();
      toast.success('Translation updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to re-translate');
    },
  });
}

export function useDeleteTranslationKey() {
  const invalidate = useInvalidateTranslationData();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/website-builder/translation-keys/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Translation key deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete translation key');
    },
  });
}
