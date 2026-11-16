'use client';

/**
 * Per-form translation mode for a Website Builder section (Botble-style).
 *
 * A section form enters translation mode when the URL carries `?lang=<id>` for
 * a non-default language. In that mode the form edits
 * `company_website_content_translations` instead of the section's own table:
 * text fields hold the translated values, and everything else (images, colors,
 * layout, URLs) is shared across languages and must be locked.
 *
 * Extracted from hero-section-content.tsx so each section needs only a few
 * lines rather than its own copy of this logic.
 *
 * ── The slot rule (read this before wiring a new section) ───────────────────
 * A translation is addressed by 5 parts:
 *   (company_id, section, page_slug, record_id, field_key)
 * `section`, `pageSlug` and `recordId` passed here MUST produce the same slot
 * the backend's content scan registers (FIELD_CATALOG in
 * websiteBuilderTranslation.service.js). If they disagree the lookup returns
 * `{}` — no error, no warning, just an empty form. Verify with:
 *   curl ".../content-translations?section=X&page_slug=Y&record_id=Z"
 * Most sections register at `page_slug=''` and `record_id=<row id>`; hero is
 * the exception, registering per page.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from '@/lib/toast';
import {
  useBuilderLanguages,
  useContentTranslations,
  useSaveContentTranslations,
  useRegisterTranslationKeys,
  type BuilderLanguage,
  type TranslatableFieldInput,
} from '@/hooks/useWebsiteBuilderTranslations';

export interface SectionTranslationOptions {
  /** Must match a FIELD_CATALOG key in the backend service, e.g. 'footer'. */
  section: string;
  /** Only hero uses a real page slug; leave undefined for everything else. */
  pageSlug?: string;
  /** The content row's id. Undefined until the section's data has loaded. */
  recordId?: number;
  /**
   * The section's translatable fields with their current English text.
   * Field keys must match the column names the backend scan registers.
   */
  fields: TranslatableFieldInput[];
}

export interface SectionTranslation {
  /** True when editing a non-default language. Drives the locked/dimmed UI. */
  isTranslationMode: boolean;
  /**
   * False until the section's row exists in the DB. A translation slot is
   * addressed by the saved row's id, so with no row there is nothing to write
   * to and nothing for the backend scan to have registered. Gate the whole
   * translation UI on this — see `blockedReason`.
   */
  canTranslate: boolean;
  /** Human-readable reason translation is unavailable, or null when it is. */
  blockedReason: string | null;
  activeLanguage: BuilderLanguage | null;
  /** Current translated values, keyed by field key. Empty in English mode. */
  values: Record<string, string>;
  setValue: (fieldKey: string, value: string) => void;
  /**
   * Fields flagged `required` that were left blank on the last save attempt,
   * keyed by field key. Feed into the same red-border className the form
   * already uses for its English errors. Cleared as soon as the field is typed
   * into, the language changes, or auto-translate fills it.
   */
  errors: Record<string, boolean>;
  /**
   * Persists the translated values. No-op outside translation mode.
   * Returns false (and marks `errors`) when a required field is empty.
   */
  save: () => Promise<boolean>;
  isSaving: boolean;
  /** Machine-translates every field from English and fills the form. */
  autoTranslate: () => Promise<void>;
  /**
   * Run after an English save so every language is filled with no extra click.
   * Pass the new row id when saving a record that did not exist yet.
   */
  translateAfterSave: (overrideRecordId?: number) => Promise<void>;
  isAutoTranslating: boolean;
  /**
   * Live progress of the running auto-translation, or null when idle.
   * `done`/`total` come from real per-field events streamed by the backend —
   * this is not a simulated bar.
   */
  autoTranslateProgress: { done: number; total: number; field?: string; language?: string } | null;
  /** Builds the `?lang=` URL for the side card; null = back to English. */
  buildHref: (languageId: number | null) => string;
  /** Registers the English source text — call after a successful English save. */
  registerKeys: () => void;
  /**
   * Convenience for binding a text input:
   *   <Input {...bind('title', title, setTitle)} />
   * In English mode it passes the base value/handler through; in translation
   * mode it swaps in the translated value and shows the English as placeholder.
   */
  bind: (
    fieldKey: string,
    baseValue: string,
    setBaseValue: (value: string) => void
  ) => { value: string; onChange: (value: string) => void; placeholder?: string };
}

