'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { NotificationTemplate, SystemTrigger } from '@/hooks/use-notification-templates';
import { AUDIENCE_LABELS, MAIN_CHANNELS, templateCode } from './template-shared';
import { StatusPill } from './send-test-dialog';

interface Props {
    template: NotificationTemplate | null;
    trigger?: SystemTrigger;
    onClose: () => void;
    onDelete: () => void;
    onDeactivate: () => void;
    busy?: boolean;
}

/**
 * Centre popup. An active template that owns a system trigger is live
 * wiring — deleting it would silently stop that message — so it must be
 * deactivated first (the backend refuses it too).
 */
export function DeleteTemplateDialog({ template: t, trigger, onClose, onDelete, onDeactivate, busy }: Props) {
    const active = !!Number(t?.is_active);
    const restricted = !!t?.trigger_key && active;

    return (
        <Dialog open={!!t} onOpenChange={(o) => !o && !busy && onClose()}>
            <DialogContent className="max-w-[520px] p-0">
                {t && (
                    <>
                        <DialogHeader className="border-b border-border bg-pink-50/60 px-5 py-4 text-left dark:bg-pink-950/20">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" /></span>
                                <div>
                                    <DialogTitle className="text-base font-bold">Delete Template</DialogTitle>
                                    <DialogDescription className="text-xs">Review dependencies before permanent removal.</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-3 px-5 py-4">
                            <div className="rounded-lg border border-border p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold">{t.name}</span>
                                    <StatusPill active={active} />
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {templateCode(t)} · {t.audience ? AUDIENCE_LABELS[t.audience] : 'No audience'} ·{' '}
                                    {MAIN_CHANNELS.filter((c) => t.channels.includes(c.key)).map((c) => c.label).join(' · ')}
                                </p>
                            </div>

                            {restricted ? (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                                    <div className="mb-0.5 font-semibold">Deletion is restricted.</div>
                                    This template is active and mapped to <b>{trigger?.label ?? t.trigger_key}</b>. Deactivate it first —
                                    while it is inactive, that message is not sent.
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Are you sure you want to delete this template? This action cannot be undone.
                                    {t.trigger_key && ' Its trigger becomes free for another template.'}
                                </p>
                            )}

                            <div className="divide-y divide-border text-sm">
                                <div className="flex justify-between py-2"><span className="text-muted-foreground">Mapped trigger</span><span>{trigger?.label ?? t.trigger_key ?? 'None'}</span></div>
                                <div className="flex justify-between py-2"><span className="text-muted-foreground">Current status</span><StatusPill active={active} /></div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
                            <Button variant="outline" onClick={onClose} disabled={busy} className="h-10">Cancel</Button>
                            {restricted ? (
                                <Button onClick={onDeactivate} disabled={busy} className="h-10 gap-2">
                                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Deactivate Template
                                </Button>
                            ) : (
                                <Button variant="destructive" onClick={onDelete} disabled={busy} className="h-10 gap-2">
                                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
