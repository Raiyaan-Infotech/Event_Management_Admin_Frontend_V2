'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    Briefcase, CheckCircle2, CircleDashed, Code2, ExternalLink, FileText, FlaskConical, Gauge, Home, Layers, Loader2,
    MessageCircle, PiggyBank, Play, Save, Settings, Smartphone, Webhook, XCircle, Zap, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/common/page-loader';
import {
    useRegenerateWhatsAppVerifyToken, useSaveWhatsAppSection, useTestWhatsAppConnection, useWhatsAppConfig,
    type WaSection, type WhatsAppConfig,
} from '@/hooks/use-whatsapp-config';
import { Pill, SideCard, Toggle, formatDateTime } from '../../_components/provider-ui';
import { ApiTab, BusinessTab, GeneralTab, SenderTab } from './whatsapp-tabs-account';
import { BudgetTab, CATEGORY_LABEL, LimitsTab, TemplatesTab, TestTab, WebhookTab } from './whatsapp-tabs-messaging';

type TabId = 'general' | 'api' | 'business' | 'senders' | 'templates' | 'webhook' | 'limits' | 'budget' | 'test';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; section: WaSection | null; title: string; sub: string }[] = [
    { id: 'general', label: 'General Settings', icon: Settings, section: 'general', title: 'General Settings', sub: 'Basic configuration for Meta WhatsApp Cloud API.' },
    { id: 'api', label: 'API Configuration', icon: Code2, section: 'api', title: 'API Configuration', sub: 'Meta Graph API version, app credentials and request settings.' },
    { id: 'business', label: 'Business Account', icon: Briefcase, section: 'business', title: 'Business Account', sub: 'Meta Business Portfolio, verification and the business profile guests see.' },
    { id: 'senders', label: 'Sender Configuration', icon: Smartphone, section: 'senders', title: 'Sender Configuration', sub: 'WhatsApp phone numbers, their purpose and messaging settings.' },
    { id: 'templates', label: 'Template Sync', icon: Layers, section: 'templates', title: 'Template Synchronization', sub: 'Meta-approved WhatsApp templates and the key the app uses for each.' },
    { id: 'webhook', label: 'Webhook', icon: Webhook, section: 'webhook', title: 'Webhook Configuration', sub: 'Receive message replies, delivery status and account changes from Meta.' },
    { id: 'limits', label: 'Messaging Limits', icon: Gauge, section: 'limits', title: 'Messaging Limits', sub: 'Meta tier, our sending speed, event caps and protection rules.' },
    { id: 'budget', label: 'Budget', icon: PiggyBank, section: 'budget', title: 'Budget Configuration', sub: 'Spending limits, alerts and the cost per message.' },
    { id: 'test', label: 'Test Connection', icon: FlaskConical, section: null, title: 'Test Connection', sub: 'Check the saved token and phone number with Meta.' },
];

type Drafts = { [K in WaSection]: WhatsAppConfig[K] } & { is_active: boolean };

const draftsFrom = (c: WhatsAppConfig): Drafts => ({
    general: c.general, api: { ...c.api, app_secret: '', access_token: '' }, business: c.business, senders: c.senders,
    templates: c.templates, webhook: c.webhook, limits: c.limits, budget: c.budget, is_active: c.is_active,
});

/** What the server stores for a tab (read-only fields left out). */
const payloadOf = (section: WaSection, d: Drafts): Record<string, unknown> => {
    if (section === 'api') {
        const { graph_version, app_id, waba_id, timeout_seconds, retry_attempts, retry_interval_seconds, app_secret, access_token } = d.api;
        return { graph_version, app_id, waba_id, timeout_seconds, retry_attempts, retry_interval_seconds, ...(app_secret ? { app_secret } : {}), ...(access_token ? { access_token } : {}) };
    }
    if (section === 'webhook') return { events: d.webhook.events };
    if (section === 'general') return { ...d.general, is_active: d.is_active };
    return d[section] as unknown as Record<string, unknown>;
};

const TIER_LABEL: Record<string, string> = { '250': '250', '1000': '1,000', '10000': '10,000', '100000': '100,000', unlimited: 'Unlimited' };

