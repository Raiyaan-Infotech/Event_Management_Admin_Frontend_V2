'use client';

import { Bell, ExternalLink, Copy as CopyIcon, Mail, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    NotificationChannel,
    NotificationTemplate,
    TemplateAudience,
    WhatsAppButton,
    WhatsAppHeaderType,
} from '@/hooks/use-notification-templates';

/* ── Labels ────────────────────────────────────────────────────────────── */

export const AUDIENCE_LABELS: Record<TemplateAudience, string> = {
    organizer: 'System to Organizer',
    guest: 'Organizer to Guests',
    participant: 'Organizer to Participants',
    contact_person: 'Organizer to Contact Person',
};

export const AUDIENCES = Object.keys(AUDIENCE_LABELS) as TemplateAudience[];

/** The three channel cards (push is a toggle inside In-app). */
export const MAIN_CHANNELS: { key: NotificationChannel; label: string; hint: string; icon: typeof Mail; tone: string }[] = [
    { key: 'email', label: 'Email', hint: 'Send by email', icon: Mail, tone: 'text-violet-600' },
    { key: 'whatsapp', label: 'WhatsApp', hint: 'Meta-approved template via MSG91', icon: MessageCircle, tone: 'text-emerald-600' },
    { key: 'in_app', label: 'In-App (Push)', hint: 'Notify inside the Event Invite app', icon: Bell, tone: 'text-violet-600' },
];

export const WA_CATEGORY_LABELS = {
    utility: 'Utility (updates the person expects)',
    authentication: 'Authentication (OTP codes)',
    marketing: 'Marketing (promotions)',
} as const;

/** "TMP-2026-0148": readable id shown on the list, view and success screens. */
export const templateCode = (t: Pick<NotificationTemplate, 'id' | 'created_at'>) =>
    `TMP-${new Date(t.created_at || Date.now()).getFullYear()}-${String(t.id).padStart(4, '0')}`;

export const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });
};

export const humanize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* ── Sample values ─────────────────────────────────────────────────────── */

/** Demo values used by every preview when the admin has not typed their own. */
export const DEFAULT_SAMPLES: Record<string, string> = {
    client_name: 'Jamal', organizer: 'Jamal & Fahmi', guest_name: 'Priya',
    email: 'jamal@example.com', temp_password: 'Temp@4821', otp: '482913', otp_minutes: '10',
    reset_code: '739204', account_status: 'activated', login_link: 'https://eventinvit.app/login',
    support_email: 'support@eventinvit.com', device: 'Chrome on Windows', browser: 'Chrome',
    login_time: '24 Nov 2026, 10:24 AM', ip_location: 'Chennai, India',
    old_email: 'old@example.com', new_email: 'new@example.com',
    plan_name: 'Premium', event_date: '20 Dec 2026', event_time: '6:00 PM', booking_id: 'EVB-104583',
    amount: '₹4,999', txn_id: 'TXN-88213', invoice_link: 'https://eventinvit.app/invoice/88213', card_last4: '4242',
    create_event_link: 'https://eventinvit.app/events/create', admin_note: 'Venue closed for maintenance',
    old_plan: 'Free', new_plan: 'Premium', end_date: '31 Dec 2026', addon_name: '500 extra guests',
    usage_percent: '75', usage_used: '750', usage_limit: '1,000', usage_left: '250',
    storage_percent: '75', storage_used: '7.5 GB', storage_limit: '10 GB', storage_left: '2.5 GB',
    max_guests: '500', waiting_count: '12', upgrade_link: 'https://eventinvit.app/billing',
    event_name: 'Jamal & Fahmi Wedding', event_link: 'https://eventinvit.app/e/104583',
    qr_link: 'https://eventinvit.app/qr/104583', sent: '320', delivered: '312', failed: '8',
    total_guests: '350', confirmed: '280', checked_in: '241',
    request_dates: '9 – 12 Dec 2026', request_status: 'approved', message_preview: 'Is parking available?',
    chat_link: 'https://eventinvit.app/chat/55', rsvp_status: 'Attending', guest_count: '2',
    responses_today: '18', reminder_note: 'Call about the hotel booking',
    couple_names: 'Jamal & Fahmi', groom_name: 'Jamal', bride_name: 'Fahmi', venue_name: 'Grand Palace Hall',
    venue_address: 'Anna Salai, Chennai', map_link: 'https://maps.google.com/?q=Grand+Palace+Hall',
    invitation_link: 'https://eventinvit.app/i/8Kq2', contact_phone: '+91 98765 43210',
    queue_position: '4', app_link: 'https://eventinvit.app/app', changes: 'Time moved to 7:00 PM',
    rsvp_link: 'https://eventinvit.app/rsvp/8Kq2', rsvp_deadline: '10 Dec 2026',
    contact_person_name: 'Arun', contact_whatsapp: '+91 98765 43210', responsibilities: 'Guest travel and stay',
    resolution_note: 'Parking is free at the venue', stream_title: 'Wedding Ceremony Live',
    stream_link: 'https://eventinvit.app/live/12', stream_time: '20 Dec 2026, 6:00 PM',
    checkin_time: '6:12 PM', agenda_item: 'Reception', agenda_time: '8:00 PM',
    gallery_link: 'https://eventinvit.app/gallery/104583', downloads_link: 'https://eventinvit.app/downloads/104583',
    file_name: 'Travel guide.pdf', recording_link: 'https://eventinvit.app/live/12/recording',
};

