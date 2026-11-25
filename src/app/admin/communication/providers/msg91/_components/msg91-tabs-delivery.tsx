'use client';

import * as React from 'react';
import {
    AlertTriangle, CheckCircle2, Copy, ExternalLink, Link2, Loader2, Mail, Plus, RefreshCw, Search, Send,
    ShieldCheck, Trash2, Truck, Activity, X, XCircle, FlaskConical, Pencil,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
    EmailTemplateMap, Msg91Alerts, Msg91Config, Msg91Dlt, Msg91Email, Msg91Webhook, SmsTemplate, WebhookEvent,
} from '@/hooks/use-msg91-config';
import {
    Check, Field, InfoNote, LANG_OPTIONS, NumberInput, Pill, Section, SelectInput, TextInput, Toggle, ToggleRow,
    formatDateTime, grid2, grid3,
} from './msg91-ui';
import { senderOptions } from './msg91-tabs-setup';

type TabProps<T> = { value: T; onChange: (next: T) => void };

const toKey = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success('Copied'));

/* ── 6. DLT Template Mapping ─────────────────────────────────────────────── */

const CATEGORY_LABEL: Record<SmsTemplate['category'], string> = { transactional: 'Transactional', promotional: 'Promotional', service: 'Service', otp: 'OTP' };
const blankTemplate = (): SmsTemplate => ({ name: '', key: '', msg91_template_id: '', dlt_template_id: '', sender_id: '', category: 'transactional', language: 'en', variables: '' });

/** A row can send only when it has both IDs and a sender. */
const mapStatus = (t: SmsTemplate) => (t.msg91_template_id && t.dlt_template_id && t.sender_id ? 'mapped' : 'incomplete');

const LANG_LABEL = Object.fromEntries(LANG_OPTIONS.map((l) => [l.value, l.label])) as Record<string, string>;
const CATEGORY_TONE = { transactional: 'blue', promotional: 'violet', service: 'amber', otp: 'green' } as const;