export function WhatsAppConfigContent() {
    const { data: config, isLoading, isError } = useWhatsAppConfig();
    const save = useSaveWhatsAppSection();
    const test = useTestWhatsAppConnection();
    const regen = useRegenerateWhatsAppVerifyToken();
    const [tab, setTab] = React.useState<TabId>('general');
    const [drafts, setDrafts] = React.useState<Drafts | null>(null);
    const [saved, setSaved] = React.useState<Drafts | null>(null);

    React.useEffect(() => {
        if (config && !drafts) { const d = draftsFrom(config); setDrafts(d); setSaved(d); }
    }, [config, drafts]);

    if (isLoading || (!drafts && !isError)) return <PageLoader open />;
    if (isError || !config || !drafts || !saved) {
        return <div className="p-8 text-center text-sm text-rose-600">Could not load the WhatsApp configuration. Check that you are signed in and the server is running.</div>;
    }

    const active = TABS.find((t) => t.id === tab)!;
    const isDirty = (section: WaSection) => JSON.stringify(payloadOf(section, drafts)) !== JSON.stringify(payloadOf(section, saved));
    const dirty = active.section ? isDirty(active.section) : false;
    const update = <K extends keyof Drafts>(k: K) => (v: Drafts[K]) => setDrafts((d) => (d ? { ...d, [k]: v } : d));

    const commit = (section: WaSection, c: WhatsAppConfig) => {
        const fresh = draftsFrom(c);
        const patch = { [section]: fresh[section], ...(section === 'general' ? { is_active: fresh.is_active } : {}) };
        setDrafts((d) => (d ? { ...d, ...patch } : d));
        setSaved((s) => (s ? { ...s, ...patch } : s));
    };
    const onSave = () => {
        if (!active.section) return;
        const section = active.section;
        save.mutate({ section, data: payloadOf(section, drafts) }, { onSuccess: (c) => commit(section, c) });
    };
    const onDiscard = () => {
        if (!active.section) return;
        const section = active.section;
        setDrafts((d) => (d ? { ...d, [section]: saved[section], ...(section === 'general' ? { is_active: saved.is_active } : {}) } : d));
    };
    // "Provider Enabled" in the header saves straight away (it's the General tab's is_active).
    const onToggleEnabled = (v: boolean) => {
        const d = { ...saved, is_active: v };
        setDrafts((x) => (x ? { ...x, is_active: v } : x));
        save.mutate({ section: 'general', data: { ...d.general, is_active: v } }, {
            onSuccess: (c) => { setSaved((s) => (s ? { ...s, is_active: c.is_active } : s)); },
            onError: () => setDrafts((x) => (x ? { ...x, is_active: saved.is_active } : x)),
        });
    };
    const onTest = () => test.mutate();
    const onRegen = () => regen.mutate(undefined, {
        onSuccess: (c) => {
            setDrafts((d) => (d ? { ...d, webhook: { ...d.webhook, verify_token: c.webhook.verify_token } } : d));
            setSaved((s) => (s ? { ...s, webhook: { ...s.webhook, verify_token: c.webhook.verify_token } } : s));
        },
    });

    const s = config.status;
    const statusPill = s.connection_status === 'connected'
        ? <Pill tone="green"><span className="h-2 w-2 rounded-full bg-emerald-500" />Connected</Pill>
        : s.connection_status === 'error'
            ? <Pill tone="red"><span className="h-2 w-2 rounded-full bg-rose-500" />Connection error</Pill>
            : <Pill tone="gray"><span className="h-2 w-2 rounded-full bg-slate-400" />Not tested</Pill>;
    const b = drafts.budget;

    return (
        <div className="space-y-4 pb-24">
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <Home className="h-4 w-4" /><ChevronRight className="h-3.5 w-3.5" />
                <span>Communication</span><ChevronRight className="h-3.5 w-3.5" />
                <span>Provider Management</span><ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-slate-800 dark:text-slate-100">Meta WhatsApp Configuration</span>
            </div>

            <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-md"><MessageCircle className="h-8 w-8" /></div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Meta WhatsApp Cloud API Configuration</h1>
                    <p className="text-[13.5px] text-slate-500">Configure and manage your Meta WhatsApp Business Platform (Cloud API) for event communications.</p>
                </div>
            </div>

            {/* Provider strip */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 md:grid-cols-6 md:items-center">
                <div className="col-span-2 md:col-span-1">
                    <div className="text-xl font-extrabold tracking-tight text-blue-700 dark:text-blue-300">∞ Meta</div>
                    <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">WhatsApp Cloud API</div>
                </div>
                <div><div className="text-[12px] text-slate-500">Provider</div><div className="text-[13px] font-medium">Meta (WhatsApp Business Platform)</div></div>
                <div><div className="text-[12px] text-slate-500">Status</div>{statusPill}</div>
                <div><div className="text-[12px] text-slate-500">Graph API</div><div className="text-[13px] font-medium">{saved.api.graph_version}</div></div>
                <div><div className="text-[12px] text-slate-500">Last Tested</div><div className="text-[13px] font-medium">{formatDateTime(s.last_tested_at)}</div></div>
                <div className="flex items-center gap-3 md:justify-end">
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Provider Enabled</span>
                    <Toggle checked={drafts.is_active} onChange={onToggleEnabled} disabled={save.isPending} label="Provider enabled" />
                </div>
            </div>

            {/* Pill tabs */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex min-w-max gap-0.5">
                    {TABS.map((t) => {
                        const on = t.id === tab;
                        const changed = t.section ? isDirty(t.section) : false;
                        return (
                            <button key={t.id} type="button" onClick={() => setTab(t.id)}
                                className={cn('relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition',
                                    on ? 'bg-blue-600 text-white shadow' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900')}>
                                <t.icon className="h-4 w-4" />{t.label}
                                {changed && <span className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-4 flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-slate-900">
                        <active.icon className="mt-0.5 h-7 w-7 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{active.title}</h2>
                            <p className="text-[13px] text-slate-500">{active.sub}</p>
                        </div>
                    </div>
                    {tab === 'general' && <GeneralTab value={drafts.general} onChange={update('general')} />}
                    {tab === 'api' && <ApiTab value={drafts.api} onChange={update('api')} />}
                    {tab === 'business' && <BusinessTab value={drafts.business} onChange={update('business')} wabaId={saved.api.waba_id} />}
                    {tab === 'senders' && <SenderTab value={drafts.senders} onChange={update('senders')} />}
                    {tab === 'templates' && <TemplatesTab value={drafts.templates} onChange={update('templates')} />}
                    {tab === 'webhook' && <WebhookTab value={drafts.webhook} onChange={update('webhook')} onRegenerate={onRegen} regenerating={regen.isPending} />}
                    {tab === 'limits' && <LimitsTab value={drafts.limits} onChange={update('limits')} />}
                    {tab === 'budget' && <BudgetTab value={drafts.budget} onChange={update('budget')} />}
                    {tab === 'test' && <TestTab config={config} onTest={onTest} testing={test.isPending} />}
                </div>

                <div className="space-y-4">
                    <div className={cn('rounded-xl border p-4 shadow-sm',
                        s.connection_status === 'connected' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                            : s.connection_status === 'error' ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950')}>
                        <div className="flex items-start gap-3">
                            {s.connection_status === 'connected' ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : s.connection_status === 'error' ? <XCircle className="h-8 w-8 text-rose-600" /> : <CircleDashed className="h-8 w-8 text-slate-400" />}
                            <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Connection Status</div>
                                <div className={cn('text-xl font-bold', s.connection_status === 'connected' ? 'text-emerald-700' : s.connection_status === 'error' ? 'text-rose-700' : 'text-slate-600')}>
                                    {s.connection_status === 'connected' ? 'Connected' : s.connection_status === 'error' ? 'Not connected' : 'Not tested'}
                                </div>
                                <p className="text-[12px] text-slate-600 dark:text-slate-300">{s.last_test_message || 'Save the token and a default sender, then run a test.'}</p>
                                <p className="mt-1 text-[11.5px] text-slate-500">Last tested: {formatDateTime(s.last_tested_at)}</p>
                            </div>
                        </div>
                        <button type="button" onClick={onTest} disabled={test.isPending} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                            {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Test Connection
                        </button>
                    </div>

                    <SideCard icon={Gauge} title="Messaging Limits">
                        <dl className="space-y-1.5 text-[12.5px]">
                            <div className="flex justify-between"><dt className="text-slate-500">Current tier</dt><dd><Pill tone="green">{TIER_LABEL[saved.limits.tier]} / 24 h</Pill></dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Meta throughput</dt><dd className="font-medium">{saved.limits.throughput} / second</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Our speed</dt><dd className="font-medium">{saved.limits.max_per_second} / second</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Per event per day</dt><dd className="font-medium">{saved.limits.max_per_event_day.toLocaleString('en-IN')}</dd></div>
                        </dl>
                    </SideCard>

                    <SideCard icon={PiggyBank} title="Budget Configuration">
                        <dl className="space-y-1.5 text-[12.5px]">
                            <div className="flex justify-between"><dt className="text-slate-500">Daily limit</dt><dd className="font-medium">₹{b.daily_limit.toLocaleString('en-IN')}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Monthly cap</dt><dd className="font-medium">₹{b.monthly_cap.toLocaleString('en-IN')}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Alert at</dt><dd className="font-medium">{b.alert_percent}%</dd></div>
                            {(Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((c) => (
                                <div key={c} className="flex justify-between"><dt className="text-slate-500">{CATEGORY_LABEL[c]} rate</dt><dd className="font-medium">{b.rates[c] ? `₹${b.rates[c]}` : 'Not set'}</dd></div>
                            ))}
                        </dl>
                    </SideCard>

                    <SideCard icon={Zap} title="Quick Actions">
                        <div className="space-y-2">
                            <a href="https://business.facebook.com/wa/manage/home/" target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                                Open WhatsApp Manager <ExternalLink className="h-4 w-4" />
                            </a>
                            <Link href="/admin/communication/providers/msg91" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                                MSG91 Provider
                            </Link>
                            <Link href="/admin/notifications/templates" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                                <FileText className="h-4 w-4" /> Message Templates
                            </Link>
                        </div>
                    </SideCard>
                </div>
            </div>

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3 shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                {dirty && <span className="mr-auto text-[12.5px] font-medium text-amber-600">Unsaved changes on this tab</span>}
                <button type="button" onClick={onDiscard} disabled={!dirty || save.isPending} className="rounded-lg border border-slate-300 px-5 py-2 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
                    Discard Changes
                </button>
                {active.section && (
                    <button type="button" onClick={onSave} disabled={!dirty || save.isPending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-[13.5px] font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50">
                        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Configuration
                    </button>
                )}
            </div>
        </div>
    );
}
