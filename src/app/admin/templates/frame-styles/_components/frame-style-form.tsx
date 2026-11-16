'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { UploadCloud, Loader2, X, FileImage, Palette, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '@/components/common/page-loader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { mediaApi } from '@/hooks/use-media';
import { FramePreview } from './frame-preview';
import { useTemplateCategories } from '@/hooks/use-template-categories';
import {
    useFrameStyle,
    useCreateFrameStyle,
    useUpdateFrameStyle,
    useFrameStyleSvgSource,
    useRecolorFrameStyle,
    frameStyleSvgSourceKey,
    recolorSvg,
    normaliseHex,
    svgToDataUri,
    FRAME_LAYOUTS,
    FRAME_LAYOUT_LABELS,
    normaliseLayouts,
    type FrameLayout,
} from '@/hooks/use-frame-styles';

/**
 * Upload Frame Style — create, and edit via `?id=`.
 *
 * ── ONE ADDITION TO THE SUPPLIED DESIGN ──────────────────────────────────────
 * The mockup has four controls: name, category, status and the drop zone. But
 * the list it feeds has a **Supported Layouts** column, and nothing in the form
 * could set it — a column no screen can fill is a column that shows the same
 * value on every row forever. So the three layout checkboxes are added here.
 * (Same call as the template wizard's Component Order, for the same reason.)
 *
 * ── THE TWO SAVE BUTTONS ARE TWO DIFFERENT COLUMNS ───────────────────────────
 * "Save as Draft" and "Upload Style" write `status`; the Status switch writes
 * `is_active`. They are genuinely separate: a published frame can be switched
 * off without becoming a draft again, and a draft is not offered whatever the
 * switch says.
 */

const ACCEPT = 'image/svg+xml,image/png,image/jpeg';
const MAX_BYTES = 10 * 1024 * 1024; // matches multer's limit in media.routes.js

type FormState = {
    name: string;
    template_category_id: string;
    is_active: boolean;
    file_url: string;
    file_name: string;
    supported_layouts: FrameLayout[];
};

const EMPTY: FormState = {
    name: '',
    template_category_id: '',
    is_active: true,
    file_url: '',
    file_name: '',
    supported_layouts: [...FRAME_LAYOUTS],
};

