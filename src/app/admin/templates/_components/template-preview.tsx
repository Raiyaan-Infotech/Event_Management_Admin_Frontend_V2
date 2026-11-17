'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    COMPONENT_LABELS,
    GRADIENT_DIRECTIONS,
    normaliseOrder,
    type ComponentKey,
    type EventTemplate,
} from '@/hooks/use-event-templates';
import { useLoadedTemplateFonts } from '@/hooks/use-template-fonts';

/**
 * The wizard's Live Preview panel, and the detail page's artwork.
 *
 * It renders SAMPLE content — Rahul & Priya, 24 Dec 2025 — because a template
 * has no event. Every visual decision on the left of the wizard shows up here:
 * background, overlay, fonts, border, and which components appear IN WHAT
 * ORDER. That last one is the point of the drag-and-drop list; without it the
 * ordering control has no visible consequence and reads as decorative.
 */

export type PreviewTemplate = Pick<
    EventTemplate,
    | 'name' | 'style' | 'layout_style' | 'background_type' | 'background_color'
    | 'secondary_color' | 'background_image' | 'gradient_from' | 'gradient_to'
    | 'overlay_opacity' | 'orientation' | 'primary_font' | 'secondary_font'
    | 'border_style' | 'components' | 'component_order'
    | 'gradient_type' | 'gradient_direction' | 'image_shape' | 'corner_radius'
    | 'gradient_via' | 'image_position' | 'image_scale' | 'background_position'
    | 'image_size' | 'overlay_enabled' | 'overlay_color'
    | 'primary_font_size' | 'secondary_font_size' | 'frame_color' | 'decoration_color'
    | 'logo_image' | 'logo_position' | 'logo_size'
> & {
    /**
     * The chosen Frame Style's artwork, drawn OVER the whole card.
     *
     * When present it replaces the CSS `border_style` entirely — a real frame
     * occupies the margin the CSS border would otherwise sit in, and drawing
     * both gives a double edge that neither control asked for.
     */
    frameUrl?: string | null;
    /**
     * The chosen Decorations, resolved. Placed by their `type`.
     *
     * Named `decorationItems`, matching the backend, and NOT `decorations` —
     * that name is already taken on EventTemplate by the legacy string list, so
     * reusing it would make the whole row unassignable to this type.
     */
    decorationItems?: Array<{ id: number; name: string; type: string; file_url: string | null }>;
};

/**
 * The sample QR code: a REAL one (it encodes a sample invitation link), as
 * its 29 x 29 modules in one SVG path. The preview used to draw an icon
 * of a QR code, which read as a cartoon next to the rest of the card. A
 * template has no event, so this stands in for the code the event will get.
 */
const SAMPLE_QR = {
    size: 29,
    path: 'M0 0h7v1h-7zM12 0h1v1h-1zM14 0h2v1h-2zM19 0h1v1h-1zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM10 1h6v1h-6zM17 1h1v1h-1zM19 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM10 2h1v1h-1zM18 2h1v1h-1zM20 2h1v1h-1zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM9 3h2v1h-2zM12 3h2v1h-2zM19 3h2v1h-2zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h1v1h-1zM10 4h2v1h-2zM13 4h3v1h-3zM17 4h3v1h-3zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h1v1h-1zM12 5h1v1h-1zM14 5h2v1h-2zM18 5h3v1h-3zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM11 7h1v1h-1zM15 7h1v1h-1zM17 7h3v1h-3zM0 8h1v1h-1zM2 8h1v1h-1zM4 8h1v1h-1zM6 8h1v1h-1zM9 8h3v1h-3zM17 8h1v1h-1zM20 8h1v1h-1zM24 8h1v1h-1zM27 8h1v1h-1zM3 9h2v1h-2zM7 9h1v1h-1zM9 9h5v1h-5zM16 9h1v1h-1zM20 9h1v1h-1zM22 9h1v1h-1zM25 9h1v1h-1zM28 9h1v1h-1zM0 10h2v1h-2zM3 10h1v1h-1zM6 10h1v1h-1zM8 10h3v1h-3zM14 10h1v1h-1zM18 10h1v1h-1zM20 10h3v1h-3zM26 10h3v1h-3zM2 11h1v1h-1zM5 11h1v1h-1zM7 11h2v1h-2zM12 11h7v1h-7zM20 11h2v1h-2zM24 11h1v1h-1zM27 11h1v1h-1zM3 12h2v1h-2zM6 12h2v1h-2zM9 12h1v1h-1zM12 12h1v1h-1zM14 12h4v1h-4zM19 12h4v1h-4zM25 12h1v1h-1zM27 12h2v1h-2zM1 13h2v1h-2zM7 13h2v1h-2zM10 13h1v1h-1zM12 13h1v1h-1zM14 13h1v1h-1zM16 13h1v1h-1zM21 13h2v1h-2zM25 13h1v1h-1zM28 13h1v1h-1zM1 14h2v1h-2zM4 14h6v1h-6zM13 14h1v1h-1zM17 14h1v1h-1zM23 14h3v1h-3zM27 14h2v1h-2zM0 15h4v1h-4zM5 15h1v1h-1zM8 15h2v1h-2zM12 15h1v1h-1zM15 15h1v1h-1zM17 15h1v1h-1zM19 15h2v1h-2zM25 15h1v1h-1zM27 15h1v1h-1zM0 16h2v1h-2zM3 16h1v1h-1zM6 16h3v1h-3zM11 16h2v1h-2zM16 16h2v1h-2zM20 16h3v1h-3zM25 16h1v1h-1zM27 16h2v1h-2zM5 17h1v1h-1zM7 17h1v1h-1zM12 17h2v1h-2zM16 17h3v1h-3zM20 17h3v1h-3zM25 17h2v1h-2zM28 17h1v1h-1zM0 18h1v1h-1zM6 18h1v1h-1zM10 18h2v1h-2zM14 18h1v1h-1zM17 18h1v1h-1zM20 18h2v1h-2zM27 18h2v1h-2zM1 19h5v1h-5zM9 19h1v1h-1zM11 19h4v1h-4zM17 19h1v1h-1zM19 19h4v1h-4zM25 19h1v1h-1zM27 19h1v1h-1zM0 20h1v1h-1zM3 20h1v1h-1zM6 20h1v1h-1zM8 20h1v1h-1zM10 20h1v1h-1zM14 20h1v1h-1zM17 20h1v1h-1zM20 20h5v1h-5zM8 21h2v1h-2zM12 21h1v1h-1zM14 21h1v1h-1zM16 21h1v1h-1zM20 21h1v1h-1zM24 21h1v1h-1zM26 21h3v1h-3zM0 22h7v1h-7zM11 22h1v1h-1zM13 22h1v1h-1zM18 22h3v1h-3zM22 22h1v1h-1zM24 22h2v1h-2zM27 22h2v1h-2zM0 23h1v1h-1zM6 23h1v1h-1zM10 23h2v1h-2zM16 23h3v1h-3zM20 23h1v1h-1zM24 23h2v1h-2zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM8 24h3v1h-3zM12 24h1v1h-1zM15 24h3v1h-3zM20 24h5v1h-5zM27 24h2v1h-2zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM10 25h2v1h-2zM13 25h1v1h-1zM17 25h2v1h-2zM24 25h1v1h-1zM26 25h3v1h-3zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM8 26h2v1h-2zM11 26h3v1h-3zM21 26h1v1h-1zM23 26h3v1h-3zM28 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM9 27h1v1h-1zM11 27h2v1h-2zM14 27h4v1h-4zM19 27h2v1h-2zM27 27h1v1h-1zM0 28h7v1h-7zM8 28h5v1h-5zM14 28h1v1h-1zM16 28h2v1h-2zM19 28h2v1h-2zM23 28h2v1h-2zM27 28h2v1h-2z',
};

