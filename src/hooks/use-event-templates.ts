import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/**
 * Invitation Templates — the super admin's template catalogue.
 *
 * NOT the Website Builder's `company_templates`, which is a tenant's WEBSITE
 * theme. This is the design a client's event invitation is rendered from.
 *
 * Backend: `/api/v1/event-templates` (eventTemplate.service.js).
 */

/* ------------------------------------------------------------------ types -- */

/**
 * The component vocabulary, in the order the wizard first offers it.
 *
 * This list MUST stay identical to `COMPONENT_KEYS` in the backend service —
 * the backend drops any key it does not recognise, so a key that exists only
 * here is silently discarded on save with no error anywhere.
 */
export const COMPONENT_KEYS = [
    'event_title',
    'host_names',
    'date_time',
    'venue',
    'event_qr_code',
    'organizer',
    'event_photos',
    'contact_details',
    'invitation_message',
    'footer_note',
    'decoration_elements',
] as const;

export type ComponentKey = (typeof COMPONENT_KEYS)[number];

export const COMPONENT_LABELS: Record<ComponentKey, string> = {
    event_title: 'Event Title',
    host_names: 'Host / Couple Names',
    date_time: 'Date & Time',
    venue: 'Venue',
    event_qr_code: 'Event QR Code',
    organizer: 'Organizer / Hosted By',
    event_photos: 'Event Photos',
    contact_details: 'Contact Details',
    invitation_message: 'Invitation Message',
    footer_note: 'Footer (Thanks / Note)',
    decoration_elements: 'Decoration Elements',
};

/**
 * What the wizard SHOWS for the eleven components (Jamal, 2026-10-05): the
 * same eight switches the mobile app and the client portal offer, plus
 * Decoration Elements, which only the admin decides.
 *
 * A group that covers two components reads on when either is on, sets both,
 * and moves as one chip in Component Order. What is STORED is unchanged — the
 * eleven keys — so nothing saved before this needs converting.
 */
export const COMPONENT_GROUPS: {
    id: string;
    label: string;
    keys: ComponentKey[];
    /** Step 4's line under the label. */
    permissionHint: string;
}[] = [
    { id: 'photos', label: 'Event Photos', keys: ['event_photos'], permissionHint: 'Allow clients to add / change photos' },
    { id: 'title_names', label: 'Title & Names', keys: ['event_title', 'host_names'], permissionHint: 'Allow clients to edit the title and host / couple names' },
    { id: 'message', label: 'Invitation Message', keys: ['invitation_message'], permissionHint: 'Allow clients to edit invitation message' },
    { id: 'date_time', label: 'Date & Time', keys: ['date_time'], permissionHint: 'Allow clients to edit date & time' },
    { id: 'venue', label: 'Venue', keys: ['venue'], permissionHint: 'Allow clients to edit venue' },
    { id: 'qr', label: 'Event QR Code', keys: ['event_qr_code'], permissionHint: 'Allow clients to show / hide QR code' },
    { id: 'organizer_contact', label: 'Organizer & Contact', keys: ['organizer', 'contact_details'], permissionHint: 'Allow clients to edit organizer and contact details' },
    { id: 'footer', label: 'Footer (Thanks / Note)', keys: ['footer_note'], permissionHint: 'Allow clients to edit footer text' },
    { id: 'decorations', label: 'Decoration Elements', keys: ['decoration_elements'], permissionHint: 'Allow clients to change decorations' },
];

/**
 * A stored component order (eleven keys) read as the groups, in the order
 * they appear — a group sits where its first component is.
 */
export function groupsInOrder(order: readonly ComponentKey[]) {
    const seen: typeof COMPONENT_GROUPS = [];
    for (const key of order) {
        const group = COMPONENT_GROUPS.find((g) => g.keys.includes(key));
        if (group && !seen.includes(group)) seen.push(group);
    }
    // Anything the order left out goes last, so no group can vanish.
    for (const group of COMPONENT_GROUPS) if (!seen.includes(group)) seen.push(group);
    return seen;
}

/**
 * Step 4 covers the same components PLUS three whole-design aspects that are
 * not components in their own right — you cannot toggle "Colors" on in step 3,
 * because every template has colours.
 */
