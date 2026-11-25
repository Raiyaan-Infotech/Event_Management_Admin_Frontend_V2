'use client';

import * as React from 'react';
import {
    CheckCircle2, Clock, Copy, Eye, EyeOff, FileText, Link2, Loader2, MessageSquare, Pencil, Phone, Plus, RefreshCw,
    Search, Send, ShieldCheck, Trash2, User, XCircle, CheckCheck, FlaskConical, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type {
    WaBudget, WaCategory, WaLimits, WaTemplate, WaWebhook, WaWebhookEvent, WhatsAppConfig,
} from '@/hooks/use-whatsapp-config';
import {
    Check, Field, InfoNote, NumberInput, Pill, Section, SelectInput, TextInput, Toggle, ToggleRow, formatDateTime, grid2, grid3, grid4,
} from '../../_components/provider-ui';
import { WA_LANG_OPTIONS } from './whatsapp-tabs-account';

type TabProps<T> = { value: T; onChange: (next: T) => void };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
const toKey = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);

/** Meta's three template categories: the price per message depends on it. */
export const CATEGORY_LABEL: Record<WaCategory, string> = { marketing: 'Marketing', utility: 'Utility', authentication: 'Authentication' };
const CATEGORY_HINT: Record<WaCategory, string> = {
    marketing: 'Promotions, offers, event discovery',
    utility: 'Updates the person expects: invites they asked for, reminders, RSVP confirmations',
    authentication: 'One-time passcodes only',
};
const CATEGORY_TONE = { marketing: 'violet', utility: 'blue', authentication: 'green' } as const;
const STATUS_TONE = { approved: 'green', pending: 'amber', rejected: 'red', paused: 'amber', disabled: 'gray' } as const;

/* ── 5. Template Sync (manual list for now) ──────────────────────────────── */

const blankTemplate = (): WaTemplate => ({ name: '', key: '', category: 'utility', language: 'en', status: 'approved', variables: 0 });

