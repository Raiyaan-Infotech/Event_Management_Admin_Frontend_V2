'use client';

import * as React from 'react';
import { Eye, EyeOff, Plus, Trash2, MessageSquare, ShieldCheck, Mail, Webhook } from 'lucide-react';
import type {
    DltSender, Msg91Api, Msg91Dlt, Msg91General, Msg91Otp, Msg91Sms,
} from '@/hooks/use-msg91-config';
import {
    Check, Field, InfoNote, LANG_OPTIONS, NumberInput, Pill, Radio, Section, SelectInput, TextArea, TextInput,
    Toggle, ToggleRow, grid2, grid3, grid4,
} from '../../_components/provider-ui';

type TabProps<T> = { value: T; onChange: (next: T) => void };

/** Approved DLT senders for a channel, as dropdown options. */
export const senderOptions = (dlt: Msg91Dlt, uses: DltSender['channel_use'][]) =>
    dlt.senders
        .filter((s) => uses.includes(s.channel_use) && s.status === 'approved')
        .map((s) => ({ value: s.sender_id, label: `${s.sender_id}${s.purpose ? ` — ${s.purpose}` : ''}` }));

/* ── 1. General Settings ─────────────────────────────────────────────────── */

const CHANNELS = [
    { key: 'sms', label: 'SMS', hint: 'Transactional & promotional SMS', icon: MessageSquare },
    { key: 'otp', label: 'OTP', hint: 'Login & verification codes', icon: ShieldCheck },
    { key: 'email', label: 'Email', hint: 'Transactional & notification emails', icon: Mail },
    { key: 'webhook', label: 'Webhook', hint: 'Delivery reports & status updates', icon: Webhook },
] as const;

export function GeneralTab({ value, onChange, isActive, onActiveChange }: TabProps<Msg91General> & {
    isActive: boolean; onActiveChange: (v: boolean) => void;
}) {
    const set = <K extends keyof Msg91General>(k: K, v: Msg91General[K]) => onChange({ ...value, [k]: v });
    return (
        <div className="space-y-4">
            <Section title="Provider Details">
                <div className={grid2}>
                    <Field label="Provider Name" required>
                        <TextInput value={value.provider_name} maxLength={60} onChange={(e) => set('provider_name', e.target.value)} />
                    </Field>
                    <Field label="Provider Type">
                        <TextInput value="Messaging Provider (SMS / OTP / Email)" disabled />
                    </Field>
                    <Field label="Status" hint="Saved only for now. Sending still uses the MSG91 keys in the server settings.">
                        <div className="flex items-center gap-2 pt-1">
                            <Toggle checked={isActive} onChange={onActiveChange} label="Provider active" />
                            <Pill tone={isActive ? 'green' : 'gray'}>{isActive ? 'Active' : 'Inactive'}</Pill>
                        </div>
                    </Field>
                    <Field label="Description">
                        <TextArea rows={2} maxLength={250} value={value.description} onChange={(e) => set('description', e.target.value)} />
                    </Field>
                </div>
            </Section>

            <Section title="Channels" hint="Which MSG91 services this platform uses.">
                <div className={grid4}>
                    {CHANNELS.map(({ key, label, hint, icon: Icon }) => {
                        const on = value.channels[key];
                        return (
                            <div key={key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                                        <Icon className="h-5 w-5 text-sky-600" /> {label}
                                    </div>
                                    <Toggle checked={on} onChange={(v) => set('channels', { ...value.channels, [key]: v })} label={label} />
                                </div>
                                <p className="mt-1.5 text-[11.5px] text-slate-500">{hint}</p>
                                <Pill tone={on ? 'green' : 'gray'} className="mt-2">{on ? 'Enabled' : 'Disabled'}</Pill>
                            </div>
                        );
                    })}
                </div>
            </Section>

            <Section title="Defaults">
                <div className={grid3}>
                    <Field label="Default Language">
                        <SelectInput value={value.default_language} onChange={(v) => set('default_language', v as Msg91General['default_language'])} options={LANG_OPTIONS} />
                    </Field>
                    <Field label="Time Zone" required>
                        <SelectInput
                            value={value.time_zone}
                            onChange={(v) => set('time_zone', v)}
                            options={[
                                { value: 'Asia/Kolkata', label: '(GMT+05:30) India Standard Time' },
                                { value: 'Asia/Dubai', label: '(GMT+04:00) Gulf Standard Time' },
                                { value: 'Asia/Singapore', label: '(GMT+08:00) Singapore Time' },
                                { value: 'Europe/London', label: '(GMT+00:00) London' },
                                { value: 'UTC', label: '(GMT+00:00) UTC' },
                            ]}
                        />
                    </Field>
                    <Field label="Default Priority">
                        <SelectInput value={value.default_priority} onChange={(v) => set('default_priority', v as Msg91General['default_priority'])} options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }]} />
                    </Field>
                </div>
            </Section>
        </div>
    );
}

