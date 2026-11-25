'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Banknote, CheckCircle2, ChevronRight, CircleDashed, FileText, FlaskConical, KeyRound, Loader2, Mail,
    MessageSquare, Radio as RadioIcon, RefreshCw, RotateCcw, Save, Settings, ShieldCheck, Webhook, XCircle, Zap, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/common/page-loader';
import {
    useMsg91Config, useRegenerateMsg91WebhookToken, useSaveMsg91Section, useTestMsg91Connection,
    type Msg91Config, type Msg91Section,
} from '@/hooks/use-msg91-config';
import { Pill, SideCard, formatDateTime } from './msg91-ui';
import { ApiTab, DltTab, GeneralTab, OtpTab, SmsTab } from './msg91-tabs-setup';
import { BalanceTab, EmailTab, TemplateMappingTab, TestTab, WebhookTab } from './msg91-tabs-delivery';

type TabId = 'general' | 'api' | 'sms' | 'otp' | 'dlt' | 'templates' | 'email' | 'webhook' | 'balance' | 'test';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; section: Msg91Section | null; title: string; sub: string }[] = [
    { id: 'general', label: 'General Settings', icon: Settings, section: 'general', title: 'General Settings', sub: 'Basic configuration and provider preferences for MSG91.' },
    { id: 'api', label: 'API Configuration', icon: KeyRound, section: 'api', title: 'API Configuration', sub: 'MSG91 auth key and request settings.' },
    { id: 'sms', label: 'SMS Configuration', icon: MessageSquare, section: 'sms', title: 'SMS Configuration', sub: 'SMS routes, sender IDs, message handling and delivery preferences.' },
    { id: 'otp', label: 'OTP Configuration', icon: ShieldCheck, section: 'otp', title: 'OTP Configuration', sub: 'One-time password settings for login and verification.' },
    { id: 'dlt', label: 'DLT Entity & Sender', icon: RadioIcon, section: 'dlt', title: 'DLT Entity & Sender Configuration', sub: 'Your Indian DLT registration and approved sender headers.' },
    { id: 'templates', label: 'DLT Template Mapping', icon: FileText, section: 'sms_templates', title: 'DLT Template Mapping', sub: 'Link each SMS to its MSG91 template and DLT-approved template (TRAI compliance).' },
    { id: 'email', label: 'Email Configuration', icon: Mail, section: 'email', title: 'Email Configuration', sub: 'Sender details, domain, tracking and MSG91 email templates.' },
    { id: 'webhook', label: 'Webhook Configuration', icon: Webhook, section: 'webhook', title: 'Webhook Configuration', sub: 'Callback URLs MSG91 calls with delivery reports and events.' },
    { id: 'balance', label: 'Balance & Credit Monitoring', icon: Banknote, section: 'alerts', title: 'Balance & Credit Monitoring', sub: 'Account balance and low-balance alerts.' },
    { id: 'test', label: 'Test Connection', icon: FlaskConical, section: null, title: 'Test Connection', sub: 'Check that MSG91 accepts the saved auth key.' },
];

type Drafts = { [K in Msg91Section]: Msg91Config[K] } & { is_active: boolean };

const draftsFrom = (c: Msg91Config): Drafts => ({
    general: c.general, api: { ...c.api, auth_key: '' }, sms: c.sms, otp: c.otp, dlt: c.dlt,
    sms_templates: c.sms_templates, email: c.email, webhook: c.webhook, alerts: c.alerts, is_active: c.is_active,
});

/** What the server stores for a tab (read-only fields left out), used both to save and to spot changes. */
const payloadOf = (section: Msg91Section, d: Drafts): Record<string, unknown> => {
    if (section === 'api') {
        const { timeout_seconds, retry_attempts, request_logging, auth_key } = d.api;
        return { timeout_seconds, retry_attempts, request_logging, ...(auth_key ? { auth_key } : {}) };
    }
    if (section === 'webhook') return { events: d.webhook.events };
    if (section === 'general') return { ...d.general, is_active: d.is_active };
    return d[section] as unknown as Record<string, unknown>;
};

function ConnectionPill({ status }: { status: Msg91Config['status']['connection_status'] }) {
    if (status === 'connected') return <Pill tone="green"><span className="h-2 w-2 rounded-full bg-emerald-500" />Connected</Pill>;
    if (status === 'error') return <Pill tone="red"><span className="h-2 w-2 rounded-full bg-rose-500" />Connection error</Pill>;
    return <Pill tone="gray"><span className="h-2 w-2 rounded-full bg-slate-400" />Not tested</Pill>;
}

