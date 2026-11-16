'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Eye,
    AlertTriangle,
    Info,
    Crown,
    CheckCircle2,
    Users,
    CircleCheck,
    CircleX,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/common/page-loader';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatPlanPrice, BILLING_CYCLES, type SubscriptionPlan } from '@/hooks/use-subscription-plans';
import { badgeStyleProps, type BadgeStyle } from '@/hooks/use-plan-badges';

/**
 * ⚠ PLACEHOLDER — there is no subscriber tracking in the database yet. Nothing
 * records who is on a plan, so these three numbers are invented purely so the
 * panel matches the design. They are NOT real and must be replaced by counts
 * from a plan_subscriptions table before this ships to anyone who might act on
 * them.
 *
 * The on-screen "Sample figures" caption that used to say so was removed on
 * request, so nothing in the UI now marks these as fake. Whoever wires up
 * plan_subscriptions must come here first.
 */
const PLACEHOLDER_PLAN_USAGE = { total: 118, active: 96, cancelled: 22 };

const MAX_COMMENTS = 300;

export type PlanActionVariant = 'deactivate' | 'delete';

const COPY = {
    deactivate: {
        title: 'Deactivate Plan',
        subtitle: 'You are about to deactivate this subscription plan. Please review the details and confirm.',
        panelTitle: 'Plan to be Deactivated',
        alertTone: 'amber' as const,
        alertTitle: 'You are about to deactivate this plan',
        alertLines: [
            'Deactivated plans will not be available for new subscriptions and will be hidden from plan listings.',
            'Existing subscribers will not be affected and can continue to use this plan until the end of their billing cycle.',
        ],
        reasonLabel: 'Reason for Deactivation',
        reasonHelp: 'Please select a reason for deactivating this plan.',
        knowTitle: 'Important to Know',
        knowLines: [
            'This plan will be marked as inactive and hidden from the pricing page.',
            'All existing subscribers will continue to have access to this plan until their current subscription period ends.',
        ],
        cta: 'Deactivate Plan',
        successTitle: 'Plan Deactivated Successfully!',
        successNote: 'Existing subscribers can continue to use this plan until the end of their billing cycle.',
        detailsTitle: 'Deactivated Plan Details',
    },
    delete: {
        title: 'Delete Plan',
        subtitle: 'You are about to permanently delete this subscription plan.',
        panelTitle: 'Plan to be Deleted',
        alertTone: 'rose' as const,
        alertTitle: 'This action cannot be undone!',
        alertLines: [
            'Deleting a plan will permanently remove it from the system.',
            'This plan will be hidden from pricing pages and plan listings immediately.',
        ],
        reasonLabel: 'Reason for Deletion',
        reasonHelp: 'Please select a reason for deleting this plan.',
        knowTitle: null,
        knowLines: [],
        cta: 'Delete Plan',
        successTitle: 'Plan deleted successfully!',
        successNote: 'This plan and all its data have been permanently removed.',
        detailsTitle: 'Deleted Plan Details',
    },
};

interface Props {
    variant: PlanActionVariant;
    plan: SubscriptionPlan;
    reasons: string[];
    isSubmitting: boolean;
    /** The plan as returned by the action — the success screen reads this. */
    result: SubscriptionPlan | null;
    onSubmit: (reason: string, comments: string) => void;
}