/* ── 2. API Configuration ────────────────────────────────────────────────── */

export function ApiTab({ value, onChange }: TabProps<Msg91Api>) {
    const [show, setShow] = React.useState(false);
    const set = <K extends keyof Msg91Api>(k: K, v: Msg91Api[K]) => onChange({ ...value, [k]: v });
    return (
        <div className="space-y-4">
            <Section title="API Credentials">
                <div className={grid2}>
                    <Field
                        label="API Auth Key"
                        required
                        hint={value.has_auth_key
                            ? `Saved (${value.auth_key_hint}). Leave empty to keep it; type a new key to replace it.`
                            : 'MSG91 → API → Auth Key. Stored encrypted and never shown again in full.'}
                    >
                        <div className="relative">
                            <TextInput
                                type={show ? 'text' : 'password'}
                                autoComplete="off"
                                placeholder={value.has_auth_key ? '•••••••••••••••••••••••• (saved)' : 'Paste your MSG91 auth key'}
                                value={value.auth_key || ''}
                                onChange={(e) => set('auth_key', e.target.value.trim())}
                                className="pr-10"
                            />
                            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Hide key' : 'Show key'}>
                                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {value.auth_key_unreadable && (
                            <p className="text-[11.5px] font-medium text-rose-600">The saved key can't be read (server encryption key changed). Type it again.</p>
                        )}
                    </Field>
                    <Field label="API Base URL" hint="Fixed by MSG91, shown for reference.">
                        <TextInput value={value.base_url || 'https://control.msg91.com/api/v5/'} disabled />
                    </Field>
                </div>
            </Section>

            <Section title="Connection & Request Settings">
                <div className={grid3}>
                    <Field label="Timeout (Seconds)" required hint="Max time to wait for MSG91 to answer.">
                        <NumberInput value={value.timeout_seconds} min={5} max={60} onChange={(n) => set('timeout_seconds', n)} />
                    </Field>
                    <Field label="Retry Attempts" required hint="How many times to retry a failed request.">
                        <NumberInput value={value.retry_attempts} min={0} max={5} onChange={(n) => set('retry_attempts', n)} />
                    </Field>
                    <Field label="Request Logging" hint="Keep MSG91 requests and replies in the server log (keys are never logged).">
                        <div className="pt-1"><Toggle checked={value.request_logging} onChange={(v) => set('request_logging', v)} label="Request logging" /></div>
                    </Field>
                </div>
            </Section>
        </div>
    );
}

/* ── 3. SMS Configuration ────────────────────────────────────────────────── */

