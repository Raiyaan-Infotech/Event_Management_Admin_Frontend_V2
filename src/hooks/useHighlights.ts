import type React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface HighlightItem {
    id: string;
    icon: string;
    title: string;
    description: string;
    icon_color?: string;
    icon_bg_color?: string;
}

export interface HighlightsSettings {
    id?: number;
    page_slug: string;
    instance: number;
    items: HighlightItem[];
    items_per_row: number;
    icon_style: 'filled' | 'outline';
    icon_shape: 'circle' | 'square' | 'rounded';
    alignment: 'left' | 'center' | 'right';
    icon_bg_color: string;
    icon_color: string;
    title_color: string;
    description_color: string;
    background_type: 'solid' | 'gradient' | 'image';
    background_color: string;
    background_image_url?: string;
    image_position?: string;
    image_size?: string;
    overlay_opacity?: number;
    /**
     * Gradient stops for `background_type: 'gradient'`. These live inside
     * settings_json, which the backend stores as an opaque blob, so adding them
     * needed no schema or API change.
     */
    gradient_from?: string;
    gradient_to?: string;
    gradient_angle?: number;
    /**
     * 'grouped' (default) — every item shares one bordered/gradient container,
     * used for compact stat/feature bars.
     * 'individual' — each item gets its own bordered card, used when the block
     * is really a small features grid rather than a single stat strip.
     */
    card_style?: 'grouped' | 'individual';
    /** @deprecated Replaced by the gradient picker; still read for older saved rows. */
    preset?: string;
}

/** Legacy fixed presets, kept only so rows saved before the picker still render. */
const LEGACY_PRESETS: Record<string, { from: string; to: string }> = {
    default: { from: '#F3F0FF', to: '#FFFFFF' },
    'gradient-1': { from: '#E0F2FE', to: '#F0FDFA' },
    'gradient-2': { from: '#FCE7F3', to: '#FFF1F2' },
    'gradient-3': { from: '#EFF6FF', to: '#DBEAFE' },
};

export const DEFAULT_GRADIENT_FROM = '#F3F0FF';
export const DEFAULT_GRADIENT_TO = '#FFFFFF';
export const DEFAULT_GRADIENT_ANGLE = 135;

/**
 * Single source of truth for a highlights block's background, shared by the
 * admin form, its preview modal and the public site — three places that
 * previously each re-derived it and could drift apart.
 */
export function highlightsBackgroundStyle(
    config: Partial<HighlightsSettings>
): React.CSSProperties {
    if (config.background_type === 'image' && config.background_image_url) {
        return {
            backgroundImage: `url(${config.background_image_url})`,
            backgroundSize: config.image_size || 'cover',
            backgroundPosition: config.image_position || 'center',
        };
    }

    if (config.background_type === 'solid') {
        return { backgroundColor: config.background_color || '#FFFFFF' };
    }

    // Gradient (the default). A row saved before the picker existed carries a
    // `preset` id instead of stops — map it across rather than losing the look.
    const legacy = config.preset ? LEGACY_PRESETS[config.preset] : undefined;
    const from = config.gradient_from || legacy?.from || DEFAULT_GRADIENT_FROM;
    const to = config.gradient_to || legacy?.to || DEFAULT_GRADIENT_TO;
    const angle = config.gradient_angle ?? DEFAULT_GRADIENT_ANGLE;
    return { backgroundImage: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)` };
}

export const DEFAULT_HIGHLIGHTS: HighlightsSettings = {
    page_slug: 'home',
    instance: 1,
    items: [
        { id: '1', icon: 'Calendar', title: '1000+ Templates', description: 'For every occasion' },
        { id: '2', icon: 'Sliders', title: 'Easy Customization', description: 'Make it your own' },
        { id: '3', icon: 'Monitor', title: 'Preview Before Use', description: 'See how it looks' },
        { id: '4', icon: 'RefreshCw', title: 'Regular Updates', description: 'New templates added' },
        { id: '5', icon: 'Upload', title: 'One Click Import', description: 'Ready in seconds' },
        { id: '6', icon: 'HelpCircle', title: '24/7 Support', description: 'We\'re here to help' },
    ],
    items_per_row: 6,
    icon_style: 'filled',
    icon_shape: 'circle',
    alignment: 'center',
    icon_bg_color: '#F3F0FF',
    icon_color: '#6C5DD3',
    title_color: '#1F2937',
    description_color: '#6B7280',
    background_type: 'gradient',
    background_color: '#FFFFFF',
    overlay_opacity: 20,
    gradient_from: DEFAULT_GRADIENT_FROM,
    gradient_to: DEFAULT_GRADIENT_TO,
    gradient_angle: DEFAULT_GRADIENT_ANGLE,
    card_style: 'grouped',
};

export function useHighlights(pageSlug: string, instance: number = 1) {
    return useQuery({
        queryKey: ['website-builder-highlights', pageSlug, instance],
        queryFn: async () => {
            let localData: any = null;
            try {
                const stored = typeof window !== 'undefined' ? localStorage.getItem(`highlights_map_${pageSlug}_${instance}`) : null;
                if (stored) localData = JSON.parse(stored);
            } catch (e) {}

            try {
                const res = await apiClient.get(`/website-builder/highlights?page_slug=${pageSlug}&instance=${instance}`);
                const apiResult = res.data?.data || (res.data && typeof res.data === 'object' && res.data.items ? res.data : null);
                if (apiResult) {
                    return { ...DEFAULT_HIGHLIGHTS, ...localData, ...apiResult, page_slug: pageSlug, instance };
                }
            } catch (e) {}

            if (localData) {
                return { ...DEFAULT_HIGHLIGHTS, ...localData, page_slug: pageSlug, instance };
            }

            return { ...DEFAULT_HIGHLIGHTS, page_slug: pageSlug, instance };
        },
    });
}

export function useSaveHighlights() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: HighlightsSettings) => {
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(`highlights_map_${payload.page_slug}_${payload.instance}`, JSON.stringify(payload));
                }
            } catch (e) {}

            const res = await apiClient.put('/website-builder/highlights', payload);
            return res.data;
        },
        onSuccess: (_, variables) => {
            toast.success('Highlights customization saved successfully!');
            queryClient.invalidateQueries({
                queryKey: ['website-builder-highlights', variables.page_slug, variables.instance],
            });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'Failed to save highlights');
        },
    });
}