export function useSectionTranslation({
  section,
  pageSlug,
  recordId,
  fields,
}: SectionTranslationOptions): SectionTranslation {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const langParam = searchParams.get('lang');
  const activeLanguageId = langParam ? Number(langParam) : null;

  const { data: builderLanguages } = useBuilderLanguages();
  // The default language is the English source — it is edited through the
  // normal form, never through translation mode.
  const activeLanguage = activeLanguageId
    ? (builderLanguages || []).find(
        (lang) => lang.id === activeLanguageId && Number(lang.is_default) !== 1
      ) || null
    : null;
  const isTranslationMode = !!activeLanguage;

  const { data: contentTranslations } = useContentTranslations(section, pageSlug, recordId);
  const saveTranslation = useSaveContentTranslations(section, pageSlug, recordId);
  const registerTranslationKeys = useRegisterTranslationKeys();

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [autoTranslateProgress, setAutoTranslateProgress] =
    useState<{ done: number; total: number; field?: string; language?: string } | null>(null);

  // Reload whenever the language changes or fresh translations arrive.
  useEffect(() => {
    setErrors({});
    if (!activeLanguage) {
      setValues({});
      return;
    }
    setValues({ ...(contentTranslations?.[activeLanguage.id] || {}) });
  }, [activeLanguage?.id, contentTranslations]);

  const setValue = useCallback((fieldKey: string, value: string) => {
    // Functional updater: these forms often carry file uploads and rich-text
    // editors whose async callbacks would otherwise write a stale snapshot back.
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
    setErrors((prev) => (prev[fieldKey] ? { ...prev, [fieldKey]: false } : prev));
  }, []);

  const fieldKeys = useMemo(() => fields.map((field) => field.key), [fields]);

  // A section that has never been saved has no row id. Writing anyway would
  // land in slot `record_id = 0` (the backend coerces undefined with `|| 0`),
  // creating orphan translations that no content will ever resolve to.
  const canTranslate = !!recordId;
  const blockedReason = canTranslate
    ? null
    : 'Save this section in English first — a translation is stored against the saved record.';

  const save = useCallback(async (): Promise<boolean> => {
    if (!activeLanguage) return false;
    if (!recordId) {
      toast.error(
        'Save this section in English first, then translate it.'
      );
      return false;
    }
    // A field the form marks with `*` must be translated, exactly as it must be
    // filled in English. Without this the translated form saved happily with
    // empty required fields, and the public site silently fell back to the
    // English text — which reads as "the translation did nothing".
    //
    // Skipped when the English source is blank: the backend registers no key
    // for an empty field (§78), so there would be nothing to translate and the
    // form could never be saved at all.
    const missing = fields.filter(
      (field) =>
        field.required &&
        String(field.value ?? '').trim() &&
        !String(values[field.key] ?? '').trim()
    );
    if (missing.length > 0) {
      setErrors(Object.fromEntries(missing.map((field) => [field.key, true])));
      toast.error('Please fill in all required fields marked with *');
      return false;
    }
    setErrors({});

    // Send every declared field, not just the edited ones, so clearing a
    // translation back to empty actually persists.
    const payload: Record<string, string> = {};
    fieldKeys.forEach((key) => {
      payload[key] = values[key] ?? '';
    });
    try {
      await saveTranslation.mutateAsync({ language_id: activeLanguage.id, values: payload });
      return true;
    } catch {
      // useSaveContentTranslations already surfaces the error toast.
      return false;
    }
  }, [activeLanguage, recordId, fields, fieldKeys, values, saveTranslation]);

  /**
   * Runs the translation for this record across every active language.
   *
   * `silent` is used by the post-save path: there the run is a side effect of
   * saving English, so "there is nothing to translate" is a normal outcome and
   * must not raise an error toast. `targetLanguageId` is the language whose
   * values get written back into the form — only meaningful in translation mode.
   */
  const runTranslation = useCallback(
    async ({
      targetLanguageId,
      silent,
      overrideRecordId,
    }: { targetLanguageId?: number; silent?: boolean; overrideRecordId?: number } = {}) => {
    // On CREATE the id only exists in the mutation's response — this closure
    // still has `recordId` undefined — so the caller passes it in explicitly.
    const targetRecordId = overrideRecordId ?? recordId;
    if (!targetRecordId) {
      if (!silent) toast.error('Save this section in English first, then translate it.');
      return;
    }
    // Nothing to send. Without this the run streams zero events and the overlay
    // flashes "0%" then closes with no visible change, which reads as a broken
    // button rather than "there is no source text yet".
    if (!fields.some((field) => String(field.value ?? '').trim())) {
      if (!silent) {
        toast.error(
          'There is no English text in this section yet. Click "Back to English", fill it in and save, then translate.'
        );
      }
      return;
    }

    const languageId = targetLanguageId;
    setAutoTranslateProgress({ done: 0, total: 0 });

    // Streams one event per translated field so the overlay can show a real
    // percentage. EventSource can't send custom headers, so company scoping
    // rides on the query string (optionalCompanyAuth accepts company_id there).
    //
    // No `all_languages` param: the backend defaults to every active language.
    // One press fills them all, so a section written today is translated
    // everywhere rather than only into whichever language is being viewed.
    // `language_id` still rides along so the backend knows which language's
    // values to hand back for this form.
    const params = new URLSearchParams({
      section,
      page_slug: pageSlug || '',
      record_id: String(targetRecordId),
    });
    // Omitted entirely when saving English: there is no form language to write
    // back to, and the backend translates every language either way.
    if (languageId) params.set('language_id', String(languageId));
    if (typeof window !== 'undefined') {
      const companyId = window.localStorage.getItem('currentCompanyId');
      if (companyId) params.set('company_id', companyId);
    }

    let preservedCount = 0;
    let translatedCount = 0;
    // Which languages the run actually wrote to, so the toast can name them.
    const languagesTouched = new Set<string>();

    try {
      await new Promise<void>((resolve, reject) => {
        const source = new EventSource(
          `/api/proxy/v1/website-builder/content-translations/auto-translate/stream?${params.toString()}`,
          { withCredentials: true }
        );

        const close = () => source.close();

        source.addEventListener('progress', (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            setAutoTranslateProgress({
              done: data.done,
              total: data.total,
              field: data.field,
              language: data.language,
            });
            // Slots that already had a translation are skipped, never rewritten;
            // remember how many so the toast can say they were left alone.
            if (typeof data.preserved === 'number') preservedCount = data.preserved;
            if (typeof data.total === 'number') translatedCount = data.total;
            if (data.language) languagesTouched.add(String(data.language));
          } catch {
            // a malformed frame shouldn't abort the run
          }
        });

        source.addEventListener('complete', (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            // Only when a form language is on screen — saving English has no
            // translated values to display.
            const translated = languageId ? data?.translations?.[languageId] : null;
            if (translated) {
              setValues({ ...translated });
              // Machine-filled fields are no longer blank, so drop any
              // required-field marks left over from a rejected save.
              setErrors({});
            }
          } catch {
            // fall through — the refetch below still picks the values up
          }
          close();
          resolve();
        });

        source.addEventListener('error', (event) => {
          close();
          let message = 'Failed to auto-translate';
          try {
            const data = JSON.parse((event as MessageEvent).data);
            if (data?.message) message = data.message;
          } catch {
            // A transport-level error carries no data payload.
          }
          reject(new Error(message));
        });
      });

      // Keep the side card counts and the central Translations page in step.
      queryClient.invalidateQueries({ queryKey: ['website-builder-content-translations'] });
      queryClient.invalidateQueries({ queryKey: ['website-builder-translation-keys'] });
      queryClient.invalidateQueries({ queryKey: ['website-builder-translation-stats'] });
      // The run covers every active language, so report what it actually did
      // rather than naming only the language being viewed.
      const where =
        languagesTouched.size > 0
          ? [...languagesTouched].join(', ')
          : activeLanguage?.name || 'other languages';
      // After an English save, "nothing to do" means every language was already
      // translated — silence is the right feedback, not a success toast.
      if (translatedCount === 0 && silent) return;
      const headline =
        translatedCount > 0
          ? `Translated ${translatedCount} field${translatedCount === 1 ? '' : 's'} into ${where}`
          : 'Everything was already translated';
      toast.success(
        preservedCount > 0
          ? `${headline}. Left ${preservedCount} existing translation${preservedCount === 1 ? '' : 's'} untouched.`
          : headline
      );
    } catch (err) {
      // A failed background translation must not make a successful save look
      // like it failed, so the post-save path reports quietly.
      const message = err instanceof Error ? err.message : 'Failed to auto-translate';
      if (silent) toast.warning(`Saved, but translating failed: ${message}`);
      else toast.error(message);
    } finally {
      setAutoTranslateProgress(null);
    }
  },
    [activeLanguage, recordId, section, pageSlug, queryClient, fields]
  );

  // The "Translate all languages" button — writes the active language's values
  // back into the form it is sitting on.
  const autoTranslate = useCallback(
    () => runTranslation({ targetLanguageId: activeLanguage?.id }),
    [runTranslation, activeLanguage]
  );

  /**
   * Called by a form right after its ENGLISH save succeeds, so a newly written
   * section is translated everywhere without the admin pressing anything.
   * Only empty slots are filled, so re-saving while editing costs no API quota
   * for text that is already translated.
   */
  const translateAfterSave = useCallback(
    (overrideRecordId?: number) => runTranslation({ silent: true, overrideRecordId }),
    [runTranslation]
  );

  const buildHref = useCallback(
    (languageId: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (languageId) params.set('lang', String(languageId));
      else params.delete('lang');
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams]
  );

  const registerKeys = useCallback(() => {
    if (!recordId) return;
    registerTranslationKeys.mutate({
      section,
      page_slug: pageSlug,
      record_id: recordId,
      fields,
    });
  }, [section, pageSlug, recordId, fields, registerTranslationKeys]);

  const bind = useCallback(
    (fieldKey: string, baseValue: string, setBaseValue: (value: string) => void) =>
      isTranslationMode
        ? {
            value: values[fieldKey] ?? '',
            onChange: (value: string) => setValue(fieldKey, value),
            // The English text as placeholder shows the translator the source.
            placeholder: baseValue || undefined,
          }
        : { value: baseValue, onChange: setBaseValue },
    [isTranslationMode, values, setValue]
  );

  return {
    // Never enter translation mode for an unsaved record.
    isTranslationMode: isTranslationMode && canTranslate,
    canTranslate,
    blockedReason,
    activeLanguage,
    values,
    setValue,
    errors,
    save,
    isSaving: saveTranslation.isPending,
    autoTranslate,
    translateAfterSave,
    isAutoTranslating: autoTranslateProgress !== null,
    autoTranslateProgress,
    buildHref,
    registerKeys,
    bind,
  };
}

/**
 * Guard for a section's save handler. Returns true when the save was handled as
 * a translation save and the caller should stop — including when it was
 * *rejected* for an empty required field, since falling through to the English
 * save path would then write the English row from a translated form.
 */
export async function handleTranslationSave(
  translation: SectionTranslation,
  sectionLabel: string
): Promise<boolean> {
  if (!translation.isTranslationMode || !translation.activeLanguage) return false;
  const ok = await translation.save();
  if (ok) {
    toast.success(`${translation.activeLanguage.name} translation for ${sectionLabel} saved successfully`);
  }
  return true;
}