export function SmsTab({ value, onChange, dlt }: TabProps<Msg91Sms> & { dlt: Msg91Dlt }) {
    const set = <K extends keyof Msg91Sms>(k: K, v: Msg91Sms[K]) => onChange({ ...value, [k]: v });
    const tOpts = senderOptions(dlt, ['T', 'S']);
    const pOpts = senderOptions(dlt, ['P']);
    const noSenders = dlt.senders.length === 0;
    return (
        <div className="space-y-4">
            <Section title="SMS Service Settings">
                <div className={grid2}>
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <Check checked={value.transactional_enabled} onChange={(v) => set('transactional_enabled', v)} label="Transactional SMS" />
                            <Pill tone={value.transactional_enabled ? 'green' : 'gray'}>{value.transactional_enabled ? 'Enabled' : 'Disabled'}</Pill>
                        </div>
                        <p className="mt-1 pl-6 text-[11.5px] text-slate-500">Critical & time-sensitive messages</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <Check checked={value.promotional_enabled} onChange={(v) => set('promotional_enabled', v)} label="Promotional SMS" />
                            <Pill tone={value.promotional_enabled ? 'green' : 'gray'}>{value.promotional_enabled ? 'Enabled' : 'Disabled'}</Pill>
                        </div>
                        <p className="mt-1 pl-6 text-[11.5px] text-slate-500">Marketing & promotional messages (consent-based users only)</p>
                    </div>
                    <Field label="Default SMS Route" required>
                        <SelectInput value={value.default_route} onChange={(v) => set('default_route', v as Msg91Sms['default_route'])} options={[{ value: 'transactional', label: 'Transactional (Recommended)' }, { value: 'promotional', label: 'Promotional' }]} />
                    </Field>
                    <Field label="Default Sender ID (Transactional)" required info="Approved Transactional / Service senders from the DLT Entity & Sender tab.">
                        <SelectInput value={value.sender_transactional} onChange={(v) => set('sender_transactional', v)} options={tOpts} placeholder={tOpts.length ? 'Select sender' : 'No approved sender yet'} />
                    </Field>
                    <Field label="Default Sender ID (Promotional)" info="Approved Promotional senders from the DLT Entity & Sender tab.">
                        <SelectInput value={value.sender_promotional} onChange={(v) => set('sender_promotional', v)} options={pOpts} placeholder={pOpts.length ? 'Select sender' : 'No approved sender yet'} />
                    </Field>
                    <Field label="Unicode (Regional languages / Special characters)">
                        <ToggleRow checked={value.unicode} onChange={(v) => set('unicode', v)} title={value.unicode ? 'Enabled' : 'Disabled'} hint="Needed for Tamil, Hindi and other regional-language SMS. A Unicode SMS holds 70 characters instead of 160." />
                    </Field>
                </div>
                {noSenders && <div className="mt-3"><InfoNote tone="amber">Add your DLT-approved sender IDs on the <b>DLT Entity & Sender</b> tab first; they then appear in these dropdowns.</InfoNote></div>}
            </Section>

            <div className={grid2}>
                <Section title="DLT (Distributed Ledger Technology)">
                    <InfoNote>
                        <b>DLT usage notes</b>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            <li>Use only DLT-registered sender IDs and approved templates.</li>
                            <li>Transactional messages must use DLT templates (OTP, alerts, updates).</li>
                            <li>Promotional messages are allowed only for consent-based users.</li>
                            <li>An SMS whose text doesn&apos;t match its DLT template is dropped by the operator.</li>
                        </ul>
                    </InfoNote>
                </Section>
                <Section title="Message Length Handling">
                    <div className="space-y-3">
                        <Radio name="len" checked={value.length_mode === 'auto_split'} onChange={() => set('length_mode', 'auto_split')} title="Auto Split (Recommended)" hint="Long messages go as several SMS (160 characters per part)." />
                        <Radio name="len" checked={value.length_mode === 'truncate'} onChange={() => set('length_mode', 'truncate')} title="Truncate" hint="Cut the message at 160 characters." />
                        <div className="flex flex-wrap items-center gap-3">
                            <Radio name="len" checked={value.length_mode === 'custom'} onChange={() => set('length_mode', 'custom')} title="Custom Limit" />
                            <NumberInput value={value.custom_limit} min={160} max={1200} suffix="chars (max 1,200)" onChange={(n) => set('custom_limit', n)} />
                        </div>
                    </div>
                </Section>
            </div>

            <div className={grid2}>
                <Section title="Delivery Report (DLR) Options">
                    <div className="space-y-3">
                        <ToggleRow checked={value.dlr_enabled} onChange={(v) => set('dlr_enabled', v)} title="Request Delivery Report (DLR)" hint="Ask MSG91 for Delivered / Failed / Pending status." />
                        <div className="space-y-2 pl-14">
                            <Check checked={value.dlr_realtime} disabled={!value.dlr_enabled} onChange={(v) => set('dlr_realtime', v)} label="Update message status in real time" />
                            <Check checked={value.dlr_notify_failure} disabled={!value.dlr_enabled} onChange={(v) => set('dlr_notify_failure', v)} label="Notify on delivery failure" />
                        </div>
                    </div>
                </Section>
                <Section title="Working Hours (SMS Sending Window)">
                    <div className="space-y-3">
                        <ToggleRow checked={value.working_hours_enabled} onChange={(v) => set('working_hours_enabled', v)} title="Restrict SMS sending to working hours" hint="India allows promotional SMS only from 9 AM to 9 PM. OTP and transactional SMS are always sent." />
                        <div className={grid2}>
                            <Field label="From"><TextInput type="time" disabled={!value.working_hours_enabled} value={value.working_from} onChange={(e) => set('working_from', e.target.value)} /></Field>
                            <Field label="To"><TextInput type="time" disabled={!value.working_hours_enabled} value={value.working_to} onChange={(e) => set('working_to', e.target.value)} /></Field>
                        </div>
                    </div>
                </Section>
            </div>

            <Section title="Default Language">
                <div className="max-w-xs">
                    <SelectInput value={value.default_language} onChange={(v) => set('default_language', v as Msg91Sms['default_language'])} options={LANG_OPTIONS} />
                </div>
            </Section>
        </div>
    );
}