export const PERMISSION_KEYS = ['background', 'colors', 'fonts', ...COMPONENT_KEYS] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
    background: 'Background (Image / Color)',
    colors: 'Colors (Theme)',
    fonts: 'Fonts',
    ...COMPONENT_LABELS,
};

export const PERMISSION_HINTS: Record<PermissionKey, string> = {
    background: 'Allow clients to change background',
    colors: 'Allow clients to change colors',
    fonts: 'Allow clients to change fonts',
    event_title: 'Allow clients to edit event title',
    host_names: 'Allow clients to edit host / couple names',
    date_time: 'Allow clients to edit date & time',
    venue: 'Allow clients to edit venue',
    event_qr_code: 'Allow clients to show / hide QR code',
    organizer: 'Allow clients to edit organizer',
    event_photos: 'Allow clients to add / change photos',
    contact_details: 'Allow clients to edit contact details',
    invitation_message: 'Allow clients to edit invitation message',
    footer_note: 'Allow clients to edit footer text',
    decoration_elements: 'Allow clients to change decorations',
};

export const TEMPLATE_STYLES = [
    { value: 'classic', label: 'Classic' },
    { value: 'floral', label: 'Floral' },
    { value: 'royal', label: 'Royal' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'modern', label: 'Modern' },
    { value: 'traditional', label: 'Traditional' },
] as const;

/**
 * The styles with a bespoke Step 2 field arrangement / gradient palette below
 * — NOT the list shown to the admin. The Layout Style buttons in the wizard
 * render from the live `template_categories` table (`styleOptions`), so a
 * category added there needs no change here to work: `layoutStyle` below
 * falls back to `classic`'s fields and presets for any slug not listed in
 * this set. Add an entry here only when a category is getting its own
 * dedicated Step 2 design, not just to make it "exist".
 */
export const LAYOUT_STYLES = [
    { value: 'classic', label: 'Classic' },
    { value: 'modern', label: 'Modern' },
    { value: 'elegant', label: 'Elegant' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'traditional', label: 'Traditional' },
] as const;

export const BACKGROUND_TYPES = [
    { value: 'color', label: 'Color' },
    { value: 'image', label: 'Image' },
    { value: 'gradient', label: 'Gradient' },
    { value: 'custom', label: 'Custom' },
] as const;

export const DIMENSIONS = [
    { value: '1080x1920', label: '1080 x 1920 (Mobile)' },
    { value: '1080x1080', label: '1080 x 1080 (Square)' },
    { value: '1200x1600', label: '1200 x 1600 (Print)' },
    { value: '1920x1080', label: '1920 x 1080 (Web)' },
    { value: '2480x3508', label: '2480 x 3508 (A4 Print)' },
] as const;

export const FONT_OPTIONS = [
    'Playfair Display',
    'Poppins',
    'Great Vibes',
    'Cormorant Garamond',
    'Montserrat',
    'Lora',
    'Cinzel',
    'Dancing Script',
    'Marcellus',
    'Inter',
] as const;

export const DECORATION_OPTIONS = [
    { value: 'roses', label: 'Roses' },
    { value: 'gold-leaf', label: 'Gold Leaf' },
    { value: 'greenery', label: 'Greenery' },
    { value: 'sparkle', label: 'Sparkle' },
    { value: 'mandala', label: 'Mandala' },
    { value: 'ribbon', label: 'Ribbon' },
] as const;

export const GRADIENT_TYPES = [
    { value: 'linear', label: 'Linear' },
    { value: 'radial', label: 'Radial' },
] as const;

/**
 * Which way a linear gradient runs, and the CSS angle each one means.
 *
 * The supplied design showed five arrows (→ ← ↑ ↗ ↖). The downward three are
 * here too, because the preview's existing default runs DOWN — without them
 * every gradient template already saved would have a direction no control could
 * represent, and the picker would show nothing selected.
 *
 * MUST stay identical to `GRADIENT_DIRECTIONS` in the backend service.
 */
