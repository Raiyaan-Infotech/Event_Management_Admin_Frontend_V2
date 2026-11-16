'use client';

/**
 * Decorations — uploaded ornament images used inside invitation templates:
 * floral corners, dividers, hanging ornaments, top borders.
 *
 * NOT a frame style. A frame is ONE piece of artwork surrounding the whole
 * invitation; a decoration is a PART, and a template can carry several. So the
 * badge here is a PLACEMENT (Corner / Divider / Top), not a design family —
 * Template Categories answers what something looks like, this answers where it
 * goes.
 *
 * ── LAYOUT ───────────────────────────────────────────────────────────────────
 * Same shape as the Template Categories screen by request: an inline card on
 * top, a searchable, drag-orderable table underneath. The card carries the
 * supplied upload design — drop zone on the left, live preview with a zoom
 * control on the right — rather than sending the upload to its own route, so
 * both supplied screens live on one page.
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Save, RotateCcw, Pencil, Trash2, Loader2, UploadCloud, X, Info, ImageOff,
    Minus, Plus, Eye, Palette, Undo2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BuilderCountedInput } from '../../website-builder/_components/builder-field';
import { BuilderDataTable, type Column } from '../../website-builder/_components/builder-data-table';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { cn } from '@/lib/utils';
import { mediaApi } from '@/hooks/use-media';
import {
    useDecorations,
    useCreateDecoration,
    useUpdateDecoration,
    useUpdateDecorationStatus,
    useReorderDecorations,
    useDeleteDecoration,
    useDecorationSvgSource,
    useRecolorDecoration,
    decorationSvgSourceKey,
    recolorSvg,
    svgToDataUri,
    normaliseHex,
    DECORATION_TYPES,
    DECORATION_TYPE_LABELS,
    DECORATION_TYPE_CLASSES,
    DECORATION_TYPE_HELP,
    formatBytes,
    formatUploadedOn,
    type Decoration,
    type DecorationType,
} from '@/hooks/use-decorations';

/**
 * Where a decoration lands on a real invitation, per `type` — copied exactly
 * from the render rules in `templates/_components/template-preview.tsx` so
 * this preview can never show a spot the actual card wouldn't use.
 */
