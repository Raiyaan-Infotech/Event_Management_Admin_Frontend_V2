'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Eye, Mail, MessageCircle, Pencil, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { cn } from '@/lib/utils';
import { useNotificationTemplate, useSystemTriggers } from '@/hooks/use-notification-templates';
import {
    AUDIENCE_LABELS,
    EmailPreview,
    InAppPreview,
    MAIN_CHANNELS,
    WA_CATEGORY_LABELS,
    WhatsAppPreview,
    formatDateTime,
    templateCode,
} from '../_components/template-shared';
import { SendTestDialog, StatusPill } from '../_components/send-test-dialog';

const BASE = '/admin/notifications/templates';
type Tab = 'overview' | 'email' | 'whatsapp' | 'in_app';

export default function TemplateDetailsPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = Number(params?.id) || undefined;

    const { data: t, isLoading } = useNotificationTemplate(id);
    const { data: catalog } = useSystemTriggers();
    const [tab, setTab] = useState<Tab>('overview');
    const [testOpen, setTestOpen] = useState(false);

    const trigger = useMemo(() => catalog?.triggers.find((x) => x.key === t?.trigger_key), [catalog, t]);

    const has = (c: string) => !!t?.channels?.includes(c as never);
    const tabs: { key: Tab; label: string; icon: typeof Eye }[] = [
        { key: 'overview', label: 'Overview', icon: Eye },
        ...(has('email') ? [{ key: 'email' as Tab, label: 'Email', icon: Mail }] : []),
        ...(has('whatsapp') ? [{ key: 'whatsapp' as Tab, label: 'WhatsApp', icon: MessageCircle }] : []),
        ...(has('in_app') ? [{ key: 'in_app' as Tab, label: 'In-App & Push', icon: Bell }] : []),
    ];


    const firstPreview = has('email') ? 'email' : has('whatsapp') ? 'whatsapp' : 'in_app';

    return (
        <PermissionGuard permission="notification_templates.view">
            <div className="space-y-5">
                <PageLoader open={isLoading} />

                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Eye className="h-6 w-6" /></span>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-foreground">View Template Details</h1>
                            <p className="text-xs text-muted-foreground">The selected template, its channel content and how it is mapped.</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => router.push(BASE)} className="h-9 gap-2"><ArrowLeft className="h-4 w-4" /> Back to List</Button>
                </div>

                {!isLoading && !t && (
                    <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">This template was not found. It may have been deleted.</CardContent></Card>
                )}

                {t && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {tabs.map((x) => (
                                <button key={x.key} type="button" onClick={() => setTab(x.key)}
                                    className={cn('inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium',
                                        tab === x.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted')}>
                                    <x.icon className="h-4 w-4" /> {x.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                            <div className="space-y-5">
                                {tab === 'overview' && (
                                    <>
                                        <InfoCard title="Template Information" rows={[
                                            ['Template Name', t.name],
                                            ['Template ID', templateCode(t)],
                                            ['Category', t.notificationCategory?.name ?? '—'],
                                            ['Audience', t.audience ? AUDIENCE_LABELS[t.audience] : '—'],
                                            ['Status', <StatusPill key="s" active={!!Number(t.is_active)} />],
                                            ['Last Updated', formatDateTime(t.updated_at || t.created_at)],
                                        ]} />
                                        <InfoCard title="Mapped Trigger & Channels" rows={[
                                            ['Trigger', trigger ? trigger.label : t.trigger_key ?? 'Not mapped'],
                                            ...MAIN_CHANNELS.map((c) => [c.label, has(c.key)
                                                ? <span key={c.key} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                    Included
                                                </span>
                                                : <span key={c.key} className="text-xs text-muted-foreground">Not used</span>] as [string, React.ReactNode]),
                                        ]} />
                                    </>
                                )}

                                {tab === 'email' && (
                                    <InfoCard title="Email" rows={[
                                        ['Subject', t.email_subject || '—'],
                                    ]} />
                                )}

                                {tab === 'whatsapp' && (
                                    <InfoCard title="WhatsApp" rows={[
                                        ['Category', t.whatsapp_category ? WA_CATEGORY_LABELS[t.whatsapp_category] : '—'],
                                        ['Header', t.whatsapp_header_type === 'text' ? t.whatsapp_header_text || '—' : 'None'],
                                        ['Message', <span key="b" className="whitespace-pre-wrap">{t.whatsapp_body || '—'}</span>],
                                        ['Footer', t.whatsapp_footer || '—'],
                                        ['Buttons', (t.whatsapp_buttons ?? []).length ? (t.whatsapp_buttons ?? []).map((b) => b.type === 'copy_code' ? 'Copy code' : `${b.text} → ${b.url}`).join(' · ') : 'None'],
                                    ]} />
                                )}

                                {tab === 'in_app' && (
                                    <InfoCard title="In-App & Push" rows={[
                                        ['Title', t.title || '—'],
                                        ['Message', t.content || '—'],
                                        ['Deep link', t.action_url || '—'],
                                        ['Image', t.image_url ? 'Attached' : 'None'],
                                    ]} />
                                )}
                            </div>

                            <div className="space-y-4">
                                {(() => {
                                    const which = tab === 'email' || tab === 'whatsapp' || tab === 'in_app' ? tab : firstPreview;
                                    return (
                                        <Card className="border-border bg-muted/30 shadow-xs">
                                            <CardContent className="space-y-3 p-4">
                                                <div className="text-sm font-bold">
                                                    {which === 'email' ? 'Email Preview' : which === 'whatsapp' ? 'WhatsApp Preview' : 'In-App Preview'}
                                                </div>
                                                {which === 'email' && <EmailPreview data={t} values={t.sample_values} />}
                                                {which === 'whatsapp' && <WhatsAppPreview data={t} values={t.sample_values} />}
                                                {which === 'in_app' && <InAppPreview data={{ ...t, push: has('push') }} values={t.sample_values} />}
                                            </CardContent>
                                        </Card>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                            <Button variant="outline" onClick={() => router.push(BASE)} className="h-10 gap-2"><ArrowLeft className="h-4 w-4" /> Back to List</Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setTestOpen(true)} className="h-10 gap-2"><Send className="h-4 w-4" /> Send Test Message</Button>
                                <Button onClick={() => router.push(`${BASE}/create?id=${t.id}`)} disabled={!!t.has_pending_approval} className="h-10 gap-2"><Pencil className="h-4 w-4" /> Edit Template</Button>
                            </div>
                        </div>

                        <SendTestDialog templateId={testOpen ? t.id : null} open={testOpen} onOpenChange={setTestOpen} />
                    </>
                )}
            </div>
        </PermissionGuard>
    );
}

function InfoCard({ title, rows }: { title: string; rows: [React.ReactNode, React.ReactNode][] }) {
    return (
        <Card className="overflow-hidden border-border bg-card shadow-xs">
            <div className="border-b border-border bg-pink-50/70 px-4 py-3 text-sm font-bold dark:bg-pink-950/20">{title}</div>
            <CardContent className="divide-y divide-border/70 px-4 py-1">
                {rows.map(([label, value], i) => (
                    <div key={i} className="grid grid-cols-[180px_1fr] gap-4 py-2.5 text-sm">
                        <span className="font-medium text-foreground">{label}</span>
                        <span className="min-w-0 break-words text-muted-foreground">{value}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