export const GRADIENT_DIRECTIONS = [
    { value: 'top', label: 'Up', arrow: '↑', deg: 0 },
    { value: 'top-right', label: 'Up right', arrow: '↗', deg: 45 },
    { value: 'right', label: 'Right', arrow: '→', deg: 90 },
    { value: 'bottom-right', label: 'Down right', arrow: '↘', deg: 135 },
    { value: 'bottom', label: 'Down', arrow: '↓', deg: 180 },
    { value: 'bottom-left', label: 'Down left', arrow: '↙', deg: 225 },
    { value: 'left', label: 'Left', arrow: '←', deg: 270 },
    { value: 'top-left', label: 'Up left', arrow: '↖', deg: 315 },
] as const;

export const IMAGE_SHAPES = [
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'square', label: 'Square' },
    { value: 'circle', label: 'Circle' },
    { value: 'heart', label: 'Heart' },
    { value: 'arch', label: 'Arch' },
] as const;

/**
 * The swatch row on Modern's Colour tab.
 *
 * A shortcut, not a constraint — the hex field beside it still accepts anything,
 * and the last tile opens the OS colour picker. These are just the eight starting
 * points somebody reaches for most often.
 */
export const COLOR_PRESETS = [
    '#F9F4E7',
    '#F8D9B0',
    '#F5C6C6',
    '#D9D2F9',
    '#BFD7F2',
    '#C6EBD9',
    '#E4E4E7',
    '#1F2937',
] as const;

/** The Preview Gradient swatch row — one click sets both colours. */
export const GRADIENT_PRESETS = [
    { from: '#FCB7F3', to: '#B7C5FF' },
    { from: '#C7D2FE', to: '#EDE9FE' },
    { from: '#FBCFE8', to: '#FDE68A' },
    { from: '#FDE68A', to: '#FCA5A5' },
    { from: '#A7F3D0', to: '#BFDBFE' },
    { from: '#FDE2E4', to: '#E2ECE9' },
] as const;

/**
 * The nine-way placement grid, shared by `image_position` (Image backgrounds)
 * and `background_position` (Custom backgrounds).
 *
 * One list for both because they mean the same thing. Some layout styles draw
 * it as a 3x3 grid of arrows and others as a dropdown — that is a rendering
 * choice per style, not two different vocabularies.
 *
 * MUST stay identical to `POSITIONS` in the backend service.
 */
export const POSITIONS = [
    { value: 'top-left', label: 'Top left', arrow: '↖' },
    { value: 'top', label: 'Top', arrow: '↑' },
    { value: 'top-right', label: 'Top right', arrow: '↗' },
    { value: 'left', label: 'Left', arrow: '←' },
    { value: 'center', label: 'Center', arrow: '•' },
    { value: 'right', label: 'Right', arrow: '→' },
    { value: 'bottom-left', label: 'Bottom left', arrow: '↙' },
    { value: 'bottom', label: 'Bottom', arrow: '↓' },
    { value: 'bottom-right', label: 'Bottom right', arrow: '↘' },
] as const;

/** Maps 1:1 to CSS `object-fit` / `background-size`. */
export const IMAGE_SCALES = [
    { value: 'cover', label: 'Cover (Fill)', hint: 'Crops image to cover the entire area.' },
    { value: 'contain', label: 'Contain (Fit)', hint: 'Shows the whole image, may leave bars.' },
    { value: 'fill', label: 'Stretch', hint: 'Distorts the image to fill exactly.' },
    { value: 'auto', label: 'Original Size', hint: 'Uses the file’s own dimensions.' },
] as const;

/** Traditional custom backgrounds only. */
export const ARTWORK_STYLES = [
    { value: 'full-bleed', label: 'Full Bleed' },
    { value: 'patterned', label: 'Patterned' },
    { value: 'illustration', label: 'Illustration' },
    { value: 'textured', label: 'Textured' },
] as const;

export type Position = (typeof POSITIONS)[number]['value'];
export type ImageScale = (typeof IMAGE_SCALES)[number]['value'];
export type ArtworkStyle = (typeof ARTWORK_STYLES)[number]['value'];
export type LayoutStyle = (typeof LAYOUT_STYLES)[number]['value'];

