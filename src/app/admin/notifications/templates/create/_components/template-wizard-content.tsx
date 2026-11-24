'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Bell,
    Check,
    CheckCircle2,
    Info,
    Mail,
    MessageCircle,
    Pencil,
    Plus,
    Save,
    Sparkles,
    Tag,
    Trash2,
    Users,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageCropper } from '@/components/common/image-cropper';
import { RichTextEditor, type RichTextEditorRef } from '@/components/common/rich-text-editor';
import { mediaApi } from '@/hooks/use-media';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { cn } from '@/lib/utils';
import { useNotificationCategories } from '@/hooks/use-notification-categories';
import {
    useNotificationTemplate,
    useNotificationVariables,
    useSystemTriggers,
    useCreateNotificationTemplate,
    useUpdateNotificationTemplate,
    type NotificationChannel,
    type NotificationTemplate,
    type NotificationTemplatePayload,
    type SystemTrigger,
    type TemplateAudience,
    type WhatsAppButton,
    type WhatsAppCategory,
    type WhatsAppHeaderType,
} from '@/hooks/use-notification-templates';
import {
    AUDIENCE_LABELS,
    EmailPreview,
    InAppPreview,
    MAIN_CHANNELS,
    WA_CATEGORY_LABELS,
    WhatsAppPreview,
    humanize,
    normalizeSpaces,
    placeholdersIn,
    templateCode,
} from '../../_components/template-shared';

const BASE = '/admin/notifications/templates';
const NONE = '__none__';

/* Limits — the same numbers the backend enforces (Meta's for WhatsApp). */
const DESC_MAX = 250;
const SUBJECT_MAX = 200;
const IN_APP_TITLE_MAX = 100;
const IN_APP_CONTENT_MAX = 500;
const WA_HEADER_MAX = 60;
const WA_BODY_MAX = 1024;
const WA_FOOTER_MAX = 60;
const WA_BUTTON_TEXT_MAX = 25;

type StepKey = 'basic' | 'email' | 'whatsapp' | 'in_app' | 'review';
const STEP_LABELS: Record<StepKey, string> = {
    basic: 'Basic Details',
    email: 'Email',
    whatsapp: 'WhatsApp',
    in_app: 'In-App & Push',
    review: 'Review & Create',
};

interface FormState {
    name: string;
    description: string;
    notification_category_id: string;
    event_category_id: string;
    audience: TemplateAudience | '';
    trigger_key: string;
    is_active: boolean;
    channels: NotificationChannel[];
    push: boolean;
    email_subject: string;
    email_preheader: string;
    email_heading: string;
    email_body: string;
    email_button_label: string;
    email_button_url: string;
    email_footer: string;
    whatsapp_template_name: string;
    whatsapp_category: WhatsAppCategory | '';
    whatsapp_header_type: WhatsAppHeaderType;
    whatsapp_header_text: string;
    whatsapp_body: string;
    whatsapp_footer: string;
    whatsapp_buttons: WhatsAppButton[];
    title: string;
    content: string;
    image_url: string;
    action_url: string;
    sample_values: Record<string, string>;
}

const emptyForm = (): FormState => ({
    name: '', description: '', notification_category_id: '', event_category_id: '', audience: '',
    trigger_key: '', is_active: true, channels: ['email'], push: true,
    email_subject: '', email_preheader: '', email_heading: '', email_body: '',
    email_button_label: '', email_button_url: '', email_footer: '',
    whatsapp_template_name: '', whatsapp_category: 'utility', whatsapp_header_type: 'none',
    whatsapp_header_text: '', whatsapp_body: '', whatsapp_footer: '', whatsapp_buttons: [],
    title: '', content: '', image_url: '', action_url: '', sample_values: {},
});

const fromTemplate = (t: NotificationTemplate): FormState => ({
    name: t.name ?? '',
    description: t.description ?? '',
    notification_category_id: t.notification_category_id ? String(t.notification_category_id) : '',
    event_category_id: t.event_category_id ? String(t.event_category_id) : '',
    audience: t.audience ?? '',
    trigger_key: t.trigger_key ?? '',
    is_active: Number(t.is_active) === 1,
    channels: (t.channels ?? []).filter((c) => c !== 'push'),
    push: (t.channels ?? []).includes('push'),
    email_subject: t.email_subject ?? '',
    email_preheader: t.email_preheader ?? '',
    email_heading: t.email_heading ?? '',
    email_body: t.email_body ?? '',
    email_button_label: t.email_button_label ?? '',
    email_button_url: t.email_button_url ?? '',
    email_footer: t.email_footer ?? '',
    whatsapp_template_name: t.whatsapp_template_name ?? '',
    whatsapp_category: t.whatsapp_category ?? 'utility',
    whatsapp_header_type: t.whatsapp_header_type === 'text' ? 'text' : 'none',
    whatsapp_header_text: t.whatsapp_header_text ?? '',
    whatsapp_body: t.whatsapp_body ?? '',
    whatsapp_footer: t.whatsapp_footer ?? '',
    whatsapp_buttons: t.whatsapp_buttons ?? [],
    title: t.title ?? '',
    content: t.content ?? '',
    image_url: t.image_url ?? '',
    action_url: t.action_url ?? '',
    sample_values: t.sample_values ?? {},
});

