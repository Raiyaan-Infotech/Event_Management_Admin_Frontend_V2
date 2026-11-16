import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/**
 * Frame / border styles — the uploaded artwork that frames an invitation.
 *
 * The file IS the design. Everything else on the row is how it gets found: a
 * name to read, a template category to filter by, and which page shapes it was
 * drawn to fit.
 *
 * Distinct from `event_templates.border_style`, which is an enum mapping to a
 * CSS border class. A double line is not an ornate frame; this is the real
 * artwork, uploaded once and reusable.
 *
 * Backend: `/api/v1/frame-styles` (frameStyle.service.js).
 */

/* ------------------------------------------------------------------ types -- */

/**
 * The page shapes a frame can be drawn for.
 *
 * MUST stay identical to `LAYOUTS` in the backend service — anything it does
 * not recognise is dropped on write with no error anywhere.
 */
export const FRAME_LAYOUTS = ['portrait', 'landscape', 'square'] as const;

export type FrameLayout = (typeof FRAME_LAYOUTS)[number];

export const FRAME_LAYOUT_LABELS: Record<FrameLayout, string> = {
    portrait: 'Portrait',
    landscape: 'Landscape',
    square: 'Square',
};

export type FramePublishStatus = 'draft' | 'published';

export interface FrameStyle {
    id: number;
    company_id: number | null;
    name: string;
    template_category_id: number | null;
    /** The uploaded SVG / PNG / JPG. This is the frame itself. */
    file_url: string | null;
    file_name: string | null;
    supported_layouts: FrameLayout[];
    /** Prebuilt "Portrait, Landscape, Square" for the list column. */
    supported_layouts_label?: string;
    /** Save as Draft vs Upload Style. Separate from `is_active` — see below. */
    status: FramePublishStatus;
    /**
     * The form's Status toggle.
     *
     * Two fields on purpose: a published frame can be switched off without
     * becoming a draft again, and a draft is not offered whatever this says.
     */
    is_active: boolean | number;
    sort_order: number;
    /** Null when the category it pointed at has been deleted. */
    category?: { id: number; name: string; slug: string } | null;
    creator?: { id: number; full_name: string } | null;
    updater?: { id: number; full_name: string } | null;
    has_pending_approval?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface FrameStyleStats {
    total: number;
    active: number;
    inactive: number;
    draft: number;
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

export type FrameStylePayload = {
    name?: string;
    template_category_id?: number | null;
    file_url?: string | null;
    file_name?: string | null;
    supported_layouts?: FrameLayout[];
    status?: FramePublishStatus;
    is_active?: number;
    sort_order?: number;
};

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
    /** How many hex values were rewritten — 0 is rejected by the server. */
    replaced: number;
    colors: PaletteEntry[];
}

/* -------------------------------------------------------------------- api -- */

const KEY = ['frame-styles'];
const PATH = '/frame-styles';

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<FrameStyle>> => {
        const response = await apiClient.get(PATH, {
            params: { page: 1, limit: 10, ...params },
        });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getStats: async (): Promise<FrameStyleStats> => {
        const response = await apiClient.get(`${PATH}/stats`);
        return response.data.data?.stats ?? { total: 0, active: 0, inactive: 0, draft: 0 };
    },
    getById: async (id: number | string): Promise<FrameStyle> => {
        const response = await apiClient.get(`${PATH}/${id}`);
        return response.data.data?.frameStyle ?? response.data.data;
    },
    create: async (data: FrameStylePayload): Promise<FrameStyle> => {
        const response = await apiClient.post(PATH, data);
        return response.data.data?.frameStyle ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: FrameStylePayload }): Promise<FrameStyle> => {
        const response = await apiClient.put(`${PATH}/${id}`, data);
        return response.data.data?.frameStyle ?? response.data.data;
    },
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<FrameStyle> => {
        const response = await apiClient.patch(`${PATH}/${id}/status`, { is_active });
        return response.data.data?.frameStyle ?? response.data.data;
    },
    remove: async (id: number): Promise<void> => {
        await apiClient.delete(`${PATH}/${id}`);
    },
    /**
     * The SVG markup + its palette, read through the server.
     *
     * The bucket sends no `Access-Control-Allow-Origin`, so the browser cannot
     * fetch the frame file it is already displaying in order to read the
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
};

function frameError(queryClient: ReturnType<typeof useQueryClient>, verb: string) {
    return (error: any) => {
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} frame style`);
    };
}

/* ------------------------------------------------------------------ hooks -- */

export function useFrameStyles(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: [...KEY, params ?? {}],
        queryFn: () => api.getAll(params),
    });
}