/**
 * ── Which controls step 2 offers, per layout style and background type ──
 *
 * A matrix rather than JSX branches. Five layout styles x four background types
 * is twenty combinations; written as nested conditionals that is unreadable and
 * impossible to check against the mockups. Here each cell is a list you can
 * read straight across and compare to the design.
 *
 * ORDER MATTERS — the wizard renders the keys in the order they appear here, so
 * this list is also the layout.
 *
 * What is NOT in here, deliberately: Orientation, Dimension, Primary Font,
 * Secondary Font, Border / Frame Style and Decorations. Those are identical in
 * every mockup, so they are rendered once outside the matrix and cannot drift
 * between styles.
 */
export type Step2Field =
    | 'bg_colors'            // Background Color + Secondary Color
    | 'bg_color_presets'     // "Choose Background Color" — hex + swatch row
    | 'primary_colors'       // Primary Color + Secondary Color (Custom tabs)
    | 'accent_color'         // Secondary Color alone, named for the trim it paints
    | 'overlay'              // Overlay / Shade
    | 'image_overlay'        // the same slider, labelled "Image Overlay"
    | 'image_upload'         // Background Image / Upload Design
    | 'image_position_grid'  // 3x3 arrows
    | 'image_position_menu'  // dropdown
    | 'image_scale'
    | 'gradient_type'
    | 'gradient_direction'
    | 'gradient_2'           // Color 1 + Color 2
    | 'gradient_3'           // Color 1 + Color 2 + Color 3 (optional)
    | 'gradient_presets'
    | 'shape'
    | 'corner_radius'
    | 'artwork_style'
    | 'bg_position_grid'
    | 'bg_position_menu'
    | 'image_size_slider'
    | 'image_size_menu'      // Traditional draws this as a cover/contain menu
    | 'overlay_toggle';      // switch + Overlay Color + Opacity

export const STEP2_FIELDS: Record<LayoutStyle, Record<BackgroundType, Step2Field[]>> = {
    classic: {
        color: ['bg_colors', 'overlay'],
        // No colour fields on Image or Custom (Jamal, 2026-10-06): the picture
        // IS the background, like the other four styles' tabs. The accent the
        // words are drawn in comes from the style picked in Step 1.
        image: ['image_upload', 'overlay'],
        gradient: ['gradient_type', 'gradient_direction', 'gradient_2', 'accent_color', 'overlay', 'gradient_presets'],
        custom: ['image_upload', 'shape', 'corner_radius', 'overlay'],
    },
    elegant: {
        color: ['bg_colors', 'overlay'],
        image: ['image_upload', 'image_position_menu', 'image_scale', 'image_overlay'],
        gradient: ['gradient_type', 'gradient_direction', 'gradient_3', 'gradient_presets', 'overlay'],
        custom: ['image_upload', 'shape', 'bg_position_grid', 'image_size_slider', 'overlay_toggle'],
    },
    minimal: {
        color: ['bg_colors', 'overlay'],
        image: ['image_upload', 'image_position_menu', 'image_scale', 'image_overlay'],
        gradient: ['gradient_type', 'gradient_direction', 'gradient_3', 'gradient_presets', 'overlay'],
        custom: ['image_upload', 'bg_position_menu', 'image_size_slider', 'overlay_toggle', 'shape'],
    },
    traditional: {
        color: ['bg_colors', 'overlay'],
        image: ['image_upload', 'image_position_grid', 'image_scale', 'image_overlay'],
        gradient: ['gradient_type', 'gradient_direction', 'gradient_3', 'gradient_presets', 'overlay'],
        custom: ['image_upload', 'artwork_style', 'bg_position_grid', 'image_size_menu', 'overlay_toggle'],
    },
    /**
     * Built from the supplied Modern screens — all four tabs.
     *
     * It is the least like the others: the only Colour tab with a swatch row and
     * a position control, and the only style using the position GRID on its
     * Image tab while Elegant and Minimal use the dropdown.
     */
    modern: {
        // Modern's Colour tab is its own thing: a swatch row instead of a plain
        // hex pair, and the overlay as a switch rather than a bare slider.
        // No position control: a flat colour has nothing to position, and its
        // thumbnail drew a leftover image on the Colour tab.
        color: ['bg_color_presets', 'overlay_toggle'],
        // Grid, not the dropdown the other styles use — Modern's screens put the
        // compass beside the thumbnail on both the Image and Custom tabs.
        image: ['image_upload', 'image_position_grid', 'image_scale', 'image_overlay'],
        gradient: ['gradient_type', 'gradient_direction', 'gradient_3', 'gradient_presets', 'overlay'],
        custom: ['image_upload', 'shape', 'bg_position_grid', 'image_size_slider', 'overlay_toggle'],
    },
};

