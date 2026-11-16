'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Eye,
    Settings2,
    SquarePen,
    ShieldCheck,
    RotateCcw,
    Save,
    Info,
    Plus,
    Check,
    Trash2,
    Pencil,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { cn } from '@/lib/utils';
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans';
import {
    usePlanBadges,
    useBadgeSettings,
    useBadgeSummary,
    useRecommendedBadges,
    useUpdateBadgeSettings,
    useCreatePlanBadge,
    useUpdatePlanBadge,
    useDeletePlanBadge,
    badgeStyleProps,
    BADGE_STYLES,
    BADGE_COLORS,
    BADGE_POSITIONS,
    type BadgeStyle,
    type BadgeApplyTo,
    type PlanBadge,
} from '@/hooks/use-plan-badges';

const MAX_TEXT = 25;

interface FormState {
    text: string;
    style: BadgeStyle;
    color: string;
    apply_to: BadgeApplyTo;
    plan_ids: number[];
    is_active: boolean;
}

const emptyForm = (): FormState => ({
    text: '',
    style: 'default',
    color: BADGE_COLORS[0],
    apply_to: 'all',
    plan_ids: [],
    is_active: true,
});

export default function ManagePlanBadgesPage() {
    const router = useRouter();

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data: badges, isLoading } = usePlanBadges();
    const { data: settings } = useBadgeSettings();
    const { data: summary } = useBadgeSummary();
    const { data: recommended } = useRecommendedBadges();
    const { data: plans } = useSubscriptionPlans({ limit: 200 });

    const updateSettings = useUpdateBadgeSettings();
    const createBadge = useCreatePlanBadge(() => resetForm());
    const updateBadge = useUpdatePlanBadge(() => resetForm());
    const deleteBadge = useDeletePlanBadge();

    // Local mirror so the switches feel instant; the query stays the source.
    const [enabled, setEnabled] = useState(true);
    const [position, setPosition] = useState('top_right');
    useEffect(() => {
        if (!settings) return;
        setEnabled(settings.enabled);
        setPosition(settings.position);
    }, [settings]);

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: false } : prev));
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm());
        setErrors({});
    };

    const loadBadge = (badge: PlanBadge) => {
        setEditingId(badge.id);
        setForm({
            text: badge.text,
            style: badge.style,
            color: badge.color,
            apply_to: badge.apply_to,
            plan_ids: badge.plan_ids ?? [],
            is_active: Number(badge.is_active) === 1,
        });
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const save = () => {
        const next: Record<string, boolean> = {};
        if (!form.text.trim()) next.text = true;
        if (!form.style) next.style = true;
        if (!form.color) next.color = true;
        // "Select Plans" with nothing chosen would apply the badge to nothing.
        if (form.apply_to === 'selected' && form.plan_ids.length === 0) next.plan_ids = true;

        if (Object.keys(next).length > 0) {
            setErrors(next);
            toast.error('Please fill all mandatory fields.');
            return;
        }
        setErrors({});

        const payload = {
            text: form.text.trim(),
            style: form.style,
            color: form.color,
            apply_to: form.apply_to,
            plan_ids: form.apply_to === 'selected' ? form.plan_ids : [],
            is_active: form.is_active,
        };

        if (editingId) updateBadge.mutate({ id: editingId, data: payload });
        else createBadge.mutate(payload);
    };

    const applyRecommended = (r: { text: string; style: BadgeStyle; color: string }) => {
        setEditingId(null);
        setForm({ ...emptyForm(), text: r.text, style: r.style, color: r.color });
        setErrors({});
        toast.success(`"${r.text}" loaded into the form — review and save.`);
    };

    const togglePlan = (planId: number, on: boolean) => {
        setForm((prev) => ({
            ...prev,
            plan_ids: on ? [...prev.plan_ids, planId] : prev.plan_ids.filter((p) => p !== planId),
        }));
        setErrors((prev) => (prev.plan_ids ? { ...prev, plan_ids: false } : prev));
    };

    const isSaving = createBadge.isPending || updateBadge.isPending;
    const preview = badgeStyleProps(form.style, form.color);

    return (
        <PermissionGuard permission="plan_badges.view">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
                <PageLoader
                    open={
                        isLoading ||
                        deleteBadge.isPending ||
                        createBadge.isPending ||
                        updateBadge.isPending ||
                        updateSettings.isPending
                    }
                />

                {/* ---------------------------------------------------------- main */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-foreground">Manage Plan Badges</h1>
                            <p className="text-xs text-muted-foreground">
                                Create, edit and manage badges that can be used with subscription plans.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin/subscriptions')}
                            className="h-9 gap-2"
                        >
                            <Eye className="h-4 w-4" /> Preview Badges
                        </Button>
                    </div>

                    {/* Badge Settings */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-4 p-5">
                            <SectionHeading icon={<Settings2 className="h-4 w-4" />} title="Badge Settings" />

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <div className="flex items-center justify-between gap-4">
                                        <Label className="text-sm font-medium">Enable Badges</Label>
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={(v) => {
                                                setEnabled(v);
                                                updateSettings.mutate({ enabled: v });
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Show badges on plan cards and plan details.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Badge Display Position</Label>
                                    <Select
                                        value={position}
                                        onValueChange={(v) => {
                                            setPosition(v);
                                            updateSettings.mutate({ position: v });
                                        }}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BADGE_POSITIONS.map((p) => (
                                                <SelectItem key={p.value} value={p.value}>
                                                    {p.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Choose where the badge will appear.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Add / Edit Badge */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-5 p-5">
                            <SectionHeading
                                icon={<SquarePen className="h-4 w-4" />}
                                title={editingId ? 'Edit Badge' : 'Add / Edit Badge'}
                            />

                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_240px]">
                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">
                                            Badge Text <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            value={form.text}
                                            onChange={(e) => setField('text', e.target.value.slice(0, MAX_TEXT))}
                                            placeholder="Most Popular"
                                            className={cn('h-10', errors.text && 'border-destructive')}
                                        />
                                        <p className="text-right text-[11px] text-muted-foreground">
                                            {form.text.length}/{MAX_TEXT}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Badge Style <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                            {BADGE_STYLES.map((s) => {
                                                const chip = badgeStyleProps(s.value, form.color);
                                                const selected = form.style === s.value;
                                                return (
                                                    <button
                                                        key={s.value}
                                                        type="button"
                                                        onClick={() => setField('style', s.value)}
                                                        className={cn(
                                                            'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors',
                                                            selected
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border hover:bg-muted/40'
                                                        )}
                                                    >
                                                        {/* Each option previews itself in the chosen colour. */}
                                                        <span className={chip.className} style={chip.style}>
                                                            Aa
                                                        </span>
                                                        <span className="text-[11px] font-medium">{s.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Badge Color <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            {BADGE_COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setField('color', c)}
                                                    style={{ backgroundColor: c }}
                                                    className={cn(
                                                        'flex h-8 w-8 items-center justify-center rounded-full transition-transform',
                                                        form.color === c && 'ring-2 ring-offset-2 ring-primary'
                                                    )}
                                                >
                                                    {form.color === c && <Check className="h-4 w-4 text-white" />}
                                                </button>
                                            ))}

                                            {/* Custom: a native colour input styled as the dashed circle. */}
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                                                    <Plus className="h-4 w-4" />
                                                </span>
                                                <span className="text-xs text-muted-foreground">Custom</span>
                                                <input
                                                    type="color"
                                                    value={form.color}
                                                    onChange={(e) => setField('color', e.target.value)}
                                                    className="h-0 w-0 opacity-0"
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Apply To Plans</Label>
                                        <div className="flex flex-wrap items-center gap-5">
                                            {([
                                                ['all', 'All Plans'],
                                                ['selected', 'Select Plans'],
                                            ] as const).map(([value, label]) => (
                                                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                                                    <input
                                                        type="radio"
                                                        name="apply_to"
                                                        checked={form.apply_to === value}
                                                        onChange={() => setField('apply_to', value)}
                                                        className="h-4 w-4 accent-[var(--primary)]"
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>

                                        {form.apply_to === 'selected' && (
                                            <div
                                                className={cn(
                                                    'mt-2 max-h-44 space-y-1.5 overflow-y-auto rounded-lg border p-3',
                                                    errors.plan_ids ? 'border-destructive' : 'border-border'
                                                )}
                                            >
                                                {(plans?.data ?? []).length === 0 ? (
                                                    <p className="text-xs text-muted-foreground">No plans yet.</p>
                                                ) : (
                                                    (plans?.data ?? []).map((p) => (
                                                        <label
                                                            key={p.id}
                                                            className="flex cursor-pointer items-center gap-2 text-sm"
                                                        >
                                                            <Checkbox
                                                                checked={form.plan_ids.includes(p.id)}
                                                                onCheckedChange={(c) => togglePlan(p.id, c === true)}
                                                            />
                                                            <span className="min-w-0 break-words">
                                                                {p.name}{' '}
                                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                                    {p.plan_code}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <Label className="text-sm font-medium">Status</Label>
                                            <Switch
                                                checked={form.is_active}
                                                onCheckedChange={(v) => setField('is_active', v)}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {form.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Inactive badges will not be shown on plans.
                                        </p>
                                    </div>
                                </div>

                                {/* Live preview */}
                                <div className="h-fit rounded-lg border border-border bg-muted/30 p-4">
                                    <p className="mb-3 text-sm font-bold text-foreground">Badge Preview</p>
                                    <span className={preview.className} style={preview.style}>
                                        {form.text.trim() || 'Badge Text'}
                                    </span>
                                    <p className="mt-3 text-[11px] text-muted-foreground">
                                        This is how the badge will look.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                                <Button variant="outline" onClick={resetForm} className="h-9 gap-2">
                                    <RotateCcw className="h-4 w-4" /> Reset
                                </Button>
                                <Button onClick={save} disabled={isSaving} className="h-9 gap-2">
                                    <Save className="h-4 w-4" />
                                    {editingId ? 'Update Badge' : 'Save Badge'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Saved badges — the design has no list, but without one an
                        existing badge could never be opened for editing. */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-3 p-5">
                            <div>
                                <p className="text-sm font-bold text-foreground">Saved Badges</p>
                                <p className="text-xs text-muted-foreground">
                                    Click a badge to load it into the form above.
                                </p>
                            </div>

                            {(badges ?? []).length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    No badges yet. Create one above, or pick a recommended badge.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {(badges ?? []).map((b) => {
                                        const chip = badgeStyleProps(b.style, b.color);
                                        return (
                                            <div
                                                key={b.id}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-lg border p-2.5',
                                                    editingId === b.id ? 'border-primary bg-primary/5' : 'border-border'
                                                )}
                                            >
                                                <span className={chip.className} style={chip.style}>
                                                    {b.text}
                                                </span>
                                                <span className="ml-auto flex items-center gap-1">
                                                    {Number(b.is_active) !== 1 && (
                                                        <span className="text-[10px] text-muted-foreground">Inactive</span>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => loadBadge(b)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7 border-rose-200 text-rose-500 hover:bg-rose-50"
                                                        onClick={() => setDeleteId(b.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recommended Badges */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-3 p-5">
                            <SectionHeading icon={<ShieldCheck className="h-4 w-4" />} title="Recommended Badges" />
                            <p className="-mt-2 text-xs text-muted-foreground">
                                Quickly add commonly used badges for your plans.
                            </p>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                {(recommended ?? []).map((r) => {
                                    const chip = badgeStyleProps(r.style, r.color);
                                    return (
                                        <button
                                            key={r.text}
                                            type="button"
                                            onClick={() => applyRecommended(r)}
                                            className="flex items-center justify-center rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
                                        >
                                            <span className={chip.className} style={chip.style}>
                                                {r.text}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ------------------------------------------------------- sidebar */}
                <div className="space-y-4 lg:sticky lg:top-6">
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-4 p-4">
                            <SectionHeading icon={<Info className="h-4 w-4" />} title="Badge Usage Summary" />

                            <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border text-center">
                                <Stat label="Total Badges" value={summary?.total ?? 0} />
                                <Stat label="Active Badges" value={summary?.active ?? 0} className="text-emerald-600" />
                                <Stat label="Inactive Badges" value={summary?.inactive ?? 0} className="text-rose-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-3 p-4">
                            <SectionHeading icon={<ShieldCheck className="h-4 w-4" />} title="Badge Guidelines" />
                            <ul className="list-disc space-y-1.5 pl-4 text-[11px] text-muted-foreground">
                                <li>Keep badge text short and meaningful.</li>
                                <li>Use contrasting colors for better visibility.</li>
                                <li>Badges help highlight special plans.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-2 p-4">
                            <p className="text-xs font-bold text-foreground">Quick Actions</p>

                            <QuickAction
                                icon={<RotateCcw className="h-4 w-4" />}
                                label="Reset to Default"
                                onClick={() => {
                                    resetForm();
                                    setEnabled(true);
                                    setPosition('top_right');
                                    updateSettings.mutate({ enabled: true, position: 'top_right' });
                                }}
                            />
                            <QuickAction
                                icon={<ShieldCheck className="h-4 w-4" />}
                                label="Enable Recommended Badges"
                                onClick={() => {
                                    const existing = new Set((badges ?? []).map((b) => b.text.toLowerCase()));
                                    // Only create the ones that are missing, so this is
                                    // safe to press twice.
                                    const missing = (recommended ?? []).filter(
                                        (r) => !existing.has(r.text.toLowerCase())
                                    );
                                    if (missing.length === 0) {
                                        toast.success('All recommended badges already exist.');
                                        return;
                                    }
                                    missing.forEach((r) =>
                                        createBadge.mutate({ ...r, apply_to: 'all', is_active: true })
                                    );
                                }}
                            />
                            <QuickAction
                                icon={<Eye className="h-4 w-4" />}
                                label="Preview in Plan Cards"
                                onClick={() => router.push('/admin/subscriptions')}
                            />

                            <div className="mt-2 flex items-start gap-2 rounded-lg bg-primary/5 p-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p className="text-[11px] text-muted-foreground">
                                    Badges will be displayed on plan cards based on the selected position.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <DeleteDialog
                    open={deleteId !== null}
                    onOpenChange={(open: boolean) => !open && setDeleteId(null)}
                    title="Delete Badge"
                    description="Are you sure you want to delete this badge? It will be removed from any plans using it."
                    isDeleting={deleteBadge.isPending}
                    onConfirm={() => {
                        if (deleteId !== null) {
                            deleteBadge.mutate(deleteId, {
                                onSuccess: () => {
                                    if (editingId === deleteId) resetForm();
                                    setDeleteId(null);
                                },
                            });
                        }
                    }}
                />
            </div>
        </PermissionGuard>
    );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                {icon}
            </span>
            <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
    );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
    return (
        <div className="px-2 py-3">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={cn('text-lg font-bold text-foreground', className)}>{value}</p>
        </div>
    );
}

function QuickAction({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-muted"
        >
            <span className="text-muted-foreground">{icon}</span>
            {label}
        </button>
    );
}
