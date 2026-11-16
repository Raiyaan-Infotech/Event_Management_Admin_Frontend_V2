'use client';

/**
 * CropArea — pure React replacement for `react-image-crop` (zero dependencies).
 *
 * - Drag inside the box to move, drag handles to resize
 * - Optional locked aspect ratio (corner handles keep the ratio)
 * - Dimmed outside area, rule-of-thirds grid, live pixel-size badge
 * - Zoom enlarges the whole stage (image + box) so crop math stays exact
 * - Keyboard: focus the box, arrows move 1% (Shift = 10%)
 *
 * The crop is stored in percent of the image, so it is resolution independent.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PercentCrop {
    x: number;
    y: number;
    width: number;
    height: number;
}

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface CropAreaProps {
    src: string;
    crop: PercentCrop | undefined;
    onChange: (crop: PercentCrop) => void;
    /** width / height. Leave undefined for free-form. */
    aspect?: number;
    /** 1 = fit. Default 1. */
    zoom?: number;
    /** Max stage height in px at zoom 1. Default 420. */
    maxHeight?: number;
    /** Smallest allowed box side in screen px. Default 32. */
    minSize?: number;
    crossOrigin?: '' | 'anonymous' | 'use-credentials';
    onImageLoad?: (img: HTMLImageElement) => void;
    imgRef?: React.Ref<HTMLImageElement>;
    className?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** A centred crop with the given aspect ratio, `widthPct` wide (shrunk to fit). */
export function centerAspectCrop(naturalWidth: number, naturalHeight: number, aspect: number | undefined, widthPct = 80): PercentCrop {
    if (!aspect) {
        const w = clamp(widthPct, 1, 100);
        return { x: (100 - w) / 2, y: (100 - w) / 2, width: w, height: w };
    }
    // height% for a given width% so that the pixel ratio equals `aspect`
    const r = naturalWidth / (aspect * naturalHeight);
    let w = clamp(widthPct, 1, 100);
    let h = w * r;
    if (h > 100) {
        h = 100;
        w = h / r;
    }
    return { x: (100 - w) / 2, y: (100 - h) / 2, width: w, height: h };
}

/**
 * Draws the crop onto a canvas and returns it as a File.
 * Pass `output` to resize to exact dimensions, otherwise natural crop size is used.
 */
export async function getCroppedFile(
    src: string,
    crop: PercentCrop,
    opts: { fileName: string; mimeType?: string; quality?: number; output?: { width: number; height: number }; crossOrigin?: string }
): Promise<File | null> {
    // Fresh off-DOM image: a data/blob/proxied URL is always origin-clean for canvas.
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        if (opts.crossOrigin !== undefined) el.crossOrigin = opts.crossOrigin;
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = src;
    });

    const sx = (crop.x / 100) * img.naturalWidth;
    const sy = (crop.y / 100) * img.naturalHeight;
    const sw = (crop.width / 100) * img.naturalWidth;
    const sh = (crop.height / 100) * img.naturalHeight;

    const outW = Math.max(1, Math.round(opts.output?.width ?? sw));
    const outH = Math.max(1, Math.round(opts.output?.height ?? sh));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

    const mimeType = opts.mimeType || 'image/jpeg';
    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => resolve(blob ? new File([blob], opts.fileName, { type: mimeType, lastModified: Date.now() }) : null),
            mimeType,
            opts.quality ?? 0.95
        );
    });
}

const HANDLE_POS: Record<Handle, string> = {
    nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
    ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
    sw: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
    se: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
    n: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    s: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
};