export const PLACEHOLDER_RE = /\{\{\s*(\w+)\s*\}\}/g;

export const sampleFor = (key: string, values?: Record<string, string> | null) =>
    values?.[key] || DEFAULT_SAMPLES[key] || `[${humanize(key)}]`;

/** Replace {{var}} with the sample value. */
export const fillSample = (text: string | null | undefined, values?: Record<string, string> | null) =>
    String(text || '').replace(PLACEHOLDER_RE, (_m, key: string) => sampleFor(key, values));

/** The rich editor writes runs of spaces as &nbsp;, which never wraps: a long line then overflows the email. */
export const normalizeSpaces = (html: string) => html.replace(/&nbsp;| /g, ' ');

/** HTML version: values are escaped before going into the email HTML. */
const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const fillSampleHtml = (html: string | null | undefined, values?: Record<string, string> | null) =>
    normalizeSpaces(String(html || '')).replace(PLACEHOLDER_RE, (_m, key: string) => escapeHtml(sampleFor(key, values)));

/** All placeholders used in the given texts, in order of first use. */
export const placeholdersIn = (...texts: (string | null | undefined)[]) => {
    const out: string[] = [];
    for (const t of texts) {
        for (const m of String(t || '').matchAll(PLACEHOLDER_RE)) {
            if (!out.includes(m[1])) out.push(m[1]);
        }
    }
    return out;
};

/** WhatsApp formatting: *bold* and _italic_, line breaks kept. */
const waFormat = (text: string) =>
    escapeHtml(text)
        .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
        .replace(/_([^_\n]+)_/g, '<em>$1</em>');

/* ── Channel icons for table rows ──────────────────────────────────────── */

export function ChannelIcons({ channels, className }: { channels: NotificationChannel[]; className?: string }) {
    return (
        <div className={cn('flex items-center gap-1.5', className)}>
            {MAIN_CHANNELS.filter((c) => channels.includes(c.key)).map((c) => (
                <c.icon key={c.key} className={cn('h-4 w-4', c.tone)} aria-label={c.label} />
            ))}
        </div>
    );
}

/* ── Previews ──────────────────────────────────────────────────────────── */

export interface EmailPreviewData {
    email_subject?: string | null;
    email_preheader?: string | null;
    email_heading?: string | null;
    email_body?: string | null;
    email_button_label?: string | null;
    email_button_url?: string | null;
    email_footer?: string | null;
}

export function EmailPreview({ data, values }: { data: EmailPreviewData; values?: Record<string, string> | null }) {
    return (
        <div className="overflow-hidden rounded-xl border border-border bg-white text-slate-800 shadow-sm">
            <div className="border-b border-border bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
                <div><span className="font-semibold text-slate-600">Subject:</span> {fillSample(data.email_subject, values) || '—'}</div>
                {data.email_preheader && <div className="truncate">{fillSample(data.email_preheader, values)}</div>}
            </div>
            <div className="flex items-center justify-center gap-2 bg-pink-50 py-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-pink-600 text-white">
                    <Mail className="h-4 w-4" />
                </span>
                <span className="text-lg font-extrabold text-slate-900">Event <span className="text-pink-600">Invite</span></span>
            </div>
            <div className="space-y-3 px-5 py-4 text-[13px] leading-relaxed">
                {data.email_heading && <h3 className="text-[17px] font-bold text-slate-900">{fillSample(data.email_heading, values)}</h3>}
                <div
                    className="space-y-2 [overflow-wrap:anywhere] [&_a]:text-pink-600 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: fillSampleHtml(data.email_body, values) || '<p class="text-slate-400">Email body…</p>' }}
                />
                {data.email_button_label && (
                    <div className="pt-1">
                        <span className="inline-block rounded-lg bg-pink-600 px-5 py-2.5 text-[13px] font-semibold text-white">
                            {fillSample(data.email_button_label, values)}
                        </span>
                    </div>
                )}
                {data.email_footer && (
                    <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">{fillSample(data.email_footer, values)}</p>
                )}
            </div>
        </div>
    );
}