/** Where a corner / side Event Logo sits inside the safe area. */
const LOGO_CORNER: Record<string, string> = {
    'top-left': 'left-0 top-0',
    'top-right': 'right-0 top-0 justify-end',
    left: 'left-0 top-1/2 -translate-y-1/2',
    right: 'right-0 top-1/2 -translate-y-1/2 justify-end',
    'bottom-left': 'left-0 bottom-0',
    'bottom-right': 'right-0 bottom-0 justify-end',
};

const SAMPLE = {
    invite_line: 'YOU ARE INVITED TO',
    occasion: 'THE WEDDING OF',
    hosts: ['Rahul', 'Priya'],
    date: '24 · DEC · 2025',
    time: 'SUNDAY, 06:00 PM',
    venue_name: 'The Grand Palace',
    venue_city: 'Chennai, Tamil Nadu',
    organizer: 'Jamal',
    message: 'Together with our families, we request the honour of your presence.',
    contact: '988699435',
    footer: 'Thank you for being part of our story.',
};

/**
 * `#RRGGBB` to the `r,g,b` triple an rgba() needs.
 *
 * The overlay has to stay an rgba layer rather than a solid colour plus an
 * `opacity` — opacity on the element would fade the decorations sitting inside
 * it too. Returns null for anything unparseable so the caller can fall back to
 * the black the preview has always used.
 */
const hexToRgb = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const m = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/**
 * The layout-style / background-type pairs whose FORM shows the "Overlay on
 * Background" switch.
 *
 * Mirrors STEP2_FIELDS deliberately rather than importing it: this component is
 * also rendered by the client portal, which has no business pulling in the
 * admin wizard's field matrix. Kept to the one fact the preview needs.
 */
const OVERLAY_SWITCH_STYLES = new Set([
    'elegant:custom',
    'minimal:custom',
    'traditional:custom',
    'modern:custom',
]);

/** `#RRGGBB` to a numeric triple. Null for anything unparseable. */
const rgbTriple = (value: string | null | undefined): [number, number, number] | null => {
    const s = hexToRgb(value);
    if (!s) return null;
    const [r, g, b] = s.split(',').map(Number);
    return [r, g, b];
};

/** Alpha-composite `fg` over `bg`, the way the overlay layer actually paints. */
const composite = (
    fg: [number, number, number],
    bg: [number, number, number],
    alpha: number
): [number, number, number] =>
    [0, 1, 2].map((i) => Math.round(fg[i] * alpha + bg[i] * (1 - alpha))) as [number, number, number];

/**
 * WCAG relative luminance. Used only to decide light-vs-dark text, so the
 * gamma-correct version is worth it — the naive (r+g+b)/3 average calls
 * mid-blues light and puts dark text on them.
 */
const luminance = ([r, g, b]: [number, number, number]): number => {
    const f = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** #RRGGBB -> HSL, so a colour can be re-lightened without losing its hue. */
const rgbToHsl = ([r, g, b]: [number, number, number]): [number, number, number] => {
    const R = r / 255, G = g / 255, B = b / 255;
    const max = Math.max(R, G, B), min = Math.min(R, G, B);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h =
        max === R ? ((G - B) / d + (G < B ? 6 : 0))
        : max === G ? (B - R) / d + 2
        : (R - G) / d + 4;
    return [h / 6, s, l];
};

const hslToRgb = ([h, s, l]: [number, number, number]): [number, number, number] => {
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t: number) => {
        let T = t; if (T < 0) T += 1; if (T > 1) T -= 1;
        if (T < 1 / 6) return p + (q - p) * 6 * T;
        if (T < 1 / 2) return q;
        if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6;
        return p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255)) as [number, number, number];
};

/**
 * The admin's accent colour, adjusted only as far as it must be to stay legible
 * on the backdrop it is drawn against.
 *
 * `secondary_color` is used for the invite line, the ampersand, the QR label and
 * every small stroke — and it is a colour the admin chose freely, so nothing
 * stops it landing near the background. A pale khaki accent on an orange card
 * measured 1.4:1: technically rendered, effectively invisible.
 *
 * HUE AND SATURATION ARE PRESERVED. Only lightness moves, and only until the
 * target ratio is met, so the result still reads as the colour that was picked
 * rather than being replaced by a computed one. If neither direction can reach
 * the target the closest attempt wins — better a nudged colour than an unusable
 * one, and a flat swap to black would throw the choice away entirely.
 */