/**
 * Preset swatch rows, per layout style.
 *
 * Each mockup shows a palette that suits its style — Minimal's are pale,
 * Traditional's are deep reds and golds. One shared list would make the
 * presets useless for at least two styles.
 */
export const GRADIENT_PRESETS_BY_STYLE: Record<LayoutStyle, readonly { from: string; to: string }[]> = {
    classic: GRADIENT_PRESETS,
    modern: GRADIENT_PRESETS,
    elegant: [
        { from: '#4B1D6D', to: '#8E2DE2' },
        { from: '#0F2027', to: '#2C5364' },
        { from: '#7B4397', to: '#DC2430' },
        { from: '#F7971E', to: '#FFD200' },
        { from: '#1A2A6C', to: '#B21F1F' },
        { from: '#11998E', to: '#38EF7D' },
        { from: '#0B0B14', to: '#3A1C71' },
        { from: '#5B247A', to: '#1BCEDF' },
        { from: '#FCB7F3', to: '#B7C5FF' },
        { from: '#C7D2FE', to: '#EDE9FE' },
    ],
    minimal: [
        { from: '#FFF3F8', to: '#F3E8FF' },
        { from: '#E8F5E9', to: '#D7F5E3' },
        { from: '#FFF7E8', to: '#FDE8D7' },
        { from: '#F5F5F4', to: '#E7E5E4' },
        { from: '#E8F0FE', to: '#D7E3FC' },
        { from: '#EDE9FE', to: '#DDD6FE' },
    ],
    traditional: [
        { from: '#8B1E3F', to: '#F7C873' },
        { from: '#6D1B3E', to: '#B8336A' },
        { from: '#2D5016', to: '#D4AF37' },
        { from: '#1A1A2E', to: '#D4AF37' },
        { from: '#7B2D8E', to: '#E94E77' },
        { from: '#0F4C5C', to: '#5F9EA0' },
        { from: '#FFF4D6', to: '#F0C674' },
    ],
};

/**
 * What a Template Style LOOKS like — its starting colours, gradient and fonts.
 *
 * `template_categories` stores a name and a slug and nothing visual, so Step 1's
 * style tiles had nothing to draw and picking one changed nothing on the
 * preview. This is the missing half: the tile draws this look, and picking a
 * style on a NEW template fills Step 2 with it (every value stays editable).
 *
 * Same palettes as the sample templates seeder, so "Classic" here is the
 * Classic the clients already see. Fonts are from the ten built in, so a look
 * never names a font the database may not have. A category whose slug is not
 * listed uses `STYLE_LOOK_FALLBACK`.
 */
export interface StyleLook {
    background_color: string;
    secondary_color: string;
    gradient_from: string;
    gradient_via: string;
    gradient_to: string;
    primary_font: string;
    secondary_font: string;
}

export const STYLE_LOOK_FALLBACK: StyleLook = {
    background_color: '#FFF7F0', secondary_color: '#88860B',
    gradient_from: '#FFF7F0', gradient_via: '', gradient_to: '#F3E8DA',
    primary_font: 'Playfair Display', secondary_font: 'Poppins',
};

