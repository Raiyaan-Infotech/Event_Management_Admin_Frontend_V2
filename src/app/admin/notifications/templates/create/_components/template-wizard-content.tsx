'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Bell, Check, FileEdit, Save, Smartphone } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ImageCropper } from '@/components/common/image-cropper';
import { mediaApi } from '@/hooks/use-media';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { DynamicIcon } from '@/components/common/dynamic-icon';
import { cn } from '@/lib/utils';
import { useEventCategories } from '@/hooks/use-menu-management';
import { useNotificationCategories } from '@/hooks/use-notification-categories';
import {
    useNotificationTemplate,
    useNotificationVariables,
    useSystemTriggers,
    useCreateNotificationTemplate,
    useUpdateNotificationTemplate,
    type NotificationChannel,
} from '@/hooks/use-notification-templates';

const STEPS = ['Template Details', 'Review & Save'] as const;

const TITLE_MAX = 100;
const CONTENT_MAX = 500;

interface FormState {
    name: string;
    trigger_key: string;
    notification_category_id: string;
    event_category_id: string;
    title: string;
    content: string;
    image_url: string;
    is_active: boolean;
}

const emptyForm = (): FormState => ({
    name: '',
    trigger_key: '',
    notification_category_id: '',
    event_category_id: '',
    title: '',
    content: '',
    image_url: '',
    is_active: true,
});

const SAMPLE_VALUES: Record<string, string> = {
    guest_name: 'Priya',
    event_name: 'Our Event',
    event_date: 'Mon, Apr 28',
    event_time: '6:00 PM',
    venue_name: 'The Grand Hall',
    event_link: 'eventinvit.app/e/22',
};

function renderPreview(text: string) {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => SAMPLE_VALUES[key] ?? match);
}

