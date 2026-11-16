'use client';

/**
 * Per-row translation editor for list-style Website Builder sections
 * (testimonials, FAQs, pricing plans, sliders, …).
 *
 * Singleton sections get the full Botble-style per-form translation mode via
 * `useSectionTranslation` + `TranslationSideCard`. That doesn't fit a list page:
 * every ROW is its own translation slot, so there is no single "form" to
 * re-render in another language. Instead each row gets this dialog, which edits
 * all languages for that one row at once.
 *
 * Slot rule: `section` + `recordId` must match what the backend's content scan
 * registers (FIELD_CATALOG in websiteBuilderTranslation.service.js). List
 * sections all register at `page_slug=''` with `record_id = <row id>`, which is
 * what this component assumes. A mismatch silently shows empty fields.
 */

import { useEffect, useMemo, useState } from 'react';
import { Languages as LanguagesIcon, Loader2, Sparkles } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useBuilderLanguages,
  useContentTranslations,
  useSaveContentTranslations,
  useAutoTranslateContent,
} from '@/hooks/useWebsiteBuilderTranslations';

export interface RowTranslateField {
  /** Column name as registered by the backend scan, e.g. 'customer_name'. */
  key: string;
  label: string;
  /** Current English source text. */
  value: string;
  type?: 'input' | 'textarea';
  /**
   * Mirrors the `*` the row's own form shows. A required field cannot be saved
   * empty here either — only enforced when the English source has text, since
   * an empty English field has no registered key and nothing to translate.
   */
  required?: boolean;
}

interface RowTranslateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: string;
  recordId?: number;
  /** Shown in the dialog header so the user knows which row they're editing. */
  rowLabel?: string;
  fields: RowTranslateField[];
}