export const STYLE_LOOKS: Record<string, StyleLook> = {
    classic: {
        background_color: '#FFF8EF', secondary_color: '#9C6B1F',
        gradient_from: '#FCE8D5', gradient_via: '', gradient_to: '#F6D9E4',
        primary_font: 'Playfair Display', secondary_font: 'Lora',
    },
    royal: {
        background_color: '#14213D', secondary_color: '#E0B03A',
        gradient_from: '#0B1736', gradient_via: '#3B2A6B', gradient_to: '#7A1F3D',
        primary_font: 'Great Vibes', secondary_font: 'Cinzel',
    },
    minimal: {
        background_color: '#FAFAF7', secondary_color: '#2F3A4A',
        gradient_from: '#F4F1EA', gradient_via: '', gradient_to: '#E3ECF2',
        primary_font: 'Cormorant Garamond', secondary_font: 'Inter',
    },
    elegant: {
        background_color: '#2B1B3D', secondary_color: '#D9B26A',
        gradient_from: '#3A1F5C', gradient_via: '#7B3FA0', gradient_to: '#E7A977',
        primary_font: 'Great Vibes', secondary_font: 'Cormorant Garamond',
    },
    traditional: {
        background_color: '#7A1220', secondary_color: '#E6BE5A',
        gradient_from: '#7A1220', gradient_via: '#B5451F', gradient_to: '#F2C66B',
        primary_font: 'Dancing Script', secondary_font: 'Marcellus',
    },
    floral: {
        background_color: '#FFF1F3', secondary_color: '#B4536B',
        gradient_from: '#FFE4EA', gradient_via: '', gradient_to: '#E6F3E6',
        primary_font: 'Dancing Script', secondary_font: 'Poppins',
    },
    modern: {
        background_color: '#1F2937', secondary_color: '#F5B94A',
        gradient_from: '#111827', gradient_via: '', gradient_to: '#3B4A63',
        primary_font: 'Montserrat', secondary_font: 'Inter',
    },
};

export const styleLook = (slug: string | null | undefined): StyleLook =>
    STYLE_LOOKS[String(slug ?? '').toLowerCase()] ?? STYLE_LOOK_FALLBACK;

export type GradientType = 'linear' | 'radial';
export type GradientDirection = (typeof GRADIENT_DIRECTIONS)[number]['value'];
export type ImageShape = (typeof IMAGE_SHAPES)[number]['value'];

export type BackgroundType = 'color' | 'image' | 'gradient' | 'custom';
export type Orientation = 'portrait' | 'landscape';
export type PlanAvailability = 'all' | 'selected' | 'trial';
export type PublishStatus = 'draft' | 'published';
export type Audience = 'individual' | 'company';

export interface EventTemplate {
    id: number;
    company_id: number | null;

    // step 1
    name: string;
    code: string;
    event_category_id: number | null;
    /**
     * Step 1's "Template Style" — now a real row in `template_categories`.
     *
     * That table holds the same vocabulary the old hardcoded enum did, and it is
     * also what a frame style is filed under — which is what lets step 2 offer
     * the frames that suit the chosen style.
     */
    template_category_id: number | null;
    /**
     * The category's slug, kept in step with `template_category_id` by the
     * backend. Still here so anything already reading `style` keeps working:
     * send either one and both end up correct.
     */
    style: string;
    tags: string[];
    description: string | null;

    // step 2
    layout_style: string;
    background_type: BackgroundType;
    background_color: string | null;
    secondary_color: string | null;
    background_image: string | null;
    gradient_from: string | null;
    gradient_to: string | null;
    gradient_type: GradientType;
    gradient_direction: GradientDirection;
    /** Custom background only — how the uploaded design is masked. */
    image_shape: ImageShape;
    /** 0-100 percent. Custom background only, and only for rectangle/square. */
    corner_radius: number;
    /** Optional third gradient stop. Null = a two-stop gradient. */
    gradient_via: string | null;
    /** Image background: which part of the picture stays in frame. */
    image_position: Position;
    /** Image background: how the picture fills its box. */
    image_scale: ImageScale;
    /** Custom background: where the uploaded design sits. */
    background_position: Position;
    /** Custom background: percent scale of the uploaded design, 10-400. */
    image_size: number;
    /** Whether the tint is drawn at all — separate from its opacity. */
    overlay_enabled: boolean;
    /** Overlay tint. Null = the black the preview has always used. */
    overlay_color: string | null;
    /** Traditional custom backgrounds only. */
    artwork_style: ArtworkStyle | null;
    overlay_opacity: number;
    orientation: Orientation;
    dimension: string | null;
    primary_font: string | null;
    secondary_font: string | null;
    /**
     * Font sizes as a percentage of the renderer's standard size (60-160,
     * 100 = unchanged). Primary draws the names, Secondary every other line.
     */
    primary_font_size?: number | null;
    secondary_font_size?: number | null;
    /** CSS fallback — used only when no `frame_style_id` is chosen. */
    border_style: string | null;
    /** Step 2's Border / Frame Style — real uploaded artwork. */
    frame_style_id: number | null;
    /** Draw the frame in this one colour; null = the frame's own colours. */
    frame_color?: string | null;
    /** Draw the decorations in this one colour; null = their own colours. */
    decoration_color?: string | null;
    /** Step 2's Decorations — ids into `decorations`, in display order. */
    decoration_ids: number[];
    /**
     * Step 2's Event Logo (2026-11-17): a SAMPLE logo / monogram, where it sits
     * and its size (% of standard). An event shows the host's own logo in this
     * place when they uploaded one. Null image = no logo slot.
     */
    logo_image?: string | null;
    logo_position?: Position;
    logo_size?: number;