/** Add / edit one SMS mapping (opened from "Map New Template" or a row's pencil). */
function MappingDialog({ initial, senders, onSave, onClose, existingKeys }: {
    initial: SmsTemplate | null; senders: { value: string; label: string }[];
    onSave: (t: SmsTemplate) => void; onClose: () => void; existingKeys: string[];
}) {
    const [t, setT] = React.useState<SmsTemplate>(initial ?? blankTemplate());
    const [err, setErr] = React.useState('');
    const set = (patch: Partial<SmsTemplate>) => { setT((x) => ({ ...x, ...patch })); setErr(''); };
    const submit = () => {
        if (!t.name.trim()) return setErr('Message name is required');
        if (!/^[a-z0-9_]+$/.test(t.key)) return setErr('Internal key: small letters, numbers and _ only');
        if (existingKeys.includes(t.key)) return setErr(`Internal key ${t.key} is already used`);
        if (t.dlt_template_id && !/^\d{10,25}$/.test(t.dlt_template_id)) return setErr('DLT template ID must be 10 to 25 digits');
        if (t.variables && !/^[A-Za-z0-9_, ]*$/.test(t.variables)) return setErr('Variables: names separated by commas');
        onSave({ ...t, name: t.name.trim() });
    };
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{initial ? 'Edit Template Mapping' : 'Map New Template'}</DialogTitle>
                    <DialogDescription>Link one SMS the app sends to its MSG91 template and DLT-approved template.</DialogDescription>
                </DialogHeader>
                <div className={cn(grid2, 'py-2')}>
                    <Field label="Message Name" required>
                        <TextInput autoFocus maxLength={80} value={t.name} placeholder="Event Invite (SMS)"
                            onChange={(e) => set({ name: e.target.value, ...(t.key === '' || t.key === toKey(t.name) ? { key: toKey(e.target.value) } : {}) })} />
                    </Field>
                    <Field label="Internal Key" required hint="How the app's code finds this SMS.">
                        <TextInput className="font-mono text-[12.5px]" maxLength={60} value={t.key} placeholder="event_invite_sms" onChange={(e) => set({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
                    </Field>
                    <Field label="MSG91 Template ID" required hint="MSG91 → SMS → Templates (the ID MSG91 gives it).">
                        <TextInput maxLength={40} value={t.msg91_template_id} placeholder="e.g. 65f1a2b3c4d5e6f7a8b9c0d1" onChange={(e) => set({ msg91_template_id: e.target.value.trim() })} />
                    </Field>
                    <Field label="DLT Template ID" required hint="The number from the DLT portal.">
                        <TextInput maxLength={25} inputMode="numeric" value={t.dlt_template_id} placeholder="e.g. 1207165489321056748" onChange={(e) => set({ dlt_template_id: e.target.value.replace(/\D/g, '') })} />
                    </Field>
                    <Field label="Sender ID" required>
                        <SelectInput value={t.sender_id} onChange={(v) => set({ sender_id: v })} options={senders} placeholder={senders.length ? 'Select sender' : 'No approved sender yet'} />
                    </Field>
                    <Field label="Category">
                        <SelectInput value={t.category} onChange={(v) => set({ category: v as SmsTemplate['category'] })} options={Object.entries(CATEGORY_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
                    </Field>
                    <Field label="Language">
                        <SelectInput value={t.language} onChange={(v) => set({ language: v as SmsTemplate['language'] })} options={LANG_OPTIONS} />
                    </Field>
                    <Field label="Template Variables" hint="Variable names in the template, in order, e.g. VAR1, VAR2.">
                        <TextInput className="font-mono text-[12.5px]" maxLength={200} value={t.variables} placeholder="VAR1, VAR2" onChange={(e) => set({ variables: e.target.value })} />
                    </Field>
                </div>
                {err && <p className="text-[12.5px] font-medium text-rose-600">{err}</p>}
                <DialogFooter>
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">Cancel</button>
                    <button type="button" onClick={submit} className="rounded-lg bg-sky-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-sky-700">{initial ? 'Update' : 'Add'}</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function TemplateMappingTab({ value, onChange, dlt }: TabProps<{ items: SmsTemplate[] }> & { dlt: Msg91Dlt }) {
    const [q, setQ] = React.useState('');
    const [cat, setCat] = React.useState('');
    const [editing, setEditing] = React.useState<number | 'new' | null>(null);
    const items = value.items;
    const setItems = (next: SmsTemplate[]) => onChange({ items: next });
    const senders = senderOptions(dlt, ['T', 'P', 'S', 'O']);
    const mapped = items.filter((t) => mapStatus(t) === 'mapped').length;

    const visible = items
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => (!cat || t.category === cat) && (!q || `${t.name} ${t.key} ${t.dlt_template_id} ${t.msg91_template_id}`.toLowerCase().includes(q.toLowerCase())));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
                <Section title="Mapping Summary">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Mapped', n: mapped, cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
                            { label: 'Incomplete', n: items.length - mapped, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
                            { label: 'Total', n: items.length, cls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
                        ].map((c) => (
                            <div key={c.label} className={cn('rounded-xl px-3 py-2.5', c.cls)}>
                                <div className="text-[12px] font-medium">{c.label} Templates</div>
                                <div className="text-2xl font-bold">{c.n}</div>
                            </div>
                        ))}
                    </div>
                </Section>
                <Section title="Compliance Reminders">
                    <ul className="list-disc space-y-1 pl-4 text-[12.5px] text-slate-600 dark:text-slate-300">
                        <li>Use only DLT-approved templates.</li>
                        <li>The SMS text must match the approved DLT text exactly; only the variables change.</li>
                        <li>MSG91 needs <b>its own template ID</b> to send, plus the DLT template ID it was created from.</li>
                    </ul>
                </Section>
            </div>

            <Section
                title={`DLT Template Mappings (${items.length})`}
                hint="Each SMS the app sends, linked to its MSG91 template and DLT template."
                action={(
                    <button type="button" onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-sky-700">
                        <Plus className="h-4 w-4" /> Map New Template
                    </button>
                )}
            >
                <div className="mb-3 flex flex-wrap gap-3">
                    <div className="relative min-w-[240px] flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <TextInput className="pl-9" placeholder="Search by name, key or template ID…" value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <SelectInput className="w-48" value={cat} onChange={setCat} placeholder="All Categories" options={Object.entries(CATEGORY_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
                </div>
                {items.length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-slate-500">No SMS templates mapped yet. Click <b>Map New Template</b>.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12.5px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[12px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900">
                                    <th className="px-2 py-2">#</th><th className="px-2 py-2">Message</th><th className="px-2 py-2">MSG91 Template ID</th>
                                    <th className="px-2 py-2">DLT Template ID</th><th className="px-2 py-2">Sender ID</th><th className="px-2 py-2">Category</th>
                                    <th className="px-2 py-2">Language</th><th className="px-2 py-2">Status</th><th className="px-2 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(({ t, i }) => (
                                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-900 dark:hover:bg-slate-900/40">
                                        <td className="px-2 py-2.5 text-slate-500">{i + 1}</td>
                                        <td className="px-2 py-2.5">
                                            <div className="font-medium text-slate-800 dark:text-slate-100">{t.name}</div>
                                            <div className="font-mono text-[11px] text-slate-500">{t.key}{t.variables ? ` · ${t.variables}` : ''}</div>
                                        </td>
                                        <td className="px-2 py-2.5 font-mono text-[12px]">{t.msg91_template_id || '—'}</td>
                                        <td className="px-2 py-2.5 font-mono text-[12px]">{t.dlt_template_id || '—'}</td>
                                        <td className="px-2 py-2.5 font-semibold">{t.sender_id || '—'}</td>
                                        <td className="px-2 py-2.5"><Pill tone={CATEGORY_TONE[t.category]}>{CATEGORY_LABEL[t.category]}</Pill></td>
                                        <td className="px-2 py-2.5">{LANG_LABEL[t.language]}</td>
                                        <td className="px-2 py-2.5">{mapStatus(t) === 'mapped' ? <Pill tone="green"><CheckCircle2 className="h-3 w-3" />Mapped</Pill> : <Pill tone="amber">Incomplete</Pill>}</td>
                                        <td className="whitespace-nowrap px-2 py-2.5 text-right">
                                            <button type="button" onClick={() => setEditing(i)} className="rounded-md p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-700" aria-label={`Edit ${t.name}`}><Pencil className="h-4 w-4" /></button>
                                            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${t.name}`}><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="mt-2 text-[12px] text-slate-500">Showing {visible.length} of {items.length} templates · changes stay on this tab until you click Save Changes</p>
            </Section>

            {editing !== null && (
                <MappingDialog
                    initial={editing === 'new' ? null : items[editing]}
                    senders={senders}
                    existingKeys={items.filter((_, j) => j !== editing).map((x) => x.key)}
                    onClose={() => setEditing(null)}
                    onSave={(t) => {
                        setItems(editing === 'new' ? [...items, t] : items.map((x, j) => (j === editing ? t : x)));
                        setEditing(null);
                    }}
                />
            )}
        </div>
    );
}

/* ── 7. Email Configuration ──────────────────────────────────────────────── */

const EMAIL_CATS = [
    ['invitations', 'Event Invitations'], ['updates', 'Event Updates'], ['reminders', 'Reminders'],
    ['tickets', 'Tickets & Confirmations'], ['marketing', 'Marketing & Promotions'], ['system', 'System Notifications'],
] as const;

export function EmailTab({ value, onChange }: TabProps<Msg91Email>) {
    const set = <K extends keyof Msg91Email>(k: K, v: Msg91Email[K]) => onChange({ ...value, [k]: v });
    const setTpl = (i: number, patch: Partial<EmailTemplateMap>) => set('templates', value.templates.map((t, j) => (j === i ? { ...t, ...patch } : t)));
    const domainTone = { verified: 'green', pending: 'amber', failed: 'red', not_added: 'gray' } as const;
    return (
        <div className="space-y-4">
            <Section title="Sender & Identity Settings">
                <div className={grid2}>
                    <Field label="Email Domain" required hint="The domain added and verified in MSG91 → Email → Domains.">
                        <TextInput value={value.domain} maxLength={120} placeholder="eventinvit.com" onChange={(e) => set('domain', e.target.value.trim().toLowerCase())} />
                    </Field>
                    <Field label="Domain Status" hint="Copy it from MSG91 after adding the DNS records.">
                        <div className="flex items-center gap-2">
                            <SelectInput className="flex-1" value={value.domain_status} onChange={(v) => set('domain_status', v as Msg91Email['domain_status'])} options={[{ value: 'not_added', label: 'Not added' }, { value: 'pending', label: 'Pending' }, { value: 'verified', label: 'Verified' }, { value: 'failed', label: 'Failed' }]} />
                            <Pill tone={domainTone[value.domain_status]}>{value.domain_status === 'not_added' ? 'Not added' : value.domain_status[0].toUpperCase() + value.domain_status.slice(1)}</Pill>
                        </div>
                    </Field>
                    <Field label="Sender Email" required hint="Must be on the email domain.">
                        <TextInput type="email" value={value.sender_email} maxLength={150} placeholder="noreply@eventinvit.com" onChange={(e) => set('sender_email', e.target.value.trim())} />
                    </Field>
                    <Field label="Sender Name" required>
                        <TextInput value={value.sender_name} maxLength={80} onChange={(e) => set('sender_name', e.target.value)} />
                    </Field>
                    <Field label="Reply-To Email" required>
                        <TextInput type="email" value={value.reply_to} maxLength={150} placeholder="support@eventinvit.com" onChange={(e) => set('reply_to', e.target.value.trim())} />
                    </Field>
                    <Field label="Default Language">
                        <SelectInput value={value.default_language} onChange={(v) => set('default_language', v as Msg91Email['default_language'])} options={LANG_OPTIONS} />
                    </Field>
                </div>
            </Section>

            <Section title="Email Behaviour">
                <div className={grid2}>
                    <Field label="Bounce Handling" required>
                        <SelectInput value={value.bounce_handling} onChange={(v) => set('bounce_handling', v as Msg91Email['bounce_handling'])} options={[{ value: 'mark_notify', label: 'Mark as Bounced & Notify' }, { value: 'mark_only', label: 'Mark as Bounced only' }, { value: 'ignore', label: 'Ignore' }]} />
                    </Field>
                    <div className="space-y-3 pt-1">
                        <ToggleRow checked={value.unsubscribe_link} onChange={(v) => set('unsubscribe_link', v)} title="Include Unsubscribe Link" hint="Gmail and Yahoo require it for bulk email." />
                        <Check checked={value.global_suppression} onChange={(v) => set('global_suppression', v)} label="Add unsubscribed and bounced addresses to the global suppression list" />
                    </div>
                </div>
            </Section>

            <div className={grid2}>
                <Section title="Notification Categories" hint="Which kinds of email go through MSG91.">
                    <div className="grid grid-cols-2 gap-2.5">
                        {EMAIL_CATS.map(([k, label]) => (
                            <Check key={k} checked={value.categories[k]} onChange={(v) => set('categories', { ...value.categories, [k]: v })} label={label} />
                        ))}
                    </div>
                </Section>
                <Section title="Tracking & Analytics">
                    <div className="space-y-3">
                        <ToggleRow checked={value.track_opens} onChange={(v) => set('track_opens', v)} title="Track Email Opens" />
                        <ToggleRow checked={value.track_clicks} onChange={(v) => set('track_clicks', v)} title="Track Link Clicks" />
                        <ToggleRow checked={value.utm} onChange={(v) => set('utm', v)} title="Include UTM Parameters" hint="Adds utm_source=eventinvit to links for analytics." />
                    </div>
                </Section>
            </div>

            <Section
                title="Email Template Mapping"
                hint="MSG91 sends email from templates created in MSG91 → Email → Templates. Link each app email to its MSG91 template ID."
                action={(
                    <button type="button" onClick={() => set('templates', [...value.templates, { name: '', key: '', msg91_template_id: '' }])} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-sky-700">
                        <Plus className="h-4 w-4" /> Add Template
                    </button>
                )}
            >
                {value.templates.length === 0 ? (
                    <p className="py-5 text-center text-[13px] text-slate-500">No email templates linked yet.</p>
                ) : (
                    <div className="space-y-2">
                        <div className="hidden grid-cols-[1fr_1fr_1fr_40px] gap-3 text-[12px] font-semibold text-slate-600 md:grid">
                            <span>Message Name</span><span>Internal Key</span><span>MSG91 Email Template ID</span><span />
                        </div>
                        {value.templates.map((t, i) => (
                            <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_40px]">
                                <TextInput maxLength={80} value={t.name} placeholder="Event Invitation"
                                    onChange={(e) => setTpl(i, { name: e.target.value, ...(t.key === '' || t.key === toKey(t.name) ? { key: toKey(e.target.value) } : {}) })} />
                                <TextInput className="font-mono text-[12px]" maxLength={60} value={t.key} placeholder="event_invitation" onChange={(e) => setTpl(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
                                <TextInput maxLength={80} value={t.msg91_template_id} placeholder="e.g. evt_invite_001" onChange={(e) => setTpl(i, { msg91_template_id: e.target.value.trim() })} />
                                <button type="button" onClick={() => set('templates', value.templates.filter((_, j) => j !== i))} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </div>
                )}
            </Section>
        </div>
    );
}

/* ── 8. Webhook Configuration ────────────────────────────────────────────── */

const EVENTS: { key: WebhookEvent; title: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'delivery', title: 'Delivery Reports', hint: 'Delivered, failed, pending', icon: Truck },
    { key: 'status', title: 'Status Updates', hint: 'Message status changes', icon: Activity },
    { key: 'bounce', title: 'Bounce Events', hint: 'Bounced or undeliverable messages', icon: AlertTriangle },
    { key: 'otp', title: 'OTP Events', hint: 'OTP sent, verified, expired', icon: ShieldCheck },
    { key: 'email', title: 'Email Events', hint: 'Email delivery, open, click, bounce', icon: Mail },
];

export function WebhookTab({ value, onChange, onRegenerate, regenerating }: TabProps<Msg91Webhook> & { onRegenerate: () => void; regenerating: boolean }) {
    return (
        <div className="space-y-4">
            <InfoNote tone="amber">
                These URLs are ready to paste into MSG91, but the part of the server that <b>receives</b> them is built in the next step (with sending).
                Until then MSG91&apos;s calls are not stored.
            </InfoNote>
            <Section title="Webhook Endpoints" hint="Paste each URL in MSG91 → Settings → Webhooks for that event.">
                <div className="space-y-3">
                    {EVENTS.map(({ key, title, hint, icon: Icon }) => (
                        <div key={key} className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[220px_1fr_auto]">
                            <div className="flex items-start gap-2.5">
                                <Icon className="mt-0.5 h-5 w-5 text-sky-600" />
                                <div>
                                    <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</div>
                                    <div className="text-[11.5px] text-slate-500">{hint}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <TextInput readOnly value={value.urls?.[key] || ''} className="font-mono text-[12px]" />
                                <button type="button" onClick={() => copy(value.urls?.[key] || '')} className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700" aria-label={`Copy ${title} URL`}><Copy className="h-4 w-4" /></button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Toggle checked={value.events[key]} onChange={(v) => onChange({ ...value, events: { ...value.events, [key]: v } })} label={title} />
                                <Pill tone={value.events[key] ? 'green' : 'gray'}>{value.events[key] ? 'Subscribed' : 'Off'}</Pill>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>
            <Section title="Security & Verification">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-xl text-[12.5px] text-slate-600 dark:text-slate-300">
                        Every URL carries a secret <span className="font-mono">token</span>. The server will accept a call only when the token matches.
                        If a URL leaks, create a new token and paste the new URLs in MSG91.
                    </p>
                    <button type="button" disabled={regenerating} onClick={onRegenerate} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200">
                        {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} New Token
                    </button>
                </div>
            </Section>
        </div>
    );
}

/* ── 9. Balance & Credit Monitoring ──────────────────────────────────────── */

export function BalanceTab({ value, onChange, status, onRefresh, refreshing }: TabProps<Msg91Alerts> & {
    status: Msg91Config['status']; onRefresh: () => void; refreshing: boolean;
}) {
    const set = <K extends keyof Msg91Alerts>(k: K, v: Msg91Alerts[K]) => onChange({ ...value, [k]: v });
    const [email, setEmail] = React.useState('');
    const addRecipient = () => {
        const e = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error('Enter a valid email'); return; }
        if (!value.recipients.includes(e)) set('recipients', [...value.recipients, e]);
        setEmail('');
    };
    const bal = status.last_balance;
    return (
        <div className="space-y-4">
            <Section
                title="Account Balance"
                action={(
                    <div className="flex items-center gap-2">
                        <a href="https://control.msg91.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                            Top Up in MSG91 <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button type="button" disabled={refreshing} onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh Balance
                        </button>
                    </div>
                )}
            >
                {bal ? (
                    <div className="flex flex-wrap items-end gap-6">
                        <div>
                            <div className="text-[12px] text-slate-500">Transactional SMS credits</div>
                            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{bal.transactional_sms.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="text-[12px] text-slate-500">Fetched {formatDateTime(bal.fetched_at)}</div>
                    </div>
                ) : (
                    <p className="text-[13px] text-slate-500">Not fetched yet. Save your auth key on the API tab, then click <b>Refresh Balance</b>.</p>
                )}
            </Section>

            <Section title="Threshold Alerts" hint="Warn the team before credits run out.">
                <table className="w-full text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600 dark:border-slate-800">
                            <th className="py-2">Channel</th><th className="py-2">Low Balance Threshold</th><th className="py-2">Alert Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(['sms', 'email', 'otp'] as const).map((k) => (
                            <tr key={k} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
                                <td className="py-2.5 font-medium uppercase text-slate-700 dark:text-slate-200">{k === 'email' ? 'Email' : k.toUpperCase()}</td>
                                <td className="py-2.5"><NumberInput className="max-w-[220px]" value={value[k].threshold} min={0} suffix="credits" onChange={(n) => set(k, { ...value[k], threshold: n })} /></td>
                                <td className="py-2.5"><div className="flex items-center gap-2"><Toggle checked={value[k].on} onChange={(v) => set(k, { ...value[k], on: v })} label={`${k} alert`} /><span className="text-[12px] text-slate-500">{value[k].on ? 'On' : 'Off'}</span></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            <Section title="Low Balance Notification Settings">
                <div className="space-y-4">
                    <Field label="Notify Via">
                        <div className="flex flex-wrap gap-5 pt-1">
                            <Check checked={value.notify_email} onChange={(v) => set('notify_email', v)} label="Email" />
                            <Check checked={value.notify_sms} onChange={(v) => set('notify_sms', v)} label="SMS" />
                            <Check checked={value.notify_in_app} onChange={(v) => set('notify_in_app', v)} label="In-App" />
                        </div>
                    </Field>
                    <Field label="Recipients" required hint="Up to 10 email addresses.">
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 p-1.5 dark:border-slate-700">
                            {value.recipients.map((r) => (
                                <span key={r} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[12px] dark:bg-slate-800">
                                    {r}
                                    <button type="button" onClick={() => set('recipients', value.recipients.filter((x) => x !== r))} aria-label={`Remove ${r}`}><X className="h-3 w-3" /></button>
                                </span>
                            ))}
                            <input
                                className="min-w-[200px] flex-1 bg-transparent px-1 text-[13px] outline-none"
                                placeholder="Type an email and press Enter"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRecipient(); } }}
                                onBlur={() => email.trim() && addRecipient()}
                            />
                        </div>
                    </Field>
                    <Field label="Frequency">
                        <SelectInput className="max-w-sm" value={value.frequency} onChange={(v) => set('frequency', v as Msg91Alerts['frequency'])} options={[{ value: 'immediate', label: 'Immediate (when threshold is reached)' }, { value: 'daily', label: 'Once a day (summary)' }]} />
                    </Field>
                </div>
            </Section>
        </div>
    );
}

/* ── 10. Test Connection ─────────────────────────────────────────────────── */

export function TestTab({ config, onTest, testing }: { config: Msg91Config; onTest: () => void; testing: boolean }) {
    const s = config.status;
    const ok = s.connection_status === 'connected';
    const checks = [
        { label: 'Auth key saved', pass: Boolean(config.api.has_auth_key) },
        { label: 'DLT entity ID', pass: Boolean(config.dlt.entity_id) },
        { label: 'At least one approved sender ID', pass: config.dlt.senders.some((x) => x.status === 'approved') },
        { label: 'OTP: MSG91 template + DLT template ID', pass: Boolean(config.otp.msg91_template_id && config.otp.dlt_template_id) },
        { label: 'Email domain verified', pass: config.email.domain_status === 'verified' },
    ];
    return (
        <div className="space-y-4">
            <Section title="Run Connection Test" hint="Checks the saved auth key with MSG91 and reads the balance. Nothing is sent and no credit is used.">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <FlaskConical className="h-8 w-8 text-sky-600" />
                        <div className="text-[13px] text-slate-600 dark:text-slate-300">
                            Test messages (SMS / OTP / Email) are added with the sending step, so they use these saved settings.
                        </div>
                    </div>
                    <button type="button" disabled={testing} onClick={onTest} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Run Test
                    </button>
                </div>
            </Section>

            <Section title="Test Result">
                {s.connection_status === 'not_tested' ? (
                    <p className="text-[13px] text-slate-500">Not tested yet.</p>
                ) : (
                    <div className={cn('flex items-start gap-3 rounded-xl p-4', ok ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30')}>
                        {ok ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /> : <XCircle className="h-6 w-6 shrink-0 text-rose-600" />}
                        <div className="text-[13px]">
                            <div className={cn('font-semibold', ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300')}>{ok ? 'Connection Successful' : 'Connection Failed'}</div>
                            <div className="text-slate-700 dark:text-slate-300">{s.last_test_message}</div>
                            <div className="mt-1 text-[12px] text-slate-500">Tested {formatDateTime(s.last_tested_at)}</div>
                        </div>
                    </div>
                )}
            </Section>

            <Section title="Setup Checklist" hint="What still needs filling before sending can switch to these settings.">
                <ul className={cn(grid3, 'gap-y-2.5')}>
                    {checks.map((c) => (
                        <li key={c.label} className="flex items-center gap-2 text-[13px]">
                            {c.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4 text-slate-400" />}
                            <span className={c.pass ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}>{c.label}</span>
                        </li>
                    ))}
                </ul>
            </Section>
        </div>
    );
}

