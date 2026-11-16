import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/**
 * Decorations — uploaded ornament images used inside invitation templates:
 * floral corners, dividers, hanging ornaments, top borders.
 *
 * ── NOT A FRAME STYLE ────────────────────────────────────────────────────────
 * A frame style is ONE piece of artwork surrounding the whole invitation. A
 * decoration is a PART, placed somewhere specific, and a template can carry
 * several. That is why `type` here is a PLACEMENT rather than a design family —
 * `template_categories` says what something looks like, this says where it goes.
 *
 * Backend: `/api/v1/decorations` (decoration.service.js).
 */

/* ------------------------------------------------------------------ types -- */

/**
 * MUST stay identical to `TYPES` in the backend service — anything it does not
 * recognise falls back to 'corner' on write, with no error anywhere.
 */
export const DECORATION_TYPES = ['corner', 'divider', 'ornament', 'top', 'bottom', 'motif'] as const;

export type DecorationType = (typeof DECORATION_TYPES)[number];

export const DECORATION_TYPE_LABELS: Record<DecorationType, string> = {
    corner: 'Corner',
    divider: 'Divider',
    ornament: 'Ornament',
    top: 'Top',
    bottom: 'Bottom',
    motif: 'Motif',
};

/** Badge colours, so the Category column reads at a glance like the design. */
export const DECORATION_TYPE_CLASSES: Record<DecorationType, string> = {
    corner: 'bg-violet-100 text-violet-700 border-violet-200',
    divider: 'bg-amber-100 text-amber-700 border-amber-200',
    ornament: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    top: 'bg-sky-100 text-sky-700 border-sky-200',
    bottom: 'bg-rose-100 text-rose-700 border-rose-200',
    motif: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
};

/**
 * What each placement actually does on a rendered invitation — mirrors the
 * render rules in `template-preview.tsx` exactly, so this text can never say
 * something the card doesn't do.
 *
 * Several of these land in nearly the same spot (`ornament` vs `top`, `motif`
 * vs `divider`) — spelled out here since the badge colour alone doesn't make
 * that obvious, and it's the exact confusion this text exists to prevent.
 */
export const DECORATION_TYPE_HELP: Record<DecorationType, string> = {
    corner: 'One image, auto-mirrored into all 4 corners — you only upload one.',
    divider: 'Small centred accent, layered above the Motif spot.',
    ornament: 'Centred strip near the top — same area as Top, just narrower.',
    top: 'Full-width strip across the top edge.',
    bottom: 'Full-width strip across the bottom edge.',
    motif: 'Centred watermark behind the text, very low opacity.',
};

export interface Decoration {
    id: number;
    company_id: number | null;
    name: string;
    type: DecorationType;
    /** Prebuilt "Corner" for the list badge. */
    type_label?: string;
    /** The uploaded image. This is the decoration itself. */
    file_url: string | null;
    file_name: string | null;
    /** PNG | SVG | JPG | WEBP. Stored at upload, not derived per render. */
    file_format: string | null;
    /** Bytes as stored — post-compression, not the size of the picked file. */
    file_size: number | null;
    /** Prebuilt "245 KB", so every screen prints it identically. */
    file_size_label?: string | null;
    is_active: boolean | number;
    sort_order: number;
    creator?: { id: number; full_name: string } | null;
    updater?: { id: number; full_name: string } | null;
    has_pending_approval?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface DecorationStats {
    total: number;
    active: number;
    inactive: number;
    total_bytes: number;
    total_size_label: string;
}

export interface Paginated<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    } | null;
}

/** One swatch in the recolour editor. `count` drives the most-used-first order. */
export interface PaletteEntry {
    color: string;
    count: number;
}

export interface SvgSource {
    svg: string;
    colors: PaletteEntry[];
}

/** One swap. See the warning on `RecolorPayload` for why this is not a map. */
export interface ColorSwap {
    from: string;
    to: string;
}

export type RecolorPayload = {
    file_url: string;
    /**
     * `[{ from: '#E4738F', to: '#3366FF' }]` — a LIST, never an object keyed
     * by hex.
     *
     * ⚠ The backend's `bodyTransform` middleware rewrites every request-body
     * KEY from camelCase to snake_case and cannot tell a colour from a field
     * name: `#4A7A42` arrives as `#4_a7_a42` and the swap is rejected as
     * malformed. Only keys are rewritten, so the colours ride safely as
     * VALUES under the fixed `from` / `to` keys.
     */
    color_map: ColorSwap[];
    file_name?: string | null;
};