    // step 3 — WHETHER a component shows, and WHERE. Two fields on purpose:
    // toggling one off and on again must not send it to the bottom of the list.
    components: Record<ComponentKey, number>;
    component_order: ComponentKey[];

    // step 4
    permissions: Record<PermissionKey, number>;

    // step 5 — there is deliberately no pricing here.
    status: PublishStatus;
    is_active: boolean | number;
    is_featured: boolean | number;
    available_for: Audience[];
    plan_availability: PlanAvailability;
    plan_ids: number[];
    sort_order: number;
    show_on_homepage: boolean | number;
    thumbnail: string | null;

    category?: { id: number; name: string; color: string | null } | null;
    templateCategory?: { id: number; name: string; slug: string } | null;
    frameStyle?: {
        id: number;
        name: string;
        file_url: string | null;
        supported_layouts: string[];
        template_category_id: number | null;
    } | null;
    /**
     * `decoration_ids` resolved to rows, in the stored order.
     *
     * Sent on every read so the preview never has to fetch the decoration list
     * separately just to draw a template it already has.
     */
    decorationItems?: Array<{
        id: number;
        name: string;
        type: string;
        file_url: string | null;
    }>;
    creator?: { id: number; full_name: string } | null;
    updater?: { id: number; full_name: string } | null;

    has_pending_approval?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface EventTemplateStats {
    total: number;
    active: number;
    inactive: number;
    featured: number;
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

export type EventTemplatePayload = Partial<
    Omit<
        EventTemplate,
        'id' | 'company_id' | 'category' | 'creator' | 'updater'
        | 'templateCategory' | 'frameStyle' | 'decorationItems'
        | 'has_pending_approval' | 'created_at' | 'updated_at'
    >
>;

/* -------------------------------------------------------------------- api -- */

const KEY = ['event-templates'];

const api = {
    getAll: async (params?: Record<string, unknown>): Promise<Paginated<EventTemplate>> => {
        const response = await apiClient.get('/event-templates', {
            params: { page: 1, limit: 10, ...params },
        });
        return {
            data: Array.isArray(response.data.data) ? response.data.data : [],
            pagination: response.data.pagination ?? null,
        };
    },
    getStats: async (): Promise<EventTemplateStats> => {
        const response = await apiClient.get('/event-templates/stats');
        return response.data.data?.stats ?? { total: 0, active: 0, inactive: 0, featured: 0 };
    },
    getById: async (id: number | string): Promise<EventTemplate> => {
        const response = await apiClient.get(`/event-templates/${id}`);
        return response.data.data?.template ?? response.data.data;
    },
    create: async (data: EventTemplatePayload): Promise<EventTemplate> => {
        const response = await apiClient.post('/event-templates', data);
        return response.data.data?.template ?? response.data.data;
    },
    update: async ({ id, data }: { id: number; data: EventTemplatePayload }): Promise<EventTemplate> => {
        const response = await apiClient.put(`/event-templates/${id}`, data);
        return response.data.data?.template ?? response.data.data;
    },
    // One column per request — a switch flip must not round-trip the whole row.
    updateStatus: async ({ id, is_active }: { id: number; is_active: boolean }): Promise<EventTemplate> => {
        const response = await apiClient.patch(`/event-templates/${id}/status`, { is_active });
        return response.data.data?.template ?? response.data.data;
    },
    updateFeatured: async ({ id, is_featured }: { id: number; is_featured: boolean }): Promise<EventTemplate> => {
        const response = await apiClient.patch(`/event-templates/${id}/featured`, { is_featured });
        return response.data.data?.template ?? response.data.data;
    },
    duplicate: async (id: number): Promise<EventTemplate> => {
        const response = await apiClient.post(`/event-templates/${id}/duplicate`);
        return response.data.data?.template ?? response.data.data;
    },
    reorder: async (items: Array<{ id: number; sort_order: number }>): Promise<{ updated: number }> => {
        const response = await apiClient.patch('/event-templates/reorder', { items });
        return response.data.data;
    },
    remove: async (id: number): Promise<void> => {
        await apiClient.delete(`/event-templates/${id}`);
    },
};

function templateError(queryClient: ReturnType<typeof useQueryClient>, verb: string) {
    return (error: any) => {
        // An approval-gated action is not a failure — the request was recorded.
        if (isApprovalRequired(error)) {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            return;
        }
        toast.error(error?.response?.data?.message || `Failed to ${verb} template`);
    };
}

/* ------------------------------------------------------------------ hooks -- */

export function useEventTemplates(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: [...KEY, params ?? {}],
        queryFn: () => api.getAll(params),
    });
}