function DecorationOnCard({ type, url }: { type: DecorationType; url: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    const img = (className: string, key?: string) => (
        <img key={key} src={url} alt="" className={cn('pointer-events-none absolute', className)} />
    );

    switch (type) {
        case 'motif':
            return img('left-1/2 top-1/2 w-2/3 -translate-x-1/2 -translate-y-1/2 opacity-20');
        case 'top':
            return img('inset-x-0 top-0 w-full');
        case 'bottom':
            return img('inset-x-0 bottom-0 w-full');
        case 'ornament':
            return img('inset-x-0 top-0 mx-auto w-3/5');
        case 'divider':
            return img('left-1/2 top-1/2 w-2/5 -translate-x-1/2 -translate-y-1/2 opacity-70');
        case 'corner':
            return (
                <>
                    {([
                        'left-0 top-0',
                        'right-0 top-0 -scale-x-100',
                        'left-0 bottom-0 -scale-y-100',
                        'right-0 bottom-0 -scale-100',
                    ] as const).map((pos) => img(cn('w-2/5', pos), pos))}
                </>
            );
        default:
            return null;
    }
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
const MAX_BYTES = 10 * 1024 * 1024; // matches multer's limit in media.routes.js

const ZOOM_STEPS = [50, 75, 100, 150, 200];

const isActive = (val?: boolean | number | string) => val !== false && val !== 0 && val !== '0';

export default function DecorationsPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // The whole set is fetched because the table searches, filters and DRAGS
    // across it — reordering row 1 past row 40 is meaningless if only page one
    // is loaded.
    const { data, isLoading } = useDecorations({ limit: 200 });

    const createDecoration = useCreateDecoration();
    const updateDecoration = useUpdateDecoration();
    const toggleStatus = useUpdateDecorationStatus();
    const reorderDecorations = useReorderDecorations();
    const deleteDecoration = useDeleteDecoration();

    /**
     * A local copy, so a drag or a status flip paints immediately instead of
     * waiting for the round trip. Re-seeded whenever the server answers, which
     * is what makes the optimistic edit converge rather than stick.
     */
    const [localItems, setLocalItems] = useState<Decoration[] | null>(null);
    useEffect(() => {
        if (data?.data) setLocalItems(data.data);
    }, [data]);

    const items = localItems ?? data?.data ?? [];

    /* ── the form ────────────────────────────────────────────────────────── */

    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<DecorationType>('corner');
    const [status, setStatus] = useState(true);
    const [fileUrl, setFileUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [fileFormat, setFileFormat] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<number | null>(null);
    const [errors, setErrors] = useState<{ name?: boolean; file?: boolean }>({});
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [positionPreviewOpen, setPositionPreviewOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Decoration | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const isSaving = createDecoration.isPending || updateDecoration.isPending;

    /* ── recolouring ─────────────────────────────────────────────────────── */

    /**
     * Pending colour swaps, `{ originalHex: newHex }`. Local until Apply, so
     * dragging a picker repaints instantly instead of writing a file per nudge.
     */
    const [colorMap, setColorMap] = useState<Record<string, string>>({});

    // Only SVG has an editable palette. A PNG is pixels — there is no list of
    // fills to swap, and the server refuses it rather than returning an empty one.
    const isSvg =
        (fileFormat ?? '').toLowerCase().includes('svg') ||
        fileName.toLowerCase().endsWith('.svg') ||
        fileUrl.toLowerCase().endsWith('.svg');

    const { data: svgSource, isLoading: svgLoading } = useDecorationSvgSource(fileUrl, isSvg);

    const pendingCount = Object.keys(colorMap).length;

    /**
     * What the preview panels actually draw.
     *
     * With edits pending this is the locally-recoloured markup as a data URI,
     * so the checkerboard AND the position modal both show the new colours
     * before anything is saved. With none, it is the stored file untouched.
     */
    const previewUrl =
        pendingCount > 0 && svgSource?.svg
            ? svgToDataUri(recolorSvg(svgSource.svg, colorMap))
            : fileUrl;

    const recolorDecoration = useRecolorDecoration((result) => {
        /**
         * Prime the cache for the new URL before pointing the form at it.
         *
         * The client ran the SAME single-pass rewrite for its live preview, so
         * the markup is already known — without this, changing `fileUrl` starts
         * a fresh fetch and the palette blanks to "Reading colours…" straight
         * after the button spinner, which reads as a second, unexplained load.
         */
        if (svgSource?.svg) {
            queryClient.setQueryData(decorationSvgSourceKey(result.url), {
                svg: recolorSvg(svgSource.svg, colorMap),
                colors: result.colors,
            });
        }

        // The recolour wrote a NEW file; point the form at it and drop the
        // pending map, since those swaps are now baked into the artwork.
        setFileUrl(result.url);
        setFileName(result.file_name);
        setFileFormat(result.file_format);
        setFileSize(result.file_size);
        setColorMap({});
    });

    const applyColors = () => {
        if (pendingCount === 0) return;
        recolorDecoration.mutate({
            file_url: fileUrl,
            // Sent as a LIST of {from,to}, not an object keyed by hex — the
            // backend's bodyTransform snake_cases every key, which mangles
            // `#4A7A42` into `#4_a7_a42`. See RecolorPayload.
            color_map: Object.entries(colorMap).map(([from, to]) => ({ from, to })),
            file_name: fileName || 'decoration',
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setName('');
        setType('corner');
        setStatus(true);
        setFileUrl('');
        setFileName('');
        setFileFormat(null);
        setFileSize(null);
        setErrors({});
        setZoom(100);
        setColorMap({});
    };

    const handleFile = async (file: File) => {
        if (!ACCEPT.split(',').includes(file.type)) {
            toast.error('Please choose a PNG, JPG, WEBP or SVG file.');
            return;
        }
        if (file.size > MAX_BYTES) {
            toast.error('That file is over 10MB, which the server will reject.');
            return;
        }

        setUploading(true);
        try {
            const result = await mediaApi.upload(file, 'decorations');
            setFileUrl(result.url);
            setFileName(file.name);
            /**
             * Format and size come from what the server actually STORED, not from
             * the File the browser picked: media.service compresses PNG/JPEG/WEBP
             * when that setting is on, so the two differ and the list would show
             * a size the bucket does not have.
             */
            setFileFormat(result.mimetype ?? file.type);
            setFileSize(result.size ?? file.size);
            // Name the decoration after the file on first pick — it is almost
            // always what you would have typed, and it is still editable.
            setName((prev) => prev || file.name.replace(/\.[^.]+$/, ''));
            setErrors((prev) => ({ ...prev, file: false }));
            // The old file's swaps mean nothing against new artwork.
            setColorMap({});
            toast.success('Decoration uploaded');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            // Reset the input, or choosing the SAME file again fires no change event.
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    const handleSave = () => {
        const nextErrors = { name: !name.trim(), file: !fileUrl };
        setErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) {
            toast.error('Please fill all mandatory fields.');
            return;
        }

        const payload = {
            name: name.trim(),
            type,
            file_url: fileUrl,
            file_name: fileName || null,
            file_format: fileFormat,
            file_size: fileSize,
            is_active: status ? 1 : 0,
        };

        if (editingId) {
            updateDecoration.mutate({ id: editingId, data: payload }, { onSuccess: handleCancel });
        } else {
            createDecoration.mutate(payload, { onSuccess: handleCancel });
        }
    };

    const handleEdit = (item: Decoration) => {
        setEditingId(item.id);
        setName(item.name);
        setType(item.type);
        setStatus(isActive(item.is_active));
        setFileUrl(item.file_url || '');
        setFileName(item.file_name || '');
        setFileFormat(item.file_format);
        setFileSize(item.file_size);
        setErrors({});
        setZoom(100);
        setColorMap({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleToggleStatus = (item: Decoration) => {
        const next = !isActive(item.is_active);
        setLocalItems(items.map((d) => (d.id === item.id ? { ...d, is_active: next } : d)));
        toggleStatus.mutate({ id: item.id, is_active: next });
    };

    const filtered = items.filter((d) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            d.name.toLowerCase().includes(q) || (d.file_name ?? '').toLowerCase().includes(q);
        const matchesType = typeFilter === 'all' || d.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const stepZoom = (dir: 1 | -1) => {
        const i = ZOOM_STEPS.indexOf(zoom);
        const next = ZOOM_STEPS[Math.min(Math.max((i === -1 ? 2 : i) + dir, 0), ZOOM_STEPS.length - 1)];
        setZoom(next);
    };

    /* ── the table ───────────────────────────────────────────────────────── */

    const columns: Column<Decoration>[] = [
        {
            header: 'Preview',
            className: 'w-[110px]',
            cell: (item) => (
                <span className="flex h-12 w-20 items-center justify-center overflow-hidden rounded border border-border bg-muted/20">
                    {item.file_url ? (
                        // `contain` on a light tile: a decoration is usually a
                        // transparent PNG or SVG, and cropping a corner ornament
                        // hides the only part that identifies it.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.file_url} alt="" className="h-full w-full object-contain p-0.5" />
                    ) : (
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                    )}
                </span>
            ),
        },
        {
            header: 'Name',
            cell: (item) => (
                <div className="min-w-0">
                    <p className="break-words font-semibold text-foreground">{item.name}</p>
                    {item.file_name ? (
                        <p className="break-all text-[10px] font-normal text-muted-foreground">
                            {item.file_name}
                        </p>
                    ) : null}
                </div>
            ),
        },
        {
            header: 'Category',
            cell: (item) => (
                <span
                    className={cn(
                        'inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                        DECORATION_TYPE_CLASSES[item.type] ?? 'bg-muted text-muted-foreground border-border'
                    )}
                >
                    {item.type_label ?? DECORATION_TYPE_LABELS[item.type] ?? item.type}
                </span>
            ),
        },
        {
            header: 'Format',
            cell: (item) => (
                <span className="font-mono text-[11px] text-muted-foreground">
                    {item.file_format || '—'}
                </span>
            ),
        },
        {
            header: 'Size',
            // The server sends a prebuilt label; the helper only covers a row
            // saved before that existed, so the two cannot disagree.
            cell: (item) => (
                <span className="text-xs text-muted-foreground">
                    {item.file_size_label ?? formatBytes(item.file_size)}
                </span>
            ),
        },
        {
            header: 'Uploaded On',
            className: 'whitespace-nowrap',
            cell: (item) => (
                <span className="text-xs text-muted-foreground">{formatUploadedOn(item.created_at)}</span>
            ),
        },
        {
            header: 'Status',
            headerClassName: 'text-center',
            className: 'text-center',
            cell: (item) => (
                <div className="flex items-center justify-center">
                    <Switch
                        checked={isActive(item.is_active)}
                        onCheckedChange={() => handleToggleStatus(item)}
                    />
                </div>
            ),
        },
        {
            header: 'Actions',
            headerClassName: 'text-right',
            className: 'text-right',
            cell: (item) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        className={cn(
                            'h-8 w-8 cursor-pointer rounded-lg p-0 transition-colors',
                            editingId === item.id
                                ? 'border-primary bg-primary/10 text-primary shadow-xs'
                                : 'border-border text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary'
                        )}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteTarget(item)}
                        className="h-8 w-8 cursor-pointer rounded-lg border-rose-200 p-0 text-rose-500 hover:border-rose-300 hover:bg-rose-50"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            {/*
              `solid` while applying colours: this action REPLACES the artwork,
              and the default translucent overlay leaves the old decoration
              legible underneath, so the loader and a stale result appear
              together. Opaque is the honest answer — there is nothing worth
              looking at until the new file exists.

              The list load stays gated on having NOTHING on screen. This is a
              `fixed inset-0` overlay, so without that gate any background
              refetch — and the surrounding mutations all invalidate with
              `refetchType: 'all'` — blacks out the whole page long after the
              first paint.
            */}
            <PageLoader
                open={(isLoading && items.length === 0) || uploading || recolorDecoration.isPending}
                solid={recolorDecoration.isPending}
                text={
                    recolorDecoration.isPending
                        ? 'Applying colours…'
                        : uploading
                            ? 'Uploading…'
                            : 'Loading decorations...'
                }
            />

            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-foreground">Decorations</h1>
                    <p className="text-xs text-muted-foreground">
                        Ornament images placed inside invitation templates — corners, dividers, tops.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResetDialogOpen(true)}
                    className="h-8 cursor-pointer border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                    <RotateCcw className="mr-1 h-3.5 w-3.5 text-rose-500" /> Reset Form
                </Button>
            </div>

            {/* ── upload / edit ───────────────────────────────────────────── */}
            <Card className="border-border bg-card shadow-xs">
                <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                        {editingId ? 'Edit Decoration' : 'Upload Decoration'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {/* left — the drop zone + fields */}
                        <div className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                                Upload your custom decoration image (floral, corner, divider, ornament, etc.).
                            </p>

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
                                    'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                                    dragging ? 'border-primary bg-primary/5' : 'border-primary/30 bg-primary/[0.02]',
                                    errors.file && 'border-destructive'
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

                                {fileUrl ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="break-all text-xs font-medium text-foreground">
                                            {fileName || 'Uploaded file'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {(fileFormat || '').toString().split('/').pop()?.toUpperCase()} ·{' '}
                                            {formatBytes(fileSize)}
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
                                                    setFileUrl('');
                                                    setFileName('');
                                                    setFileFormat(null);
                                                    setFileSize(null);
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
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        ) : (
                                            <UploadCloud className="h-8 w-8 text-primary" />
                                        )}
                                        <p className="text-sm font-medium text-foreground">
                                            Drag &amp; drop your image here
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">or</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-primary/40 text-xs font-semibold text-primary hover:bg-primary/5"
                                            onClick={() => fileInput.current?.click()}
                                        >
                                            Browse Files
                                        </Button>
                                        <p className="mt-2 text-[11px] text-muted-foreground">
                                            Supported formats: PNG, JPG, WEBP, SVG
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Recommended: Transparent background, High resolution
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                <div>
                                    <p className="text-[11px] font-bold text-foreground">Tips</p>
                                    <p className="text-[11px] leading-snug text-muted-foreground">
                                        Use PNG or SVG with transparent background for best results. A JPG has
                                        no transparency, so it will sit on the invitation as a solid block.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <BuilderCountedInput
                                    label="Decoration Name"
                                    required
                                    placeholder="e.g. Pink Floral Corner"
                                    value={name}
                                    onChange={(val) => {
                                        setName(val);
                                        if (errors.name) setErrors((prev) => ({ ...prev, name: false }));
                                    }}
                                    maxLength={100}
                                    inputClassName={cn(
                                        '!h-9 text-xs border-border bg-card text-foreground',
                                        errors.name && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                    )}
                                />

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                                            Category
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setPositionPreviewOpen(true)}
                                            disabled={!fileUrl}
                                            className="flex items-center gap-1 text-[10px] font-semibold text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                                        >
                                            <Eye className="h-3 w-3" /> Preview Position
                                        </button>
                                    </div>
                                    <Select value={type} onValueChange={(v) => setType(v as DecorationType)}>
                                        <SelectTrigger className="!h-9 border-border bg-card text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DECORATION_TYPES.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {DECORATION_TYPE_LABELS[t]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">
                                        {DECORATION_TYPE_HELP[type]}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
                                <div className="flex h-9 items-center justify-between rounded-lg border border-border bg-card p-2.5">
                                    <span className="text-xs font-semibold text-foreground">Active</span>
                                    <Switch checked={status} onCheckedChange={setStatus} />
                                </div>

                                <div className="flex items-center gap-2">
                                    {editingId ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCancel}
                                            className="h-9 flex-1 cursor-pointer border-border bg-card text-xs font-bold text-foreground hover:bg-muted"
                                        >
                                            Cancel
                                        </Button>
                                    ) : null}
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={isSaving || uploading}
                                        className="h-9 flex-1 cursor-pointer gap-1.5 bg-primary text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Save className="h-3.5 w-3.5" />
                                        )}
                                        {isSaving
                                            ? 'Saving...'
                                            : editingId
                                                ? 'Update Decoration'
                                                : 'Save Decoration'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* right — the preview */}
                        <div className="flex flex-col rounded-lg border border-border bg-muted/10 p-4">
                            <p className="text-sm font-bold text-foreground">Decoration Preview</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                This decoration will be available to use in invitation templates.
                            </p>

                            {/* A checkerboard, so a transparent PNG reads as transparent
                                rather than as "white background". On a plain white panel
                                the two are indistinguishable, which is exactly the
                                mistake the Tips box warns about. */}
                            <div
                                className="mt-3 flex flex-1 items-center justify-center overflow-auto rounded-md border border-border"
                                style={{
                                    minHeight: 260,
                                    backgroundImage:
                                        'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)',
                                    backgroundSize: '16px 16px',
                                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                    backgroundColor: '#fff',
                                }}
                            >
                                {fileUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={previewUrl}
                                        alt=""
                                        style={{ width: `${zoom}%` }}
                                        className="max-w-none object-contain"
                                    />
                                ) : (
                                    <p className="px-6 text-center text-xs text-muted-foreground">
                                        Upload an image to see how it will look.
                                    </p>
                                )}

                            </div>

                            {/* ── colours ─────────────────────────────────────
                                An SVG decoration is a handful of solid fills, so
                                its palette IS editable — pick a swatch, get a
                                different flower. Nothing is written until Apply:
                                the preview above recolours a local copy of the
                                markup, so dragging a picker costs no requests.

                                Raster uploads get no editor at all. A PNG has no
                                list of fills to swap, and offering a control that
                                silently does nothing is worse than not offering it.
                            */}
                            {fileUrl && isSvg ? (
                                <div className="mt-3 rounded-md border border-border bg-card p-3">
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
                                                    disabled={recolorDecoration.isPending}
                                                    className="mt-2 h-8 w-full gap-1.5 border-primary/40 text-xs font-bold text-primary hover:bg-primary/5"
                                                >
                                                    {recolorDecoration.isPending ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Palette className="h-3.5 w-3.5" />
                                                    )}
                                                    {recolorDecoration.isPending ? 'Applying…' : 'Apply Colours'}
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

                            <div className="mt-3 flex items-center justify-center gap-0 rounded-md border border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-r-none px-3"
                                    disabled={!fileUrl || zoom === ZOOM_STEPS[0]}
                                    onClick={() => stepZoom(-1)}
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="min-w-[64px] border-x border-border px-3 py-1.5 text-center text-xs font-semibold">
                                    {zoom}%
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-l-none px-3"
                                    disabled={!fileUrl || zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                                    onClick={() => stepZoom(1)}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── the list ────────────────────────────────────────────────── */}
            <BuilderDataTable
                title="Uploaded Decorations"
                data={filtered}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No decorations uploaded yet."
                searchPlaceholder="Search decorations..."
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filters={[
                    {
                        id: 'type',
                        placeholder: 'All Categories',
                        value: typeFilter,
                        onChange: setTypeFilter,
                        options: [
                            { value: 'all', label: 'All Categories' },
                            ...DECORATION_TYPES.map((t) => ({
                                value: t,
                                label: DECORATION_TYPE_LABELS[t],
                            })),
                        ],
                    },
                ]}
                keyExtractor={(item, index) => item.id ?? index}
                pageSize={10}
                enableDragAndDrop
                onReorder={(reordered) => {
                    // Paint first, then persist. Without the second half the drag
                    // survives only until the next refetch.
                    setLocalItems(reordered);
                    reorderDecorations.mutate(
                        reordered.map((d, index) => ({ id: d.id, sort_order: index + 1 }))
                    );
                }}
            />

            <DeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget) {
                        deleteDecoration.mutate(deleteTarget.id, {
                            onSuccess: () => setDeleteTarget(null),
                        });
                    }
                }}
                isDeleting={deleteDecoration.isPending}
                title="Delete Decoration"
                description={
                    deleteTarget
                        ? `Delete "${deleteTarget.name}"? Any template using this decoration will stop showing it.`
                        : ''
                }
            />

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleCancel}
            />

            {/* Where this decoration actually lands on an invitation — the exact
                same placement rules `template-preview.tsx` renders with, on a
                sample card, so nobody has to build a template just to find out
                that "Ornament" and "Top" land in almost the same spot. */}
            <Dialog open={positionPreviewOpen} onOpenChange={setPositionPreviewOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Position Preview — {DECORATION_TYPE_LABELS[type]}</DialogTitle>
                    </DialogHeader>

                    <p className="text-xs text-muted-foreground">{DECORATION_TYPE_HELP[type]}</p>

                    <div
                        className="relative mx-auto aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-lg border border-border shadow-sm"
                        style={{ backgroundColor: '#FFF7F0' }}
                    >
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-8 text-center">
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                You are invited to
                            </p>
                            <p className="font-serif text-lg font-semibold text-foreground/80">
                                Rahul &amp; Priya
                            </p>
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70">
                                24 · Dec · 2025
                            </p>
                        </div>

                        {/* `previewUrl`, not `fileUrl` — pending colour edits show
                            here too, so position and colour are checked together. */}
                        {fileUrl ? <DecorationOnCard type={type} url={previewUrl} /> : null}
                    </div>

                    <p className="text-center text-[11px] text-muted-foreground">
                        Sample invitation text shown for scale only — it isn&apos;t saved.
                    </p>
                </DialogContent>
            </Dialog>
        </div>
    );
}
