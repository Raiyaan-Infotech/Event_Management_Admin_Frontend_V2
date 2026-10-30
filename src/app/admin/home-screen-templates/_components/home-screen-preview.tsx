'use client';

import { useState } from 'react';
import {
    ChevronLeft, ChevronRight, BookOpen, CalendarDays, Images, MailCheck,
    MapPin, Users, MessageCircle, Phone, ImageOff,
} from 'lucide-react';
import type { TemplateColor } from '@/hooks/use-home-screen-templates';

/**
 * The mobile app home screen, drawn from the template being edited: the
 * uploaded image on top, then title, date, countdown and the menu grid in the
 * template's OWN colours. The `<` `>` buttons step through sample events so the
 * design can be judged with different text lengths.
 */

const SAMPLES = [
    { title: 'Jamal & Ayesha', subtitle: 'Our Wedding Day', date: '25 Jan 2026', match: /wedding|marriage|engage/i },
    { title: 'Aarav turns 5', subtitle: 'Birthday Celebration', date: '12 Mar 2026', match: /birth/i },
    { title: 'Annual Meet 2026', subtitle: 'Corporate Event', date: '08 Feb 2026', match: /corporate|conference|meet/i },
];

const MENUS = [
    { label: 'Our Story', Icon: BookOpen },
    { label: 'Events', Icon: CalendarDays },
    { label: 'Gallery', Icon: Images },
    { label: 'RSVP', Icon: MailCheck },
    { label: 'Venue', Icon: MapPin },
    { label: 'Family', Icon: Users },
    { label: 'Messages', Icon: MessageCircle },
    { label: 'Contact', Icon: Phone },
];

const COUNTDOWN = [
    { value: '25', label: 'Days' },
    { value: '12', label: 'Hours' },
    { value: '30', label: 'Mins' },
    { value: '15', label: 'Secs' },
];

const FALLBACK = {
    primary: '#4F46E5',
    secondary: '#E0E7FF',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#1F2937',
};

export function HomeScreenPreview({
    imageUrl,
    colors,
    categoryName,
}: {
    imageUrl: string | null;
    colors: TemplateColor[];
    /** The selected event category, so the first sample matches it. */
    categoryName?: string;
}) {
    const firstMatch = Math.max(0, SAMPLES.findIndex((s) => categoryName && s.match.test(categoryName)));
    const [offset, setOffset] = useState(0);
    const sample = SAMPLES[(firstMatch + offset + SAMPLES.length * 10) % SAMPLES.length];

    const pick = (key: keyof typeof FALLBACK) =>
        colors.find((c) => c.key === key)?.hex || FALLBACK[key];
    const primary = pick('primary');
    // A role the template does not define falls back to a neighbour of its own
    // palette, not to an unrelated default colour.
    const secondary = colors.some((c) => c.key === 'secondary') ? pick('secondary') : `${primary}22`;
    const accent = colors.some((c) => c.key === 'accent') ? pick('accent') : primary;
    const background = colors.some((c) => c.key === 'background') ? pick('background') : '#FFFFFF';
    const text = colors.some((c) => c.key === 'text') ? pick('text') : '#1F2937';

    const step = (by: number) => setOffset((o) => o + by);

    return (
        <div className="flex items-center justify-center gap-3 sm:gap-6">
            <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous sample"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:bg-muted"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Phone */}
            <div className="w-[230px] shrink-0 rounded-[2.4rem] border-[9px] border-neutral-900 bg-neutral-900 shadow-xl sm:w-[250px]">
                <div
                    className="relative flex aspect-[9/19] flex-col overflow-hidden rounded-[1.8rem]"
                    style={{ backgroundColor: background }}
                >
                    {/* notch */}
                    <span className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-neutral-900" />

                    {/* image */}
                    <div className="relative h-[52%] w-full shrink-0">
                        {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1" style={{ backgroundColor: secondary }}>
                                <ImageOff className="h-6 w-6" style={{ color: primary }} />
                                <span className="text-[10px]" style={{ color: text }}>Home screen image</span>
                            </div>
                        )}
                        {/* fade into the screen colour */}
                        <div
                            className="absolute inset-x-0 bottom-0 h-1/3"
                            style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${background})` }}
                        />
                    </div>

                    {/* content */}
                    <div className="-mt-6 flex min-h-0 flex-1 flex-col items-center px-3 text-center">
                        <p className="relative w-full break-words font-serif text-[17px] font-bold leading-tight" style={{ color: primary }}>
                            {sample.title}
                        </p>
                        <p className="mt-0.5 text-[9.5px]" style={{ color: text }}>{sample.subtitle}</p>
                        <span
                            className="mt-1.5 rounded-full border px-3 py-0.5 text-[10px] font-semibold"
                            style={{ borderColor: accent, color: text }}
                        >
                            {sample.date}
                        </span>

                        <div className="mt-2 grid w-full grid-cols-4 gap-1">
                            {COUNTDOWN.map((c) => (
                                <div key={c.label} className="flex flex-col items-center">
                                    <span className="text-[13px] font-bold leading-none" style={{ color: text }}>{c.value}</span>
                                    <span className="mt-0.5 text-[8px]" style={{ color: text, opacity: 0.7 }}>{c.label}</span>
                                </div>
                            ))}
                        </div>

                        <span className="my-2 h-px w-3/4" style={{ backgroundColor: accent, opacity: 0.5 }} />

                        <div className="grid w-full grid-cols-4 gap-x-1 gap-y-1.5">
                            {MENUS.map(({ label, Icon }) => (
                                <div key={label} className="flex min-w-0 flex-col items-center">
                                    <span
                                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                                        style={{ backgroundColor: secondary, border: `1px solid ${accent}55` }}
                                    >
                                        <Icon className="h-3.5 w-3.5" style={{ color: primary }} />
                                    </span>
                                    <span className="mt-0.5 w-full truncate text-[7.5px]" style={{ color: text }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next sample"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:bg-muted"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}