export function CropArea({
    src,
    crop,
    onChange,
    aspect,
    zoom = 1,
    maxHeight = 420,
    minSize = 32,
    crossOrigin,
    onImageLoad,
    imgRef,
    className,
}: CropAreaProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const stageRef = React.useRef<HTMLDivElement>(null);
    const [natural, setNatural] = React.useState({ w: 0, h: 0 });
    const [containerW, setContainerW] = React.useState(0);
    const [dragging, setDragging] = React.useState<null | 'move' | Handle>(null);

    // Track the container width so the image always fits.
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Fit size at zoom 1, then scale.
    const fit = React.useMemo(() => {
        if (!natural.w || !containerW) return { w: 0, h: 0 };
        const available = Math.max(containerW - 32, 100); // minus the p-4 stage padding
        const s = Math.min(available / natural.w, maxHeight / natural.h, 1.5);
        return { w: natural.w * s, h: natural.h * s };
    }, [natural, containerW, maxHeight]);
    const stageW = fit.w * zoom;
    const stageH = fit.h * zoom;

    const startDrag = (e: React.PointerEvent, mode: 'move' | Handle) => {
        if (!crop || !stageW) return;
        e.preventDefault();
        e.stopPropagation();
        const start = { x: e.clientX, y: e.clientY, crop: { ...crop } };
        const minW = (minSize / stageW) * 100;
        const minH = (minSize / stageH) * 100;
        const r = aspect ? stageW / (aspect * stageH) : 0; // h% = w% * r
        setDragging(mode);

        const onMove = (ev: PointerEvent) => {
            const dx = ((ev.clientX - start.x) / stageW) * 100;
            const dy = ((ev.clientY - start.y) / stageH) * 100;
            const s = start.crop;

            if (mode === 'move') {
                onChange({ ...s, x: clamp(s.x + dx, 0, 100 - s.width), y: clamp(s.y + dy, 0, 100 - s.height) });
                return;
            }

            const hasN = mode.includes('n');
            const hasS = mode.includes('s');
            const hasE = mode.includes('e');
            const hasW = mode.includes('w');

            if (aspect) {
                // Ratio-locked: width drives height; the opposite corner stays fixed.
                const fromX = hasE ? s.width + dx : hasW ? s.width - dx : s.width;
                const fromY = hasS ? (s.height + dy) / r : hasN ? (s.height - dy) / r : s.width;
                let w = Math.abs(fromX - s.width) > Math.abs(fromY - s.width) ? fromX : fromY;
                if (mode === 'n' || mode === 's') w = fromY;
                if (mode === 'e' || mode === 'w') w = fromX;

                const maxWx = hasW ? s.x + s.width : hasE ? 100 - s.x : Math.min(s.x + s.width / 2, 100 - s.x - s.width / 2) * 2;
                const maxHy = hasN ? s.y + s.height : hasS ? 100 - s.y : Math.min(s.y + s.height / 2, 100 - s.y - s.height / 2) * 2;
                w = clamp(w, Math.max(minW, minH / r), Math.min(maxWx, maxHy / r));
                const h = w * r;

                const x = hasW ? s.x + s.width - w : hasE ? s.x : s.x + (s.width - w) / 2;
                const y = hasN ? s.y + s.height - h : hasS ? s.y : s.y + (s.height - h) / 2;
                onChange({ x, y, width: w, height: h });
                return;
            }

            let { x, y, width, height } = s;
            if (hasE) width = clamp(s.width + dx, minW, 100 - s.x);
            if (hasW) {
                x = clamp(s.x + dx, 0, s.x + s.width - minW);
                width = s.x + s.width - x;
            }
            if (hasS) height = clamp(s.height + dy, minH, 100 - s.y);
            if (hasN) {
                y = clamp(s.y + dy, 0, s.y + s.height - minH);
                height = s.y + s.height - y;
            }
            onChange({ x, y, width, height });
        };

        const onUp = () => {
            setDragging(null);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!crop) return;
        const step = e.shiftKey ? 10 : 1;
        const delta: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        };
        const d = delta[e.key];
        if (!d) return;
        e.preventDefault();
        onChange({
            ...crop,
            x: clamp(crop.x + d[0], 0, 100 - crop.width),
            y: clamp(crop.y + d[1], 0, 100 - crop.height),
        });
    };

    const handles: Handle[] = aspect ? ['nw', 'ne', 'sw', 'se'] : ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
    const pxW = crop ? Math.round((crop.width / 100) * natural.w) : 0;
    const pxH = crop ? Math.round((crop.height / 100) * natural.h) : 0;

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative flex w-full overflow-auto rounded-xl bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]',
                className
            )}
            style={{ maxHeight: maxHeight + 32 }}
        >
            <div className="m-auto p-4">
                <div
                    ref={stageRef}
                    className="relative touch-none overflow-hidden rounded-md shadow-md"
                    style={{ width: stageW || undefined, height: stageH || undefined }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imgRef}
                        src={src}
                        alt="Image to crop"
                        crossOrigin={crossOrigin}
                        draggable={false}
                        onLoad={(e) => {
                            const img = e.currentTarget;
                            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                            onImageLoad?.(img);
                        }}
                        className={cn('block h-full w-full select-none', !stageW && 'max-h-[420px] w-auto opacity-0')}
                    />

                    {crop && stageW > 0 && (
                        <div
                            role="slider"
                            aria-label="Crop area — drag to move, arrow keys to nudge"
                            aria-valuetext={`${pxW} by ${pxH} pixels`}
                            tabIndex={0}
                            onKeyDown={onKeyDown}
                            onPointerDown={(e) => startDrag(e, 'move')}
                            className={cn(
                                'absolute cursor-move outline-none ring-2 ring-white/90 focus-visible:ring-primary',
                                'shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]'
                            )}
                            style={{
                                left: `${crop.x}%`,
                                top: `${crop.y}%`,
                                width: `${crop.width}%`,
                                height: `${crop.height}%`,
                            }}
                        >
                            {/* Rule-of-thirds grid */}
                            <div
                                className={cn(
                                    'pointer-events-none absolute inset-0 transition-opacity duration-150',
                                    dragging ? 'opacity-100' : 'opacity-40'
                                )}
                            >
                                <div className="absolute inset-y-0 left-1/3 w-px bg-white/70" />
                                <div className="absolute inset-y-0 left-2/3 w-px bg-white/70" />
                                <div className="absolute inset-x-0 top-1/3 h-px bg-white/70" />
                                <div className="absolute inset-x-0 top-2/3 h-px bg-white/70" />
                            </div>

                            {/* Size badge */}
                            {natural.w > 0 && (
                                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
                                    {pxW} × {pxH}
                                </span>
                            )}

                            {handles.map((h) => (
                                <span
                                    key={h}
                                    onPointerDown={(e) => startDrag(e, h)}
                                    className={cn(
                                        'absolute z-10 flex items-center justify-center p-2', // larger invisible hit-area
                                        HANDLE_POS[h]
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'block border-2 border-primary bg-white shadow-sm transition-transform',
                                            h.length === 2 ? 'h-3.5 w-3.5 rounded-full' : h === 'n' || h === 's' ? 'h-2 w-6 rounded-full' : 'h-6 w-2 rounded-full',
                                            dragging === h && 'scale-125'
                                        )}
                                    />
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