export interface RecolorResult {
    url: string;
    file_name: string;
    file_format: string;
    file_size: number;
    file_size_label: string | null;
    /** How many hex values were rewritten — 0 is rejected by the server. */
    replaced: number;
    colors: PaletteEntry[];
}

export type DecorationPayload = {
    name?: string;
    type?: DecorationType;
    file_url?: string | null;
    file_name?: string | null;
    file_format?: string | null;
    file_size?: number | null;
    is_active?: number;
    sort_order?: number;
};

/* -------------------------------------------------------------------- api -- */

const KEY = ['decorations'];
const PATH = '/decorations';

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<Decoration>> => {
        const response = await apiClient.get(PATH, {
            params: { page: 1, limit: 10, ...params },
        });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getStats: async (): Promise<DecorationStats> => {
        const response = await apiClient.get(`${PATH}/stats`);
        return (
            response.data.data?.stats ?? {
                total: 0, active: 0, inactive: 0, total_bytes: 0, total_size_label: '0 KB',
            }
        );
    },
    getById: async (id: number | string): Promise<Decoration> => {
        const response = await apiClient.get(`${PATH}/${id}`);
        return response.data.data?.decoration ?? response.data.data;
    },
    create: async (data: DecorationPayload): Promise<Decoration> => {
        const response = await apiClient.post(PATH, data);
        return response.data.data?.decoration ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: DecorationPayload }): Promise<Decoration> => {
        const response = await apiClient.put(`${PATH}/${id}`, data);
        return response.data.data?.decoration ?? response.data.data;
    },
    // One column per request — a switch flip must not round-trip the whole row.
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<Decoration> => {
        const response = await apiClient.patch(`${PATH}/${id}/status`, { is_active });
        return response.data.data?.decoration ?? response.data.data;
    },
    reorder: async (items: Array<{ id: number; sort_order: number }>): Promise<{ updated: number }> => {
        const response = await apiClient.patch(`${PATH}/reorder`, { items });
        return response.data.data;
    },
    /**
     * The SVG markup + its palette, read through the server.
     *
     * The bucket sends no `Access-Control-Allow-Origin`, so the browser cannot
     * fetch the decoration it is already displaying in order to read the
     * colours out of it. One round trip here hands the markup over, and the
     * editor recolours that local string for its live preview — so dragging a
     * colour picker costs nothing instead of a request per nudge.
     */
    svgSource: async (fileUrl: string): Promise<SvgSource> => {
        const response = await apiClient.get(`${PATH}/svg-source`, {
            params: { file_url: fileUrl },
        });
        return response.data.data;
    },
    recolor: async (payload: RecolorPayload): Promise<RecolorResult> => {
        const response = await apiClient.post(`${PATH}/recolor`, payload);
        return response.data.data;
    },
    remove: async (id: number): Promise<void> => {
        await apiClient.delete(`${PATH}/${id}`);
    },
};

