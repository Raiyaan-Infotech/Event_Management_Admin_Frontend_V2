'use client';

/**
 * Add / Edit Home Screen Template — Jamal's "Add New Home Screen Template"
 * layout (form left, live phone preview right) in the admin's own theme.
 *
 * Seeded from `initial` once (the edit page remounts this with a `key`), never
 * from an effect.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UploadCloud, X, Pipette, Save, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '@/components/common/page-loader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { mediaApi } from '@/hooks/use-media';
import { useEventCategories } from '@/hooks/use-menu-management';
import { useTemplateCategories } from '@/hooks/use-template-categories';
import {
    COLOR_ROLES,
    normaliseHex,
    useCreateHomeScreenTemplate,
    useUpdateHomeScreenTemplate,
    type HomeScreenTemplate,
    type TemplateColor,
} from '@/hooks/use-home-screen-templates';
import { HomeScreenPreview } from './home-screen-preview';
import { extractColors } from './extract-colors';

const LIST = '/admin/home-screen-templates';
const ACCEPT = ['image/png', 'image/jpeg'];
const MAX_BYTES = 2 * 1024 * 1024;
const DESC_MAX = 300;
const NOTES_MAX = 200;

/** Neutral starting palette — the admin picks or extracts the real one. */
const DEFAULT_HEX: Record<string, string> = {
    primary: '#4F46E5',
    secondary: '#E0E7FF',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#1F2937',
};

type FormState = {
    name: string;
    description: string;
    event_category_id: string;
    template_category_id: string;
    image_url: string;
    image_name: string;
    image_size: number | null;
    color_count: number;
    /** One entry per role, always all five — color_count decides how many are used. */
    hex: Record<string, string>;
    notes: string;
};

const fromInitial = (row?: HomeScreenTemplate | null): FormState => {
    const hex = { ...DEFAULT_HEX };
    (row?.colors ?? []).forEach((c) => { if (c?.key && c.hex) hex[c.key] = c.hex; });
    return {
        name: row?.name ?? '',
        description: row?.description ?? '',
        event_category_id: row?.event_category_id ? String(row.event_category_id) : '',
        template_category_id: row?.template_category_id ? String(row.template_category_id) : '',
        image_url: row?.image_url ?? '',
        image_name: row?.image_name ?? '',
        image_size: row?.image_size ?? null,
        color_count: row?.color_count ?? 4,
        hex,
        notes: row?.notes ?? '',
    };
};

const formatSize = (bytes: number | null) =>
    !bytes ? '' : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

function StepLabel({ n, children, htmlFor, required }: { n: number; children: React.ReactNode; htmlFor?: string; required?: boolean }) {
    return (
        <Label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
            {n}. {children} {required ? <span className="text-destructive">*</span> : null}
        </Label>
    );
}