const readableOn = (
    colour: [number, number, number],
    backdrop: [number, number, number],
    target = 4.5
): [number, number, number] => {
    if (contrastRatio(colour, backdrop) >= target) return colour;

    const [h, sat] = rgbToHsl(colour);
    let best = colour;
    let bestRatio = contrastRatio(colour, backdrop);

    // Walk lightness outward in both directions and keep the first value that
    // clears the target, or the strongest seen if none does.
    for (let step = 1; step <= 20; step += 1) {
        for (const l of [0.5 - step * 0.025, 0.5 + step * 0.025]) {
            if (l < 0 || l > 1) continue;
            const candidate = hslToRgb([h, sat, l]);
            const ratio = contrastRatio(candidate, backdrop);
            if (ratio >= target) return candidate;
            if (ratio > bestRatio) { bestRatio = ratio; best = candidate; }
        }
    }
    return best;
};

/** The two inks the invitation is ever drawn in. */
const INK_DARK: [number, number, number] = [58, 44, 34];
const INK_LIGHT: [number, number, number] = [247, 242, 234];

const toHexString = ([r, g, b]: [number, number, number]) =>
    `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;

/** WCAG contrast ratio between two colours. Always >= 1. */
const contrastRatio = (a: [number, number, number], b: [number, number, number]) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** A hex that is missing or malformed must not become `background: undefined`. */
const hex = (value: string | null | undefined, fallback: string) => {
    if (!value) return fallback;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value) ? value : fallback;
};

function backgroundStyle(t: PreviewTemplate): React.CSSProperties {
    const primary = hex(t.background_color, '#FFF7F0');

    /**
     * `custom` paints the uploaded design too, not just `image`.
     *
     * The Custom tab's "Upload Design" writes to the same `background_image`
     * column — it is the same picture, masked to a shape. Without `custom` here
     * the upload would succeed, the file would reach S3, and the preview would
     * show a flat colour: exactly the bug that made the uploader read as broken
     * the first time round.
     */
    if ((t.background_type === 'image' || t.background_type === 'custom') && t.background_image) {
        /**
         * Image and Custom read DIFFERENT position columns.
         *
         * They are separate controls on separate tabs, so a template that has
         * been set up as both must remember both — sharing one column would
         * mean nudging the custom design also moved the photo background.
         */
        const isCustom = t.background_type === 'custom';
        const position = isCustom ? t.background_position : t.image_position;

        /**
         * Custom's Image Size is a percentage; Image's Scale is a CSS keyword.
         * A percentage only means anything for the custom design, so `cover`
         * stays the fallback everywhere else — which is what the preview drew
         * before either control existed.
         */
        const size =
            isCustom && Number(t.image_size) && Number(t.image_size) !== 100
                ? `${Number(t.image_size)}%`
                : (t.image_scale ?? 'cover');

        return {
            backgroundImage: `url(${t.background_image})`,
            backgroundSize: size,
            backgroundPosition: (position ?? 'center').replace(/-/g, ' '),
            backgroundRepeat: 'no-repeat',
        };
    }
    if (t.background_type === 'gradient') {
        const from = hex(t.gradient_from, primary);
        const to = hex(t.gradient_to, hex(t.secondary_color, '#F3E8DA'));

        // The third stop is optional. Omitted entirely when unset, rather than
        // defaulted to a colour — a two-stop gradient and a three-stop gradient
        // whose middle repeats an end are not the same picture.
        const stops = [from, t.gradient_via ? hex(t.gradient_via, from) : null, to]
            .filter(Boolean)
            .join(', ');

        if (t.gradient_type === 'radial') {
            // `circle at center` rather than the default ellipse: an ellipse
            // stretches with the card, so the same template looked like a
            // different gradient in portrait and landscape.
            return { backgroundImage: `radial-gradient(circle at center, ${stops})` };
        }

        // Falls back to 180deg (straight down), which is what every gradient
        // template saved before the Direction control existed already looks like.
        const deg =
            GRADIENT_DIRECTIONS.find((d) => d.value === t.gradient_direction)?.deg ?? 180;
        return { backgroundImage: `linear-gradient(${deg}deg, ${stops})` };
    }
    return { backgroundColor: primary };
}

/**
 * The Custom background's Image Shape, as CSS on the card.
 *
 * Circle and heart are clip-paths; rectangle and square are a corner radius.
 * Arch is a border-radius rather than a clip-path so the frame artwork drawn on
 * top still follows the same silhouette — a clip-path would cut the frame off
 * at a different curve and the two edges would disagree.
 *
 * Only applied for `custom`: the shape control only appears on that tab, and
 * masking a plain colour background to a heart is not something any other tab
 * offers.
 */
function shapeStyle(t: PreviewTemplate): React.CSSProperties {
    if (t.background_type !== 'custom') return {};

    const radius = `${Math.min(Math.max(Number(t.corner_radius) || 0, 0), 100) / 2}%`;

    switch (t.image_shape) {
        case 'circle':
            return { borderRadius: '50%' };
        case 'heart':
            /**
             * Referenced, not inlined.
             *
             * CSS `clip-path: path()` measures in PIXELS, so a heart authored on
             * a 100-unit box renders as a 100px heart in the corner of a 248px
             * card. The SVG clipPath below uses `objectBoundingBox` units, which
             * scale to whatever the card actually is.
             */
            return { clipPath: 'url(#tplHeartClip)' };
        case 'arch':
            return { borderRadius: `999px 999px ${radius} ${radius}` };
        case 'square':
        case 'rectangle':
        default:
            return { borderRadius: radius };
    }
}

const BORDER_CLASS: Record<string, string> = {
    ornate: 'rounded-md border-[3px] border-double',
    corners: 'rounded-none border-2',
    arch: 'rounded-t-[999px] rounded-b-md border-2',
    'floral-top': 'rounded-md border-t-4 border-x border-b',
    none: 'border-0',
};

export function TemplatePreview({
    template,
    className,
    caption,
    bare = false,
}: {
    template: PreviewTemplate;
    className?: string;
    caption?: string;
    /**
     * The card alone — no "Live Preview" header, no Mobile / Web toggle, no
     * captions. For a thumbnail: the caller scales the 248px card down, so a
     * list row shows the SAME drawing as the wizard, not a stand-in.
     */
    bare?: boolean;
}) {
    // Fonts added under Templates → Fonts: declared here so a template that
    // names one is drawn in it on the list, the detail page and the wizard.
    useLoadedTemplateFonts();
    const [device, setDevice] = useState<'mobile' | 'web'>('mobile');

    /**
     * Scale the invitation down until it fits the card.
     *
     * A real invitation is a fixed canvas — 1080x1920 — and everything on it is
     * sized relative to that canvas. The preview was instead laying twelve
     * components out at fixed pixel sizes inside a 248px card and centring them,
     * so as soon as the content was taller than the card it overflowed EQUALLY
     * top and bottom: the invite line disappeared off the top edge, the footer
     * off the bottom, and the frame's rule appeared to cut through the middle of
     * the text. Widening the safe area only made it worse, because it left less
     * room for the same content.
     *
     * Measuring and scaling is what a fixed-canvas design actually needs. A
     * transform does not affect layout, so `scrollHeight` on the inner element
     * stays the UNSCALED height and the measurement cannot feed back into
     * itself.
     */
    const boxRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [fit, setFit] = useState(1);

    const order = normaliseOrder(template.component_order);
    /**
     * The Event Photos sample — three camera icons in boxes — is never drawn
     * (Jamal, 2026-10-06, removed in two steps: first on Colour / Gradient,
     * then everywhere). A template has no photographs to show, and the icons
     * read as a fault on the card. The switch and the stored value are
     * untouched; this is the preview only.
     */
    const on = (key: ComponentKey) => {
        if (key === 'event_photos') return false;
        // Organizer & contact details are rendered together as the unified Contact Us box.
        // If organizer is already enabled, skip contact_details so it doesn't leave an empty spacer.
        if (key === 'contact_details' && !!Number(template.components?.organizer ?? 1)) return false;
        return !!Number(template.components?.[key] ?? 1);
    };

    const accent = hex(template.secondary_color, '#8A6A3B');
    const headingFont = template.primary_font || 'Playfair Display';
    const bodyFont = template.secondary_font || 'Poppins';
    const frameUrl = template.frameUrl || null;
    // Real artwork wins over the CSS fallback — see the note on PreviewTemplate.
    const borderClass = frameUrl
        ? 'border-0'
        : (BORDER_CLASS[template.border_style ?? 'none'] ?? 'border-0');

    /**
     * Where each decoration sits.
     *
     * `type` is a PLACEMENT, which is exactly what this needs — a corner goes in
     * a corner, a top spans the top edge. Anything unplaced (`motif`) is centred
     * behind the content at low opacity rather than dropped, so choosing it still
     * has a visible consequence.
     */
    /**
     * Event Logo (2026-11-17). Top / centre / bottom join the column of content,
     * so the logo can never sit on top of the names; a corner or side pins it
     * there inside the safe area. 18% of the card wide at 100%.
     */
    const logoUrl = template.logo_image || null;
    const logoPos = (template.logo_position ?? 'top') as string;
    const logoInFlow = !!logoUrl && ['top', 'center', 'bottom'].includes(logoPos);
    const logoWidth = `${(18 * Math.min(Math.max(Number(template.logo_size) || 100, 60), 200)) / 100}%`;
    const logoEl = logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logoUrl} alt="" data-event-logo
            className="pointer-events-none block h-auto object-contain"
            style={{ width: logoInFlow ? logoWidth : '100%', maxHeight: logoInFlow ? '22%' : undefined }} />
    ) : null;

    const decorations = template.decorationItems ?? [];
    const placed = (type: string) => decorations.filter((d) => d.type === type && d.file_url);

    /**
     * The safe area for content, as a PERCENTAGE of the card.
     *
     * The frame is artwork stretched over the whole card, so its inner rule sits
     * at a fixed FRACTION of the card — 7.8% in horizontally and 5.9% vertically
     * for the deepest of the seeded frames. The content inset was a fixed `p-5`
     * (20px), which is a different fraction at every card size: 8.1% wide on a
     * 248px mobile card but only 3.8% on a 520px web one. The two agreed nowhere,
     * so applying a frame pushed the rule straight through the text.
     *
     * ⚠ This is applied by ABSOLUTE INSETS, not padding, on purpose. CSS
     * percentage padding resolves against the containing block's WIDTH on all
     * four sides — `padding-top: 8%` on a 9:16 card is 8% of the *width*, which
     * is roughly half what it should be. `top`/`bottom` percentages resolve
     * against height, which is the behaviour this needs.
     */
    const hasTopArt = placed('top').length > 0 || placed('corner').length > 0;
    const hasBottomArt = placed('bottom').length > 0 || placed('corner').length > 0;

    // Frame values clear the deepest rule with room to spare, so a descender or
    // an italic overhang does not touch it.
    /**
     * A Custom template masks the card to a SHAPE, and the words have to stay
     * inside it (Jamal, 2026-10-06: on Heart the text ran outside the shape and
     * was cut off). The rectangle that fits inside each shape, as insets:
     *   heart  — widest a third of the way down, a point at the foot;
     *   circle — the square inside it;
     *   arch   — the curve takes the top corners.
     * Rectangle and square need nothing extra. Same numbers in the admin
     * preview and the client portal card.
     */
    const shapeBox =
        template.background_type === 'custom'
            ? ({
                  heart: { x: 15, top: 16, bottom: 13 },
                  circle: { x: 17, top: 17, bottom: 17 },
                  arch: { x: 11, top: 17, bottom: 6 },
              } as Record<string, { x: number; top: number; bottom: number }>)[template.image_shape ?? ''] ?? null
            : null;
    // A shape leaves less room, so its card may shrink further before giving up.
    const minFit = shapeBox ? 0.3 : 0.45;
    const safeX = Math.max(frameUrl ? 11 : 6, shapeBox?.x ?? 0);
    // 13, not 9 (2026-10-06): many frames carry corner fans, an arch or a
    // head / foot ornament deeper than their rule, and the words ran into them.
    const safeTop = Math.max(frameUrl ? 13 : 4, hasTopArt ? 10 : 0, shapeBox?.top ?? 0);
    const safeBottom = Math.max(frameUrl ? 13 : 4, hasBottomArt ? 10 : 0, shapeBox?.bottom ?? 0);

    // The overlay is a separate layer rather than a filter on the background:
    // a filter would wash out the text sitting on top of it too.
    const overlay = Math.min(Math.max(Number(template.overlay_opacity) || 0, 0), 100) / 100;

    /**
     * The tint colour, and whether it is drawn at all.
     *
     * `overlay_enabled` gates only the styles whose form HAS the switch. On
     * every other layout style the column stays false while the slider is the
     * only control shown — so treating false as "off" everywhere would silently
     * disable the overlay on Classic, where it has always worked. The switch is
     * therefore read as an override that can only ever turn the tint OFF when a
     * form actually offered it.
     */
    const hasOverlaySwitch = OVERLAY_SWITCH_STYLES.has(
        `${template.layout_style ?? 'classic'}:${template.background_type}`
    );
    const overlayOff = template.overlay_enabled === false && hasOverlaySwitch;
    const overlayTint = hexToRgb(template.overlay_color) ?? '0,0,0';
    const overlayDrawn = overlay > 0 && !overlayOff;

    /**
     * The invitation's text colour, derived from what it actually sits on.
     *
     * This was hardcoded to a dark brown, which is right on ivory and illegible
     * on everything else — a deep-purple Elegant template, a near-black Modern
     * one and a deep-red Traditional one all rendered dark-brown-on-dark. The
     * overlay makes it worse, because it darkens the backdrop further without
     * the text knowing.
     *
     * So: work out the backdrop, composite the overlay onto it exactly as the
     * layer below paints it, and pick the ink from the result's luminance.
     */
    const backdrop = ((): [number, number, number] => {
        const base = rgbTriple(hex(template.background_color, '#FFF7F0')) ?? [255, 247, 240];

        if (template.background_type === 'gradient') {
            // Average the stops. A gradient has no single backdrop, and the
            // midpoint is what most of the text sits over.
            const stops = [template.gradient_from, template.gradient_via, template.gradient_to]
                .map((c) => rgbTriple(c ?? null))
                .filter(Boolean) as [number, number, number][];
            if (stops.length) {
                return [0, 1, 2].map((i) =>
                    Math.round(stops.reduce((sum, st) => sum + st[i], 0) / stops.length)
                ) as [number, number, number];
            }
        }

        /**
         * For a photo we cannot know the pixels, and guessing wrong is worse
         * than not guessing: assume a mid tone so the decision falls to the
         * overlay, which is the control that exists precisely to make text
         * readable over an image.
         */
        if (
            (template.background_type === 'image' || template.background_type === 'custom') &&
            template.background_image
        ) {
            return template.background_color ? base : [128, 128, 128];
        }

        return base;
    })();

    const tintTriple = overlayTint.split(',').map(Number) as [number, number, number];
    const effective = overlayDrawn ? composite(tintTriple, backdrop, overlay) : backdrop;

    /**
     * Pick whichever ink actually contrasts more, rather than thresholding the
     * luminance.
     *
     * A threshold gets mid-tones wrong in both directions: at L≈0.31 a
     * "that's light-ish, use light text" rule produced 2.6:1 where the dark ink
     * would have given 4.4:1. Comparing the two candidates is the same amount of
     * work and cannot be miscalibrated.
     *
     * Some mid-tone backdrops cannot reach 4.5:1 with EITHER ink. That is a
     * property of the colour, not a bug to code around — the Overlay / Shade
     * control is the thing that fixes it, which is what it is for.
     */
    const plainInk = [INK_DARK, INK_LIGHT]
        .map((candidate) => ({ candidate, ratio: contrastRatio(candidate, effective) }))
        .sort((a, b) => b.ratio - a.ratio)[0].candidate;

    /**
     * The words follow the Secondary Color (Jamal, 2026-10-06).
     *
     * The names, date and venue were always one of the two fixed inks above,
     * so changing both colours in Step 2 moved the small trim and left every
     * line of real text the same brown — it read as hardcoded. They are now
     * the picked colour, in a shade strong enough to read (7:1, hue kept).
     *
     * The fixed ink stays as the fallback: no colour picked, or a colour that
     * cannot be made readable on this backdrop.
     *
     * The client portal's `invitation-card.tsx` and the app's `designInk` use
     * the same rule — change all three together.
     */
    const pickedAccent = rgbTriple(template.secondary_color);
    const tintedInk = pickedAccent ? readableOn(pickedAccent, effective, 7) : null;
    const ink = toHexString(
        tintedInk && contrastRatio(tintedInk, effective) >= 4.5 ? tintedInk : plainInk
    );

    /**
     * Two accents, deliberately.
     *
     * `accent` stays exactly as picked for the LARGE decorative strokes — the
     * card's own border, where being a little soft is a design choice and where
     * shifting the colour would visibly disagree with the swatch in the form.
     *
     * `accentInk` is the same colour pushed only as far as legibility requires,
     * for anything carrying WORDS: the invite line, the ampersand, the QR label.
     * Those have to be readable before they are on-brand.
     */
    const accentRgb = rgbTriple(accent) ?? [138, 106, 59];
    const accentInk = toHexString(readableOn(accentRgb, effective));
    // Small strokes need to be seen but not read — 3:1, the WCAG bar for
    // non-text UI, rather than the 4.5:1 body-text bar.
    const accentLine = toHexString(readableOn(accentRgb, effective, 3));

    const isLandscape = template.orientation === 'landscape';

    // A "square" or "circle" shape has to make the CARD square, or the mask is
    // drawn on a 9:16 box and both come out as ovals.
    const forcedSquare =
        template.background_type === 'custom' &&
        (template.image_shape === 'square' || template.image_shape === 'circle' || template.image_shape === 'heart');

    // The heart gets a larger card than the other square shapes: so much of a
    // heart's box is outside the shape that the words have little room left.
    const isHeart = template.background_type === 'custom' && template.image_shape === 'heart';

    const frameSize = isHeart
        ? 'w-[340px] max-w-full aspect-square'
        : forcedSquare
        ? 'w-[300px] aspect-square'
        : device === 'web'
            ? 'w-full max-w-[520px] aspect-[16/10]'
            : isLandscape
                ? 'w-full max-w-[420px] aspect-[16/10]'
                : 'w-[248px] aspect-[9/16]';

    const dividerArt = placed('divider')[0] ?? null;

    /** The frame in one colour, when the template names one. */
    const frameTint = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(template.frame_color ?? '')
        ? (template.frame_color as string)
        : null;
    const frameTintId = `frame-tint-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

    // Decoration Color: the decorations in one colour, the same way as the frame.
    const decorationTint = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(template.decoration_color ?? '')
        ? (template.decoration_color as string)
        : null;
    const decorationTintId = `${frameTintId}-decor`;
    const decoStyle = decorationTint ? { filter: `url(#${decorationTintId})` } : undefined;

    /**
     * Font sizes: a percentage of the standard size, per block. The names take
     * the Primary Font's size, every other line of words the Secondary Font's.
     * The QR code and the decoration row are not text and keep their size.
     * `zoom`, not a transform: it resizes the block's layout box too, so the
     * card's fit-to-height still measures the real height.
     */
    const pct = (value: number | null | undefined) => Math.min(Math.max(Number(value) || 100, 60), 160) / 100;
    const blockZoom = (key: ComponentKey) =>
        key === 'host_names'
            ? pct(template.primary_font_size)
            : key === 'event_qr_code' || key === 'decoration_elements'
              ? 1
              : pct(template.secondary_font_size);

    /** One block per component, rendered in `component_order`. */
    /**
     * Type sizes (raised 2026-10-06 — Jamal: "some text is so small"). The
     * small lines were 7-8px on a 248px card, below what reads on a laptop.
     * Everything is now 8.5px or more and the names lead at 32px; a card with
     * too much on it still scales down as one piece (see `fit`).
     */
    const blocks: Record<ComponentKey, React.ReactNode> = {
        event_title: (
            <div className="text-center">
                <div
                    className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: accentInk, fontFamily: bodyFont }}
                >
                    {SAMPLE.invite_line}
                </div>
                <div
                    className="text-[9.5px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: accentInk, fontFamily: bodyFont }}
                >
                    {SAMPLE.occasion}
                </div>
            </div>
        ),
        host_names: (
            <div className="text-center leading-none" style={{ fontFamily: headingFont, color: ink }}>
                <div className="text-[32px] italic">{SAMPLE.hosts[0]}</div>
                <div className="my-0.5 text-[13px]" style={{ color: accentInk }}>
                    &amp;
                </div>
                <div className="text-[32px] italic">{SAMPLE.hosts[1]}</div>
            </div>
        ),
        date_time: (
            <div className="text-center" style={{ fontFamily: bodyFont, color: ink }}>
                <div className="text-[13.5px] font-bold tracking-[0.14em]">{SAMPLE.date}</div>
                <div className="text-[9.5px] tracking-[0.12em] opacity-80">{SAMPLE.time}</div>
            </div>
        ),
        venue: (
            <div className="text-center" style={{ fontFamily: bodyFont, color: ink }}>
                <div className="text-[12px] font-semibold">{SAMPLE.venue_name}</div>
                {/* Words only — no location pin, no phone icon (Jamal, 2026-10-06). */}
                <div className="text-[9.5px] opacity-80">{SAMPLE.venue_city}</div>
            </div>
        ),
        event_qr_code: (
            <div className="flex flex-col items-center gap-0.5">
                <div
                    className="flex h-14 w-14 items-center justify-center rounded-sm border bg-white"
                    style={{ borderColor: accentLine }}
                >
                    {/* Black on white whatever the card's colours are — a tinted
                        or inverted code does not scan. Two modules of quiet
                        zone, inside the white box. */}
                    <svg
                        viewBox={`-2 -2 ${SAMPLE_QR.size + 4} ${SAMPLE_QR.size + 4}`}
                        className="h-full w-full"
                        shapeRendering="crispEdges"
                        aria-label="Sample QR code"
                    >
                        <path d={SAMPLE_QR.path} fill="#111111" />
                    </svg>
                </div>
                {/* No "Event QR Code" label under it (Jamal, 2026-10-06). */}
            </div>
        ),
        organizer: (
            <div
                className="mx-auto flex flex-col items-center rounded-lg px-3.5 py-1.5 text-center shadow-xs"
                style={{
                    backgroundColor: `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.08)`,
                    border: `1.5px solid rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.45)`,
                    boxShadow: `0 2px 8px rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.12)`,
                    minWidth: '150px',
                }}
            >
                <div
                    className="text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ fontFamily: bodyFont, color: accentInk }}
                >
                    Contact Us
                </div>
                <div
                    className="mt-0.5 text-[11px] font-semibold"
                    style={{ fontFamily: bodyFont, color: ink }}
                >
                    {SAMPLE.organizer}
                </div>
                <div
                    className="mt-0.5 text-[9.5px] tracking-wide opacity-80"
                    style={{ fontFamily: bodyFont, color: ink }}
                >
                    {SAMPLE.contact}
                </div>
            </div>
        ),
        // Never drawn — see `on`.
        event_photos: null,
        contact_details: (
            <div
                className="mx-auto flex flex-col items-center rounded-lg px-3.5 py-1.5 text-center shadow-xs"
                style={{
                    backgroundColor: `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.08)`,
                    border: `1.5px solid rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.45)`,
                    boxShadow: `0 2px 8px rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.12)`,
                    minWidth: '150px',
                }}
            >
                <div
                    className="text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ fontFamily: bodyFont, color: accentInk }}
                >
                    Contact Us
                </div>
                <div
                    className="mt-0.5 text-[11px] font-semibold"
                    style={{ fontFamily: bodyFont, color: ink }}
                >
                    {SAMPLE.organizer}
                </div>
                <div
                    className="mt-0.5 text-[9.5px] tracking-wide opacity-80"
                    style={{ fontFamily: bodyFont, color: ink }}
                >
                    {SAMPLE.contact}
                </div>
            </div>
        ),
        invitation_message: (
            <div
                className="px-3 text-center text-[9.5px] italic leading-snug opacity-90"
                style={{ fontFamily: bodyFont, color: ink }}
            >
                {SAMPLE.message}
            </div>
        ),
        footer_note: (
            <div
                className="text-center text-[8.5px] tracking-wide opacity-80"
                style={{ fontFamily: bodyFont, color: ink }}
            >
                {SAMPLE.footer}
            </div>
        ),
        /**
         * A chosen divider decoration is this row: its own line between two
         * sections, with the same gap as any other, placed by Component Order.
         * With no divider chosen the row is the plain rule it always was.
         */
        decoration_elements: dividerArt ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={dividerArt.file_url!} alt="" style={decoStyle} data-tint={decorationTint ?? undefined} className="pointer-events-none mx-auto block w-24 opacity-80" />
        ) : (
            <div className="flex items-center justify-center gap-1.5" style={{ color: accentLine }}>
                <Sparkles className="h-3 w-3" />
                <span className="h-px w-8" style={{ backgroundColor: accentLine }} />
                <Sparkles className="h-3 w-3" />
            </div>
        ),
    };

    // The divider is the Decoration Elements row, so that switch shows and
    // hides it — the client has the same switch.
    /**
     * On a Heart EVERY section that is switched on is drawn, the QR code
     * included (Jamal, 2026-10-06 — an earlier version drew four rows only).
     * They fit because the column is scaled as one piece, and because the
     * text box below is the tallest that stays inside the shape: a heart
     * narrows toward its point, and the rows are centred, so the lower ones
     * have less width but still sit inside it. With many sections on, the
     * words are small — that is the price of the shape, not a fault.
     */
    const visible = order.filter(on);

    /**
     * Recompute the fit whenever anything that changes the content's natural
     * size changes — which components are on, the device tab, the orientation,
     * the fonts, and the card resizing under a responsive layout.
     */
    useLayoutEffect(() => {
        const box = boxRef.current;
        const content = contentRef.current;
        if (!box || !content) return;

        const measure = () => {
            const availH = box.clientHeight;
            const availW = box.clientWidth;
            // scrollHeight/Width are pre-transform, so this is the natural size
            // even while a scale is already applied.
            const naturalH = content.scrollHeight;
            const naturalW = content.scrollWidth;
            if (!availH || !naturalH) return;

            const ratio = Math.min(availH / naturalH, availW / naturalW, 1);
            // Never shrink past legibility. Below this the preview stops being
            // useful and the honest answer is that too much is switched on.
            setFit(Math.max(ratio, minFit));
        };

        measure();
        // Both elements are observed. The box catches a responsive resize; the
        // content catches a reflow the deps cannot see, such as a web font
        // finishing loading and changing every line height at once.
        //
        // This cannot loop: a CSS transform does not change either element's
        // layout box, so applying the scale produces no resize notification.
        const ro = new ResizeObserver(measure);
        ro.observe(box);
        ro.observe(content);
        return () => ro.disconnect();
    }, [
        visible.join(','),
        device,
        template.orientation,
        template.primary_font,
        template.secondary_font,
        template.primary_font_size,
        template.secondary_font_size,
        safeX,
        safeTop,
        safeBottom,
    ]);

    return (
        <div className={cn(!bare && 'space-y-3', className)}>
            <div className={bare ? 'hidden' : 'flex items-center justify-between gap-2'}>
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">Live Preview</span>
                </div>
                <div className="flex rounded-md border border-border p-0.5">
                    {(['mobile', 'web'] as const).map((d) => (
                        <Button
                            key={d}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDevice(d)}
                            className={cn(
                                'h-7 px-3 text-xs capitalize',
                                device === d && 'bg-primary/10 font-semibold text-primary'
                            )}
                        >
                            {d}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Zero-size and aria-hidden: this exists only to be referenced by
                `clip-path` above, and must never take layout space. */}
            <svg width="0" height="0" aria-hidden className="absolute">
                <defs>
                    <clipPath id="tplHeartClip" clipPathUnits="objectBoundingBox">
                        <path d="M0.5,0.97 C0.22,0.76 0.01,0.56 0.01,0.31 C0.01,0.14 0.14,0.03 0.28,0.03
                                 C0.38,0.03 0.46,0.08 0.5,0.16 C0.54,0.08 0.62,0.03 0.72,0.03
                                 C0.86,0.03 0.99,0.14 0.99,0.31 C0.99,0.56 0.78,0.76 0.5,0.97 Z" />
                    </clipPath>
                </defs>
            </svg>

            <div className="flex justify-center">
                <div
                    // Selected by the templates detail page's PNG export — the
                    // card ONLY, not the device toggle or caption around it.
                    data-invitation-card
                    className={cn(
                        'relative overflow-hidden shadow-md',
                        frameSize,
                        borderClass,
                        template.border_style && template.border_style !== 'none' ? 'border-solid' : ''
                    )}
                    style={{
                        ...backgroundStyle(template),
                        ...shapeStyle(template),
                        borderColor: accent,
                    }}
                >
                    {overlay > 0 && !overlayOff && (
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{ backgroundColor: `rgba(${overlayTint},${overlay})` }}
                        />
                    )}

                    {/* Decorations sit UNDER the content: an ornament that covers
                        the couple's names is not a decoration. */}
                    {placed('motif').slice(0, 1).map((d) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img key={d.id} src={d.file_url!} alt="" style={decoStyle} data-tint={decorationTint ?? undefined}
                            className="pointer-events-none absolute left-1/2 top-1/2 w-2/3 -translate-x-1/2 -translate-y-1/2 opacity-20" />
                    ))}
                    {placed('top').slice(0, 1).map((d) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img key={d.id} src={d.file_url!} alt="" style={decoStyle} data-tint={decorationTint ?? undefined}
                            className="pointer-events-none absolute inset-x-0 top-0 w-full" />
                    ))}
                    {placed('bottom').slice(0, 1).map((d) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img key={d.id} src={d.file_url!} alt="" style={decoStyle} data-tint={decorationTint ?? undefined}
                            className="pointer-events-none absolute inset-x-0 bottom-0 w-full" />
                    ))}
                    {/* Up to four corners, mirrored so one uploaded corner fills
                        every corner rather than needing four files. */}
                    {placed('corner').slice(0, 1).map((d) =>
                        ([
                            'left-0 top-0',
                            'right-0 top-0 -scale-x-100',
                            'left-0 bottom-0 -scale-y-100',
                            'right-0 bottom-0 -scale-100',
                        ] as const).map((pos) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img key={`${d.id}-${pos}`} src={d.file_url!} alt="" style={decoStyle} data-tint={decorationTint ?? undefined}
                                className={cn('pointer-events-none absolute w-2/5', pos)} />
                        ))
                    )}
                    {placed('ornament').slice(0, 1).map((d) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img key={d.id} src={d.file_url!} alt="" style={decoStyle} data-tint={decorationTint ?? undefined}
                            className="pointer-events-none absolute inset-x-0 top-0 mx-auto w-3/5" />
                    ))}
                    {/*
                      `divider` is a real, seeded placement — a decoration is
                      genuinely selectable as this type — but had no render
                      branch at all: picking one ticked the checkbox, saved
                      cleanly, and then drew nothing.

                      NOT full width, unlike `top`/`bottom`. A divider is a short
                      centred rule; stretched edge to edge its end ornaments land
                      out at the margins and read as two unrelated shapes floating
                      either side of the content, which is exactly how it looked
                      when it was first drawn that way.
                    */}
                    {/* The divider is NOT drawn here any more (Jamal, 2026-10-06):
                        pinned to the centre of the card it ran straight through
                        whichever line of text happened to be there. It is a row
                        of the content now — see `decoration_elements` in `blocks`. */}

                    {/* The frame is drawn LAST, over the content: it occupies the
                        margin, and a border under the text would be half-hidden by
                        whatever component happens to reach the edge. */}
                    {/*
                      Border Color: an SVG filter floods the frame's own shape
                      with the one colour. A filter, not a CSS mask — a mask
                      needs the image served with CORS headers, which the CDN
                      may not send, and then draws nothing at all.
                    */}
                    {decorationTint ? (
                        <svg width="0" height="0" aria-hidden className="absolute">
                            <defs>
                                <filter id={decorationTintId} colorInterpolationFilters="sRGB">
                                    <feFlood floodColor={decorationTint} result="colour" />
                                    <feComposite in="colour" in2="SourceAlpha" operator="in" />
                                </filter>
                            </defs>
                        </svg>
                    ) : null}
                    {frameUrl && frameTint ? (
                        <svg width="0" height="0" aria-hidden className="absolute">
                            <defs>
                                <filter id={frameTintId} colorInterpolationFilters="sRGB">
                                    <feFlood floodColor={frameTint} result="colour" />
                                    <feComposite in="colour" in2="SourceAlpha" operator="in" />
                                </filter>
                            </defs>
                        </svg>
                    ) : null}
                    {frameUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={frameUrl} alt=""
                            className="pointer-events-none absolute inset-0 z-10 h-full w-full object-fill"
                            style={frameTint ? { filter: `url(#${frameTintId})` } : undefined}
                    data-tint={frameTint ?? undefined} />
                    ) : null}

                    {/* The safe area — see the note on safeX/safeTop above. It
                        keeps content clear of BOTH the frame's inner rule and any
                        edge decoration, at every card size. */}
                    <div
                        ref={boxRef}
                        className="absolute flex items-center justify-center overflow-hidden"
                        style={{
                            left: `${safeX}%`,
                            right: `${safeX}%`,
                            top: `${safeTop}%`,
                            bottom: `${safeBottom}%`,
                        }}
                    >
                        {/* `contentRef` measures the UNSCALED layout; the scale
                            is applied here so the measurement never chases its
                            own result. `w-full` keeps the natural width equal to
                            the safe area, so only genuine overflow shrinks it. */}
                        {/* The sections are spread down the card, not bunched in the
                            middle: a card with seven sections left the top and bottom
                            thirds empty. `min-height` only matters while the content is
                            SHORTER than the card — a taller one still scales to fit.
                            Admin preview and client portal use the same numbers. */}
                        <div
                            ref={contentRef}
                            className="flex w-full flex-col items-center justify-evenly gap-1.5"
                            style={{ minHeight: '86%', transform: `scale(${fit})`, transformOrigin: 'center center' }}
                        >
                            {logoInFlow && logoPos === 'top' && logoEl}
                            {visible.length === 0 && !logoUrl ? (
                                <div className="px-4 text-center text-[10px] text-muted-foreground">
                                    Every component is switched off, so this invitation would render empty.
                                </div>
                            ) : (
                                visible.map((key, i) => (
                                    <div key={key} className="contents">
                                        {logoInFlow && logoPos === 'center' && i === Math.floor(visible.length / 2) && logoEl}
                                        <div style={{ zoom: blockZoom(key) }}>
                                            {blocks[key]}
                                        </div>
                                    </div>
                                ))
                            )}
                            {logoInFlow && (logoPos === 'bottom' || (logoPos === 'center' && visible.length === 0)) && logoEl}
                        </div>
                        {logoUrl && !logoInFlow && (
                            <div className={cn('pointer-events-none absolute z-[5] flex', LOGO_CORNER[logoPos])} style={{ width: logoWidth }}>
                                {logoEl}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!bare && (
                <p className="text-center text-[11px] leading-snug text-muted-foreground">
                    {caption ??
                        `This is a preview of how the template will look on ${device === 'web' ? 'web' : 'mobile'}.`}
                </p>
            )}

            {!bare && visible.length > 0 && (
                <p className="text-center text-[10px] text-muted-foreground">
                    Showing {visible.length} components ·{' '}
                    {order.filter((k) => !on(k) && k !== 'event_photos' && k !== 'contact_details').length > 0
                        ? `${order.filter((k) => !on(k) && k !== 'event_photos' && k !== 'contact_details').map((k) => COMPONENT_LABELS[k]).join(', ')} hidden`
                        : 'all components on'}
                </p>
            )}
        </div>
    );
}