/* ── 4. OTP Configuration ────────────────────────────────────────────────── */

export function OtpTab({ value, onChange, dlt }: TabProps<Msg91Otp> & { dlt: Msg91Dlt }) {
    const set = <K extends keyof Msg91Otp>(k: K, v: Msg91Otp[K]) => onChange({ ...value, [k]: v });
    const oOpts = senderOptions(dlt, ['O', 'T', 'S']);
    return (
        <div className="space-y-4">
            <Section title="OTP Sender & Template">
                <div className={grid2}>
                    <Field label="Sender ID (OTP)" required info="Approved OTP / Transactional senders from the DLT Entity & Sender tab.">
                        <SelectInput value={value.sender_id} onChange={(v) => set('sender_id', v)} options={oOpts} placeholder={oOpts.length ? 'Select sender' : 'No approved sender yet'} />
                    </Field>
                    <Field label="MSG91 OTP Template ID" required hint="MSG91 → OTP → Templates. The ID MSG91 gives the template (not the DLT number).">
                        <TextInput value={value.msg91_template_id} maxLength={40} placeholder="e.g. 6654321a1b2c3d4e5f" onChange={(e) => set('msg91_template_id', e.target.value)} />
                    </Field>
                    <Field label="DLT Template ID" required hint="The number the DLT portal gave this OTP text.">
                        <TextInput value={value.dlt_template_id} inputMode="numeric" maxLength={25} placeholder="e.g. 1007654321098765432" onChange={(e) => set('dlt_template_id', e.target.value.replace(/\D/g, ''))} />
                    </Field>
                    <Field label="OTP Variable Name" hint="The variable in the template that holds the code, e.g. OTP or VAR1.">
                        <TextInput value={value.otp_variable} maxLength={30} onChange={(e) => set('otp_variable', e.target.value)} />
                    </Field>
                    <Field label="Android App Hash" hint="11 characters. Lets the Android app read the OTP SMS by itself (SMS Retriever). It must also be in the DLT template text.">
                        <TextInput value={value.app_hash} maxLength={11} placeholder="e.g. FA+9qCX9VSu" onChange={(e) => set('app_hash', e.target.value.trim())} />
                    </Field>
                </div>
            </Section>

            <Section title="OTP Channel & Fallback">
                <div className={grid2}>
                    <ToggleRow checked={value.sms_enabled} onChange={(v) => set('sms_enabled', v)} title="Enable SMS OTP" hint="Send OTP by SMS using MSG91." />
                    <ToggleRow checked={value.whatsapp_fallback} onChange={(v) => set('whatsapp_fallback', v)} title="WhatsApp OTP Fallback (Optional)" hint="If the SMS isn't received within the resend interval, the OTP can be sent on WhatsApp." />
                </div>
            </Section>

            <Section title="OTP Behaviour Settings">
                <div className={grid4}>
                    <Field label="OTP Length" required>
                        <SelectInput value={String(value.length)} onChange={(v) => set('length', v)} options={['4', '5', '6', '7', '8'].map((n) => ({ value: n, label: `${n} Digits` }))} />
                    </Field>
                    <Field label="OTP Validity (Expiry)" required>
                        <NumberInput value={value.validity_minutes} min={1} max={30} suffix="minutes" onChange={(n) => set('validity_minutes', n)} />
                    </Field>
                    <Field label="Resend Interval" required>
                        <NumberInput value={value.resend_seconds} min={15} max={300} suffix="seconds" onChange={(n) => set('resend_seconds', n)} />
                    </Field>
                    <Field label="Maximum Attempts" required>
                        <NumberInput value={value.max_attempts} min={1} max={10} suffix="attempts" onChange={(n) => set('max_attempts', n)} />
                    </Field>
                </div>
            </Section>

            <Section title="Security & Rate Limiting">
                <div className={grid2}>
                    <div className="space-y-3">
                        <ToggleRow checked={value.rate_limit_enabled} onChange={(v) => set('rate_limit_enabled', v)} title="Rate Limiting" hint="Limit how many OTPs one mobile number can get." />
                        <Field label="Max OTPs per Mobile">
                            <NumberInput value={value.rate_limit_per_hour} min={1} max={50} suffix="per hour" onChange={(n) => set('rate_limit_per_hour', n)} />
                        </Field>
                    </div>
                    <div className="space-y-3">
                        <ToggleRow checked={value.lockout_enabled} onChange={(v) => set('lockout_enabled', v)} title="Failed Attempt Lockout" hint="Block OTP requests for a while after the maximum wrong attempts." />
                        <Field label="Lockout Duration">
                            <NumberInput value={value.lockout_minutes} min={1} max={1440} suffix="minutes" onChange={(n) => set('lockout_minutes', n)} />
                        </Field>
                    </div>
                </div>
            </Section>
        </div>
    );
}