export function Msg91ConfigContent() {
    const { data: config, isLoading, isError } = useMsg91Config();
    const save = useSaveMsg91Section();
    const test = useTestMsg91Connection();
    const regen = useRegenerateMsg91WebhookToken();
    const [tab, setTab] = React.useState<TabId>('general');
    const [drafts, setDrafts] = React.useState<Drafts | null>(null);
    const [saved, setSaved] = React.useState<Drafts | null>(null);

    // Fill drafts on first load; after a save only the saved tab is replaced, so unsaved edits on other tabs stay.
    React.useEffect(() => {
        if (config && !drafts) { const d = draftsFrom(config); setDrafts(d); setSaved(d); }
    }, [config, drafts]);

    if (isLoading || (!drafts && !isError)) return <PageLoader open />;
    if (isError || !config || !drafts || !saved) {
        return <div className="p-8 text-center text-sm text-rose-600">Could not load the MSG91 configuration. Check that you are signed in and the server is running.</div>;
    }

    const active = TABS.find((t) => t.id === tab)!;
    const isDirty = (section: Msg91Section) => JSON.stringify(payloadOf(section, drafts)) !== JSON.stringify(payloadOf(section, saved));
    const dirty = active.section ? isDirty(active.section) : false;

    const update = <K extends keyof Drafts>(k: K) => (v: Drafts[K]) => setDrafts((d) => (d ? { ...d, [k]: v } : d));

    const onSave = () => {
        if (!active.section) return;
        const section = active.section;
        save.mutate({ section, data: payloadOf(section, drafts) }, {
            onSuccess: (c) => {
                const fresh = draftsFrom(c);
                const patch = { [section]: fresh[section], ...(section === 'general' ? { is_active: fresh.is_active } : {}) };
                setDrafts((d) => (d ? { ...d, ...patch } : d));
                setSaved((s) => (s ? { ...s, ...patch } : s));
            },
        });
    };
    const onReset = () => {
        if (!active.section) return;
        const section = active.section;
        setDrafts((d) => (d ? { ...d, [section]: saved[section], ...(section === 'general' ? { is_active: saved.is_active } : {}) } : d));
    };
    // The test reads only status fields; webhook regen changes only URLs. Merge those without touching drafts.
    const onTest = () => test.mutate();
    const onRegen = () => regen.mutate(undefined, {
        onSuccess: (c) => {
            setDrafts((d) => (d ? { ...d, webhook: { ...d.webhook, urls: c.webhook.urls } } : d));
            setSaved((s) => (s ? { ...s, webhook: { ...s.webhook, urls: c.webhook.urls } } : s));
        },
    });

    const s = config.status;
    const channels = drafts.general.channels;

    return (
        <div className="space-y-4 pb-24">
            {/* Breadcrumb line */}
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <ArrowLeft className="h-4 w-4" />
                <span>Communication</span><ChevronRight className="h-3.5 w-3.5" />
                <span>Provider Management</span><ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-slate-800 dark:text-slate-100">MSG91 Configuration</span>
            </div>

            {/* Header card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md">
                        <Mail className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">MSG91 – Provider Configuration</h1>
                        <p className="text-[13.5px] text-slate-500">Configure and manage MSG91 for SMS, OTP and Email communications.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={drafts.is_active ? 'green' : 'gray'} className="px-3 py-1 text-[12.5px]">
                        <span className={cn('h-2 w-2 rounded-full', drafts.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                        {drafts.is_active ? 'Provider Active' : 'Provider Inactive'}
                    </Pill>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-[12.5px] text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        <RefreshCw className="h-3.5 w-3.5" /> Last saved: {formatDateTime(s.updated_at)}
                    </span>
                </div>
            </div>

            {/* Icon tab row */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex min-w-max">
                    {TABS.map((t) => {
                        const on = t.id === tab;
                        const changed = t.section ? isDirty(t.section) : false;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={cn(
                                    'relative flex w-[118px] flex-col items-center gap-1.5 border-b-[3px] px-2 py-3 text-center text-[12.5px] leading-tight transition',
                                    on ? 'border-sky-600 bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' : 'border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900',
                                )}
                            >
                                <t.icon className="h-5 w-5" />
                                {t.label}
                                {changed && <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* Main form card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-900">
                        <div className="flex items-start gap-3">
                            <active.icon className="mt-0.5 h-7 w-7 text-sky-600" />
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{active.title}</h2>
                                <p className="text-[13px] text-slate-500">{active.sub}</p>
                            </div>
                        </div>
                        <div className="hidden items-center gap-2 sm:flex">
                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-600 text-white"><Mail className="h-5 w-5" /></div>
                            <span className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">MSG91</span>
                        </div>
                    </div>

                    {tab === 'general' && <GeneralTab value={drafts.general} onChange={update('general')} isActive={drafts.is_active} onActiveChange={update('is_active')} />}
                    {tab === 'api' && <ApiTab value={drafts.api} onChange={update('api')} />}
                    {tab === 'sms' && <SmsTab value={drafts.sms} onChange={update('sms')} dlt={drafts.dlt} />}
                    {tab === 'otp' && <OtpTab value={drafts.otp} onChange={update('otp')} dlt={drafts.dlt} />}
                    {tab === 'dlt' && <DltTab value={drafts.dlt} onChange={update('dlt')} />}
                    {tab === 'templates' && <TemplateMappingTab value={drafts.sms_templates} onChange={update('sms_templates')} dlt={drafts.dlt} />}
                    {tab === 'email' && <EmailTab value={drafts.email} onChange={update('email')} />}
                    {tab === 'webhook' && <WebhookTab value={drafts.webhook} onChange={update('webhook')} onRegenerate={onRegen} regenerating={regen.isPending} />}
                    {tab === 'balance' && <BalanceTab value={drafts.alerts} onChange={update('alerts')} status={s} onRefresh={onTest} refreshing={test.isPending} />}
                    {tab === 'test' && <TestTab config={config} onTest={onTest} testing={test.isPending} />}
                </div>

                {/* Right column */}
                <div className="space-y-4">
                    <SideCard icon={Zap} title="Connection Status">
                        <div className={cn('flex items-center gap-3 rounded-xl p-3',
                            s.connection_status === 'connected' ? 'bg-emerald-50 dark:bg-emerald-950/30' : s.connection_status === 'error' ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-slate-900')}>
                            {s.connection_status === 'connected' ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : s.connection_status === 'error' ? <XCircle className="h-8 w-8 text-rose-600" /> : <CircleDashed className="h-8 w-8 text-slate-400" />}
                            <div className="min-w-0">
                                <ConnectionPill status={s.connection_status} />
                                <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">{s.last_test_message || 'Run a test to check the auth key.'}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-between text-[12.5px]">
                            <span className="text-slate-500">Last tested</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{formatDateTime(s.last_tested_at)}</span>
                        </div>
                        <div className="mt-1.5 flex justify-between text-[12.5px]">
                            <span className="text-slate-500">Auth key</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{config.api.has_auth_key ? config.api.auth_key_hint : 'Not saved'}</span>
                        </div>
                    </SideCard>

                    <SideCard
                        icon={Banknote}
                        title="Account & Balance"
                        action={(
                            <button type="button" onClick={onTest} disabled={test.isPending} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-2 py-1 text-[12px] font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60 dark:border-sky-900 dark:text-sky-300">
                                {test.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
                            </button>
                        )}
                    >
                        <div className="text-[12px] text-slate-500">Transactional SMS credits</div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.last_balance ? s.last_balance.transactional_sms.toLocaleString('en-IN') : '—'}</div>
                        <div className="text-[11.5px] text-slate-500">{s.last_balance ? `Fetched ${formatDateTime(s.last_balance.fetched_at)}` : 'Not fetched yet'}</div>
                        <p className="mt-2 text-[11px] leading-snug text-slate-400">From MSG91&apos;s balance API (transactional route). If your account uses MSG91 wallet credits this can read 0; check the MSG91 panel.</p>
                    </SideCard>

                    <SideCard icon={RadioIcon} title="Supported Channels">
                        <div className="grid grid-cols-2 gap-2">
                            {(['sms', 'otp', 'email', 'webhook'] as const).map((k) => (
                                <div key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 text-[12.5px] dark:border-slate-800">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{k === 'email' ? 'Email' : k === 'webhook' ? 'Webhook' : k.toUpperCase()}</span>
                                    <Pill tone={channels[k] ? 'green' : 'gray'}>{channels[k] ? 'On' : 'Off'}</Pill>
                                </div>
                            ))}
                        </div>
                    </SideCard>

                    <SideCard icon={Zap} title="Quick Actions">
                        <div className="space-y-2">
                            <button type="button" onClick={() => setTab('test')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                                <FlaskConical className="h-4 w-4" /> Test Connection
                            </button>
                            <a href="https://control.msg91.com" target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                                Open MSG91 Panel <ExternalLink className="h-4 w-4" />
                            </a>
                            <Link href="/admin/notifications/templates" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                                <FileText className="h-4 w-4" /> Message Templates
                            </Link>
                        </div>
                    </SideCard>
                </div>
            </div>

            {/* Bottom action bar */}
            <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3 shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                <button type="button" onClick={onReset} disabled={!dirty || save.isPending} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
                    <RotateCcw className="h-4 w-4" /> Reset
                </button>
                <div className="flex items-center gap-3">
                    {dirty && <span className="text-[12.5px] font-medium text-amber-600">Unsaved changes on this tab</span>}
                    <button type="button" onClick={onTest} disabled={test.isPending} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200">
                        {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Test Connection
                    </button>
                    {active.section && (
                        <button type="button" onClick={onSave} disabled={!dirty || save.isPending} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-teal-500 px-5 py-2 text-[13.5px] font-semibold text-white shadow hover:from-sky-700 hover:to-teal-600 disabled:opacity-50">
                            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