const toSnake = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100);
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
const startsOrEndsWithVar = (s: string) => /^\s*\{\{\s*\w+\s*\}\}/.test(s) || /\{\{\s*\w+\s*\}\}[\s.!?]*$/.test(s);

export function TemplateWizardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const isEdit = !!id;

    const [form, setForm] = useState<FormState>(emptyForm);
    const [stepKey, setStepKey] = useState<StepKey>('basic');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loadedId, setLoadedId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [created, setCreated] = useState<NotificationTemplate | null>(null);

    const { data: existing, isLoading: loadingExisting } = useNotificationTemplate(id ?? undefined);
    const { data: notificationCategories } = useNotificationCategories({ limit: 200, is_active: true });
    const { data: allVariables } = useNotificationVariables();
    const { data: catalog } = useSystemTriggers();

    // Load the template once per id, during render (a background refetch cannot clobber edits).
    if (existing && id && loadedId !== id) {
        setLoadedId(id);
        setForm(fromTemplate(existing));
    }

    const triggers = catalog?.triggers ?? [];
    const trigger: SystemTrigger | undefined = triggers.find((t) => t.key === form.trigger_key);
    const variableKeys = trigger?.variables?.length ? trigger.variables : (allVariables ?? []).map((v) => v.key);

    const steps: StepKey[] = useMemo(
        () => ['basic', ...MAIN_CHANNELS.map((c) => c.key as StepKey).filter((k) => form.channels.includes(k as NotificationChannel)), 'review'],
        [form.channels],
    );
    const stepIndex = Math.max(0, steps.indexOf(stepKey));

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: '' } : prev));
    };

    /* ── Variable insertion into whichever field had focus last ─────────── */
    const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
    const editorRef = useRef<RichTextEditorRef>(null);
    const lastFocused = useRef<Partial<Record<StepKey, string>>>({});
    const bind = (step: StepKey, key: keyof FormState) => ({
        ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => { fieldRefs.current[key] = el; },
        onFocus: () => { lastFocused.current[step] = key; },
    });
    const insertVariable = (step: StepKey, fallback: keyof FormState, varKey: string) => {
        const token = `{{${varKey}}}`;
        const target = (lastFocused.current[step] ?? fallback) as keyof FormState;
        if (target === 'email_body') {
            editorRef.current?.insertTextAtCursor(token);
            return;
        }
        const el = fieldRefs.current[target];
        const current = String(form[target] ?? '');
        const pos = el?.selectionStart ?? current.length;
        setField(target, (current.slice(0, pos) + token + current.slice(pos)) as never);
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(pos + token.length, pos + token.length);
        });
    };

    /* ── Trigger: fills audience, channels and (optionally) suggested wording ── */
    const applySuggestion = (t: SystemTrigger, base: FormState): FormState => {
        const s = t.suggested;
        const next = { ...base };
        if (s?.email) {
            Object.assign(next, {
                email_subject: s.email.subject, email_preheader: s.email.preheader, email_heading: s.email.heading,
                email_body: s.email.body, email_button_label: s.email.button_label, email_button_url: s.email.button_url,
                email_footer: s.email.footer,
            });
        }
        if (s?.whatsapp) {
            Object.assign(next, {
                whatsapp_template_name: s.whatsapp.template_name, whatsapp_category: s.whatsapp.category,
                whatsapp_header_type: s.whatsapp.header_type === 'text' ? 'text' : 'none', whatsapp_header_text: s.whatsapp.header_type === 'text' ? s.whatsapp.header_text : '',
                whatsapp_body: s.whatsapp.body, whatsapp_footer: s.whatsapp.footer, whatsapp_buttons: s.whatsapp.buttons,
            });
        }
        if (s?.in_app) Object.assign(next, { title: s.in_app.title, content: s.in_app.content });
        return next;
    };

    const pickTrigger = (key: string) => {
        const k = key === NONE ? '' : key;
        const t = triggers.find((x) => x.key === k);
        setForm((prev) => {
            let next: FormState = { ...prev, trigger_key: k };
            if (t) {
                next.audience = t.audience;
                next.channels = t.channels.length ? [...t.channels] : prev.channels;
                if (!prev.name.trim()) next.name = t.label.replace(/\s*\(.*\)\s*$/, '');
                const untouched = !prev.email_body && !prev.whatsapp_body && !prev.content;
                if (untouched && t.suggested) next = applySuggestion(t, next);
            }
            return next;
        });
        setErrors({});
        if (t?.suggested) toast.success('Channels set from the tick sheet. Suggested wording is ready to use.');
    };

    const handleImageCropped = async (file: File) => {
        setUploadingImage(true);
        try {
            const res = await mediaApi.upload(file, 'notification-templates');
            setField('image_url', res.url);
        } catch {
            toast.error('Failed to upload image. Please try again.');
        } finally {
            setUploadingImage(false);
        }
    };

    /* ── Validation per step (mirrors the backend) ──────────────────────── */
    const validate = (key: StepKey): Record<string, string> => {
        const e: Record<string, string> = {};
        if (key === 'basic') {
            if (!form.name.trim()) e.name = 'Enter a template name.';
            if (!form.notification_category_id) e.notification_category_id = 'Pick a category.';
            if (!form.channels.length) e.channels = 'Pick at least one channel.';
        }
        if (key === 'email') {
            if (!form.email_subject.trim()) e.email_subject = 'Enter a subject.';
            if (!stripHtml(form.email_body)) e.email_body = 'Write the email body.';
        }
        if (key === 'whatsapp') {
            if (!form.whatsapp_category) e.whatsapp_category = 'Pick a Meta category.';
            if (form.whatsapp_header_type === 'text' && !form.whatsapp_header_text.trim()) e.whatsapp_header_text = 'Enter the header text.';
            if (!form.whatsapp_body.trim()) e.whatsapp_body = 'Write the message.';
            else if (form.whatsapp_category !== 'authentication' && startsOrEndsWithVar(form.whatsapp_body)) {
                e.whatsapp_body = 'Meta rejects a message that starts or ends with a variable.';
            }
            form.whatsapp_buttons.forEach((b, i) => {
                if (!b.text.trim()) e[`btn_${i}`] = 'Every button needs a label.';
                else if (b.type === 'url' && !b.url.trim()) e[`btn_${i}`] = 'This button needs a link.';
            });
            if (form.whatsapp_category === 'authentication' && form.whatsapp_buttons.some((b) => b.type !== 'copy_code')) {
                e.btn_0 = 'Authentication templates can only have the Copy code button.';
            }
        }
        if (key === 'in_app') {
            if (!form.title.trim()) e.title = 'Enter a notification title.';
            if (!form.content.trim()) e.content = 'Write the short message.';
        }
        return e;
    };

    const goTo = (target: StepKey) => {
        const targetIdx = steps.indexOf(target);
        // Moving forward checks every step on the way.
        for (const s of steps.slice(0, targetIdx)) {
            const e = validate(s);
            if (Object.keys(e).length) {
                setErrors(e);
                setStepKey(s);
                toast.error('Please fix the highlighted fields.');
                return;
            }
        }
        setErrors({});
        setStepKey(target);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* ── Placeholders actually used + their sample values ──────────────── */
    const used = placeholdersIn(
        ...(form.channels.includes('email')
            ? [form.email_subject, form.email_preheader, form.email_heading, form.email_body, form.email_button_label, form.email_button_url, form.email_footer]
            : []),
        ...(form.channels.includes('whatsapp')
            ? [form.whatsapp_header_type === 'text' ? form.whatsapp_header_text : '', form.whatsapp_body, ...form.whatsapp_buttons.map((b) => b.url)]
            : []),
        ...(form.channels.includes('in_app') ? [form.title, form.content, form.action_url] : []),
    );
    const known = new Set(variableKeys);
    const unknownVars = used.filter((v) => !known.has(v));

    /* ── Save ──────────────────────────────────────────────────────────── */
    const buildPayload = (activeOverride?: boolean): NotificationTemplatePayload => {
        const has = (c: NotificationChannel) => form.channels.includes(c);
        const samples: Record<string, string> = {};
        used.forEach((k) => { if (form.sample_values[k]?.trim()) samples[k] = form.sample_values[k].trim(); });
        return {
            name: form.name.trim(),
            description: form.description.trim() || null,
            notification_category_id: Number(form.notification_category_id),
            event_category_id: form.event_category_id ? Number(form.event_category_id) : null,
            audience: trigger?.audience ?? (form.trigger_key ? form.audience || null : null),
            trigger_key: form.trigger_key || null,
            is_active: activeOverride ?? form.is_active,
            channels: [...form.channels, ...(has('in_app') ? ['push' as const] : [])],
            email_subject: has('email') ? form.email_subject : null,
            email_preheader: null,
            email_heading: null,
            email_body: has('email') ? normalizeSpaces(form.email_body) : null,
            email_button_label: null,
            email_button_url: null,
            email_footer: null,
            // Meta template name = the template name in snake_case (MSG91 sends by this name).
            whatsapp_template_name: has('whatsapp') ? (toSnake(form.name) || `template_${Date.now()}`) : null,
            whatsapp_category: has('whatsapp') ? (form.whatsapp_category || null) : null,
            whatsapp_header_type: has('whatsapp') ? form.whatsapp_header_type : 'none',
            whatsapp_header_text: has('whatsapp') && form.whatsapp_header_type === 'text' ? form.whatsapp_header_text : null,
            whatsapp_body: has('whatsapp') ? form.whatsapp_body : null,
            whatsapp_footer: has('whatsapp') ? form.whatsapp_footer : null,
            whatsapp_buttons: has('whatsapp') && form.whatsapp_buttons.length ? form.whatsapp_buttons : null,
            title: has('in_app') ? form.title : null,
            content: has('in_app') ? form.content : null,
            image_url: has('in_app') ? (form.image_url || null) : null,
            action_url: has('in_app') ? (form.action_url || null) : null,
            sample_values: Object.keys(samples).length ? samples : null,
        };
    };

    const createTemplate = useCreateNotificationTemplate((t) => setCreated(t));
    const updateTemplate = useUpdateNotificationTemplate(() => router.push(BASE));
    const isSaving = createTemplate.isPending || updateTemplate.isPending;

    const save = (activeOverride?: boolean) => {
        for (const s of steps) {
            const e = validate(s);
            if (Object.keys(e).length) {
                setErrors(e);
                setStepKey(s);
                toast.error('Please fix the highlighted fields.');
                return;
            }
        }
        const payload = buildPayload(activeOverride);
        if (isEdit && id) updateTemplate.mutate({ id: Number(id), data: payload });
        else createTemplate.mutate(payload);
    };

    const categoryName = notificationCategories?.data?.find((c) => String(c.id) === form.notification_category_id)?.name ?? '—';
    const sections = catalog?.sections ?? [];

    if (created) {
        return <SuccessScreen template={created} trigger={trigger} categoryName={categoryName} onList={() => router.push(BASE)} onAnother={() => {
            setCreated(null); setForm(emptyForm()); setStepKey('basic');
        }} />;
    }

    const varChips = (step: StepKey, fallback: keyof FormState) => (
        <VariableChips keys={variableKeys} onPick={(k) => insertVariable(step, fallback, k)} />
    );

    return (
        <PermissionGuard permission={isEdit ? 'notification_templates.edit' : 'notification_templates.create'}>
            <div className="space-y-5">
                <PageLoader open={isSaving || uploadingImage || (isEdit && loadingExisting)} />

                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-6 w-6" /></span>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-foreground">{isEdit ? 'Edit Template' : 'Create Template'}</h1>
                            <p className="text-xs text-muted-foreground">Email, WhatsApp and In-App notification templates sent when a system event happens.</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => router.push(BASE)} className="h-9 gap-2"><ArrowLeft className="h-4 w-4" /> Back to List</Button>
                </div>

                <StepBar steps={steps} current={stepIndex} onPick={(i) => goTo(steps[i])} />

                <div className={cn('grid gap-5', stepKey !== 'basic' && 'xl:grid-cols-[minmax(0,1fr)_340px]')}>
                    <Card className="border-border bg-card shadow-xs">
                        <div className="rounded-t-xl border-b border-border bg-pink-50/70 px-5 py-3 dark:bg-pink-950/20">
                            <h2 className="text-base font-bold text-foreground">
                                Step {stepIndex + 1} of {steps.length}: {STEP_LABELS[stepKey]}
                            </h2>
                        </div>
                        <CardContent className="space-y-4 p-5">
                            {/* ── STEP: BASIC ─────────────────────────────── */}
                            {stepKey === 'basic' && (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Template Name" required error={errors.name}>
                                            <Input value={form.name} onChange={(e) => setField('name', e.target.value.slice(0, 150))} placeholder="e.g. Booking Confirmation" className={cn('h-10', errors.name && 'border-destructive')} />
                                        </Field>
                                        <Field label="Category" required error={errors.notification_category_id}>
                                            <Select value={form.notification_category_id} onValueChange={(v) => setField('notification_category_id', v)}>
                                                <SelectTrigger className={cn('h-10', errors.notification_category_id && 'border-destructive')}><SelectValue placeholder="Select category" /></SelectTrigger>
                                                <SelectContent>
                                                    {(notificationCategories?.data ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    </div>

                                    <Field label="Description" helper={`${form.description.length} / ${DESC_MAX}`}>
                                        <Textarea value={form.description} onChange={(e) => setField('description', e.target.value.slice(0, DESC_MAX))} placeholder="When it is sent and what it says (for the admin team)." className="min-h-[80px] text-sm" />
                                    </Field>

                                    <div className="flex items-center gap-3">
                                        <Label className="text-sm font-medium">Status</Label>
                                        <Switch checked={form.is_active} onCheckedChange={(v) => setField('is_active', v)} />
                                        <span className={cn('text-sm font-semibold', form.is_active ? 'text-emerald-600' : 'text-muted-foreground')}>{form.is_active ? 'Active' : 'Inactive'}</span>
                                        <span className="text-xs text-muted-foreground">Only active templates are sent.</span>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Channels (included in this template) <span className="text-destructive">*</span></Label>
                                        <div className="grid gap-3 md:grid-cols-3">
                                            {MAIN_CHANNELS.map((c) => {
                                                const on = form.channels.includes(c.key);
                                                return (
                                                    <button key={c.key} type="button"
                                                        onClick={() => setField('channels', on ? form.channels.filter((x) => x !== c.key) : MAIN_CHANNELS.map((m) => m.key).filter((k) => k === c.key || form.channels.includes(k)))}
                                                        className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                                                            on ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/50')}>
                                                        <c.icon className={cn('h-6 w-6 shrink-0', c.tone)} />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm font-semibold text-foreground">{c.label}</span>
                                                            <span className="block text-[11px] text-muted-foreground">{c.hint}</span>
                                                        </span>
                                                        <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                                                            on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                                                            {on && <Check className="h-3.5 w-3.5" />}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {errors.channels && <p className="text-[11px] text-destructive">{errors.channels}</p>}
                                    </div>
                                </>
                            )}

                            {/* ── STEP: EMAIL ─────────────────────────────── */}
                            {stepKey === 'email' && (
                                <>
                                    <Field label="Template Name">
                                        <Input value={form.name} readOnly disabled className="h-10 bg-muted/50" />
                                    </Field>
                                    <Field label="Email Subject" required error={errors.email_subject} helper={`${form.email_subject.length} / ${SUBJECT_MAX}`}>
                                        <Input {...bind('email', 'email_subject')} value={form.email_subject} onChange={(e) => setField('email_subject', e.target.value.slice(0, SUBJECT_MAX))} placeholder="e.g. Your event date is booked – {{event_date}}" className={cn('h-10', errors.email_subject && 'border-destructive')} />
                                    </Field>
                                    <Field label="Email Body" required error={errors.email_body}>
                                        <div onFocusCapture={() => { lastFocused.current.email = 'email_body'; }} className={cn(errors.email_body && 'rounded-md ring-1 ring-destructive')}>
                                            <RichTextEditor ref={editorRef} value={form.email_body} onChange={(v: string) => setField('email_body', v)} variant="basic" placeholder="Write the email…" />
                                        </div>
                                    </Field>
                                    {varChips('email', 'email_body')}
                                </>
                            )}

                            {/* ── STEP: WHATSAPP ──────────────────────────── */}
                            {stepKey === 'whatsapp' && (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Template Name">
                                            <Input value={form.name} readOnly disabled className="h-10 bg-muted/50" />
                                        </Field>
                                        <Field label="Template Category" required error={errors.whatsapp_category}>
                                            <Select value={form.whatsapp_category} onValueChange={(v) => {
                                                setField('whatsapp_category', v as WhatsAppCategory);
                                                if (v === 'authentication') setField('whatsapp_buttons', [{ type: 'copy_code', text: 'Copy code', url: '' }]);
                                            }}>
                                                <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                                                <SelectContent>
                                                    {(Object.keys(WA_CATEGORY_LABELS) as WhatsAppCategory[]).map((k) => <SelectItem key={k} value={k}>{WA_CATEGORY_LABELS[k]}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    </div>
                                    {form.whatsapp_category === 'authentication' && (
                                        <Note>Meta fixes the wording of Authentication templates: only the code, the expiry footer and the Copy code button are yours. One approved template can serve every OTP trigger.</Note>
                                    )}
                                    {form.whatsapp_category === 'marketing' && (
                                        <Note tone="warn">Marketing templates cost more and need the person&apos;s opt-in. Transactional messages should normally be Utility.</Note>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Header Type</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {([['none', 'None'], ['text', 'Text']] as [WhatsAppHeaderType, string][]).map(([k, label]) => (
                                                <button key={k} type="button" onClick={() => setField('whatsapp_header_type', k)}
                                                    className={cn('rounded-full border px-4 py-1.5 text-sm', form.whatsapp_header_type === k ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border hover:bg-muted')}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {form.whatsapp_header_type === 'text' && (
                                        <Field label="Header Text" required error={errors.whatsapp_header_text} helper={`${form.whatsapp_header_text.length} / ${WA_HEADER_MAX}`}>
                                            <Input {...bind('whatsapp', 'whatsapp_header_text')} value={form.whatsapp_header_text} onChange={(e) => setField('whatsapp_header_text', e.target.value.slice(0, WA_HEADER_MAX))} className="h-10" />
                                        </Field>
                                    )}
                                    <Field label="Message Body" required error={errors.whatsapp_body} helper={`${form.whatsapp_body.length} / ${WA_BODY_MAX} · *bold*  _italic_`}>
                                        <Textarea {...bind('whatsapp', 'whatsapp_body')} value={form.whatsapp_body} onChange={(e) => setField('whatsapp_body', e.target.value.slice(0, WA_BODY_MAX))} className={cn('min-h-[150px] text-sm', errors.whatsapp_body && 'border-destructive')} placeholder={'Dear {{guest_name}},\n\nYou are warmly invited to *{{event_name}}*…'} />
                                    </Field>
                                    <Field label="Footer (optional)" helper={`${form.whatsapp_footer.length} / ${WA_FOOTER_MAX}`}>
                                        <Input value={form.whatsapp_footer} onChange={(e) => setField('whatsapp_footer', e.target.value.slice(0, WA_FOOTER_MAX))} placeholder="Sent via EventInvit" className="h-10" />
                                    </Field>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium">Buttons (max 2)</Label>
                                            {form.whatsapp_buttons.length < 2 && form.whatsapp_category !== 'authentication' && (
                                                <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => setField('whatsapp_buttons', [...form.whatsapp_buttons, { type: 'url', text: '', url: '' }])}>
                                                    <Plus className="h-3.5 w-3.5" /> Add Button
                                                </Button>
                                            )}
                                        </div>
                                        {form.whatsapp_buttons.length === 0 && <p className="text-xs text-muted-foreground">No buttons.</p>}
                                        {form.whatsapp_buttons.map((b, i) => (
                                            <div key={i} className="space-y-1">
                                                <div className="grid gap-2 md:grid-cols-[150px_1fr_1.4fr_auto]">
                                                    <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm">{b.type === 'copy_code' ? 'Copy code' : 'Open link'}</div>
                                                    <Input value={b.text} placeholder="Button label" onChange={(e) => {
                                                        const next = [...form.whatsapp_buttons]; next[i] = { ...b, text: e.target.value.slice(0, WA_BUTTON_TEXT_MAX) }; setField('whatsapp_buttons', next);
                                                    }} className="h-10" />
                                                    {b.type === 'url' ? (
                                                        <Input value={b.url} placeholder="{{invitation_link}}" onChange={(e) => {
                                                            const next = [...form.whatsapp_buttons]; next[i] = { ...b, url: e.target.value.slice(0, 500) }; setField('whatsapp_buttons', next);
                                                        }} className="h-10" />
                                                    ) : <div className="flex h-10 items-center text-xs text-muted-foreground">Copies the {'{{otp}}'} code</div>}
                                                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setField('whatsapp_buttons', form.whatsapp_buttons.filter((_, j) => j !== i))}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                {errors[`btn_${i}`] && <p className="text-[11px] text-destructive">{errors[`btn_${i}`]}</p>}
                                            </div>
                                        ))}
                                    </div>
                                    {varChips('whatsapp', 'whatsapp_body')}
                                </>
                            )}

                            {/* ── STEP: IN-APP ────────────────────────────── */}
                            {stepKey === 'in_app' && (
                                <>
                                    <Field label="Notification Title" required error={errors.title} helper={`${form.title.length} / ${IN_APP_TITLE_MAX}`}>
                                        <Input {...bind('in_app', 'title')} value={form.title} onChange={(e) => setField('title', e.target.value.slice(0, IN_APP_TITLE_MAX))} placeholder="e.g. Your date is booked" className={cn('h-10', errors.title && 'border-destructive')} />
                                    </Field>
                                    <Field label="Short Message" required error={errors.content} helper={`${form.content.length} / ${IN_APP_CONTENT_MAX}`}>
                                        <Textarea {...bind('in_app', 'content')} value={form.content} onChange={(e) => setField('content', e.target.value.slice(0, IN_APP_CONTENT_MAX))} className={cn('min-h-[110px] text-sm', errors.content && 'border-destructive')} />
                                    </Field>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">Icon / Image (optional)</Label>
                                            <ImageCropper title="Notification Image" description="Recommended 512 × 512 px. PNG or JPG." targetWidth={512} targetHeight={512}
                                                currentImage={form.image_url || undefined} onImageCropped={handleImageCropped} onRemove={() => setField('image_url', '')} />
                                        </div>
                                        <div className="space-y-4">
                                            <Field label="Deep Link / Action URL" helper="Screen or link opened when the person taps it.">
                                                <Input {...bind('in_app', 'action_url')} value={form.action_url} onChange={(e) => setField('action_url', e.target.value.slice(0, 500))} placeholder="{{event_link}}" className="h-10" />
                                            </Field>
                                        </div>
                                    </div>
                                    {varChips('in_app', 'content')}
                                </>
                            )}

                            {/* ── STEP: REVIEW ────────────────────────────── */}
                            {stepKey === 'review' && (
                                <>
                                    <p className="text-sm text-muted-foreground">Check each part, then create the template. Use Send Test Message from the list after saving.</p>
                                    <ReviewBlock icon={Info} title="Basic Details" onEdit={() => setStepKey('basic')}>
                                        <b>{form.name || '—'}</b> · {categoryName} · 
                                        Status: {form.is_active ? 'Active' : 'Inactive'}
                                    </ReviewBlock>
                                    {form.channels.includes('email') && (
                                        <ReviewBlock icon={Mail} title="Email" onEdit={() => setStepKey('email')}>
                                            <b>Subject:</b> {form.email_subject || '—'}<br />
                                            {stripHtml(form.email_body).slice(0, 140)}{stripHtml(form.email_body).length > 140 && '…'}
                                        </ReviewBlock>
                                    )}
                                    {form.channels.includes('whatsapp') && (
                                        <ReviewBlock icon={MessageCircle} title="WhatsApp" onEdit={() => setStepKey('whatsapp')}>
                                            {form.whatsapp_category ? humanize(form.whatsapp_category) : '—'}<br />
                                            {form.whatsapp_body.slice(0, 140)}{form.whatsapp_body.length > 140 && '…'}
                                        </ReviewBlock>
                                    )}
                                    {form.channels.includes('in_app') && (
                                        <ReviewBlock icon={Bell} title="In-App & Push" onEdit={() => setStepKey('in_app')}>
                                            <b>{form.title || '—'}</b><br />
                                            {form.content.slice(0, 140)}
                                        </ReviewBlock>
                                    )}

                                    <div className="rounded-lg border border-border p-3">
                                        <div className="mb-2 text-sm font-semibold">Validation Checklist</div>
                                        {[
                                            { ok: Object.keys(validate('basic')).length === 0, label: 'Basic details are complete' },
                                            ...form.channels.map((c) => ({ ok: Object.keys(validate(c as StepKey)).length === 0, label: `${MAIN_CHANNELS.find((m) => m.key === c)?.label} message is configured` })),
                                            { ok: unknownVars.length === 0, label: 'Every placeholder can be filled' },
                                        ].map((row) => (
                                            <div key={row.label} className="flex items-center gap-2 py-0.5 text-sm">
                                                {row.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                                {row.label}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
                            {stepIndex > 0 ? (
                                <Button variant="outline" onClick={() => setStepKey(steps[stepIndex - 1])} className="h-10 gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
                            ) : (
                                <Button variant="outline" onClick={() => router.push(BASE)} className="h-10">Cancel</Button>
                            )}
                            <div className="flex gap-2">
                                {!isEdit && stepIndex > 0 && (
                                    <Button variant="outline" onClick={() => save(false)} disabled={isSaving} className="h-10 gap-2" title="Saves the template as Inactive">
                                        <Save className="h-4 w-4" /> Save Draft
                                    </Button>
                                )}
                                {stepKey === 'review' ? (
                                    <Button onClick={() => save()} disabled={isSaving} className="h-10 gap-2">
                                        {isEdit ? 'Save Changes' : 'Create Template'} <ArrowRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button onClick={() => goTo(steps[stepIndex + 1])} className="h-10 gap-2">
                                        Next: {STEP_LABELS[steps[stepIndex + 1]]} <ArrowRight className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* ── Right column: live preview / help ─────────────────── */}
                    {stepKey !== 'basic' && <div className="space-y-4">
                        {(stepKey === 'email' || (stepKey === 'review' && form.channels.includes('email'))) && (
                            <PreviewCard title="Email Preview"><EmailPreview data={form} values={form.sample_values} /></PreviewCard>
                        )}
                        {(stepKey === 'whatsapp' || (stepKey === 'review' && form.channels.includes('whatsapp'))) && (
                            <PreviewCard title="WhatsApp Preview"><WhatsAppPreview data={form} values={form.sample_values} /></PreviewCard>
                        )}
                        {(stepKey === 'in_app' || (stepKey === 'review' && form.channels.includes('in_app'))) && (
                            <PreviewCard title="In-App Preview"><InAppPreview data={{ ...form, push: true }} values={form.sample_values} /></PreviewCard>
                        )}
                    </div>}
                </div>
            </div>
        </PermissionGuard>
    );
}

/* ─────────────────────────────────────────────────────────── sub-components */

function StepBar({ steps, current, onPick }: { steps: StepKey[]; current: number; onPick: (i: number) => void }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-card px-4 py-4">
            <div className="flex min-w-[560px] items-start">
                {steps.map((s, i) => {
                    const done = i < current;
                    const active = i === current;
                    return (
                        <div key={s} className="flex flex-1 items-start last:flex-none">
                            <button type="button" onClick={() => onPick(i)} className="flex w-24 flex-col items-center gap-1.5">
                                <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
                                    active && 'border-primary bg-primary text-primary-foreground',
                                    done && 'border-primary bg-primary/10 text-primary',
                                    !active && !done && 'border-border bg-card text-muted-foreground')}>
                                    {done ? <Check className="h-4 w-4" /> : i + 1}
                                </span>
                                <span className={cn('text-center text-xs', active ? 'rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground' : done ? 'font-medium text-primary' : 'text-muted-foreground')}>
                                    {STEP_LABELS[s]}
                                </span>
                            </button>
                            {i < steps.length - 1 && <div className={cn('mt-[18px] h-0.5 flex-1', done ? 'bg-primary' : 'bg-border')} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Field({ label, required, helper, error, children }: { label: string; required?: boolean; helper?: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">{label} {required && <span className="text-destructive">*</span>}</Label>
            {children}
            {error ? <p className="text-[11px] text-destructive">{error}</p> : helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
        </div>
    );
}

function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'ok' }) {
    return (
        <div className={cn('rounded-lg px-3 py-2.5 text-xs',
            tone === 'info' && 'bg-violet-50 text-violet-900 dark:bg-violet-950/30 dark:text-violet-200',
            tone === 'warn' && 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
            tone === 'ok' && 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200')}>
            {children}
        </div>
    );
}

function VariableChips({ keys, onPick }: { keys: string[]; onPick: (k: string) => void }) {
    if (!keys.length) return null;
    return (
        <div className="space-y-1.5 rounded-lg border border-dashed border-border p-3">
            <div className="text-xs font-semibold text-foreground">Available Variables <span className="font-normal text-muted-foreground">: click to insert where the cursor is</span></div>
            <div className="flex flex-wrap gap-1.5">
                {keys.map((k) => (
                    <button key={k} type="button" onClick={() => onPick(k)}
                        className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/20">
                        {`{{${k}}}`}
                    </button>
                ))}
            </div>
        </div>
    );
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card className="border-border bg-muted/30 shadow-xs">
            <CardContent className="space-y-3 p-4">
                <div className="text-sm font-bold text-foreground">{title}</div>
                {children}
            </CardContent>
        </Card>
    );
}


function ReviewBlock({ icon: Icon, title, onEdit, children }: { icon: typeof Info; title: string; onEdit: () => void; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{title}</div>
                <div className="break-words text-xs text-muted-foreground">{children}</div>
            </div>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        </div>
    );
}

function SuccessScreen({ template, trigger, categoryName, onList, onAnother }: {
    template: NotificationTemplate; trigger?: SystemTrigger; categoryName: string; onList: () => void; onAnother: () => void;
}) {
    const active = Number(template.is_active) === 1;
    const cards: [typeof Users, string, string][] = [
        [Users, 'Audience', template.audience ? AUDIENCE_LABELS[template.audience] : '—'],
        [Mail, 'Channels', MAIN_CHANNELS.filter((c) => template.channels.includes(c.key)).map((c) => c.label).join(' / ')],
        [Tag, 'Category', categoryName],
    ];
    return (
        <div className="space-y-5">
            <Card className="border-emerald-200 bg-emerald-50/60 shadow-xs dark:border-emerald-900 dark:bg-emerald-950/20">
                <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-8 w-8" /></span>
                    <h1 className="text-2xl font-extrabold text-foreground">Template Created Successfully!</h1>
                    <p className="text-sm text-muted-foreground">
                        {active ? 'Your communication template is saved and ready to use.' : 'Saved as a draft (inactive). Activate it from the list when it is ready.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-lg border border-border bg-card px-4 py-2 text-sm">Template ID: <b>{templateCode(template)}</b></span>
                        <span className={cn('rounded-lg px-4 py-2 text-sm font-semibold', active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700')}>
                            {active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </CardContent>
            </Card>
            <div className="grid gap-3 sm:grid-cols-3">
                {cards.map(([Icon, label, value]) => (
                    <Card key={label} className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-1 p-4">
                            <Icon className="h-5 w-5 text-primary" />
                            <div className="text-sm font-bold">{label}</div>
                            <div className="text-sm text-muted-foreground">{value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="flex flex-wrap justify-between gap-2">
                <Button variant="outline" onClick={onList} className="h-10">View Template List</Button>
                <Button onClick={onAnother} className="h-10 gap-2">Create Another Template <ArrowRight className="h-4 w-4" /></Button>
            </div>
        </div>
    );
}