export function FrameStyleForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const editId = searchParams.get('id');
    const isEdit = !!editId;

    const [form, setForm] = useState<FormState>(EMPTY);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    /* ── recolouring ─────────────────────────────────────────────────────── */

    /**
     * Pending colour swaps, `{ originalHex: newHex }`. Local until Apply, so
     * dragging a picker repaints instantly instead of writing a file per nudge.
     */
    const [colorMap, setColorMap] = useState<Record<string, string>>({});

    // Only SVG has an editable palette. A PNG is pixels — there is no list of
    // fills to swap, and the server refuses it rather than returning an empty one.
    const isSvg =
        form.file_name.toLowerCase().endsWith('.svg') ||
        form.file_url.toLowerCase().endsWith('.svg');

    const { data: svgSource, isLoading: svgLoading } = useFrameStyleSvgSource(form.file_url, isSvg);

    const pendingCount = Object.keys(colorMap).length;

    /**
     * What the preview panel actually draws.
     *
     * With edits pending this is the locally-recoloured markup as a data URI,
     * so the sample invitation shows the new colours before anything is saved.
     * With none, it is the stored file untouched.
     */
    const previewUrl =
        pendingCount > 0 && svgSource?.svg
            ? svgToDataUri(recolorSvg(svgSource.svg, colorMap))
            : form.file_url || null;

    const recolorFrame = useRecolorFrameStyle((result) => {
        /**
         * Prime the cache for the new URL before pointing the form at it.
         *
         * The client ran the SAME single-pass rewrite for its live preview, so
         * the markup is already known — without this, changing `file_url` starts
         * a fresh fetch and the palette blanks to "Reading colours…" straight
         * after the button spinner, which reads as a second, unexplained load.
         */
        if (svgSource?.svg) {
            queryClient.setQueryData(frameStyleSvgSourceKey(result.url), {
                svg: recolorSvg(svgSource.svg, colorMap),
                colors: result.colors,
            });
        }

        // The recolour wrote a NEW file; point the form at it and drop the
        // pending map, since those swaps are now baked into the artwork.
        setForm((prev) => ({ ...prev, file_url: result.url, file_name: result.file_name }));
        setColorMap({});
    });

    const applyColors = () => {
        if (pendingCount === 0) return;
        recolorFrame.mutate({
            file_url: form.file_url,
            // Sent as a LIST of {from,to}, not an object keyed by hex — the
            // backend's bodyTransform snake_cases every key, which mangles
            // `#4A7A42` into `#4_a7_a42`. See RecolorPayload.
            color_map: Object.entries(colorMap).map(([from, to]) => ({ from, to })),
            file_name: form.file_name || 'frame-style',
        });
    };

    // Only active categories — offering a disabled one would let someone file a
    // frame under a category the list filter cannot select.
    const { data: categories, isLoading: categoriesLoading } = useTemplateCategories({
        limit: 200,
        is_active: 1,
    });

    const { data: existing, isLoading: existingLoading } = useFrameStyle(editId ?? undefined);

    const backToList = () => router.push('/admin/templates/frame-styles');
    const createFrame = useCreateFrameStyle(backToList);
    const updateFrame = useUpdateFrameStyle(backToList);
    const busy = createFrame.isPending || updateFrame.isPending;

    /**
     * Populate from the loaded row ONCE per id.
     *
     * Re-running on every reference would wipe whatever is being typed the
     * moment a background refetch resolves.
     */
    const loadedFor = useRef<string | null>(null);
    useEffect(() => {
        if (!existing || loadedFor.current === String(existing.id)) return;
        loadedFor.current = String(existing.id);
        setForm({
            name: existing.name || '',
            template_category_id: existing.template_category_id
                ? String(existing.template_category_id)
                : '',
            is_active: !!Number(existing.is_active),
            file_url: existing.file_url || '',
            file_name: existing.file_name || '',
            supported_layouts: normaliseLayouts(existing.supported_layouts),
        });
        setColorMap({});
    }, [existing]);

    // Functional updater: a `{ ...form }` spread writes back a stale snapshot
    // when an upload resolves while a field is being typed.
    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: false }));
    };

    const toggleLayout = (layout: FrameLayout) => {
        setForm((prev) => {
            const on = prev.supported_layouts.includes(layout);
            const next = on
                ? prev.supported_layouts.filter((l) => l !== layout)
                : [...prev.supported_layouts, layout];
            // Kept in FRAME_LAYOUTS order so the list column reads the same
            // whichever order the boxes were ticked in.
            return { ...prev, supported_layouts: FRAME_LAYOUTS.filter((l) => next.includes(l)) };
        });
    };

    const handleFile = async (file: File) => {
        if (!ACCEPT.split(',').includes(file.type)) {
            toast.error('Please choose an SVG, PNG or JPG file.');
            return;
        }
        if (file.size > MAX_BYTES) {
            toast.error('That file is over 10MB, which the server will reject.');
            return;
        }

        setUploading(true);
        try {
            const result = await mediaApi.upload(file, 'frame-styles');
            setForm((prev) => ({ ...prev, file_url: result.url, file_name: file.name }));
            setErrors((prev) => ({ ...prev, file_url: false }));
            // The old file's swaps mean nothing against new artwork.
            setColorMap({});
            toast.success('Frame file uploaded');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            // Reset the input, or choosing the SAME file again fires no change event.
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    const save = (status: 'draft' | 'published') => {
        const nextErrors = {
            name: !form.name.trim(),
            template_category_id: !form.template_category_id,
            // Required for a DRAFT too: "save as draft" means not published yet,
            // not saved without the thing the record exists to hold.
            file_url: !form.file_url,
        };
        setErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) {
            toast.error('Please fill all mandatory fields.');
            return;
        }

        const payload = {
            name: form.name.trim(),
            template_category_id: Number(form.template_category_id),
            file_url: form.file_url,
            file_name: form.file_name || null,
            // An empty selection is normalised back to all three by the backend —
            // a frame supporting no layout could never be used.
            supported_layouts: form.supported_layouts,
            status,
            is_active: form.is_active ? 1 : 0,
        };

        if (isEdit && existing) {
            updateFrame.mutate({ id: existing.id, data: payload });
        } else {
            createFrame.mutate(payload);
        }
    };

    // Nothing renders against a half-loaded row: populating from `existing`
    // after the fields are already on screen is what makes an edit form flash
    // empty and then fill in.
    if (isEdit && existingLoading) return <PageLoader open />;

    return (
        <>
            <PageLoader open={busy || uploading || recolorFrame.isPending} />

            <PageHeader
                title={isEdit ? 'Edit Frame Style' : 'Upload Frame Style'}
                description="Border artwork applied around an invitation."
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* ── left: the form ─────────────────────────────────────── */}
                <Card className="p-5">
                    <h2 className="text-base font-bold text-foreground">
                        {isEdit ? 'Frame Style' : 'Upload Frame Style'}
                    </h2>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
                        <div>
                            <Label htmlFor="frame-name">
                                Frame Style Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="frame-name"
                                value={form.name}
                                onChange={(e) => setField('name', e.target.value)}
                                placeholder="Enter frame style name"
                                className={errors.name ? 'border-destructive' : ''}
                            />
                        </div>

                        <div>
                            <Label htmlFor="frame-category">
                                Category <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.template_category_id}
                                onValueChange={(v) => setField('template_category_id', v)}
                            >
                                <SelectTrigger
                                    id="frame-category"
                                    className={errors.template_category_id ? 'border-destructive' : ''}
                                >
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(categories?.data ?? []).map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Nothing can be filed without one, so the empty case
                                points at the fix rather than showing a dead list. */}
                            {!categoriesLoading && (categories?.data ?? []).length === 0 ? (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    No categories yet —{' '}
                                    <button
                                        type="button"
                                        className="font-semibold text-primary underline-offset-2 hover:underline"
                                        onClick={() => router.push('/admin/templates/categories')}
                                    >
                                        add one first
                                    </button>
                                    .
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <Label htmlFor="frame-status">Status</Label>
                            <div className="flex h-9 items-center gap-2">
                                <Switch
                                    id="frame-status"
                                    checked={form.is_active}
                                    onCheckedChange={(v) => setField('is_active', v)}
                                />
                                <span className="text-sm font-medium">
                                    {form.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── the drop zone ──────────────────────────────────── */}
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
                            'mt-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                            dragging ? 'border-primary bg-primary/5' : 'border-border',
                            errors.file_url && 'border-destructive'
                        )}
                    >
                        <input
                            ref={fileInput}
                            type="file"
                            accept={ACCEPT}
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                        />

                        {form.file_url ? (
                            <div className="flex flex-col items-center gap-2">
                                <span className="flex h-20 w-28 items-center justify-center overflow-hidden rounded border border-border bg-muted/30">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={form.file_url} alt="" className="h-full w-full object-contain p-1" />
                                </span>
                                <p className="flex items-center gap-1.5 break-all text-xs text-muted-foreground">
                                    <FileImage className="h-3.5 w-3.5 shrink-0" />
                                    {form.file_name || 'Uploaded file'}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => fileInput.current?.click()}
                                    >
                                        Replace
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1.5 text-xs text-destructive"
                                        onClick={() => {
                                            setForm((prev) => ({ ...prev, file_url: '', file_name: '' }));
                                            setColorMap({});
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5" /> Remove
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1.5">
                                {uploading ? (
                                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                ) : (
                                    <UploadCloud className="h-7 w-7 text-primary" />
                                )}
                                <p className="text-sm text-muted-foreground">
                                    Drag &amp; drop border / frame file here
                                    <br />
                                    or{' '}
                                    <button
                                        type="button"
                                        className="font-semibold text-primary underline-offset-2 hover:underline"
                                        onClick={() => fileInput.current?.click()}
                                    >
                                        Browse File
                                    </button>
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    SVG, PNG, JPG · up to 10MB. SVG keeps its edges crisp at any size.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── colours ─────────────────────────────────────────────
                        An SVG frame is a handful of solid fills, so its palette
                        IS editable — pick a swatch, get a different gold.
                        Nothing is written until Apply: the preview panel
                        recolours a local copy of the markup, so dragging a
                        colour picker costs no requests.

                        Raster uploads get no editor at all. A PNG has no list
                        of fills to swap, and offering a control that silently
                        does nothing is worse than not offering it.
                    */}
                    {form.file_url && isSvg ? (
                        <div className="mt-4 rounded-md border border-border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                    <Palette className="h-3.5 w-3.5 text-primary" />
                                    Colours
                                </p>
                                {pendingCount > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setColorMap({})}
                                        className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-destructive"
                                    >
                                        <Undo2 className="h-3 w-3" /> Revert {pendingCount}
                                    </button>
                                ) : null}
                            </div>

                            {svgLoading ? (
                                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Reading colours…
                                </p>
                            ) : svgSource?.colors?.length ? (
                                <>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {svgSource.colors.map((entry) => {
                                            const current = colorMap[entry.color] ?? entry.color;
                                            const changed = current !== entry.color;
                                            return (
                                                <label
                                                    key={entry.color}
                                                    title={`${entry.color}${changed ? ` → ${current}` : ''}`}
                                                    className={cn(
                                                        'relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border transition-colors',
                                                        changed
                                                            ? 'border-primary ring-1 ring-primary'
                                                            : 'border-border hover:border-primary/50'
                                                    )}
                                                    style={{ backgroundColor: current }}
                                                >
                                                    {/* The native picker — no library, and it is
                                                        the same control ColorField already uses
                                                        elsewhere in the admin. */}
                                                    <input
                                                        type="color"
                                                        value={
                                                            /^#[0-9a-fA-F]{6}$/.test(current)
                                                                ? current
                                                                : (normaliseHex(current) ?? '#000000').slice(0, 7)
                                                        }
                                                        onChange={(e) => {
                                                            const next = e.target.value.toUpperCase();
                                                            setColorMap((prev) => {
                                                                // Setting a swatch back to its
                                                                // original is not a change — drop
                                                                // it, so "Revert 2" never counts
                                                                // a no-op edit.
                                                                const copy = { ...prev };
                                                                if (next === entry.color) delete copy[entry.color];
                                                                else copy[entry.color] = next;
                                                                return copy;
                                                            });
                                                        }}
                                                        className="absolute inset-0 cursor-pointer opacity-0"
                                                        aria-label={`Change ${entry.color}`}
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                                        {pendingCount > 0
                                            ? 'Preview updated. Apply writes a recoloured copy — the original file is left alone.'
                                            : 'Click a swatch to recolour that part of the artwork.'}
                                    </p>

                                    {pendingCount > 0 ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={applyColors}
                                            disabled={recolorFrame.isPending}
                                            className="mt-2 h-8 w-full gap-1.5 border-primary/40 text-xs font-bold text-primary hover:bg-primary/5"
                                        >
                                            {recolorFrame.isPending ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Palette className="h-3.5 w-3.5" />
                                            )}
                                            {recolorFrame.isPending ? 'Applying…' : 'Apply Colours'}
                                        </Button>
                                    ) : null}
                                </>
                            ) : (
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    This SVG has no solid colour fills to edit.
                                </p>
                            )}
                        </div>
                    ) : null}

                    {/* ── supported layouts (added — see the header note) ─── */}
                    <div className="mt-4">
                        <Label>Supported Layouts</Label>
                        <div className="mt-1.5 flex flex-wrap gap-4">
                            {FRAME_LAYOUTS.map((layout) => (
                                <label
                                    key={layout}
                                    className="flex cursor-pointer items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={form.supported_layouts.includes(layout)}
                                        onCheckedChange={() => toggleLayout(layout)}
                                    />
                                    {FRAME_LAYOUT_LABELS[layout]}
                                </label>
                            ))}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            {form.supported_layouts.length === 0
                                ? 'None selected — this saves as all three, since a frame supporting no layout could never be used.'
                                : 'The page shapes this frame was drawn for. Corner artwork sized for one shape rarely survives being stretched to another.'}
                        </p>
                    </div>

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <Button variant="outline" onClick={backToList} disabled={busy}>
                            Cancel
                        </Button>
                        <Button variant="outline" onClick={() => save('draft')} disabled={busy}>
                            Save as Draft
                        </Button>
                        <Button onClick={() => save('published')} disabled={busy}>
                            {isEdit ? 'Save Changes' : 'Upload Style'}
                        </Button>
                    </div>
                </Card>

                {/* ── right: the preview ─────────────────────────────────── */}
                <Card className="p-5">
                    <FramePreview
                        fileUrl={previewUrl}
                        layouts={
                            form.supported_layouts.length
                                ? form.supported_layouts
                                : [...FRAME_LAYOUTS]
                        }
                    />
                </Card>
            </div>
        </>
    );
}