export function TemplateWizardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const isEdit = !!id;

    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [loadedId, setLoadedId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const titleRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const lastFocused = useRef<'title' | 'content'>('content');

    const { data: existing, isLoading: loadingExisting } = useNotificationTemplate(id ?? undefined);
    const { data: notificationCategories } = useNotificationCategories({ limit: 200, is_active: true });
    const { data: eventCategories } = useEventCategories({ limit: 200, is_active: true });
    const { data: variables } = useNotificationVariables();
    const { data: systemTriggers } = useSystemTriggers();

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: false } : prev));
    };

    // Load once per id, so a background refetch cannot clobber in-progress edits.
    useEffect(() => {
        if (!existing || !id || loadedId === id) return;
        setForm({
            name: existing.name ?? '',
            trigger_key: existing.trigger_key ?? '',
            notification_category_id: existing.notification_category_id ? String(existing.notification_category_id) : '',
            event_category_id: existing.event_category_id ? String(existing.event_category_id) : '',
            title: existing.title ?? '',
            content: existing.content ?? '',
            image_url: existing.image_url ?? '',
            is_active: Number(existing.is_active) === 1,
        });
        setLoadedId(id);
    }, [existing, id, loadedId]);

    const insertVariable = (key: string) => {
        const token = `{{${key}}}`;
        const target = lastFocused.current;

        if (target === 'title') {
            const el = titleRef.current;
            const pos = el?.selectionStart ?? form.title.length;
            const next = (form.title.slice(0, pos) + token + form.title.slice(pos)).slice(0, TITLE_MAX);
            setField('title', next);
            requestAnimationFrame(() => el?.focus());
        } else {
            const el = contentRef.current;
            const pos = el?.selectionStart ?? form.content.length;
            const next = (form.content.slice(0, pos) + token + form.content.slice(pos)).slice(0, CONTENT_MAX);
            setField('content', next);
            requestAnimationFrame(() => el?.focus());
        }
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

    const validateStep1 = (): boolean => {
        const next: Record<string, boolean> = {};
        if (!form.name.trim()) next.name = true;
        if (!form.notification_category_id) next.notification_category_id = true;
        if (!form.title.trim()) next.title = true;
        if (!form.content.trim()) next.content = true;

        if (Object.keys(next).length > 0) {
            setErrors(next);
            toast.error('Please fill all mandatory fields.');
            return false;
        }
        setErrors({});
        return true;
    };

    const goNext = () => {
        if (!validateStep1()) return;
        setStep(2);
    };

    const buildPayload = (activeOverride?: boolean) => ({
        name: form.name.trim(),
        trigger_key: form.trigger_key || null,
        notification_category_id: Number(form.notification_category_id),
        event_category_id: form.event_category_id ? Number(form.event_category_id) : null,
        title: form.title.trim(),
        content: form.content.trim(),
        image_url: form.image_url || null,
        channels: ['in_app'] as NotificationChannel[],
        is_active: activeOverride ?? form.is_active,
    });

    const createTemplate = useCreateNotificationTemplate(() => router.push('/admin/notifications/templates'));
    const updateTemplate = useUpdateNotificationTemplate(() => router.push('/admin/notifications/templates'));

    const save = (activeOverride?: boolean) => {
        if (!validateStep1()) {
            setStep(1);
            return;
        }
        const payload = buildPayload(activeOverride);
        if (isEdit && id) updateTemplate.mutate({ id: Number(id), data: payload });
        else createTemplate.mutate(payload);
    };

    const isSaving = createTemplate.isPending || updateTemplate.isPending;

    const notificationCategoryName =
        notificationCategories?.data?.find((c) => String(c.id) === form.notification_category_id)?.name ?? '—';
    const eventCategoryName =
        eventCategories?.data?.find((c) => String(c.id) === form.event_category_id)?.name ?? 'All Categories';

    const checklist = [
        { label: 'Template details are complete', ok: !!form.name.trim() && !!form.notification_category_id, hint: 'Name and notification category are set.' },
        { label: 'Title length is within limit', ok: form.title.length > 0 && form.title.length <= TITLE_MAX, hint: `${form.title.length}/${TITLE_MAX} characters` },
        { label: 'Message content is ready', ok: !!form.content.trim(), hint: 'Content is filled in.' },
        { label: 'Image attachment (optional)', ok: true, hint: form.image_url ? 'Image will be included in the notification.' : 'No image attached.' },
        { label: 'Template status', ok: true, hint: form.is_active ? 'Template will be enabled after saving.' : 'Template will be saved inactive.' },
    ];

    return (
        <PermissionGuard permission={isEdit ? 'notification_templates.edit' : 'notification_templates.create'}>
            <div className="space-y-5">
                <PageLoader open={isSaving || uploadingImage || (isEdit && loadingExisting)} />

                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                            {isEdit ? 'Edit Transactional Notification Template' : 'Add Transactional Notification Template'}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Create a notification template for event communication and system updates.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin/notifications/templates')}
                        className="h-9 gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to List
                    </Button>
                </div>

                <StepBar
                    step={step}
                    onStepClick={(target) => {
                        if (target < step || validateStep1()) setStep(target);
                    }}
                />

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="space-y-5 lg:col-span-2">
                        {step === 1 && (
                            <WizardCard title="Template Information" subtitle="Fill in the details below to create your notification template.">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <Field label="Template Name" required error={errors.name}>
                                            <Input
                                                value={form.name}
                                                onChange={(e) => setField('name', e.target.value)}
                                                placeholder="e.g. Guest Registration Confirmation"
                                                maxLength={150}
                                                className={cn('h-10', errors.name && 'border-destructive')}
                                            />
                                        </Field>

                                        <Field label="Notification Category" required error={errors.notification_category_id}>
                                            <Select
                                                value={form.notification_category_id}
                                                onValueChange={(v) => setField('notification_category_id', v)}
                                            >
                                                <SelectTrigger className={cn('h-10', errors.notification_category_id && 'border-destructive')}>
                                                    <SelectValue placeholder="Select notification category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(notificationCategories?.data ?? []).map((c) => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            <span className="flex items-center gap-2">
                                                                <DynamicIcon name={c.icon} color={c.color} size="h-3.5 w-3.5" />
                                                                {c.name}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>

                                        <Field
                                            label="System Trigger"
                                            helper="Optional — links this template to an automatic system event. Only one template can own a given trigger."
                                        >
                                            <Select
                                                value={form.trigger_key || 'none'}
                                                onValueChange={(v) => setField('trigger_key', v === 'none' ? '' : v)}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Not linked to a system trigger" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Not linked to a system trigger</SelectItem>
                                                    {(systemTriggers ?? []).map((t) => (
                                                        <SelectItem key={t.key} value={t.key}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>

                                        <Field label="Event Category" helper="Leave empty to apply to all categories.">
                                            <Select
                                                value={form.event_category_id}
                                                onValueChange={(v) => setField('event_category_id', v)}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Select event category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(eventCategories?.data ?? []).map((c) => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    </div>

                                    <Field label="Title" required error={errors.title} helper={`${form.title.length}/${TITLE_MAX}`}>
                                        <Input
                                            ref={titleRef}
                                            value={form.title}
                                            onChange={(e) => setField('title', e.target.value.slice(0, TITLE_MAX))}
                                            onFocus={() => (lastFocused.current = 'title')}
                                            placeholder="e.g. Welcome to Our Event!"
                                            className={cn('h-10', errors.title && 'border-destructive')}
                                        />
                                    </Field>

                                    <Field label="Content / Message" required error={errors.content} helper={`${form.content.length}/${CONTENT_MAX}`}>
                                        <Textarea
                                            ref={contentRef}
                                            value={form.content}
                                            onChange={(e) => setField('content', e.target.value.slice(0, CONTENT_MAX))}
                                            onFocus={() => (lastFocused.current = 'content')}
                                            placeholder="Write your notification message here..."
                                            className={cn('min-h-[120px] text-sm', errors.content && 'border-destructive')}
                                        />
                                    </Field>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Optional Variables / Placeholders</Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Click on a variable to insert it into your title or content.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {(variables ?? []).map((v) => (
                                                <button
                                                    key={v.key}
                                                    type="button"
                                                    onClick={() => insertVariable(v.key)}
                                                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Optional Image Upload</Label>
                                        <ImageCropper
                                            title="Template Image"
                                            description="Recommended size 500 x 500 px. PNG, JPG or WEBP."
                                            targetWidth={500}
                                            targetHeight={500}
                                            currentImage={form.image_url || undefined}
                                            onImageCropped={handleImageCropped}
                                            onRemove={() => setField('image_url', '')}
                                        />
                                    </div>

                                    <Field label="Active Template" helper="Enable this template for use.">
                                        <div className="flex h-10 items-center gap-3 rounded-md border border-border bg-card px-3">
                                            <Switch checked={form.is_active} onCheckedChange={(v) => setField('is_active', v)} />
                                            <span className="text-sm text-muted-foreground">
                                                {form.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </Field>
                                </div>
                            </WizardCard>
                        )}

                        {step === 2 && (
                            <WizardCard title="Review Template" subtitle="Please review your template details before saving. You can go back to make changes if needed.">
                                <div className="space-y-1">
                                    <ReviewRow icon={FileEdit} label="Template Name" value={form.name || '—'} />
                                    <ReviewRow
                                        label="System Trigger"
                                        value={systemTriggers?.find((t) => t.key === form.trigger_key)?.label ?? 'Not linked'}
                                    />
                                    <ReviewRow label="Notification Category" value={notificationCategoryName} />
                                    <ReviewRow label="Event Category" value={eventCategoryName} />
                                    <ReviewRow label="Title" value={form.title || '—'} />
                                    <ReviewRow label="Message Content" value={form.content || '—'} multiline />
                                    <ReviewRow
                                        label="Image Attachment"
                                        value={form.image_url ? 'Attached' : 'None'}
                                    />
                                    <ReviewRow label="Active Status" value={form.is_active ? 'Enabled' : 'Disabled'} />
                                </div>
                            </WizardCard>
                        )}
                    </div>

                    <div className="space-y-5">
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4 text-primary" />
                                    <CardTitle className="text-sm font-bold text-foreground">Preview (Mobile View)</CardTitle>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    This is how your notification will appear in the Event Invit app.
                                </p>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="rounded-2xl border border-border bg-muted/30 p-3">
                                    <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
                                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Bell className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-foreground">Event Invit</span>
                                                <span className="text-[10px] text-muted-foreground">now</span>
                                            </div>
                                            <p className="break-words text-sm font-semibold text-foreground">
                                                {renderPreview(form.title) || 'Notification title'}
                                            </p>
                                            <p className="break-words text-xs text-muted-foreground">
                                                {renderPreview(form.content) || 'Notification message will appear here.'}
                                            </p>
                                            {form.image_url && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={form.image_url}
                                                    alt=""
                                                    className="mt-2 h-24 w-full rounded-lg object-cover"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {step === 2 && (
                            <Card className="border-border bg-card shadow-xs">
                                <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                                    <CardTitle className="text-sm font-bold text-foreground">Before You Save</CardTitle>
                                    <p className="text-xs text-muted-foreground">Confirm the following items before saving your template.</p>
                                </CardHeader>
                                <CardContent className="space-y-3 p-4">
                                    {checklist.map((c) => (
                                        <div key={c.label} className="flex items-start gap-2">
                                            <span
                                                className={cn(
                                                    'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                                                    c.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                                                )}
                                            >
                                                <Check className="h-2.5 w-2.5" />
                                            </span>
                                            <div>
                                                <p className="text-xs font-semibold text-foreground">{c.label}</p>
                                                <p className="text-[11px] text-muted-foreground">{c.hint}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    {step > 1 ? (
                        <Button variant="outline" onClick={() => setStep(1)} className="h-9 gap-2">
                            <ArrowLeft className="h-4 w-4" /> Previous
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => router.push('/admin/notifications/templates')} className="h-9">
                            Cancel
                        </Button>
                    )}

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => save(false)} disabled={isSaving} className="h-9 gap-2">
                            <Save className="h-4 w-4" /> Save Draft
                        </Button>
                        {step < 2 ? (
                            <Button onClick={goNext} className="h-9 gap-2">
                                Next <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={() => save()} disabled={isSaving} className="h-9 gap-2">
                                <Save className="h-4 w-4" /> Save Template
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}

/* --------------------------------------------------------------- sub-components */

function StepBar({ step, onStepClick }: { step: number; onStepClick: (target: number) => void }) {
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-border bg-card p-3">
            {STEPS.map((label, i) => {
                const index = i + 1;
                const done = step > index;
                const active = step === index;
                return (
                    <button
                        key={label}
                        type="button"
                        onClick={() => onStepClick(index)}
                        className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted',
                            active ? 'font-semibold text-foreground' : 'text-muted-foreground'
                        )}
                    >
                        <span
                            className={cn(
                                'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                                active && 'bg-primary text-primary-foreground',
                                done && 'bg-emerald-100 text-emerald-700',
                                !active && !done && 'bg-muted text-muted-foreground'
                            )}
                        >
                            {done ? <Check className="h-3 w-3" /> : index}
                        </span>
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function WizardCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <Card className="border-border bg-card shadow-xs">
            <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileEdit className="h-4 w-4" />
                    </span>
                    <div>
                        <CardTitle className="text-sm font-bold text-foreground">{title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">{children}</CardContent>
        </Card>
    );
}

function Field({
    label,
    required,
    helper,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    helper?: string;
    error?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            {helper && (
                <p className={cn('text-[11px]', error ? 'text-destructive' : 'text-muted-foreground')}>{helper}</p>
            )}
        </div>
    );
}

function ReviewRow({
    icon: Icon,
    label,
    value,
    multiline,
}: {
    icon?: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    multiline?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
            </div>
            <div
                className={cn(
                    'text-right text-sm font-medium text-foreground',
                    multiline ? 'max-w-md whitespace-pre-wrap break-words' : 'break-words'
                )}
            >
                {value}
            </div>
        </div>
    );
}