export function useEventTemplateStats() {
    return useQuery({
        queryKey: [...KEY, 'stats'],
        queryFn: api.getStats,
    });
}

export function useEventTemplate(id: number | string | undefined) {
    return useQuery({
        queryKey: ['event-templates', 'detail', id],
        queryFn: () => api.getById(id!),
        enabled: !!id,
    });
}

/**
 * `onSuccess` is a callback rather than a router.push inside the hook —
 * navigation belongs to the component that knows where it wants to go.
 */
export function useCreateEventTemplate(onSuccess?: (template: EventTemplate) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.create,
        onSuccess: (template) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Template created successfully');
            onSuccess?.(template);
        },
        onError: templateError(queryClient, 'create'),
    });
}

export function useUpdateEventTemplate(onSuccess?: (template: EventTemplate) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.update,
        onSuccess: (template, vars) => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['event-templates', 'detail', vars.id] });
            toast.success('Template updated successfully');
            onSuccess?.(template);
        },
        onError: templateError(queryClient, 'update'),
    });
}

export function useUpdateEventTemplateStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
        onError: templateError(queryClient, 'update'),
    });
}

export function useUpdateEventTemplateFeatured() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateFeatured,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' }),
        onError: templateError(queryClient, 'update'),
    });
}

export function useDuplicateEventTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.duplicate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Template duplicated as a draft');
        },
        onError: templateError(queryClient, 'duplicate'),
    });
}

export function useReorderEventTemplates() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.reorder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Template order updated');
        },
        onError: templateError(queryClient, 'reorder'),
    });
}

export function useDeleteEventTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY, refetchType: 'all' });
            toast.success('Template deleted successfully');
        },
        onError: templateError(queryClient, 'delete'),
    });
}

/* ----------------------------------------------------------------- helpers -- */

/** All components on, in catalogue order — the wizard's starting point. */
export const defaultComponents = (): Record<ComponentKey, number> =>
    COMPONENT_KEYS.reduce((acc, k) => ({ ...acc, [k]: 1 }), {} as Record<ComponentKey, number>);

export const defaultPermissions = (): Record<PermissionKey, number> =>
    PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: 1 }), {} as Record<PermissionKey, number>);

/**
 * A stored order can predate a component being added, so it is completed here
 * rather than trusted. Unknown keys are dropped and missing ones appended, so
 * the list always renders every component exactly once.
 */
export const normaliseOrder = (order?: ComponentKey[] | null): ComponentKey[] => {
    const seen: ComponentKey[] = [];
    for (const key of order ?? []) {
        if ((COMPONENT_KEYS as readonly string[]).includes(key) && !seen.includes(key)) seen.push(key);
    }
    for (const key of COMPONENT_KEYS) if (!seen.includes(key)) seen.push(key);
    return seen;
};