function decorationError(queryClient: ReturnType<typeof useQueryClient>, verb: string) {
    return (error: any) => {
        // An approval-gated action is not a failure — the request was recorded.
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} decoration`);
    };
}

/* ------------------------------------------------------------------ hooks -- */

export function useDecorations(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: [...KEY, params ?? {}],
        queryFn: () => api.getAll(params),
    });
}

export function useDecorationStats() {
    return useQuery({
        queryKey: [...KEY, 'stats'],
        queryFn: api.getStats,
    });
}

export function useDecoration(id: number | string | undefined) {
    return useQuery({
        queryKey: [...KEY, 'detail', id],
        queryFn: () => api.getById(id!),
        enabled: !!id,
    });
}

export function useCreateDecoration(onSuccess?: (decoration: Decoration) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (decoration) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Decoration uploaded successfully');
            onSuccess?.(decoration);
        },
        onError: decorationError(queryClient, 'upload'),
    });
}

export function useUpdateDecoration(onSuccess?: (decoration: Decoration) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (decoration, vars) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: [...KEY, 'detail', vars.id] });
            toast.success('Decoration updated successfully');
            onSuccess?.(decoration);
        },
        onError: decorationError(queryClient, 'update'),
    });
}

export function useUpdateDecorationStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
        onError: decorationError(queryClient, 'update'),
    });
}

/**
 * Persists a drag-and-drop reorder.
 *
 * Without this the drag is local state that a refresh throws away — a control
 * that appears to work and does not.
 */
export function useReorderDecorations() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.reorder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Decoration order updated');
        },
        onError: decorationError(queryClient, 'reorder'),
    });
}

export function useDeleteDecoration() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Decoration deleted successfully');
        },
        onError: decorationError(queryClient, 'delete'),
    });
}

/**
 * Loads the SVG markup + palette for the file currently in the form.
 *
 * `enabled` keeps it off for raster uploads — a PNG has no editable palette,
 * and the server rejects it rather than returning an empty one.
 */
/**
 * Exported so a caller can prime this cache after a recolour instead of
 * triggering a second round trip for markup it already has. Hardcoding the
 * key at the call site is how the two silently stop matching.
 */
export const decorationSvgSourceKey = (fileUrl: string) => [...KEY, 'svg-source', fileUrl];

export function useDecorationSvgSource(fileUrl: string | null | undefined, isSvg: boolean) {
    return useQuery({
        queryKey: decorationSvgSourceKey(fileUrl ?? ''),
        queryFn: () => api.svgSource(fileUrl!),
        enabled: !!fileUrl && isSvg,
        // The markup for a given URL cannot change — a recolour writes a NEW
        // file rather than overwriting one, so this never goes stale.
        staleTime: Infinity,
    });
}

export function useRecolorDecoration(onSuccess?: (result: RecolorResult) => void) {
    return useMutation({
        mutationFn: api.recolor,
        onSuccess: (result) => {
            toast.success('Colours applied');
            onSuccess?.(result);
        },
        onError: (error: any) =>
            toast.error(error?.response?.data?.message || 'Failed to recolour decoration'),
    });
}

/* ----------------------------------------------------------------- helpers -- */

/** `#abc` → `#AABBCC`. Mirrors `normaliseHex` in the backend service. */
export const normaliseHex = (raw: string): string | null => {
    const value = String(raw || '').trim();
    const body = value.startsWith('#') ? value.slice(1) : value;
    if (!/^[0-9a-fA-F]+$/.test(body)) return null;
    if (body.length === 3 || body.length === 4) {
        return `#${body.split('').map((ch) => ch + ch).join('').toUpperCase()}`;
    }
    if (body.length === 6 || body.length === 8) return `#${body.toUpperCase()}`;
    return null;
};

const HEX_TOKEN = /#[0-9a-fA-F]{3,8}\b/g;

/**
 * The live preview's recolour — the SAME single-pass rewrite the server does
 * on save, so what the panel shows is what gets written.
 *
 * ⚠ ONE pass, from the original map. Chained `.replace()` calls re-read their
 * own output: mapping red→blue then blue→green turns every originally-red
 * shape green. The mapping in this editor is user-supplied and routinely
 * contains exactly that kind of cycle (swapping two colours over).
 */
export const recolorSvg = (svg: string, map: Record<string, string>): string => {
    const lookup = new Map<string, string>();
    for (const [from, to] of Object.entries(map)) {
        const source = normaliseHex(from);
        const target = normaliseHex(to);
        if (source && target && source !== target) lookup.set(source, target);
    }
    if (lookup.size === 0) return svg;

    return svg.replace(HEX_TOKEN, (token) => {
        const hex = normaliseHex(token);
        return (hex && lookup.get(hex)) || token;
    });
};

/**
 * An `<img>`-safe source for a raw SVG string.
 *
 * `encodeURIComponent` rather than base64: it survives the non-ASCII a
 * decoration's `<title>` can carry, which `btoa` throws on outright.
 */
export const svgToDataUri = (svg: string): string =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * Mirrors `formatSize` in the backend service, for the rare row that predates
 * `file_size_label` being sent. The server value wins when present, so the two
 * cannot disagree on a row that has one.
 */
export const formatBytes = (bytes?: number | null): string => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** "20 May 2025, 10:30 AM" — the Uploaded On column. */
export const formatUploadedOn = (iso?: string): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
};