function TemplateDialog({ initial, onSave, onClose, taken }: {
    initial: WaTemplate | null; onSave: (t: WaTemplate) => void; onClose: () => void; taken: WaTemplate[];
}) {
    const [t, setT] = React.useState<WaTemplate>(initial ?? blankTemplate());
    const [err, setErr] = React.useState('');
    const set = (p: Partial<WaTemplate>) => { setT((x) => ({ ...x, ...p })); setErr(''); };
    const submit = () => {
        if (!/^[a-z0-9_]+$/.test(t.name)) return setErr('Template name: small letters, numbers and _ only, exactly as in Meta');
        if (!/^[a-z0-9_]+$/.test(t.key)) return setErr('Internal key: small letters, numbers and _ only');
        if (taken.some((x) => x.name === t.name && x.language === t.language)) return setErr('This template + language is already listed');
        if (taken.some((x) => x.key === t.key && x.language === t.language)) return setErr('This internal key is already used for that language');
        onSave(t);
    };
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{initial ? 'Edit WhatsApp Template' : 'Add WhatsApp Template'}</DialogTitle>
                    <DialogDescription>A template already created in WhatsApp Manager, linked to the key the app uses.</DialogDescription>
                </DialogHeader>
                <div className={cn(grid2, 'py-2')}>
                    <Field label="Template Name (in Meta)" required>
                        <TextInput autoFocus className="font-mono text-[12.5px]" maxLength={512} value={t.name} placeholder="event_invitation_v1"
                            onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); set({ name: v, ...(t.key === '' || t.key === toKey(t.name.replace(/_v\d+$/, '')) ? { key: toKey(v.replace(/_v\d+$/, '')) } : {}) }); }} />
                    </Field>
                    <Field label="Internal Mapping Key" required hint="How the app's code finds this template.">
                        <TextInput className="font-mono text-[12.5px]" maxLength={60} value={t.key} placeholder="event_invitation" onChange={(e) => set({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
                    </Field>
                    <Field label="Category" hint={CATEGORY_HINT[t.category]}>
                        <SelectInput value={t.category} onChange={(v) => set({ category: v as WaCategory })} options={Object.entries(CATEGORY_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
                    </Field>
                    <Field label="Language">
                        <SelectInput value={t.language} onChange={(v) => set({ language: v as WaTemplate['language'] })} options={WA_LANG_OPTIONS} />
                    </Field>
                    <Field label="Approval Status">
                        <SelectInput value={t.status} onChange={(v) => set({ status: v as WaTemplate['status'] })} options={['approved', 'pending', 'rejected', 'paused', 'disabled'].map((x) => ({ value: x, label: cap(x) }))} />
                    </Field>
                    <Field label="Body Variables" hint="How many {{1}}, {{2}}… the body has.">
                        <NumberInput value={t.variables} min={0} max={20} onChange={(n) => set({ variables: n })} />
                    </Field>
                </div>
                {err && <p className="text-[12.5px] font-medium text-rose-600">{err}</p>}
                <DialogFooter>
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">Cancel</button>
                    <button type="button" onClick={submit} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">{initial ? 'Update' : 'Add'}</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function TemplatesTab({ value, onChange }: TabProps<{ items: WaTemplate[] }>) {
    const [q, setQ] = React.useState('');
    const [cat, setCat] = React.useState('');
    const [status, setStatus] = React.useState('');
    const [editing, setEditing] = React.useState<number | 'new' | null>(null);
    const items = value.items;
    const setItems = (next: WaTemplate[]) => onChange({ items: next });
    const count = (s: WaTemplate['status']) => items.filter((t) => t.status === s).length;
    const visible = items.map((t, i) => ({ t, i })).filter(({ t }) =>
        (!cat || t.category === cat) && (!status || t.status === status) && (!q || `${t.name} ${t.key}`.includes(q.toLowerCase())));
    const cards = [
        { label: 'Approved Templates', n: count('approved'), hint: 'Available for use', icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' },
        { label: 'Pending Approval', n: count('pending'), hint: 'Under Meta review', icon: Clock, cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' },
        { label: 'Rejected', n: count('rejected'), hint: 'Needs update & resubmission', icon: XCircle, cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300' },
        { label: 'Paused / Disabled', n: count('paused') + count('disabled'), hint: 'Stopped by Meta for low quality', icon: FileText, cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300' },
    ];
    return (
        <div className="space-y-4">
            <div className={grid4}>
                {cards.map((c) => (
                    <div key={c.label} className={cn('rounded-xl border p-3', c.cls)}>
                        <div className="flex items-center gap-2 text-[12.5px] font-semibold"><c.icon className="h-5 w-5" />{c.label}</div>
                        <div className="mt-1 text-2xl font-bold">{c.n}</div>
                        <div className="text-[11px] opacity-80">{c.hint}</div>
                    </div>
                ))}
            </div>
            <InfoNote>
                Automatic sync from Meta comes with the sending step. For now, list each approved template here with the key the app uses.
                Meta has only <b>3 categories</b>: Marketing, Utility and Authentication. The price per message depends on the category.
            </InfoNote>
            <Section
                title={`WhatsApp Templates (${items.length})`}
                action={(
                    <button type="button" onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> Add Template
                    </button>
                )}
            >
                <div className="mb-3 flex flex-wrap gap-3">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <TextInput className="pl-9" placeholder="Search by template name or mapping…" value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <SelectInput className="w-44" value={cat} onChange={setCat} placeholder="All Categories" options={Object.entries(CATEGORY_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
                    <SelectInput className="w-40" value={status} onChange={setStatus} placeholder="All Statuses" options={['approved', 'pending', 'rejected', 'paused', 'disabled'].map((x) => ({ value: x, label: cap(x) }))} />
                </div>
                {items.length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-slate-500">No templates listed yet. Click <b>Add Template</b>.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12.5px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[12px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900">
                                    <th className="px-2 py-2">Template Name</th><th className="px-2 py-2">Internal Mapping Key</th><th className="px-2 py-2">Category</th>
                                    <th className="px-2 py-2">Language</th><th className="px-2 py-2">Variables</th><th className="px-2 py-2">Approval Status</th><th className="px-2 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(({ t, i }) => (
                                    <tr key={`${t.name}-${t.language}-${i}`} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
                                        <td className="px-2 py-2.5 font-mono text-[12px] font-semibold text-blue-700 dark:text-blue-300">{t.name}</td>
                                        <td className="px-2 py-2.5 font-mono text-[12px] uppercase">{t.key}</td>
                                        <td className="px-2 py-2.5"><Pill tone={CATEGORY_TONE[t.category]}>{CATEGORY_LABEL[t.category]}</Pill></td>
                                        <td className="px-2 py-2.5">{t.language}</td>
                                        <td className="px-2 py-2.5">{t.variables}</td>
                                        <td className="px-2 py-2.5"><Pill tone={STATUS_TONE[t.status]}>{cap(t.status)}</Pill></td>
                                        <td className="whitespace-nowrap px-2 py-2.5 text-right">
                                            <button type="button" onClick={() => setEditing(i)} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" aria-label={`Edit ${t.name}`}><Pencil className="h-4 w-4" /></button>
                                            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${t.name}`}><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="mt-2 text-[12px] text-slate-500">Showing {visible.length} of {items.length} templates · changes stay on this tab until you click Save Configuration</p>
            </Section>
            {editing !== null && (
                <TemplateDialog
                    initial={editing === 'new' ? null : items[editing]}
                    taken={items.filter((_, j) => j !== editing)}
                    onClose={() => setEditing(null)}
                    onSave={(t) => { setItems(editing === 'new' ? [...items, t] : items.map((x, j) => (j === editing ? t : x))); setEditing(null); }}
                />
            )}
        </div>
    );
}

/* ── 6. Webhook ──────────────────────────────────────────────────────────── */

const EVENTS: { key: WaWebhookEvent; title: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'messages', title: 'Messages', hint: 'Replies from guests (text, buttons, media)', icon: MessageSquare },
    { key: 'message_status', title: 'Message Status', hint: 'Sent, delivered, read, failed', icon: CheckCheck },
    { key: 'template_status', title: 'Template Status', hint: 'Approved, rejected, paused', icon: FileText },
    { key: 'quality', title: 'Phone Number Quality Updates', hint: 'Quality rating changes for your numbers', icon: Phone },
    { key: 'account', title: 'Account Updates', hint: 'Display name, profile and limit changes', icon: User },
];

export function WebhookTab({ value, onChange, onRegenerate, regenerating }: TabProps<WaWebhook> & { onRegenerate: () => void; regenerating: boolean }) {
    const [show, setShow] = React.useState(false);
    return (
        <div className="space-y-4">
            <InfoNote tone="amber">The URL and token are ready to paste into Meta, but the part of the server that <b>receives</b> Meta&apos;s calls is built with the sending step.</InfoNote>
            <Section title="Webhook Endpoint" hint="Meta for Developers → your app → WhatsApp → Configuration → Webhook.">
                <div className={grid2}>
                    <Field label="Callback URL" required>
                        <div className="flex items-center gap-2">
                            <TextInput readOnly value={value.callback_url || ''} className="font-mono text-[12px]" />
                            <button type="button" onClick={() => copy(value.callback_url || '')} className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700" aria-label="Copy callback URL"><Copy className="h-4 w-4" /></button>
                        </div>
                    </Field>
                    <Field label="Verify Token" required hint="Paste the same token in Meta. Create a new one if it leaks.">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <TextInput readOnly type={show ? 'text' : 'password'} value={value.verify_token || ''} className="pr-10 font-mono text-[12px]" />
                                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? 'Hide token' : 'Show token'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                            </div>
                            <button type="button" onClick={() => copy(value.verify_token || '')} className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700" aria-label="Copy verify token"><Copy className="h-4 w-4" /></button>
                            <button type="button" disabled={regenerating} onClick={onRegenerate} className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700" aria-label="New verify token">
                                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </button>
                        </div>
                    </Field>
                </div>
            </Section>
            <Section title="Event Subscriptions" hint="Subscribe to the same fields in Meta. Turned-off events will be ignored by the server.">
                <div className="divide-y divide-slate-100 dark:divide-slate-900">
                    {EVENTS.map(({ key, title, hint, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="flex items-start gap-3">
                                <Icon className="mt-0.5 h-5 w-5 text-blue-600" />
                                <div>
                                    <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</div>
                                    <div className="text-[11.5px] text-slate-500">{hint}</div>
                                </div>
                            </div>
                            <Toggle checked={value.events[key]} onChange={(v) => onChange({ ...value, events: { ...value.events, [key]: v } })} label={title} />
                        </div>
                    ))}
                </div>
            </Section>
            <Section title="Security & Signature">
                <ul className="space-y-1.5 text-[12.5px] text-slate-600 dark:text-slate-300">
                    {['Every call is checked with the X-Hub-Signature-256 header.', 'The signature is an HMAC-SHA256 of the body using your App Secret.', 'Calls with a wrong signature are refused (HTTP 401).'].map((x) => (
                        <li key={x} className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />{x}</li>
                    ))}
                </ul>
            </Section>
        </div>
    );
}

/* ── 7. Messaging Limits ─────────────────────────────────────────────────── */

const TIERS = [
    { value: '250', label: '250 people / 24 h (new account)' }, { value: '1000', label: '1,000 people / 24 h' },
    { value: '10000', label: '10,000 people / 24 h' }, { value: '100000', label: '100,000 people / 24 h' }, { value: 'unlimited', label: 'Unlimited' },
];

function EmailChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const [email, setEmail] = React.useState('');
    const add = () => {
        const e = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error('Enter a valid email'); return; }
        if (!value.includes(e)) onChange([...value, e]);
        setEmail('');
    };
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 p-1.5 dark:border-slate-700">
            {value.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[12px] text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                    {r}<button type="button" onClick={() => onChange(value.filter((x) => x !== r))} aria-label={`Remove ${r}`}><X className="h-3 w-3" /></button>
                </span>
            ))}
            <input className="min-w-[180px] flex-1 bg-transparent px-1 text-[13px] outline-none" placeholder="Add email and press Enter" value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={() => email.trim() && add()} />
        </div>
    );
}

export function LimitsTab({ value, onChange }: TabProps<WaLimits>) {
    const set = <K extends keyof WaLimits>(k: K, v: WaLimits[K]) => onChange({ ...value, [k]: v });
    return (
        <div className="space-y-4">
            <Section title="Meta Messaging Tier" hint="Set by Meta. Record your current tier from WhatsApp Manager → Insights.">
                <div className={grid2}>
                    <Field label="Current Tier" hint="How many different people you can start conversations with in 24 hours. The limit is shared by all numbers in your business portfolio.">
                        <SelectInput value={value.tier} onChange={(v) => set('tier', v as WaLimits['tier'])} options={TIERS} />
                    </Field>
                    <Field label="Throughput" hint="Messages per second Meta allows per number. 80 by default; Meta raises it to 1,000 automatically for high-volume numbers.">
                        <SelectInput value={value.throughput} onChange={(v) => set('throughput', v as WaLimits['throughput'])} options={[{ value: '80', label: '80 messages / second' }, { value: '1000', label: '1,000 messages / second' }]} />
                    </Field>
                </div>
            </Section>

            <div className={grid2}>
                <Section title="Our Sending Speed">
                    <Field label="Max Messages per Second" required hint={`Our own throttle. Keep it at or below Meta's ${value.throughput} / second.`}>
                        <NumberInput value={value.max_per_second} min={1} max={1000} suffix="per second" onChange={(n) => set('max_per_second', n)} />
                    </Field>
                </Section>
                <Section title="Quality-Based Warnings">
                    <div className="space-y-2.5">
                        <ToggleRow checked={value.warn_yellow} onChange={(v) => set('warn_yellow', v)} title="Warn when quality drops to Yellow" />
                        <ToggleRow checked={value.warn_red} onChange={(v) => set('warn_red', v)} title="Warn when quality drops to Red" />
                        <ToggleRow checked={value.notify_quality_change} onChange={(v) => set('notify_quality_change', v)} title="Notify admin on any quality change" />
                        <Field label="Notification Recipients"><EmailChips value={value.recipients} onChange={(v) => set('recipients', v)} /></Field>
                    </div>
                </Section>
            </div>

            <div className={grid2}>
                <Section title="Event-Wise Sending Caps" hint="Stop one event from using up the whole daily limit.">
                    <div className="space-y-3">
                        <Field label="Max Messages per Event per Day" required><NumberInput value={value.max_per_event_day} min={1} max={1000000} suffix="messages" onChange={(n) => set('max_per_event_day', n)} /></Field>
                        <Field label="Apply To"><SelectInput value={value.cap_applies} onChange={(v) => set('cap_applies', v as WaLimits['cap_applies'])} options={[{ value: 'all', label: 'All events' }, { value: 'campaign', label: 'Campaign (bulk) sends only' }]} /></Field>
                        <Check checked={value.include_system} onChange={(v) => set('include_system', v)} label="Include system and automated messages (reminders, RSVPs)" />
                    </div>
                </Section>
                <Section title="High-Volume Protection Rules" hint="Based on the share of the Meta tier used today.">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Toggle checked={value.auto_throttle_enabled} onChange={(v) => set('auto_throttle_enabled', v)} label="Auto-throttle" />
                            <span className="text-[13px] text-slate-700 dark:text-slate-200">Slow down at</span>
                            <NumberInput className="w-40" value={value.auto_throttle_percent} min={50} max={100} suffix="% of tier" onChange={(n) => set('auto_throttle_percent', n)} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Toggle checked={value.pause_enabled} onChange={(v) => set('pause_enabled', v)} label="Pause" />
                            <span className="text-[13px] text-slate-700 dark:text-slate-200">Pause new sends at</span>
                            <NumberInput className="w-40" value={value.pause_percent} min={50} max={100} suffix="% of tier" onChange={(n) => set('pause_percent', n)} />
                        </div>
                        <ToggleRow checked={value.resume_next_day} onChange={(v) => set('resume_next_day', v)} title="Resume automatically the next day" />
                    </div>
                </Section>
            </div>
        </div>
    );
}

/* ── 8. Budget ───────────────────────────────────────────────────────────── */

export function BudgetTab({ value, onChange }: TabProps<WaBudget>) {
    const set = <K extends keyof WaBudget>(k: K, v: WaBudget[K]) => onChange({ ...value, [k]: v });
    const inr = (n: number) => `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN')}`;
    return (
        <div className="space-y-4">
            <Section title="Budget Limits & Alerts">
                <div className={grid2}>
                    <Field label="Daily Budget Limit" required hint="Maximum spend allowed per day (₹)."><NumberInput value={value.daily_limit} min={0} suffix="₹ / day" onChange={(n) => set('daily_limit', n)} /></Field>
                    <Field label="Monthly Budget Cap" required hint="Total spend allowed per calendar month (₹)."><NumberInput value={value.monthly_cap} min={0} suffix="₹ / month" onChange={(n) => set('monthly_cap', n)} /></Field>
                    <Field label="Alert Threshold" required hint={`Alert when spend reaches ${value.alert_percent}% (${inr(Math.round((value.monthly_cap * value.alert_percent) / 100))} of the monthly cap).`}>
                        <NumberInput value={value.alert_percent} min={50} max={100} suffix="%" onChange={(n) => set('alert_percent', n)} />
                    </Field>
                    <Field label="Hard Limit Action" hint="What happens when the monthly cap is reached.">
                        <SelectInput value={value.hard_limit_action} onChange={(v) => set('hard_limit_action', v as WaBudget['hard_limit_action'])} options={[{ value: 'stop', label: 'Stop sending (block)' }, { value: 'alert_only', label: 'Keep sending, alert only' }]} />
                    </Field>
                </div>
            </Section>

            <Section title="Cost per Message" hint="Meta charges per delivered template message, by category (since July 2025). Copy the India rates from Meta's pricing page; spend is worked out from these.">
                <div className={grid3}>
                    {(Object.keys(CATEGORY_LABEL) as WaCategory[]).map((c) => (
                        <Field key={c} label={`${CATEGORY_LABEL[c]} (₹ per message)`} hint={CATEGORY_HINT[c]}>
                            <input
                                type="number" step="0.0001" min={0}
                                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900"
                                value={Number.isFinite(value.rates[c]) ? value.rates[c] : ''}
                                onChange={(e) => set('rates', { ...value.rates, [c]: e.target.value === '' ? NaN : Number(e.target.value) })}
                            />
                        </Field>
                    ))}
                </div>
                <p className="mt-3 text-[12px] text-slate-500">Replies to a guest within 24 hours of their message are free. Billing is through your Meta Business account; no recharge here.</p>
            </Section>
        </div>
    );
}

/* ── 9. Test Connection ──────────────────────────────────────────────────── */

export function TestTab({ config, onTest, testing }: { config: WhatsAppConfig; onTest: () => void; testing: boolean }) {
    const s = config.status;
    const ok = s.connection_status === 'connected';
    const def = config.senders.items.find((x) => x.is_default);
    const checks = [
        { label: 'App ID, App Secret and access token saved', pass: Boolean(config.api.app_id && config.api.has_app_secret && config.api.has_access_token) },
        { label: 'WhatsApp Business Account ID', pass: Boolean(config.api.waba_id) },
        { label: 'Business Portfolio ID', pass: Boolean(config.business.portfolio_id) },
        { label: 'A default sender (phone number)', pass: Boolean(def) },
        { label: 'At least one approved template', pass: config.templates.items.some((t) => t.status === 'approved') },
        { label: 'Cost per message filled in', pass: Object.values(config.budget.rates).some((r) => r > 0) },
    ];
    return (
        <div className="space-y-4">
            <Section title="Run Connection Test" hint="Looks up the default phone number on Meta with the saved token. Nothing is sent.">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-[13px] text-slate-600 dark:text-slate-300">
                        <FlaskConical className="h-8 w-8 text-blue-600" />
                        <div>
                            <div>Checks: access token, Graph API version and Phone Number ID together.</div>
                            <div className="text-[12px] text-slate-500">Default sender: {def ? `${def.display_name} (${def.phone_number})` : 'none yet'}. Test template messages come with the sending step.</div>
                        </div>
                    </div>
                    <button type="button" disabled={testing} onClick={onTest} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Run Test
                    </button>
                </div>
            </Section>
            <Section title="Test Results">
                {s.connection_status === 'not_tested' ? <p className="text-[13px] text-slate-500">Not tested yet.</p> : (
                    <div className={cn('flex items-start gap-3 rounded-xl p-4', ok ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30')}>
                        {ok ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /> : <XCircle className="h-6 w-6 shrink-0 text-rose-600" />}
                        <div className="text-[13px]">
                            <div className={cn('font-semibold', ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300')}>{ok ? 'Connection Successful' : 'Connection Failed'}</div>
                            <div className="text-slate-700 dark:text-slate-300">{s.last_test_message}</div>
                            {s.last_test_info && (
                                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px]">
                                    <span className="text-slate-500">Verified name</span><span className="font-medium">{s.last_test_info.verified_name || '—'}</span>
                                    <span className="text-slate-500">Phone number</span><span className="font-medium">{s.last_test_info.display_phone_number || '—'}</span>
                                    <span className="text-slate-500">Quality</span><span className="font-medium">{s.last_test_info.quality_rating || '—'}</span>
                                </div>
                            )}
                            <div className="mt-1 text-[12px] text-slate-500">Tested {formatDateTime(s.last_tested_at)}</div>
                        </div>
                    </div>
                )}
            </Section>
            <Section title="Setup Checklist" hint="What still needs filling before sending can switch to Meta.">
                <ul className={cn(grid2, 'gap-y-2.5')}>
                    {checks.map((c) => (
                        <li key={c.label} className="flex items-center gap-2 text-[13px]">
                            {c.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4 text-slate-400" />}
                            <span className={c.pass ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}>{c.label}</span>
                        </li>
                    ))}
                    <li className="flex items-center gap-2 text-[13px] text-slate-500"><Link2 className="h-4 w-4 text-slate-400" />Recipient has opted in (checked per guest when sending)</li>
                </ul>
            </Section>
        </div>
    );
}