export function useFrameStyleStats() {
    return useQuery({
        queryKey: [...KEY, 'stats'],
        queryFn: api.getStats,
    });
}

export function useFrameStyle(id: number | string | undefined) {
    return useQuery({
        queryKey: [...KEY, 'detail', id],
        queryFn: () => api.getById(id!),
        enabled: !!id,
    });
}

/**
 * `onSuccess` is a callback rather than a router.push inside the hook —
 * navigation belongs to the component that knows where it wants to go.
 */
export function useCreateFrameStyle(onSuccess?: (frameStyle: FrameStyle) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (frameStyle) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success(
                frameStyle.status === 'draft'
                    ? 'Frame style saved as a draft'
                    : 'Frame style uploaded successfully'
            );
            onSuccess?.(frameStyle);
        },
        onError: frameError(queryClient, 'upload'),
    });
}

export function useUpdateFrameStyle(onSuccess?: (frameStyle: FrameStyle) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (frameStyle, vars) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: [...KEY, 'detail', vars.id] });
            toast.success('Frame style updated successfully');
            onSuccess?.(frameStyle);
        },
        onError: frameError(queryClient, 'update'),
    });
}

export function useUpdateFrameStyleStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
        onError: frameError(queryClient, 'update'),
    });
}

export function useDeleteFrameStyle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Frame style deleted successfully');
        },
        onError: frameError(queryClient, 'delete'),
    });
}

/**
 * Loads the SVG markup + palette for the file currently in the form.
 *
 * `enabled` keeps it off for raster uploads — a PNG has no editable palette,
 * and the server rejects it rather than returning an empty one.
 *
 * Exported so a caller can prime this cache after a recolour instead of
 * triggering a second round trip for markup it already has. Hardcoding the
 * key at the call site is how the two silently stop matching.
 */
export const frameStyleSvgSourceKey = (fileUrl: string) => [...KEY, 'svg-source', fileUrl];

export function useFrameStyleSvgSource(fileUrl: string | null | undefined, isSvg: boolean) {
    return useQuery({
        queryKey: frameStyleSvgSourceKey(fileUrl ?? ''),
        queryFn: () => api.svgSource(fileUrl!),
        enabled: !!fileUrl && isSvg,
        // The markup for a given URL cannot change — a recolour writes a NEW
        // file rather than overwriting one, so this never goes stale.
        staleTime: Infinity,
    });
}

export function useRecolorFrameStyle(onSuccess?: (result: RecolorResult) => void) {
    return useMutation({
        mutationFn: api.recolor,
        onSuccess: (result) => {
            toast.success('Colours applied');
            onSuccess?.(result);
        },
        onError: (error: any) =>
            toast.error(error?.response?.data?.message || 'Failed to recolour frame style'),
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
 * `encodeURIComponent` rather than base64: it survives the non-ASCII a frame
 * style's `<title>` can carry, which `btoa` throws on outright.
 */
export const svgToDataUri = (svg: string): string =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * A stored list can predate a layout being added, so it is normalised here
 * rather than trusted. Unknown values dropped; an empty result means all three,
 * matching the backend's own fallback — a frame that supports no layout could
 * never be used.
 */
export const normaliseLayouts = (layouts?: FrameLayout[] | null): FrameLayout[] => {
    const picked = new Set((layouts ?? []).map((l) => String(l).toLowerCase()));
    const out = FRAME_LAYOUTS.filter((l) => picked.has(l));
    return out.length ? [...out] : [...FRAME_LAYOUTS];
};

export const layoutsLabel = (layouts?: FrameLayout[] | null): string =>
    normaliseLayouts(layouts).map((l) => FRAME_LAYOUT_LABELS[l]).join(', ');
