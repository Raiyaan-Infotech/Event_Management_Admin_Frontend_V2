'use client';

import * as React from 'react';
import { CheckCircle2, Eye, EyeOff, Pencil, Phone, Plus, Star, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Quality, WaApi, WaBusiness, WaGeneral, WaSender, WaSenders } from '@/hooks/use-whatsapp-config';
import {
    Field, InfoNote, NumberInput, Pill, Section, SelectInput, TextArea, TextInput, ToggleRow, grid2, grid3, grid4,
} from '../../_components/provider-ui';

type TabProps<T> = { value: T; onChange: (next: T) => void };

export const WA_LANG_OPTIONS = [
    { value: 'en', label: 'English (en)' }, { value: 'en_US', label: 'English US (en_US)' }, { value: 'en_GB', label: 'English UK (en_GB)' },
    { value: 'ta', label: 'Tamil (ta)' }, { value: 'hi', label: 'Hindi (hi)' }, { value: 'ml', label: 'Malayalam (ml)' },
    { value: 'te', label: 'Telugu (te)' }, { value: 'kn', label: 'Kannada (kn)' },
];
export const QUALITY_OPTIONS = [
    { value: 'high', label: 'High (Green)' }, { value: 'medium', label: 'Medium (Yellow)' }, { value: 'low', label: 'Low (Red)' }, { value: 'unknown', label: 'Unknown' },
];
export const QUALITY_TONE: Record<Quality, 'green' | 'amber' | 'red' | 'gray'> = { high: 'green', medium: 'amber', low: 'red', unknown: 'gray' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
const digitsOnly = (s: string) => s.replace(/\D/g, '');

/** Masked secret box: empty means "keep the saved one". */
function SecretInput({ value, onChange, saved, savedHint, placeholder }: {
    value: string; onChange: (v: string) => void; saved?: boolean; savedHint?: string; placeholder: string;
}) {
    const [show, setShow] = React.useState(false);
    return (
        <div className="relative">
            <TextInput
                type={show ? 'text' : 'password'}
                autoComplete="off"
                placeholder={saved ? `•••••••••••••••••••• saved (${savedHint})` : placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value.trim())}
                className="pr-10"
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Hide' : 'Show'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
}

/* ── 1. General Settings ─────────────────────────────────────────────────── */

export function GeneralTab({ value, onChange }: TabProps<WaGeneral>) {
    const set = <K extends keyof WaGeneral>(k: K, v: WaGeneral[K]) => onChange({ ...value, [k]: v });
    return (
        <div className="space-y-4">
            <Section title="Provider Details">
                <div className={grid2}>
                    <Field label="Provider Name" required>
                        <TextInput value={value.provider_name} maxLength={60} onChange={(e) => set('provider_name', e.target.value)} />
                    </Field>
                    <Field label="Provider Type">
                        <TextInput value="WhatsApp (Cloud API)" disabled />
                    </Field>
                    <Field label="Description" className="md:col-span-2" hint={`${value.description.length} / 250`}>
                        <TextArea rows={2} maxLength={250} value={value.description} onChange={(e) => set('description', e.target.value)} />
                    </Field>
                    <Field label="Default Template Language" hint="Language code sent with every template message, unless a template has its own.">
                        <SelectInput value={value.default_language} onChange={(v) => set('default_language', v as WaGeneral['default_language'])} options={WA_LANG_OPTIONS} />
                    </Field>
                </div>
            </Section>
            <Section title="Consent & Opt-in" hint="Meta requires permission before you message someone on WhatsApp.">
                <ToggleRow
                    checked={value.opt_in_required}
                    onChange={(v) => set('opt_in_required', v)}
                    title="Send only to people who opted in"
                    hint="Guests must have agreed to receive WhatsApp messages (for example a tick box on the RSVP or registration form). Messaging people who never agreed can get the number blocked or its quality lowered."
                />
            </Section>
            <InfoNote>Saved only for now. WhatsApp messages still go out through MSG91 until sending is switched to these Meta settings.</InfoNote>
        </div>
    );
}

/* ── 2. API Configuration ────────────────────────────────────────────────── */

export function ApiTab({ value, onChange }: TabProps<WaApi>) {
    const set = <K extends keyof WaApi>(k: K, v: WaApi[K]) => onChange({ ...value, [k]: v });
    return (
        <div className="space-y-4">
            <Section title="API Integration Settings">
                <div className={grid2}>
                    <Field label="Graph API Version" required>
                        <SelectInput value={value.graph_version} onChange={(v) => set('graph_version', v as WaApi['graph_version'])} options={['v21.0', 'v22.0', 'v23.0', 'v24.0'].map((x) => ({ value: x, label: x }))} />
                    </Field>
                    <Field label="API Base Endpoint" hint="Fixed by Meta; follows the version.">
                        <TextInput value={`https://graph.facebook.com/${value.graph_version}`} disabled />
                    </Field>
                </div>
            </Section>

            <Section title="Authentication & App Credentials" hint="Secrets are stored encrypted and never shown again in full. Leave a secret empty to keep the saved one.">
                <div className={grid2}>
                    <Field label="App ID" required hint="Meta for Developers → your app → App settings → Basic.">
                        <TextInput value={value.app_id} inputMode="numeric" maxLength={25} placeholder="e.g. 123456789012345" onChange={(e) => set('app_id', digitsOnly(e.target.value))} />
                    </Field>
                    <Field label="App Secret" required hint="Same page. Also used to check that webhook calls really come from Meta.">
                        <SecretInput value={value.app_secret || ''} onChange={(v) => set('app_secret', v)} saved={value.has_app_secret} savedHint={value.app_secret_hint} placeholder="Paste the 32-character App Secret" />
                    </Field>
                    <Field label="System User Access Token" required hint="Business settings → System users → Generate token (permanent, with whatsapp_business_messaging + whatsapp_business_management).">
                        <SecretInput value={value.access_token || ''} onChange={(v) => set('access_token', v)} saved={value.has_access_token} savedHint={value.access_token_hint} placeholder="Paste the token (starts with EAA…)" />
                    </Field>
                    <Field label="WhatsApp Business Account ID (WABA)" required hint="WhatsApp Manager → Account tools → Phone numbers.">
                        <TextInput value={value.waba_id} inputMode="numeric" maxLength={25} placeholder="e.g. 987654321098765" onChange={(e) => set('waba_id', digitsOnly(e.target.value))} />
                    </Field>
                </div>
                {value.secrets_unreadable && <p className="mt-3 text-[12px] font-medium text-rose-600">A saved secret can&apos;t be read (server encryption key changed). Type it again.</p>}
            </Section>

            <Section title="Request & Retry Settings" hint="How our server calls Meta.">
                <div className={grid3}>
                    <Field label="Request Timeout" required><NumberInput value={value.timeout_seconds} min={5} max={60} suffix="seconds" onChange={(n) => set('timeout_seconds', n)} /></Field>
                    <Field label="Retry Attempts" required><NumberInput value={value.retry_attempts} min={0} max={5} suffix="attempts" onChange={(n) => set('retry_attempts', n)} /></Field>
                    <Field label="Retry Interval" required><NumberInput value={value.retry_interval_seconds} min={1} max={60} suffix="seconds" onChange={(n) => set('retry_interval_seconds', n)} /></Field>
                </div>
                <p className="mt-3 text-[12px] text-slate-500">Failed requests are retried up to {value.retry_attempts} times, {value.retry_interval_seconds} seconds apart. Webhook signatures are always checked and all calls use HTTPS.</p>
            </Section>
        </div>
    );
}

/* ── 3. Business Account ─────────────────────────────────────────────────── */

const VERTICALS = [
    { value: 'EVENT_PLAN', label: 'Event Planning & Services' }, { value: 'ENTERTAIN', label: 'Entertainment' },
    { value: 'PROF_SERVICES', label: 'Professional Services' }, { value: 'OTHER', label: 'Other' },
];

export function BusinessTab({ value, onChange, wabaId }: TabProps<WaBusiness> & { wabaId: string }) {
    const set = <K extends keyof WaBusiness>(k: K, v: WaBusiness[K]) => onChange({ ...value, [k]: v });
    return (
        <div className="space-y-4">
            <Section title="Business Account Information" hint="Copy these from Meta Business Manager. Statuses are set by Meta; record them here.">
                <div className={grid2}>
                    <Field label="Business Portfolio Name" hint="Meta Business Manager name.">
                        <TextInput value={value.portfolio_name} maxLength={120} placeholder="EventInvit Technologies Pvt. Ltd." onChange={(e) => set('portfolio_name', e.target.value)} />
                    </Field>
                    <Field label="Business Portfolio ID" required hint="Business settings → Business info. Meta sets message limits per portfolio.">
                        <TextInput value={value.portfolio_id} inputMode="numeric" maxLength={25} placeholder="e.g. 732198765432109" onChange={(e) => set('portfolio_id', digitsOnly(e.target.value))} />
                    </Field>
                    <Field label="WhatsApp Business Account ID (WABA)" hint="Set on the API Configuration tab.">
                        <TextInput value={wabaId || 'Not set'} disabled />
                    </Field>
                    <Field label="Business Verification">
                        <div className="flex items-center gap-2">
                            <SelectInput className="flex-1" value={value.verification_status} onChange={(v) => set('verification_status', v as WaBusiness['verification_status'])} options={['verified', 'pending', 'not_verified', 'rejected'].map((x) => ({ value: x, label: cap(x) }))} />
                            <Pill tone={value.verification_status === 'verified' ? 'green' : value.verification_status === 'rejected' ? 'red' : 'amber'}>{cap(value.verification_status)}</Pill>
                        </div>
                    </Field>
                    <Field label="Display Name" hint="The name guests see on WhatsApp.">
                        <div className="flex items-center gap-2">
                            <TextInput className="flex-1" value={value.display_name} maxLength={80} placeholder="EventInvit" onChange={(e) => set('display_name', e.target.value)} />
                            <SelectInput className="w-32" value={value.display_name_status} onChange={(v) => set('display_name_status', v as WaBusiness['display_name_status'])} options={['approved', 'pending', 'rejected'].map((x) => ({ value: x, label: cap(x) }))} />
                        </div>
                    </Field>
                    <Field label="Account Quality Rating">
                        <div className="flex items-center gap-2">
                            <SelectInput className="flex-1" value={value.quality_rating} onChange={(v) => set('quality_rating', v as Quality)} options={QUALITY_OPTIONS} />
                            <Pill tone={QUALITY_TONE[value.quality_rating]}>{cap(value.quality_rating)}</Pill>
                        </div>
                    </Field>
                    <Field label="Category">
                        <SelectInput value={value.vertical} onChange={(v) => set('vertical', v as WaBusiness['vertical'])} options={VERTICALS} />
                    </Field>
                    <Field label="Timezone">
                        <SelectInput value={value.timezone} onChange={(v) => set('timezone', v)} options={[{ value: 'Asia/Kolkata', label: '(GMT+05:30) India Standard Time' }, { value: 'Asia/Dubai', label: '(GMT+04:00) Gulf Standard Time' }, { value: 'UTC', label: '(GMT+00:00) UTC' }]} />
                    </Field>
                </div>
            </Section>

            <Section title="Business Profile" hint="What guests see when they open your business info on WhatsApp.">
                <div className={grid2}>
                    <Field label="About" hint={`${value.about.length} / 139 (Meta limit)`}>
                        <TextInput value={value.about} maxLength={139} placeholder="Plan • Invite • Manage • Engage" onChange={(e) => set('about', e.target.value)} />
                    </Field>
                    <Field label="Website">
                        <TextInput value={value.website} maxLength={250} placeholder="https://www.eventinvit.com" onChange={(e) => set('website', e.target.value.trim())} />
                    </Field>
                    <Field label="Business Description" className="md:col-span-2" hint={`${value.profile_description.length} / 512`}>
                        <TextArea rows={2} maxLength={512} value={value.profile_description} placeholder="EventInvit is an event management platform…" onChange={(e) => set('profile_description', e.target.value)} />
                    </Field>
                    <Field label="Email">
                        <TextInput type="email" value={value.profile_email} maxLength={150} placeholder="support@eventinvit.com" onChange={(e) => set('profile_email', e.target.value.trim())} />
                    </Field>
                    <Field label="Address">
                        <TextInput value={value.address} maxLength={256} placeholder="Building, street, city, PIN" onChange={(e) => set('address', e.target.value)} />
                    </Field>
                </div>
            </Section>
        </div>
    );
}

/* ── 4. Sender Configuration ─────────────────────────────────────────────── */

const blankSender = (): WaSender => ({ display_name: '', phone_number: '+91', phone_number_id: '', purpose: '', verification: 'verified', quality: 'high', is_default: false });

function SenderDialog({ initial, onSave, onClose, takenIds }: {
    initial: WaSender | null; onSave: (s: WaSender) => void; onClose: () => void; takenIds: string[];
}) {
    const [s, setS] = React.useState<WaSender>(initial ?? blankSender());
    const [err, setErr] = React.useState('');
    const set = (p: Partial<WaSender>) => { setS((x) => ({ ...x, ...p })); setErr(''); };
    const submit = () => {
        if (!s.display_name.trim()) return setErr('Display name is required');
        if (!/^\+\d{8,15}$/.test(s.phone_number)) return setErr('Phone number must be in +91XXXXXXXXXX format');
        if (!/^\d{5,25}$/.test(s.phone_number_id)) return setErr('Phone Number ID: digits only, from WhatsApp Manager');
        if (takenIds.includes(s.phone_number_id)) return setErr('This Phone Number ID is already listed');
        onSave({ ...s, display_name: s.display_name.trim() });
    };
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{initial ? 'Edit Sender' : 'Add Sender'}</DialogTitle>
                    <DialogDescription>A WhatsApp phone number registered in your Meta account.</DialogDescription>
                </DialogHeader>
                <div className={cn(grid2, 'py-2')}>
                    <Field label="Display Name" required><TextInput autoFocus maxLength={80} value={s.display_name} placeholder="EventInvit Official" onChange={(e) => set({ display_name: e.target.value })} /></Field>
                    <Field label="Phone Number (E.164)" required><TextInput maxLength={16} value={s.phone_number} placeholder="+919876543210" onChange={(e) => set({ phone_number: '+' + digitsOnly(e.target.value) })} /></Field>
                    <Field label="Phone Number ID" required hint="WhatsApp Manager → Phone numbers (not the phone number itself)."><TextInput inputMode="numeric" maxLength={25} value={s.phone_number_id} placeholder="109876543210987" onChange={(e) => set({ phone_number_id: digitsOnly(e.target.value) })} /></Field>
                    <Field label="Messaging Purpose"><TextInput maxLength={120} value={s.purpose} placeholder="Event invites, reminders" onChange={(e) => set({ purpose: e.target.value })} /></Field>
                    <Field label="Verification"><SelectInput value={s.verification} onChange={(v) => set({ verification: v as WaSender['verification'] })} options={['verified', 'pending', 'not_verified'].map((x) => ({ value: x, label: cap(x) }))} /></Field>
                    <Field label="Quality"><SelectInput value={s.quality} onChange={(v) => set({ quality: v as Quality })} options={QUALITY_OPTIONS} /></Field>
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

export function SenderTab({ value, onChange }: TabProps<WaSenders>) {
    const [editing, setEditing] = React.useState<number | 'new' | null>(null);
    const items = value.items;
    const setItems = (next: WaSender[]) => {
        // Keep exactly one default while there are numbers; drop a fallback that no longer exists.
        let list = next;
        if (list.length && !list.some((s) => s.is_default)) list = list.map((s, i) => ({ ...s, is_default: i === 0 }));
        const fb = list.some((s) => s.phone_number_id === value.fallback_phone_number_id && !s.is_default) ? value.fallback_phone_number_id : '';
        onChange({ ...value, items: list, fallback_phone_number_id: fb });
    };
    const makeDefault = (i: number) => setItems(items.map((s, j) => ({ ...s, is_default: j === i })));
    const def = items.find((s) => s.is_default);
    const stats = [
        { label: 'Total Senders', n: items.length, hint: 'All configured numbers', icon: Phone, cls: 'text-blue-600' },
        { label: 'Verified Senders', n: items.filter((s) => s.verification === 'verified').length, hint: 'Verified in Meta', icon: CheckCircle2, cls: 'text-emerald-600' },
        { label: 'High Quality', n: items.filter((s) => s.quality === 'high').length, hint: 'Green rating', icon: Star, cls: 'text-amber-500' },
        { label: 'Incoming Messages', n: value.incoming_enabled ? 'On' : 'Off', hint: 'Guests can reply', icon: MessageSquare, cls: 'text-violet-600' },
    ];
    return (
        <div className="space-y-4">
            <div className={grid4}>
                {stats.map((c) => (
                    <div key={c.label} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                        <c.icon className={cn('mt-0.5 h-6 w-6', c.cls)} />
                        <div>
                            <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{c.label}</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-slate-50">{c.n}</div>
                            <div className="text-[11px] text-slate-500">{c.hint}</div>
                        </div>
                    </div>
                ))}
            </div>

            <Section
                title={`Senders (${items.length})`}
                hint="WhatsApp phone numbers, their purpose and messaging status."
                action={(
                    <button type="button" onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> Add Sender
                    </button>
                )}
            >
                {items.length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-slate-500">No phone numbers yet. Click <b>Add Sender</b>.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12.5px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[12px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900">
                                    <th className="px-2 py-2">Sender (Display Name)</th><th className="px-2 py-2">Phone Number</th><th className="px-2 py-2">Phone Number ID</th>
                                    <th className="px-2 py-2">Purpose</th><th className="px-2 py-2">Verification</th><th className="px-2 py-2">Quality</th><th className="px-2 py-2 text-center">Default</th><th className="px-2 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((s, i) => (
                                    <tr key={s.phone_number_id + i} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
                                        <td className="px-2 py-2.5">
                                            <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                                                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white"><MessageSquare className="h-3.5 w-3.5" /></span>
                                                {s.display_name}
                                                {s.is_default && <Pill tone="blue">Default</Pill>}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2.5">{s.phone_number}</td>
                                        <td className="px-2 py-2.5 font-mono text-[12px]">{s.phone_number_id}</td>
                                        <td className="px-2 py-2.5">{s.purpose || '—'}</td>
                                        <td className="px-2 py-2.5"><Pill tone={s.verification === 'verified' ? 'green' : 'amber'}>{cap(s.verification)}</Pill></td>
                                        <td className="px-2 py-2.5"><Pill tone={QUALITY_TONE[s.quality]}>{cap(s.quality)}</Pill></td>
                                        <td className="px-2 py-2.5 text-center"><input type="radio" name="wa-default" className="h-4 w-4 accent-blue-600" checked={s.is_default} onChange={() => makeDefault(i)} aria-label={`Make ${s.display_name} default`} /></td>
                                        <td className="whitespace-nowrap px-2 py-2.5 text-right">
                                            <button type="button" onClick={() => setEditing(i)} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" aria-label={`Edit ${s.display_name}`}><Pencil className="h-4 w-4" /></button>
                                            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${s.display_name}`}><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>

            <Section title="Sender Behaviour & Messaging Settings">
                <div className={grid2}>
                    <Field label="Default Sender" hint="Pick it with the Default column above.">
                        <TextInput disabled value={def ? `${def.display_name} (${def.phone_number})` : 'No sender yet'} />
                    </Field>
                    <Field label="Fallback Sender (Optional)" hint="Used if the default number is unavailable or throttled.">
                        <SelectInput
                            value={value.fallback_phone_number_id}
                            onChange={(v) => onChange({ ...value, fallback_phone_number_id: v })}
                            placeholder="None"
                            options={items.filter((s) => !s.is_default).map((s) => ({ value: s.phone_number_id, label: `${s.display_name} (${s.phone_number})` }))}
                        />
                    </Field>
                    <ToggleRow checked={value.incoming_enabled} onChange={(v) => onChange({ ...value, incoming_enabled: v })} title="Incoming Messages" hint="Allow guests to reply on WhatsApp (RSVP, questions). Replies open a free 24-hour reply window." />
                </div>
            </Section>

            {editing !== null && (
                <SenderDialog
                    initial={editing === 'new' ? null : items[editing]}
                    takenIds={items.filter((_, j) => j !== editing).map((x) => x.phone_number_id)}
                    onClose={() => setEditing(null)}
                    onSave={(s) => { setItems(editing === 'new' ? [...items, s] : items.map((x, j) => (j === editing ? { ...s, is_default: x.is_default } : x))); setEditing(null); }}
                />
            )}
        </div>
    );
}