export interface WhatsAppPreviewData {
    whatsapp_header_type?: WhatsAppHeaderType | null;
    whatsapp_header_text?: string | null;
    whatsapp_body?: string | null;
    whatsapp_footer?: string | null;
    whatsapp_buttons?: WhatsAppButton[] | null;
}

export function WhatsAppPreview({ data, values }: { data: WhatsAppPreviewData; values?: Record<string, string> | null }) {
    const buttons = (data.whatsapp_buttons ?? []).filter((b) => b.text);
    return (
        <div className="mx-auto w-full max-w-[290px] rounded-[2rem] border-[6px] border-slate-800 bg-slate-800 shadow-lg">
            <div className="overflow-hidden rounded-[1.6rem] bg-[#efe7dd]">
                <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-[11px] font-bold">EI</span>
                    <div className="leading-tight">
                        <div className="text-[12px] font-semibold">Event Invite</div>
                        <div className="text-[10px] opacity-80">Business account</div>
                    </div>
                </div>
                <div className="min-h-[260px] space-y-1.5 p-3">
                    <div className="rounded-lg rounded-tl-none bg-white p-2.5 text-[12px] leading-snug text-slate-800 shadow-sm">
                        {data.whatsapp_header_type === 'text' && data.whatsapp_header_text && (
                            <div className="mb-1 font-bold">{fillSample(data.whatsapp_header_text, values)}</div>
                        )}
                        <div
                            className="whitespace-pre-wrap break-words"
                            dangerouslySetInnerHTML={{ __html: waFormat(fillSample(data.whatsapp_body, values)) || '<span class="text-slate-400">Message body…</span>' }}
                        />
                        {data.whatsapp_footer && <div className="mt-1.5 text-[10px] text-slate-500">{data.whatsapp_footer}</div>}
                        <div className="mt-1 text-right text-[9px] text-slate-400">10:24 AM</div>
                    </div>
                    {buttons.map((b, i) => (
                        <div key={i} className="flex items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-[12px] font-medium text-sky-600 shadow-sm">
                            {b.type === 'copy_code' ? <CopyIcon className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                            {b.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export interface InAppPreviewData {
    title?: string | null;
    content?: string | null;
    image_url?: string | null;
    push?: boolean;
}

export function InAppPreview({ data, values }: { data: InAppPreviewData; values?: Record<string, string> | null }) {
    const title = fillSample(data.title, values) || 'Notification title';
    const body = fillSample(data.content, values) || 'Short message…';
    return (
        <div className="mx-auto w-full max-w-[290px] rounded-[2rem] border-[6px] border-slate-800 bg-gradient-to-b from-violet-100 to-pink-100 p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-center gap-1.5 pt-2 text-sm font-extrabold text-slate-900">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-pink-600 text-white"><Bell className="h-3.5 w-3.5" /></span>
                Event <span className="text-pink-600">Invite</span>
            </div>
            <div className="mb-1 text-[11px] font-semibold text-slate-600">In-app notification</div>
            <div className="flex gap-2.5 rounded-xl bg-white p-2.5 shadow-sm">
                {data.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Bell className="h-4 w-4" /></span>
                )}
                <div className="min-w-0 text-[12px]">
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-900">{title}</span><span className="shrink-0 text-[9px] text-slate-400">Just now</span></div>
                    <p className="mt-0.5 break-words text-slate-600">{body}</p>
                </div>
            </div>
            {data.push !== false && (
                <>
                    <div className="mb-1 mt-3 text-[11px] font-semibold text-slate-600">Push notification</div>
                    <div className="flex gap-2.5 rounded-xl bg-white/90 p-2.5 shadow-sm">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-600 text-white"><Bell className="h-4 w-4" /></span>
                        <div className="min-w-0 text-[12px]">
                            <div className="text-[10px] text-slate-500">Event Invite · now</div>
                            <div className="font-semibold text-slate-900">{title}</div>
                            <p className="line-clamp-2 break-words text-slate-600">{body}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