export function HomeScreenTemplateForm({ initial }: { initial?: HomeScreenTemplate | null }) {
    const router = useRouter();
    const isEdit = !!initial;

    const [form, setForm] = useState<FormState>(() => fromInitial(initial));
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [dragging, setDragging] = useState(false);
    /** The local copy of the file just picked — the only image the canvas may read. */
    const [localUrl, setLocalUrl] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

    const { data: eventCategories } = useEventCategories({ limit: 200, is_active: 1 });
    const { data: styles, isLoading: stylesLoading } = useTemplateCategories({ limit: 200, is_active: 1 });

    const backToList = () => router.push(LIST);
    const createTpl = useCreateHomeScreenTemplate(backToList);
    const updateTpl = useUpdateHomeScreenTemplate(backToList);
    const busy = createTpl.isPending || updateTpl.isPending;

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: false }));
    };

    const activeRoles = COLOR_ROLES.slice(0, form.color_count);
    const previewColors: TemplateColor[] = activeRoles.map((r) => ({
        key: r.key,
        label: r.label,
        hex: normaliseHex(form.hex[r.key]) ?? DEFAULT_HEX[r.key],
    }));
    const categoryName = (eventCategories?.data ?? []).find((c) => String(c.id) === form.event_category_id)?.name;

    const handleFile = async (file: File) => {
        if (!ACCEPT.includes(file.type)) {
            toast.error('Please choose a PNG or JPG image.');
            return;
        }
        if (file.size > MAX_BYTES) {
            toast.error('The image must be 2MB or smaller.');
            return;
        }
        setUploading(true);
        try {
            const result = await mediaApi.upload(file, 'home-screen-templates');
            setLocalUrl(URL.createObjectURL(file));
            setForm((prev) => ({ ...prev, image_url: result.url, image_name: file.name, image_size: file.size }));
            setErrors((prev) => ({ ...prev, image_url: false }));
            toast.success('Image uploaded');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    const removeImage = () => {
        setLocalUrl(null);
        setForm((prev) => ({ ...prev, image_url: '', image_name: '', image_size: null }));
    };

    const extract = async () => {
        const src = localUrl || form.image_url;
        if (!src) {
            toast.error('Please upload the home screen image first.');
            return;
        }
        setExtracting(true);
        try {
            const hexes = await extractColors(src);
            setForm((prev) => {
                const hex = { ...prev.hex };
                COLOR_ROLES.forEach((r, i) => { if (hexes[i]) hex[r.key] = hexes[i]; });
                return { ...prev, hex };
            });
            toast.success('Colours extracted from the image');
        } catch {
            toast.error(
                localUrl
                    ? 'Could not read colours from this image.'
                    : 'Colours can be extracted from a newly uploaded image. Upload the image again to extract.',
            );
        } finally {
            setExtracting(false);
        }
    };

    const save = () => {
        const badColor = activeRoles.some((r) => !normaliseHex(form.hex[r.key]));
        const next: Record<string, boolean> = {
            name: !form.name.trim(),
            description: !form.description.trim(),
            event_category_id: !form.event_category_id,
            template_category_id: !form.template_category_id,
            image_url: !form.image_url,
        };
        activeRoles.forEach((r) => { next[`hex_${r.key}`] = !normaliseHex(form.hex[r.key]); });
        setErrors(next);
        if (Object.entries(next).some(([k, v]) => v && !k.startsWith('hex_'))) {
            toast.error('Please fill all mandatory fields.');
            return;
        }
        if (badColor) {
            toast.error('Please enter valid colours (e.g. #4F46E5).');
            return;
        }
        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            event_category_id: Number(form.event_category_id),
            template_category_id: Number(form.template_category_id),
            image_url: form.image_url,
            image_name: form.image_name || null,
            image_size: form.image_size,
            color_count: form.color_count,
            colors: activeRoles.map((r) => ({ key: r.key, hex: normaliseHex(form.hex[r.key])! })),
            notes: form.notes.trim() || null,
        };
        if (isEdit && initial) updateTpl.mutate({ id: initial.id, data: payload });
        else createTpl.mutate(payload);
    };

    return (
        <>
            <PageLoader open={busy} />
            <PageHeader
                title={isEdit ? 'Edit Home Screen Template' : 'Add New Home Screen Template'}
                description="Create a mobile app home screen template for different event categories."
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                {/* ── form ─────────────────────────────────────────────── */}
                <Card className="min-w-0 p-5">
                    <h2 className="text-base font-bold">Template Information</h2>

                    <div className="mt-4 space-y-5">
                        {/* 1 */}
                        <div>
                            <StepLabel n={1} htmlFor="tpl-name" required>Template Name</StepLabel>
                            <Input
                                id="tpl-name"
                                value={form.name}
                                maxLength={150}
                                onChange={(e) => setField('name', e.target.value)}
                                placeholder="Enter template name (e.g. Royal Wedding, Modern Wedding)"
                                className={errors.name ? 'border-destructive' : ''}
                            />
                        </div>

                        {/* 2 */}
                        <div>
                            <StepLabel n={2} htmlFor="tpl-desc" required>Description</StepLabel>
                            <Textarea
                                id="tpl-desc"
                                rows={3}
                                value={form.description}
                                maxLength={DESC_MAX}
                                onChange={(e) => setField('description', e.target.value)}
                                placeholder="Describe this template, key features and best use cases..."
                                className={cn('resize-none', errors.description && 'border-destructive')}
                            />
                            <p className="mt-1 text-right text-xs text-muted-foreground">
                                {form.description.length}/{DESC_MAX}
                            </p>
                        </div>

                        {/* 3 + 4 */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="min-w-0">
                                <StepLabel n={3} required>Event Category</StepLabel>
                                <Select value={form.event_category_id} onValueChange={(v) => setField('event_category_id', v)}>
                                    <SelectTrigger className={errors.event_category_id ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select event category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(eventCategories?.data ?? []).map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="min-w-0">
                                <StepLabel n={4} required>Template Style</StepLabel>
                                <Select value={form.template_category_id} onValueChange={(v) => setField('template_category_id', v)}>
                                    <SelectTrigger className={errors.template_category_id ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select template style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(styles?.data ?? []).map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!stylesLoading && (styles?.data ?? []).length === 0 ? (
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        No styles yet —{' '}
                                        <button
                                            type="button"
                                            className="font-semibold text-primary hover:underline"
                                            onClick={() => router.push('/admin/templates/categories')}
                                        >
                                            add one in Invitation → Template Categories
                                        </button>
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        {/* 5 */}
                        <div>
                            <StepLabel n={5} required>Upload Home Screen Image</StepLabel>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragging(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleFile(file);
                                }}
                                className={cn(
                                    'flex flex-col gap-4 rounded-lg border-2 border-dashed p-4 sm:flex-row sm:items-center',
                                    dragging ? 'border-primary bg-primary/5' : 'border-border',
                                    errors.image_url && 'border-destructive',
                                )}
                            >
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept={ACCEPT.join(',')}
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFile(file);
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    disabled={uploading}
                                    className="flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-center"
                                >
                                    {uploading ? (
                                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                    ) : (
                                        <UploadCloud className="h-7 w-7 text-primary" />
                                    )}
                                    <span className="text-sm font-medium text-primary">
                                        {uploading ? 'Uploading...' : 'Drag & drop your image here, or click to upload'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">Recommended size: 1080 × 1920 px (9:16 ratio)</span>
                                    <span className="text-xs text-muted-foreground">Formats: PNG, JPG (Max 2MB)</span>
                                </button>

                                {form.image_url ? (
                                    <div className="relative mx-auto flex w-[120px] shrink-0 flex-col items-center gap-1 rounded-lg border border-border bg-muted/30 p-2">
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            aria-label="Remove image"
                                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={localUrl || form.image_url} alt="" className="aspect-[9/16] w-14 rounded object-cover" />
                                        <span className="w-full break-all text-center text-[10px] leading-tight line-clamp-2" title={form.image_name}>
                                            {form.image_name || 'Uploaded image'}
                                        </span>
                                        {form.image_size ? (
                                            <span className="text-[10px] text-muted-foreground">{formatSize(form.image_size)}</span>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* 6 */}
                        <div>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <StepLabel n={6} required>Choose Color Palette</StepLabel>
                                    <p className="-mt-1 text-xs text-muted-foreground">
                                        Select how many colors are used in this design, then define each color.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={extract}
                                    disabled={extracting || !form.image_url}
                                    className="h-8 gap-1.5 text-xs"
                                >
                                    {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pipette className="h-3.5 w-3.5" />}
                                    Extract colors from uploaded image
                                </Button>
                            </div>

                            <p className="mt-3 text-sm font-medium">Color Count</p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                                {[2, 3, 4, 5].map((n) => (
                                    <Button
                                        key={n}
                                        type="button"
                                        size="sm"
                                        variant={form.color_count === n ? 'default' : 'outline'}
                                        onClick={() => setField('color_count', n)}
                                        className="h-8 min-w-[84px] text-xs"
                                    >
                                        {n} Colors
                                    </Button>
                                ))}
                            </div>

                            <p className="mt-3 text-sm font-medium">Define Colors</p>
                            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                                {activeRoles.map((r) => {
                                    const value = form.hex[r.key] ?? '';
                                    const valid = normaliseHex(value);
                                    return (
                                        <div key={r.key} className="min-w-0 rounded-lg border border-border p-2.5">
                                            <p className="text-xs font-medium">{r.label}</p>
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <label
                                                    className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border"
                                                    style={{ backgroundColor: valid ?? '#FFFFFF' }}
                                                    title="Pick a colour"
                                                >
                                                    <input
                                                        type="color"
                                                        value={valid ?? '#FFFFFF'}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({ ...prev, hex: { ...prev.hex, [r.key]: e.target.value.toUpperCase() } }))
                                                        }
                                                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                                    />
                                                </label>
                                                <Input
                                                    value={value}
                                                    maxLength={7}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setForm((prev) => ({ ...prev, hex: { ...prev.hex, [r.key]: v } }));
                                                        setErrors((prev) => ({ ...prev, [`hex_${r.key}`]: false }));
                                                    }}
                                                    onBlur={() => {
                                                        const n = normaliseHex(value);
                                                        if (n) setForm((prev) => ({ ...prev, hex: { ...prev.hex, [r.key]: n } }));
                                                    }}
                                                    className={cn('h-8 min-w-0 font-mono text-xs uppercase', errors[`hex_${r.key}`] && 'border-destructive')}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 7 */}
                        <div>
                            <Label htmlFor="tpl-notes" className="mb-1.5 block text-sm font-semibold">
                                7. Notes <span className="font-normal text-muted-foreground">(Optional)</span>
                            </Label>
                            <Textarea
                                id="tpl-notes"
                                rows={2}
                                value={form.notes}
                                maxLength={NOTES_MAX}
                                onChange={(e) => setField('notes', e.target.value)}
                                placeholder="Add any additional information about this template..."
                                className="resize-none"
                            />
                            <p className="mt-1 text-right text-xs text-muted-foreground">{form.notes.length}/{NOTES_MAX}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                            <Button type="button" variant="outline" onClick={backToList}>Cancel</Button>
                            <Button type="button" onClick={save} disabled={busy || uploading}>
                                <Save className="mr-2 h-4 w-4" />
                                {isEdit ? 'Update Template' : 'Create Template'}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* ── live preview ─────────────────────────────────────── */}
                <Card className="min-w-0 self-start p-5 xl:sticky xl:top-4">
                    <h2 className="text-base font-bold">Live Preview</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        See how your template will look on the mobile app home screen.
                    </p>
                    <div className="mt-5 rounded-xl bg-muted/40 py-6">
                        <HomeScreenPreview
                            imageUrl={localUrl || form.image_url || null}
                            colors={previewColors}
                            categoryName={categoryName}
                        />
                    </div>
                </Card>
            </div>
        </>
    );
}