export function RowTranslateDialog({
  open,
  onOpenChange,
  section,
  recordId,
  rowLabel,
  fields,
}: RowTranslateDialogProps) {
  const { data: languages, isLoading: languagesLoading } = useBuilderLanguages();
  const { data: translations } = useContentTranslations(section, undefined, recordId);
  const saveTranslation = useSaveContentTranslations(section, undefined, recordId);
  const autoTranslate = useAutoTranslateContent(section, undefined, recordId);

  const otherLanguages = useMemo(
    () => (languages || []).filter((lang) => Number(lang.is_default) !== 1),
    [languages]
  );

  const [activeLanguageId, setActiveLanguageId] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Typing into a field clears its own error, matching every other form here.
  const setFieldValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  // Default to the first non-default language once they've loaded.
  useEffect(() => {
    if (!open) return;
    if (activeLanguageId && otherLanguages.some((lang) => lang.id === activeLanguageId)) return;
    setActiveLanguageId(otherLanguages[0]?.id ?? null);
  }, [open, otherLanguages, activeLanguageId]);

  // Reload the editor whenever the selected language or the fetched data changes.
  useEffect(() => {
    setErrors({});
    if (!activeLanguageId) {
      setValues({});
      return;
    }
    setValues({ ...(translations?.[activeLanguageId] || {}) });
  }, [activeLanguageId, translations]);

  // A field with no English text has no registered key and nothing to
  // translate, so counting it would make a finished row read as incomplete.
  const translatableFields = fields.filter((field) => (field.value || '').trim().length > 0);

  const filledCount = (languageId: number) => {
    const saved = translations?.[languageId] || {};
    return translatableFields.filter((field) => (saved[field.key] || '').trim().length > 0).length;
  };

  const handleSave = async () => {
    if (!activeLanguageId) return;
    // Required fields must be translated, same rule as the per-form mode.
    const missing = fields.filter(
      (field) =>
        field.required &&
        (field.value || '').trim() &&
        !(values[field.key] || '').trim()
    );
    if (missing.length > 0) {
      setErrors(Object.fromEntries(missing.map((field) => [field.key, true])));
      toast.error('Please fill in all required fields marked with *');
      return;
    }
    setErrors({});
    const payload: Record<string, string> = {};
    // Send every field so clearing one back to empty actually persists.
    fields.forEach((field) => {
      payload[field.key] = values[field.key] ?? '';
    });
    try {
      await saveTranslation.mutateAsync({ language_id: activeLanguageId, values: payload });
      onOpenChange(false);
    } catch {
      // error toast handled by the mutation
    }
  };

  const handleAutoTranslate = async () => {
    if (!activeLanguageId) return;
    try {
      const result = await autoTranslate.mutateAsync(activeLanguageId);
      const translated = result?.[activeLanguageId];
      if (translated) {
        setValues({ ...translated });
        setErrors({});
      }
    } catch {
      // error toast handled by the mutation
    }
  };

  // The row must exist in the DB before it can be translated — an unsaved new
  // row has no id, so there is no slot to write to.
  const noRecord = !recordId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-sm">
            <LanguagesIcon className="h-4 w-4 text-primary" />
            Translate{rowLabel ? `: ${rowLabel}` : ''}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Text only — images, colors and links are shared across all languages.
          </DialogDescription>
        </DialogHeader>

        {noRecord ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Save this item first, then translate it.
          </p>
        ) : languagesLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Loading languages...
          </div>
        ) : otherLanguages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No other languages yet. Add one under Website Builder &gt; Languages.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Language picker */}
            <div className="flex flex-wrap gap-1.5">
              {otherLanguages.map((lang) => {
                const filled = filledCount(lang.id);
                const isActive = lang.id === activeLanguageId;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setActiveLanguageId(lang.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      isActive
                        ? 'border-primary bg-primary/5 text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    {lang.name}
                    <Badge
                      variant="outline"
                      className={
                        filled === translatableFields.length && translatableFields.length > 0
                          ? 'border-emerald-300 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700'
                          : filled > 0
                          ? 'border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700'
                          : 'border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] text-slate-500'
                      }
                    >
                      {filled}/{translatableFields.length}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Field editors — English source shown as the placeholder */}
            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {fields.map((field) => {
                const hasError = !!errors[field.key];
                const errorClass = hasError ? 'border-red-500 ring-1 ring-red-500' : '';
                return (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">
                      {field.label}
                      {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
                    </Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        rows={3}
                        value={values[field.key] ?? ''}
                        placeholder={field.value || undefined}
                        onChange={(event) => setFieldValue(field.key, event.target.value)}
                        className={`text-xs ${errorClass}`}
                      />
                    ) : (
                      <Input
                        value={values[field.key] ?? ''}
                        placeholder={field.value || undefined}
                        onChange={(event) => setFieldValue(field.key, event.target.value)}
                        className={`h-8 text-xs ${errorClass}`}
                      />
                    )}
                    {hasError ? (
                      <p className="text-[11px] font-semibold text-rose-500">
                        {field.label} is required.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoTranslate}
            disabled={noRecord || !activeLanguageId || autoTranslate.isPending}
            className="h-8 text-xs"
          >
            {autoTranslate.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3.5 w-3.5" />
            )}
            Translate from English
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={noRecord || !activeLanguageId || saveTranslation.isPending}
              className="h-8 text-xs"
            >
              {saveTranslation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Row action button that opens `RowTranslateDialog`. Drop this next to a row's
 * edit/delete buttons — it owns its own open state.
 */
export function RowTranslateButton({
  section,
  recordId,
  rowLabel,
  fields,
}: Omit<RowTranslateDialogProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Translate"
        onClick={() => setOpen(true)}
        className="h-7 w-7 text-slate-500 hover:bg-primary/5 hover:text-primary"
      >
        <LanguagesIcon className="h-3.5 w-3.5" />
      </Button>
      {/* Mounted only while open so each row doesn't fire its own queries. */}
      {open && (
        <RowTranslateDialog
          open={open}
          onOpenChange={setOpen}
          section={section}
          recordId={recordId}
          rowLabel={rowLabel}
          fields={fields}
        />
      )}
    </>
  );
}