export function PlanActionScreen({ variant, plan, reasons, isSubmitting, result, onSubmit }: Props) {
    const router = useRouter();
    const copy = COPY[variant];

    const [reason, setReason] = useState('');
    const [comments, setComments] = useState('');
    const [reasonError, setReasonError] = useState(false);

    const cycleLabel = BILLING_CYCLES.find((c) => c.value === plan.billing_cycle)?.label ?? plan.billing_cycle;
    const isActive = Number(plan.is_active) === 1;

    const stamp = (value?: string | null) => {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '—';
        return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    };

    const submit = () => {
        if (!reason) {
            setReasonError(true);
            toast.error('Please select a reason.');
            return;
        }
        setReasonError(false);
        onSubmit(reason, comments);
    };

    /* ------------------------------------------------------------- success */
    if (result) {
        const done = result;
        return (
            <div className="mx-auto max-w-3xl space-y-5">
                <h1 className="text-lg font-bold tracking-tight text-foreground">{copy.successTitle}</h1>

                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="flex flex-col items-center gap-4 px-5 py-12 text-center">
                        <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
                        </span>

                        <h2 className="text-xl font-bold text-foreground">{copy.successTitle}</h2>
                        <p className="max-w-lg text-sm text-muted-foreground">
                            The <span className="font-semibold text-emerald-600">{done.name}</span>{' '}
                            {variant === 'deactivate'
                                ? 'has been deactivated. It is now inactive and hidden from the pricing page and plan listings.'
                                : 'has been permanently deleted from the system. It is no longer available in pricing pages or plan listings.'}
                        </p>

                        <div className="flex w-full max-w-xl items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left">
                            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <p className="text-xs text-emerald-800">{copy.successNote}</p>
                        </div>

                        <div className="mt-2 w-full max-w-2xl rounded-lg border border-border p-4 text-left">
                            <p className="mb-4 text-sm font-bold text-foreground">{copy.detailsTitle}</p>
                            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                                <Row label="Plan Name" value={done.name} />
                                <Row
                                    label={variant === 'deactivate' ? 'Trial Period' : 'Deleted On'}
                                    value={
                                        variant === 'deactivate'
                                            ? `${done.trial_days} Days`
                                            : stamp(done.deleted_at)
                                    }
                                />
                                <Row label="Plan Code" value={done.plan_code} />
                                <Row
                                    label={variant === 'deactivate' ? `Price (${cycleLabel})` : 'Deleted By'}
                                    value={
                                        variant === 'deactivate'
                                            ? formatPlanPrice(done)
                                            : done.deleter?.full_name ?? '—'
                                    }
                                />
                                <Row label="Plan Type" value={done.planType?.name ?? '—'} />
                                <Row
                                    label="Plan Badge"
                                    value={
                                        done.planBadge ? (
                                            <span {...badgeStyleProps(done.planBadge.style as BadgeStyle, done.planBadge.color)}>
                                                {done.planBadge.text}
                                            </span>
                                        ) : (
                                            'No badge'
                                        )
                                    }
                                />
                                <Row
                                    label={variant === 'deactivate' ? 'Status' : 'Reason'}
                                    value={
                                        variant === 'deactivate' ? (
                                            <Badge variant="outline" className="border-rose-300 bg-rose-50 text-[11px] text-rose-600">
                                                Inactive
                                            </Badge>
                                        ) : (
                                            done.deletion_reason ?? '—'
                                        )
                                    }
                                />
                                <Row label="Billing Cycle" value={cycleLabel} />
                                <Row
                                    label={variant === 'deactivate' ? 'Deactivated On' : 'Status'}
                                    value={
                                        variant === 'deactivate' ? (
                                            stamp(done.deactivated_at)
                                        ) : (
                                            <span className="font-semibold text-rose-600">Deleted</span>
                                        )
                                    }
                                />
                                {variant === 'deactivate' && (
                                    <>
                                        <Row label="Trial Price" value={done.trial_days > 0 ? 'Free' : '—'} />
                                        <Row label="Deactivated By" value={done.deactivator?.full_name ?? '—'} />
                                    </>
                                )}
                                {variant === 'delete' && (
                                    <Row label={`Price (${cycleLabel})`} value={formatPlanPrice(done)} />
                                )}
                            </dl>
                        </div>

                        <div className="mt-4 flex flex-col items-center gap-2">
                            {/* A deleted plan has no detail page left to open. */}
                            {variant === 'deactivate' ? (
                                <Button
                                    onClick={() => router.push(`/admin/subscriptions/${done.id}`)}
                                    className="h-10 w-56 gap-2"
                                >
                                    <Eye className="h-4 w-4" /> View Plan Details
                                </Button>
                            ) : (
                                <Button onClick={() => router.push('/admin/subscriptions')} className="h-10 w-56 gap-2">
                                    <Eye className="h-4 w-4" /> View All Plans
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => router.push('/admin/subscriptions')}
                                className="h-10 w-56 gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to Plans
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    /* ------------------------------------------------------------- confirm */
    const alertClasses = copy.alertTone === 'rose'
        ? 'border-rose-200 bg-rose-50'
        : 'border-amber-200 bg-amber-50';
    const alertText = copy.alertTone === 'rose' ? 'text-rose-700' : 'text-amber-800';

    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
            <PageLoader open={isSubmitting} />
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-foreground">{copy.title}</h1>
                            <p className="text-xs text-muted-foreground">{copy.subtitle}</p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => router.push(`/admin/subscriptions/${plan.id}`)}
                        className="h-9 gap-2 border-primary/40 text-primary hover:bg-primary/5"
                    >
                        <Eye className="h-4 w-4" /> View Plan
                    </Button>
                </div>

                <div className={cn('flex items-start gap-2.5 rounded-lg border px-4 py-3', alertClasses)}>
                    <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', alertText)} />
                    <div className="space-y-1">
                        <p className={cn('text-sm font-semibold', alertText)}>{copy.alertTitle}</p>
                        {copy.alertLines.map((line) => (
                            <p key={line} className="text-xs text-muted-foreground">{line}</p>
                        ))}
                    </div>
                </div>

                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="space-y-5 p-5">
                        <p className="text-sm font-bold text-foreground">{copy.panelTitle}</p>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_220px]">
                            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                                <Row label="Plan Name" value={plan.name} />
                                <Row label="Trial Period" value={`${plan.trial_days} Days`} />
                                <Row label="Plan Code" value={plan.plan_code} />
                                <Row label={`Price (${cycleLabel})`} value={formatPlanPrice(plan)} />
                                <Row label="Plan Type" value={plan.planType?.name ?? '—'} />
                                <Row
                                    label="Plan Badge"
                                    value={
                                        plan.planBadge ? (
                                            <span {...badgeStyleProps(plan.planBadge.style as BadgeStyle, plan.planBadge.color)}>
                                                {plan.planBadge.text}
                                            </span>
                                        ) : (
                                            'No badge'
                                        )
                                    }
                                />
                                <Row
                                    label="Status"
                                    value={
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-[11px]',
                                                isActive
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-300 bg-slate-50 text-slate-600'
                                            )}
                                        >
                                            {isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    }
                                />
                                <Row label="Billing Cycle" value={cycleLabel} />
                                <Row label="Created On" value={stamp(plan.created_at)} />
                                {variant === 'delete' && (
                                    <Row label="Created By" value={plan.creator?.full_name ?? '—'} />
                                )}
                            </dl>

                            <div className="flex items-start gap-3 border-border lg:border-l lg:pl-5">
                                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <Crown className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'mb-1 text-[11px]',
                                            isActive
                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                : 'border-slate-300 bg-slate-50 text-slate-600'
                                        )}
                                    >
                                        {isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <p className="break-words text-sm font-bold text-foreground">{plan.name}</p>
                                    {plan.short_description && (
                                        <p className="break-words text-[11px] text-muted-foreground">
                                            {plan.short_description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-border pt-5">
                            <div className="max-w-md space-y-1.5">
                                <Label className="text-sm font-medium">
                                    {copy.reasonLabel} <span className="text-destructive">*</span>
                                </Label>
                                <p className="text-[11px] text-muted-foreground">{copy.reasonHelp}</p>
                                <Select
                                    value={reason}
                                    onValueChange={(v) => {
                                        setReason(v);
                                        setReasonError(false);
                                    }}
                                >
                                    <SelectTrigger className={cn('h-10', reasonError && 'border-destructive')}>
                                        <SelectValue placeholder="Select a reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {reasons.map((r) => (
                                            <SelectItem key={r} value={r}>
                                                {r}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="max-w-md space-y-1.5">
                                <Label className="text-sm font-medium">Additional Comments (Optional)</Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Add any additional information that might help us improve.
                                </p>
                                <Textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value.slice(0, MAX_COMMENTS))}
                                    placeholder="Type your comments..."
                                    className="min-h-[88px] text-sm"
                                />
                                <p className="text-right text-[11px] text-muted-foreground">
                                    {comments.length}/{MAX_COMMENTS}
                                </p>
                            </div>
                        </div>

                        {copy.knowTitle && (
                            <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <div>
                                    <p className="text-xs font-semibold text-foreground">{copy.knowTitle}</p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                                        {copy.knowLines.map((l) => (
                                            <li key={l}>{l}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                            <Button variant="outline" onClick={() => router.back()} className="h-9">
                                Cancel
                            </Button>
                            <Button
                                onClick={submit}
                                disabled={isSubmitting}
                                className="h-9 gap-2 bg-rose-600 text-white hover:bg-rose-700"
                            >
                                {copy.cta}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ----------------------------------------------------- sidebar */}
            <Card className="border-border bg-card shadow-xs lg:sticky lg:top-6">
                <CardContent className="space-y-4 p-4">
                    <p className="text-sm font-bold text-foreground">Plan Summary</p>

                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Crown className="h-5 w-5" />
                        </span>
                        <Badge
                            variant="outline"
                            className={cn(
                                'text-[11px]',
                                isActive
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-300 bg-slate-50 text-slate-600'
                            )}
                        >
                            {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>

                    <div>
                        <h2 className="break-words text-base font-bold text-foreground">{plan.name}</h2>
                        <p className="text-xs text-muted-foreground">Plan Code: {plan.plan_code}</p>
                    </div>

                    <div className="space-y-2.5 border-t border-border pt-3">
                        <SummaryRow label="Plan Type" value={plan.planType?.name ?? '—'} />
                        <SummaryRow
                            label="Plan Badge"
                            value={
                                plan.planBadge ? (
                                    <span {...badgeStyleProps(plan.planBadge.style as BadgeStyle, plan.planBadge.color)}>
                                        {plan.planBadge.text}
                                    </span>
                                ) : (
                                    'No badge'
                                )
                            }
                        />
                        <SummaryRow label="Billing Cycle" value={cycleLabel} />
                        <SummaryRow label="Trial Period" value={`${plan.trial_days} Days`} />
                        <SummaryRow label={`Price (${cycleLabel})`} value={formatPlanPrice(plan)} />
                        <SummaryRow
                            label="Status"
                            value={
                                <span className={isActive ? 'text-emerald-600' : 'text-muted-foreground'}>
                                    {isActive ? 'Active' : 'Inactive'}
                                </span>
                            }
                        />
                    </div>

                    <div className="space-y-2.5 border-t border-border pt-3">
                        <p className="text-xs font-bold text-foreground">Applies To</p>
                        <SummaryRow label="Event Category" value={plan.category?.name ?? 'All Categories'} />
                        <SummaryRow label="Total Menus" value={String(plan.total_menus)} />
                    </div>

                    <div className="space-y-2 border-t border-border pt-3">
                        <p className="text-xs font-bold text-foreground">Plan Usage</p>
                        {/* ⚠ Placeholder numbers — see PLACEHOLDER_PLAN_USAGE above. */}
                        <UsageRow
                            icon={<Users className="h-4 w-4 text-primary" />}
                            label="Total Subscribers"
                            value={PLACEHOLDER_PLAN_USAGE.total}
                        />
                        <UsageRow
                            icon={<CircleCheck className="h-4 w-4 text-emerald-600" />}
                            label="Active Subscribers"
                            value={PLACEHOLDER_PLAN_USAGE.active}
                        />
                        <UsageRow
                            icon={<CircleX className="h-4 w-4 text-rose-600" />}
                            label="Cancelled Subscribers"
                            value={PLACEHOLDER_PLAN_USAGE.cancelled}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex min-w-0 items-start gap-2">
            <dt className="w-24 shrink-0 text-xs text-muted-foreground">{label}</dt>
            <span className="shrink-0 text-xs text-muted-foreground">:</span>
            <dd className="min-w-0 break-words text-sm font-medium text-foreground">{value}</dd>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="min-w-0 break-words text-right text-xs font-semibold text-foreground">{value}</span>
        </div>
    );
}

function UsageRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {icon}
                {label}
            </span>
            <span className="text-sm font-bold text-foreground">{value}</span>
        </div>
    );
}
