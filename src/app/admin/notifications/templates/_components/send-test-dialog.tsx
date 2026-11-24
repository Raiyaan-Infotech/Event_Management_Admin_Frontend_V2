'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, MinusCircle, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    useNotificationTemplate,
    useTestSendNotificationTemplate,
    type NotificationChannel,
    type TestSendResult,
} from '@/hooks/use-notification-templates';
import { AUDIENCE_LABELS, MAIN_CHANNELS, placeholdersIn, sampleFor, templateCode } from './template-shared';

interface Props {
    templateId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * "Send Test Message": sends the template to test recipients only — the
 * production trigger mapping is untouched. Each channel reports its own
 * outcome (sent / failed with the provider's reason / skipped with why).
 */
export function SendTestDialog({ templateId, open, onOpenChange }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] max-w-[620px] overflow-y-auto p-0">
                {templateId !== null && open && <SendTestBody key={templateId} templateId={templateId} onClose={() => onOpenChange(false)} />}
            </DialogContent>
        </Dialog>
    );
}

function SendTestBody({ templateId, onClose }: { templateId: number; onClose: () => void }) {
    const { data: t, isLoading } = useNotificationTemplate(templateId);
    const testSend = useTestSendNotificationTemplate();

    const [picked, setPicked] = useState<NotificationChannel[] | null>(null);
    const [email, setEmail] = useState('');
    const [dialCode, setDialCode] = useState('91');
    const [mobile, setMobile] = useState('');
    const [samples, setSamples] = useState<Record<string, string>>({});
    const [results, setResults] = useState<Record<string, TestSendResult> | null>(null);

    const available = MAIN_CHANNELS.filter((c) => t?.channels?.includes(c.key));
    const channels = picked ?? available.map((c) => c.key);
    const toggle = (key: NotificationChannel) =>
        setPicked(channels.includes(key) ? channels.filter((c) => c !== key) : [...channels, key]);

    const vars = t
        ? placeholdersIn(
            channels.includes('email') ? t.email_subject : '', channels.includes('email') ? t.email_heading : '',
            channels.includes('email') ? t.email_body : '', channels.includes('whatsapp') ? t.whatsapp_body : '',
            channels.includes('in_app') ? t.title : '', channels.includes('in_app') ? t.content : '',
        ).slice(0, 8)
        : [];

    const submit = () => {
        if (!t) return;
        const sample_values: Record<string, string> = {};
        vars.forEach((k) => { sample_values[k] = samples[k] ?? sampleFor(k, t.sample_values); });
        testSend.mutate(
            {
                id: t.id,
                data: {
                    channels,
                    email: email.trim() || undefined,
                    dial_code: dialCode.replace(/\D/g, '') || '91',
                    mobile: mobile.trim() || undefined,
                    sample_values,
                },
            },
            { onSuccess: setResults },
        );
    };

    const needEmail = channels.includes('email');
    const needWa = channels.includes('whatsapp');
    const canSend = channels.length > 0 && (!needEmail || email.trim()) && (!needWa || mobile.trim());

    return (
        <>
            <DialogHeader className="border-b border-border bg-pink-50/60 px-5 py-4 text-left dark:bg-pink-950/20">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Send className="h-5 w-5" /></span>
                    <div>
                        <DialogTitle className="text-base font-bold">Send Test Message</DialogTitle>
                        <DialogDescription className="text-xs">Preview delivery across the selected channels.</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div className="space-y-4 px-5 py-4">
                {isLoading || !t ? (
                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading template…</div>
                ) : (
                    <>
                        <div className="rounded-lg border border-border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-foreground">{t.name}</span>
                                <StatusPill active={!!Number(t.is_active)} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {templateCode(t)} · {t.audience ? AUDIENCE_LABELS[t.audience] : 'No audience'} · {available.map((c) => c.label).join(' · ')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Test Channels <span className="text-destructive">*</span></Label>
                            <div className="flex flex-wrap gap-4">
                                {available.map((c) => (
                                    <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
                                        <Checkbox checked={channels.includes(c.key)} onCheckedChange={() => toggle(c.key)} />
                                        {c.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {needEmail && (
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Test Email <span className="text-destructive">*</span></Label>
                                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-10" />
                                </div>
                            )}
                            {needWa && (
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Test WhatsApp Number <span className="text-destructive">*</span></Label>
                                    <div className="flex gap-2">
                                        <Input value={`+${dialCode}`} onChange={(e) => setDialCode(e.target.value.replace(/\D/g, '').slice(0, 4))} className="h-10 w-20" aria-label="Country code" />
                                        <Input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^\d ]/g, '').slice(0, 15))} placeholder="98765 43210" className="h-10 flex-1" inputMode="tel" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {vars.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Sample Variables</Label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {vars.map((k) => (
                                        <div key={k} className="space-y-1">
                                            <span className="font-mono text-[11px] text-primary">{`{{${k}}}`}</span>
                                            <Input
                                                value={samples[k] ?? sampleFor(k, t.sample_values)}
                                                onChange={(e) => setSamples((s) => ({ ...s, [k]: e.target.value }))}
                                                className="h-9"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="rounded-lg bg-violet-50 px-3 py-2.5 text-xs text-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
                            This sends only to the test recipients above. WhatsApp sends need the template approved by Meta.
                            In-app messages appear in the app only, so they are not sent from here.
                        </p>

                        {results && (
                            <div className="space-y-1.5 rounded-lg border border-border p-3">
                                <div className="text-xs font-semibold text-foreground">Result</div>
                                {Object.entries(results).map(([ch, r]) => (
                                    <div key={ch} className="flex items-start gap-2 text-xs">
                                        {r.status === 'sent' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                            : r.status === 'failed' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                                : <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                                        <span><span className="font-semibold">{MAIN_CHANNELS.find((c) => c.key === ch)?.label ?? ch}:</span> {r.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
                <Button variant="outline" onClick={onClose} className="h-10">{results ? 'Close' : 'Cancel'}</Button>
                <Button onClick={submit} disabled={!t || !canSend || testSend.isPending} className="h-10 gap-2">
                    {testSend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {results ? 'Send Again' : 'Send Test Message'}
                </Button>
            </div>
        </>
    );
}

export function StatusPill({ active, className }: { active: boolean; className?: string }) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
            className,
        )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-amber-500')} />
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}
