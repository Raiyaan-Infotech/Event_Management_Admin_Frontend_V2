import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/**
 * Template fonts — fonts the admin ADDS for invitation templates, on top of
 * the ten built into the wizard (`FONT_OPTIONS`).
 *
 * Two ways in:
 *   upload — a font file (TTF / OTF / WOFF / WOFF2).
 *   link   — an address: a stylesheet (a Google Fonts "css2" link) or a font
 *            file hosted elsewhere.
 *
 * A template stores the font's NAME, exactly as it does for a built-in font,
 * so the name is the CSS family: for a stylesheet link it must match the
 * family the stylesheet declares.
 *
 * Backend: `/api/v1/template-fonts` (templateFont.service.js). It is gated by
 * the EVENT TEMPLATES permissions — there are no slugs of its own.
 */

export interface TemplateFont {
    id: number;
    name: string;
    source: 'upload' | 'link';
    file_url: string | null;
    file_name: string | null;
    /** TTF | OTF | WOFF | WOFF2 */
    file_format: string | null;
    file_size: number | null;
    link_url: string | null;
    /** A link is either a stylesheet or a single font file. Null for an upload. */
    link_kind: 'stylesheet' | 'file' | null;
    is_active: boolean | number;
    created_at: string;
}

/** The slice of a font a renderer needs. */
export type RenderFont = Pick<TemplateFont, 'id' | 'name' | 'source' | 'link_url' | 'link_kind'>;

const KEY = ['template-fonts'];
const PATH = '/template-fonts';

const fontError = (verb: string) => (error: { response?: { data?: { message?: string } } }) => {
    toast.error(error?.response?.data?.message || `Failed to ${verb} font`);
};

export function useTemplateFonts() {
    return useQuery({
        queryKey: KEY,
        queryFn: async (): Promise<TemplateFont[]> => {
            const response = await apiClient.get(PATH);
            const fonts = response.data?.data?.fonts;
            return Array.isArray(fonts) ? fonts : [];
        },
    });
}

/** `file` set = an upload; otherwise `link_url` = a link. */
export function useCreateTemplateFont(onSuccess?: () => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { name: string; file?: File | null; link_url?: string }) => {
            if (input.file) {
                const body = new FormData();
                body.append('name', input.name);
                body.append('file', input.file);
                const response = await apiClient.post(PATH, body, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                return response.data?.data?.font as TemplateFont;
            }
            const response = await apiClient.post(PATH, { name: input.name, link_url: input.link_url });
            return response.data?.data?.font as TemplateFont;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Font added successfully');
            onSuccess?.();
        },
        onError: fontError('add'),
    });
}

export function useUpdateTemplateFont() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: { name?: string; is_active?: number; link_url?: string } }) => {
            const response = await apiClient.put(`${PATH}/${id}`, data);
            return response.data?.data?.font as TemplateFont;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
        },
        onError: fontError('update'),
    });
}

export function useDeleteTemplateFont() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`${PATH}/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Font deleted successfully');
        },
        onError: fontError('delete'),
    });
}

/* ---------------------------------------------------------------- loading -- */

/**
 * Where the browser fetches an uploaded font from. The backend itself, not the
 * `/api/proxy` route the rest of the panel uses: the file route is public and
 * answers with the CORS headers a cross-origin web font needs.
 */
const fontFileUrl = (id: number) =>
    `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1').replace(/\/$/, '')}/template-fonts/${id}/file`;

/**
 * Make added fonts usable on this page: one `<style>` / `<link>` per font in
 * the document head, added once and left there (a font that is already
 * declared costs nothing, and removing it would flash every preview using it).
 */
export function loadTemplateFonts(fonts: RenderFont[] | undefined) {
    if (typeof document === 'undefined' || !fonts?.length) return;
    for (const font of fonts) {
        const marker = `template-font-${font.id}`;
        if (document.getElementById(marker)) continue;

        if (font.source === 'link' && font.link_kind === 'stylesheet' && font.link_url) {
            const link = document.createElement('link');
            link.id = marker;
            link.rel = 'stylesheet';
            link.href = font.link_url;
            document.head.appendChild(link);
            continue;
        }

        const src = font.source === 'upload' ? fontFileUrl(font.id) : font.link_url;
        if (!src) continue;
        const style = document.createElement('style');
        style.id = marker;
        // The name is validated server-side to letters, digits, spaces and a
        // few joining marks, so it cannot close the string it is written into.
        style.textContent = `@font-face{font-family:"${font.name}";src:url("${src}");font-display:swap;}`;
        document.head.appendChild(style);
    }
}

/** Loads every ACTIVE added font and returns them — for the wizard and the previews. */
export function useLoadedTemplateFonts() {
    const query = useTemplateFonts();
    const active = (query.data ?? []).filter((f) => f.is_active !== false && f.is_active !== 0);
    const signature = active.map((f) => f.id).join(',');
    useEffect(() => {
        loadTemplateFonts(active);
        // `signature` stands for `active`: same ids, same fonts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);
    return active;
}

/** "245 KB" */
export const formatFontSize = (bytes?: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