/* ── 5. DLT Entity & Sender Configuration ────────────────────────────────── */

const USE_LABEL: Record<DltSender['channel_use'], string> = { T: 'Transactional', P: 'Promotional', S: 'Service', O: 'OTP' };
const USE_TONE = { T: 'blue', P: 'violet', S: 'amber', O: 'green' } as const;
const blankSender = (): DltSender => ({ sender_id: '', channel_use: 'T', purpose: '', status: 'approved', approval_date: '' });

export function DltTab({ value, onChange }: TabProps<Msg91Dlt>) {
    const set = <K extends keyof Msg91Dlt>(k: K, v: Msg91Dlt[K]) => onChange({ ...value, [k]: v });
    const setSender = (i: number, patch: Partial<DltSender>) =>
        set('senders', value.senders.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    return (
        <div className="space-y-4">
            <Section title="DLT Entity Details">
                <div className={grid2}>
                    <Field label="DLT Entity ID (PE ID)" required hint="From your DLT portal registration (Jio / Airtel / Vi …).">
                        <TextInput value={value.entity_id} inputMode="numeric" maxLength={25} placeholder="e.g. 1201161234567890123" onChange={(e) => set('entity_id', e.target.value.replace(/\D/g, ''))} />
                    </Field>
                    <Field label="Principal Entity Name" required>
                        <TextInput value={value.entity_name} maxLength={150} placeholder="Registered company name" onChange={(e) => set('entity_name', e.target.value)} />
                    </Field>
                    <Field label="Registration Status">
                        <SelectInput value={value.registration_status} onChange={(v) => set('registration_status', v as Msg91Dlt['registration_status'])} options={[{ value: 'registered', label: 'Registered' }, { value: 'pending', label: 'Pending' }, { value: 'not_registered', label: 'Not registered' }]} />
                    </Field>
                    <div className={grid2}>
                        <Field label="DLT Registration Date"><TextInput type="date" value={value.registration_date} onChange={(e) => set('registration_date', e.target.value)} /></Field>
                        <Field label="Approval Date"><TextInput type="date" value={value.approval_date} onChange={(e) => set('approval_date', e.target.value)} /></Field>
                    </div>
                </div>
            </Section>

            <Section
                title="Sender Headers (DLT)"
                hint="Approved sender IDs (6 capital letters). The SMS and OTP tabs pick from this list."
                action={(
                    <button type="button" onClick={() => set('senders', [...value.senders, blankSender()])} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-sky-700">
                        <Plus className="h-4 w-4" /> Add Sender
                    </button>
                )}
            >
                {value.senders.length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-slate-500">No sender IDs yet. Click <b>Add Sender</b>.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-[13px]">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600 dark:border-slate-800">
                                    <th className="w-8 py-2">#</th><th className="py-2">Sender ID (Header)</th><th className="py-2">Channel Use</th>
                                    <th className="py-2">Description / Purpose</th><th className="py-2">Registration Status</th><th className="py-2">Approval Date</th><th className="w-10 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {value.senders.map((s, i) => (
                                    <tr key={i} className="border-b border-slate-100 align-middle last:border-0 dark:border-slate-900">
                                        <td className="py-2 text-slate-500">{i + 1}</td>
                                        <td className="py-2 pr-2"><TextInput className="w-28 font-semibold uppercase" maxLength={6} value={s.sender_id} placeholder="EVNTIT" onChange={(e) => setSender(i, { sender_id: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></td>
                                        <td className="py-2 pr-2">
                                            <div className="flex items-center gap-2">
                                                <Pill tone={USE_TONE[s.channel_use]} className="w-6 justify-center px-0">{s.channel_use}</Pill>
                                                <SelectInput className="w-36" value={s.channel_use} onChange={(v) => setSender(i, { channel_use: v as DltSender['channel_use'] })} options={(['T', 'P', 'S', 'O'] as const).map((u) => ({ value: u, label: USE_LABEL[u] }))} />
                                            </div>
                                        </td>
                                        <td className="py-2 pr-2"><TextInput value={s.purpose} maxLength={120} placeholder="e.g. Event & ticket notifications" onChange={(e) => setSender(i, { purpose: e.target.value })} /></td>
                                        <td className="py-2 pr-2"><SelectInput className="w-32" value={s.status} onChange={(v) => setSender(i, { status: v as DltSender['status'] })} options={[{ value: 'approved', label: 'Approved' }, { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }]} /></td>
                                        <td className="py-2 pr-2"><TextInput type="date" className="w-36" value={s.approval_date} onChange={(e) => setSender(i, { approval_date: e.target.value })} /></td>
                                        <td className="py-2 text-right">
                                            <button type="button" onClick={() => set('senders', value.senders.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove sender"><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="mt-2 text-[12px] text-slate-500">Showing {value.senders.length} sender{value.senders.length === 1 ? '' : 's'} · T = Transactional, P = Promotional, S = Service, O = OTP</p>
            </Section>
        </div>
    );
}
