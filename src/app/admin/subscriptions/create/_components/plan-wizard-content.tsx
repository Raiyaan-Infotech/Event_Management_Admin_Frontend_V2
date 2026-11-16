'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    FileText,
    Search,
    Send,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { DynamicIcon } from '@/components/common/dynamic-icon';
import { cn } from '@/lib/utils';
import { isLockedMenu } from '@/lib/locked-menus';
import { usePlanTypes } from '@/hooks/use-plan-types';
import { usePlanBadges, badgeStyleProps, type BadgeStyle } from '@/hooks/use-plan-badges';
import { useEventCategories, useEventMenus } from '@/hooks/use-menu-management';
import {
    useSubscriptionPlan,
    useCreateSubscriptionPlan,
    useUpdateSubscriptionPlan,
    BILLING_CYCLES,
    CURRENCIES,
    currencySymbol,
    type BillingCycle,
    type SubscriptionPlanPayload,
    type SubscriptionPlan,
} from '@/hooks/use-subscription-plans';

const STEPS = [
    'Plan Information',
    'Menu Selection',
    'Pricing',
    'Configuration',
    'Review',
    'Success',
] as const;

/**
 * A menu is in the plan or not — no website/app choice here; the menu's own
 * Active switch in Menu Management decides where it shows.
 */
interface MenuSelection {
    included: boolean;
}

const EMPTY_SELECTION: MenuSelection = { included: false };

/**
 * Step 4 — the plan's usage limits, one set per plan. Blank = unlimited.
 *
 * Guests and RSVPs are two different things and get two fields (§571):
 * a GUEST is a phone-book contact on the account, an RSVP is one person
 * attending one event — including someone who scanned the QR and was never
 * in the phone book at all.
 */
const LIMIT_FIELDS = [
    { key: 'max_events', label: 'Max Events', helper: 'Events a client can create on this plan.' },
    { key: 'max_guests_per_event', label: 'Max Guests', helper: 'Contacts in the guest list, in total.' },
    { key: 'max_rsvp_per_event', label: 'Max RSVP (Per Event)', helper: 'Same as max participants' },
    { key: 'max_photos', label: 'Max Photos', helper: 'Photos per event — gallery and Wed Wishes together.' },
    { key: 'max_videos', label: 'Max Videos', helper: 'Videos per event — gallery and Wed Wishes together.' },
] as const;

const STORAGE_UNITS = ['MB', 'GB'] as const;
const STORAGE_MAX = 100;
const UNLIMITED = 'unlimited';

const limitValue = (v: string): number | null => (v === '' ? null : Number(v));

interface FormState {
    // Step 1
    name: string;
    plan_code: string;
    plan_type_id: string;
    plan_badge_id: string;
    billing_cycle: BillingCycle;
    short_description: string;
    is_active: boolean;
    // Step 2
    event_category_id: string;
    // Step 3
    currency_code: string;
    price: string;
    trial_days: string;
    // Step 4 — '' = unlimited
    max_events: string;
    max_guests_per_event: string;
    max_rsvp_per_event: string;
    max_photos: string;
    max_videos: string;
    // A pair: '' + '' = unlimited
    storage_limit: string;
    storage_unit: '' | 'MB' | 'GB';
}

const emptyForm = (): FormState => ({
    name: '',
    plan_code: '',
    plan_type_id: '',
    plan_badge_id: '',
    billing_cycle: 'monthly',
    short_description: '',
    is_active: true,
    event_category_id: '',
    currency_code: 'INR',
    price: '',
    trial_days: '0',
    max_events: '',
    max_guests_per_event: '',
    max_rsvp_per_event: '',
    max_photos: '',
    max_videos: '',
    storage_limit: '',
    storage_unit: '',
});

export function PlanWizardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const isEdit = !!id;
    // "Manage Menus" from the list deep-links straight to step 2.
    const initialStep = Math.min(Math.max(Number(searchParams.get('step') || 1), 1), 5);

    const [step, setStep] = useState(initialStep);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [menuSearch, setMenuSearch] = useState('');
    const [selection, setSelection] = useState<Record<number, MenuSelection>>({});
    const [loadedId, setLoadedId] = useState<string | null>(null);
    const [savedPlan, setSavedPlan] = useState<SubscriptionPlan | null>(null);

    const { data: existing, isLoading: loadingPlan } = useSubscriptionPlan(id ?? undefined);
    const { data: planTypes } = usePlanTypes({ limit: 200, is_active: 1 });
    const { data: planBadges } = usePlanBadges();
    const { data: categories } = useEventCategories({ limit: 200, is_active: true });

    // The menus offered are the ones in the plan's category — a menu outside it
    // could never apply to a subscriber on this plan. A plan (like a menu) is
    // scoped by category only: no event type, no religion.
    const { data: menusData, isLoading: loadingMenus } = useEventMenus({
        limit: 200,
        is_active: true,
        event_category_id: form.event_category_id || undefined,
    });
    const menus = menusData?.data ?? [];

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: false } : prev));
    };

    // Load once per id, so a refetch cannot clobber in-progress edits.
    useEffect(() => {
        if (!existing || !id || loadedId === id) return;
        setForm({
            name: existing.name ?? '',
            plan_code: existing.plan_code ?? '',
            plan_type_id: existing.plan_type_id ? String(existing.plan_type_id) : '',
            plan_badge_id: existing.plan_badge_id ? String(existing.plan_badge_id) : '',
            billing_cycle: existing.billing_cycle ?? 'monthly',
            short_description: existing.short_description ?? '',
            is_active: Number(existing.is_active) === 1,
            event_category_id: existing.event_category_id ? String(existing.event_category_id) : '',
            currency_code: existing.currency_code ?? 'INR',
            price: String(Number(existing.price ?? 0)),
            trial_days: String(existing.trial_days ?? 0),
            max_events: existing.max_events ? String(existing.max_events) : '',
            max_guests_per_event: existing.max_guests_per_event ? String(existing.max_guests_per_event) : '',
            max_rsvp_per_event: existing.max_rsvp_per_event ? String(existing.max_rsvp_per_event) : '',
            max_photos: existing.max_photos ? String(existing.max_photos) : '',
            max_videos: existing.max_videos ? String(existing.max_videos) : '',
            storage_limit: existing.storage_limit && existing.storage_unit ? String(existing.storage_limit) : '',
            storage_unit: existing.storage_limit && existing.storage_unit ? existing.storage_unit : '',
        });
        const next: Record<number, MenuSelection> = {};
        (existing.planMenus ?? []).forEach((pm) => {
            next[pm.menu_id] = { included: true };
        });
        setSelection(next);
        setLoadedId(id);
    }, [existing, id, loadedId]);

    /*
      Locked menus are unioned in here rather than trusted to arrive in
      `selection`. The row draws itself ticked from `isLockedMenu` alone, so if
      the state ever disagreed — an edit loading a plan saved before the lock
      existed, for instance — the payload would omit a menu the screen was
      showing as included, and the save DELETES grants missing from the payload.
    */
    const selectedIds = useMemo(() => {
        const picked = Object.keys(selection).map(Number).filter((k) => selection[k]?.included);
        const lockedIds = menus.filter((m) => isLockedMenu(m)).map((m) => m.id);
        return [...new Set([...picked, ...lockedIds])];
    }, [selection, menus]);
    const selectedMenus = useMemo(
        () => menus.filter((m) => selectedIds.includes(m.id)),
        [menus, selectedIds]
    );

    const filteredMenus = useMemo(() => {
        const q = menuSearch.trim().toLowerCase();
        if (!q) return menus;
        return menus.filter((m) => m.name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q));
    }, [menus, menuSearch]);

    /**
     * A NEW plan starts with every default menu ticked (Menu Management's "Plan
     * Default" switch) — once per category, since changing the category clears
     * the selection. Editing an existing plan never re-ticks anything: what it
     * saved is the truth, including defaults an admin chose to untick.
     */
    const [defaultsAppliedFor, setDefaultsAppliedFor] = useState<string | null>(null);
    const categoryKey = form.event_category_id || 'all';
    useEffect(() => {
        if (isEdit || loadingMenus || !menusData || defaultsAppliedFor === categoryKey) return;
        setSelection((prev) => {
            const next = { ...prev };
            menus.forEach((m) => {
                if (Number(m.is_default) === 1 && !next[m.id]) next[m.id] = { included: true };
            });
            return next;
        });
        setDefaultsAppliedFor(categoryKey);
    }, [isEdit, loadingMenus, menusData, menus, categoryKey, defaultsAppliedFor]);

    // Locked menus are ticked on every plan, new or existing — an older plan
    // saved before they were locked gets them back the next time it is opened.
    useEffect(() => {
        if (loadingMenus || !menusData) return;
        setSelection((prev) => {
            const missing = menus.filter((m) => isLockedMenu(m) && !prev[m.id]?.included);
            if (missing.length === 0) return prev;
            const next = { ...prev };
            missing.forEach((m) => {
                next[m.id] = { ...(next[m.id] ?? EMPTY_SELECTION), included: true };
            });
            return next;
        });
    }, [loadingMenus, menusData, menus]);

    const menuSections = useMemo(
        () =>
            [
                {
                    key: 'default',
                    title: 'Default Menus',
                    hint: 'On every plan — set in Menu Management, cannot be removed here.',
                    rows: filteredMenus.filter((m) => isLockedMenu(m)),
                },
                {
                    key: 'addon',
                    title: 'Add-on Features',
                    hint: 'Extras, off until you add them to this plan.',
                    rows: filteredMenus.filter((m) => !isLockedMenu(m)),
                },
            ].filter((section) => section.rows.length > 0),
        [filteredMenus]
    );

    const toggleMenuIncluded = (menuId: number, checked: boolean) => {
        const menu = menus.find((m) => m.id === menuId);
        if (isLockedMenu(menu)) return;
        setSelection((prev) => ({
            ...prev,
            [menuId]: { ...(prev[menuId] ?? EMPTY_SELECTION), included: checked },
        }));
    };

    const allSelected =
        filteredMenus.length > 0 && filteredMenus.every((m) => selection[m.id]?.included);

    const toggleAll = (checked: boolean) => {
        setSelection((prev) => {
            const next = { ...prev };
            filteredMenus.forEach((m) => {
                next[m.id] = {
                    ...(next[m.id] ?? EMPTY_SELECTION),
                    included: isLockedMenu(m) ? true : checked,
                };
            });
            return next;
        });
    };

    /* ------------------------------------------------------- step validation */

    const validateStep = (target: number): boolean => {
        const next: Record<string, boolean> = {};

        if (target >= 1) {
            if (!form.name.trim()) next.name = true;
            if (!form.plan_code.trim()) next.plan_code = true;
            if (!form.plan_type_id) next.plan_type_id = true;
            if (!form.billing_cycle) next.billing_cycle = true;
            if (!form.short_description.trim()) next.short_description = true;
        }
        if (target >= 2) {
            if (selectedIds.length === 0) next.menus = true;
        }
        if (target >= 3) {
            if (!form.currency_code) next.currency_code = true;
            if (form.price === '' || Number.isNaN(Number(form.price))) next.price = true;
        }

        if (Object.keys(next).length > 0) {
            setErrors(next);
            toast.error('Please fill all mandatory fields.');
            return false;
        }

        // Limits are optional (blank = unlimited), so a bad value is a format
        // problem, reported on its own rather than as a missing field.
        if (target >= 4) {
            const bad = LIMIT_FIELDS.filter(({ key }) => form[key] !== '' && !/^[1-9]\d*$/.test(form[key]));
            if (bad.length > 0) {
                setErrors(Object.fromEntries(bad.map(({ key }) => [key, true])));
                toast.error('Limits must be whole numbers of 1 or more, or blank for unlimited.');
                return false;
            }
            const storage = Number(form.storage_limit);
            if (form.storage_unit && (!/^\d+$/.test(form.storage_limit) || storage < 1 || storage > STORAGE_MAX)) {
                setErrors({ storage_limit: true });
                toast.error(`Max Storage must be a whole number from 1 to ${STORAGE_MAX}, or Unlimited.`);
                return false;
            }
        }
        setErrors({});
        return true;
    };

    const goNext = () => {
        if (!validateStep(step)) return;
        setStep((s) => Math.min(s + 1, 6));
    };

    /* ------------------------------------------------------------- persistence */

    const buildPayload = (): SubscriptionPlanPayload => ({
        name: form.name.trim(),
        plan_code: form.plan_code.trim(),
        plan_type_id: form.plan_type_id ? Number(form.plan_type_id) : null,
        plan_badge_id: form.plan_badge_id ? Number(form.plan_badge_id) : null,
        billing_cycle: form.billing_cycle,
        short_description: form.short_description.trim(),
        // Empty = "applies to all", which the list renders as All Categories.
        event_category_id: form.event_category_id ? Number(form.event_category_id) : null,
        currency_code: form.currency_code,
        price: Number(form.price || 0),
        trial_days: Number(form.trial_days || 0),
        is_active: form.is_active,
        // Blank = unlimited, sent as null so a cleared limit is actually cleared.
        max_events: limitValue(form.max_events),
        max_guests_per_event: limitValue(form.max_guests_per_event),
        max_rsvp_per_event: limitValue(form.max_rsvp_per_event),
        max_photos: limitValue(form.max_photos),
        max_videos: limitValue(form.max_videos),
        // Both or neither — see the step-4 validation.
        storage_limit: form.storage_unit ? limitValue(form.storage_limit) : null,
        storage_unit: form.storage_unit || null,
        menus: selectedIds.map((menuId, index) => ({ menu_id: menuId, sort_order: index })),
    });

    const createPlan = useCreateSubscriptionPlan((plan) => {
        setSavedPlan(plan);
        setStep(6);
    });
    const updatePlan = useUpdateSubscriptionPlan((plan) => {
        setSavedPlan(plan);
        setStep(6);
    });

    const submit = () => {
        if (!validateStep(4)) return;
        const payload = buildPayload();
        if (isEdit && id) updatePlan.mutate({ id: Number(id), data: payload });
        else createPlan.mutate(payload);
    };

    const isSaving = createPlan.isPending || updatePlan.isPending;
    const planTypeName = planTypes?.data?.find((p) => String(p.id) === form.plan_type_id)?.name ?? '—';
    // Inactive badges are excluded: pinning one would save an id that renders nothing.
    const activeBadges = useMemo(
        () => (planBadges ?? []).filter((b) => Boolean(Number(b.is_active))),
        [planBadges]
    );
    const selectedBadge = activeBadges.find((b) => String(b.id) === form.plan_badge_id);
    const cycleLabel = BILLING_CYCLES.find((c) => c.value === form.billing_cycle)?.label ?? form.billing_cycle;

    return (
        <PermissionGuard permission={isEdit ? 'subscription_plans.edit' : 'subscription_plans.create'}>
            <div className="space-y-5">
                <PageLoader open={isSaving || (isEdit && loadingPlan)} />

                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                            {isEdit ? 'Edit Subscription Plan' : 'Add Subscription Plan'}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {isEdit ? 'Update this plan and its included menus.' : 'Create a new subscription plan.'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin/subscriptions')}
                        className="h-9 gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Plans
                    </Button>
                </div>

                <StepBar step={step} onStepClick={(target) => {
                    // Backwards is always safe; forwards must pass the steps in between.
                    if (target < step || validateStep(target - 1)) setStep(target);
                }} />

                {step === 1 && (
                    <WizardCard title="Plan Information" subtitle="Create a new subscription plan with basic details.">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Plan Name" required error={errors.name}>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setField('name', e.target.value)}
                                    placeholder="e.g. Premium Plan"
                                    maxLength={150}
                                    className={cn('h-10', errors.name && 'border-destructive')}
                                />
                            </Field>

                            <Field
                                label="Plan Code"
                                required
                                error={errors.plan_code}
                                helper="Unique code for internal reference (no spaces)."
                            >
                                <Input
                                    value={form.plan_code}
                                    // Upper-cased and stripped as you type, so what you see is what is saved.
                                    onChange={(e) =>
                                        setField('plan_code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                                    }
                                    placeholder="e.g. PREMIUM"
                                    maxLength={50}
                                    className={cn('h-10 font-mono', errors.plan_code && 'border-destructive')}
                                />
                            </Field>

                            <Field label="Plan Type" required error={errors.plan_type_id}>
                                <Select value={form.plan_type_id} onValueChange={(v) => setField('plan_type_id', v)}>
                                    <SelectTrigger className={cn('h-10', errors.plan_type_id && 'border-destructive')}>
                                        <SelectValue placeholder="Select plan type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(planTypes?.data ?? []).length === 0 ? (
                                            <div className="px-2 py-3 text-xs text-muted-foreground">
                                                No plan types yet — create one under Plan Types.
                                            </div>
                                        ) : (
                                            (planTypes?.data ?? []).map((p) => (
                                                <SelectItem key={p.id} value={String(p.id)}>
                                                    {p.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Billing Cycle" required error={errors.billing_cycle}>
                                <Select
                                    value={form.billing_cycle}
                                    onValueChange={(v) => setField('billing_cycle', v as BillingCycle)}
                                >
                                    <SelectTrigger className={cn('h-10', errors.billing_cycle && 'border-destructive')}>
                                        <SelectValue placeholder="Select billing cycle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BILLING_CYCLES.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field
                                label="Short Description"
                                required
                                error={errors.short_description}
                                helper={`${form.short_description.length}/200`}
                            >
                                <Textarea
                                    value={form.short_description}
                                    onChange={(e) => setField('short_description', e.target.value.slice(0, 200))}
                                    placeholder="Enter short description"
                                    className={cn('min-h-[96px] text-sm', errors.short_description && 'border-destructive')}
                                />
                            </Field>

                            <Field label="Status" required helper="Active plans will be visible to users.">
                                <div className="flex h-10 items-center gap-3 rounded-md border border-border bg-card px-3">
                                    <Switch
                                        checked={form.is_active}
                                        onCheckedChange={(v) => setField('is_active', v)}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {form.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </Field>

                            {/* Belongs here per the design, not on the Pricing step —
                                it is a property of the plan, and step 3 already
                                reads it back on the Review card. */}
                            <Field label="Trial Period (Days)" helper="Leave 0 for no trial.">
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.trial_days}
                                    onChange={(e) => setField('trial_days', e.target.value)}
                                    className="h-10"
                                />
                            </Field>

                            {/* One badge per plan. Inactive badges are filtered out —
                                assigning one would show nothing on the card. The
                                'none' sentinel maps to '' because an empty SelectItem
                                value cannot be selected back once a badge is chosen. */}
                            <Field
                                label="Plan Badge"
                                helper={
                                    activeBadges.length
                                        ? 'Shown on this plan card. Manage the list under Plan Badges.'
                                        : 'No active badges yet — create one under Subscriptions > Plan Badges.'
                                }
                            >
                                <Select
                                    value={form.plan_badge_id || 'none'}
                                    onValueChange={(v) => setField('plan_badge_id', v === 'none' ? '' : v)}
                                    disabled={!activeBadges.length}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="No badge" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No badge</SelectItem>
                                        {activeBadges.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.text}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedBadge && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Preview:</span>
                                        <span {...badgeStyleProps(selectedBadge.style, selectedBadge.color)}>
                                            {selectedBadge.text}
                                        </span>
                                    </div>
                                )}
                            </Field>
                        </div>
                    </WizardCard>
                )}

                {step === 2 && (
                    <WizardCard title="Menu Selection" subtitle="Select the event menus you want to include in this plan.">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <Field label="Event Category" helper="Leave empty to apply to all categories.">
                                    <Select
                                        value={form.event_category_id}
                                        onValueChange={(v) => {
                                            setField('event_category_id', v);
                                            // The picked menus belong to the old category.
                                            setSelection({});
                                        }}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(categories?.data ?? []).map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                            </div>

                            {/* Menu picker */}
                            <div className={cn('rounded-lg border border-border', errors.menus && 'border-destructive')}>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
                                    <div className="relative min-w-[220px] flex-1">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={menuSearch}
                                            onChange={(e) => setMenuSearch(e.target.value)}
                                            placeholder="Search menu..."
                                            className="h-9 pl-9"
                                        />
                                    </div>
                                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                                        <Checkbox checked={allSelected} onCheckedChange={(c) => toggleAll(c === true)} />
                                        Select All
                                    </label>
                                </div>

                                <div className="max-h-[360px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-muted/60">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Menu Name
                                                </th>
                                                <th className="w-24 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Included
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingMenus ? (
                                                <tr>
                                                    <td colSpan={2} className="py-10 text-center text-muted-foreground">
                                                        Loading menus...
                                                    </td>
                                                </tr>
                                            ) : filteredMenus.length === 0 ? (
                                                <tr>
                                                    <td colSpan={2} className="py-10 text-center text-muted-foreground">
                                                        No menus match this scope.
                                                    </td>
                                                </tr>
                                            ) : (
                                                menuSections.map((section) => [
                                                    <tr key={`section-${section.key}`} className="border-t border-border bg-muted/30">
                                                        <td colSpan={2} className="px-3 py-2">
                                                            <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                                                                {section.title} ({section.rows.length})
                                                            </span>
                                                            <span className="ml-2 text-[11px] text-muted-foreground">{section.hint}</span>
                                                        </td>
                                                    </tr>,
                                                    ...section.rows.map((m) => {
                                                    const sel = selection[m.id];
                                                    const locked = isLockedMenu(m);
                                                    return (
                                                        <tr key={m.id} className="border-t border-border/50">
                                                            <td className="px-3 py-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/40">
                                                                        <DynamicIcon name={m.icon} color={m.color} size="h-3.5 w-3.5" />
                                                                    </span>
                                                                    <span className="min-w-0">
                                                                        <span className="block break-all font-medium">{m.name}</span>
                                                                        {locked && (
                                                                            <span className="block text-[11px] text-muted-foreground">
                                                                                Always included — cannot be removed
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <Checkbox
                                                                    checked={locked || !!sel?.included}
                                                                    disabled={locked}
                                                                    onCheckedChange={(c) => toggleMenuIncluded(m.id, c === true)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                    }),
                                                ])
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                                    {selectedIds.length} menu{selectedIds.length === 1 ? '' : 's'} selected
                                </div>
                            </div>
                        </div>
                    </WizardCard>
                )}

                {step === 3 && (
                    <WizardCard title="Pricing Details" subtitle="Set the price for this subscription plan.">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Field label="Currency" required error={errors.currency_code}>
                                <Select value={form.currency_code} onValueChange={(v) => setField('currency_code', v)}>
                                    <SelectTrigger className={cn('h-10', errors.currency_code && 'border-destructive')}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Plan Price" required error={errors.price}>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        {currencySymbol(form.currency_code)}
                                    </span>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.price}
                                        onChange={(e) => setField('price', e.target.value)}
                                        placeholder="0.00"
                                        className={cn('h-10 pl-7', errors.price && 'border-destructive')}
                                    />
                                </div>
                            </Field>

                            <Field label="Billing Cycle" required>
                                <Select
                                    value={form.billing_cycle}
                                    onValueChange={(v) => setField('billing_cycle', v as BillingCycle)}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BILLING_CYCLES.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </WizardCard>
                )}

                {step === 4 && (
                    <WizardCard
                        title="Plan Configuration"
                        subtitle="How much a client on this plan can use. Leave a field blank for unlimited."
                    >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {LIMIT_FIELDS.map(({ key, label, helper }) => (
                                <Field key={key} label={label} helper={helper} error={errors[key]}>
                                    <Input
                                        type="number"
                                        min={1}
                                        step={1}
                                        inputMode="numeric"
                                        value={form[key]}
                                        onChange={(e) => setField(key, e.target.value.replace(/[^\d]/g, ''))}
                                        placeholder="Unlimited"
                                        className={cn('h-10', errors[key] && 'border-destructive')}
                                    />
                                </Field>
                            ))}
                            <Field
                                label="Max Storage"
                                helper={`1 to ${STORAGE_MAX}, in MB or GB. Total storage for this client's uploads.`}
                                error={errors.storage_limit}
                            >
                                <div className="flex flex-nowrap items-center gap-2">
                                    {/* One row. The amount is a plain text box (digits only) rather than
                                        type="number": the browser's spinner arrows are ~20px wide and,
                                        when the flex item shrank in this narrow cell, they were ALL that
                                        was left of the box. A fixed width keeps room for three digits;
                                        the unit select takes the remaining space. */}
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={3}
                                        value={form.storage_limit}
                                        disabled={!form.storage_unit}
                                        onChange={(e) =>
                                            setField('storage_limit', e.target.value.replace(/[^\d]/g, '').slice(0, 3))
                                        }
                                        placeholder={form.storage_unit ? `1-${STORAGE_MAX}` : 'Unlimited'}
                                        className={cn('h-10 w-20 shrink-0', errors.storage_limit && 'border-destructive')}
                                    />
                                    <Select
                                        value={form.storage_unit || UNLIMITED}
                                        onValueChange={(v) => {
                                            if (v === UNLIMITED) {
                                                setField('storage_unit', '');
                                                setField('storage_limit', '');
                                            } else {
                                                setField('storage_unit', v as 'MB' | 'GB');
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-10 min-w-0 flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STORAGE_UNITS.map((u) => (
                                                <SelectItem key={u} value={u}>
                                                    {u}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value={UNLIMITED}>Unlimited</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Field>
                        </div>
                    </WizardCard>
                )}

                {step === 5 && (
                    <div className="space-y-4">
                        <WizardCard title="Review & Confirm" subtitle="Review all details before creating the subscription plan.">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <ReviewCard title="Plan Information" onEdit={() => setStep(1)} rows={[
                                    ['Plan Name', form.name || '—'],
                                    ['Plan Code', form.plan_code || '—'],
                                    ['Plan Type', planTypeName],
                                    ['Billing Cycle', cycleLabel],
                                    ['Status', form.is_active ? 'Active' : 'Inactive'],
                                    ['Plan Badge', selectedBadge?.text ?? 'No badge'],
                                    ['Short Description', form.short_description || '—'],
                                ]} />
                                <ReviewCard title="Pricing Information" onEdit={() => setStep(3)} rows={[
                                    ['Price', `${currencySymbol(form.currency_code)} ${Number(form.price || 0).toLocaleString()}`],
                                    ['Billing Cycle', cycleLabel],
                                    ['Trial Period', `${form.trial_days || 0} Days`],
                                    ['Currency', form.currency_code],
                                ]} />
                                <ReviewCard title="Menu Selection" onEdit={() => setStep(2)} rows={[
                                    ['Event Category', categories?.data?.find((c) => String(c.id) === form.event_category_id)?.name ?? 'All Categories'],
                                    ['Total Menus', String(selectedIds.length)],
                                ]} />
                                <ReviewCard title="Plan Configuration" onEdit={() => setStep(4)} rows={[
                                    ...LIMIT_FIELDS.map(({ key, label }): [string, string] => [label, form[key] || 'Unlimited']),
                                    ['Max Storage', form.storage_unit && form.storage_limit ? `${form.storage_limit} ${form.storage_unit}` : 'Unlimited'],
                                ]} />
                            </div>
                        </WizardCard>

                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                                <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                                    Included Menus
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {selectedMenus.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No menus selected.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                                        {selectedMenus.map((m) => (
                                            <div
                                                key={m.id}
                                                className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center"
                                            >
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40">
                                                    <DynamicIcon name={m.icon} color={m.color} size="h-4 w-4" />
                                                </span>
                                                <span className="break-all text-xs font-medium">{m.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {step === 6 && (() => {
                    // Everything here comes off the saved record, so it reflects
                    // what the server stored rather than what the form held.
                    const done = savedPlan;
                    // Prefer the badge the server joined back onto the saved row;
                    // selectedBadge is the fallback before `done` lands.
                    const savedBadge = done?.planBadge ?? selectedBadge ?? null;
                    const cycle = BILLING_CYCLES.find((c) => c.value === (done?.billing_cycle ?? form.billing_cycle));
                    const stamp = (value?: string | null) => {
                        if (!value) return '\u2014';
                        const d = new Date(value);
                        if (Number.isNaN(d.getTime())) return '\u2014';
                        return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                    };
                    const active = done ? Number(done.is_active) === 1 : form.is_active;

                    return (
                        <div className="mx-auto max-w-3xl space-y-5">
                            <h1 className="text-lg font-bold tracking-tight text-foreground">
                                Plan {isEdit ? 'Updated' : 'Created'} Successfully!
                            </h1>

                            <Card className="border-border bg-card shadow-xs">
                                <CardContent className="flex flex-col items-center gap-4 px-5 py-12 text-center">
                                    <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
                                        <CheckCircle2 className="h-14 w-14 text-emerald-600" />
                                    </span>

                                    <h2 className="text-xl font-bold text-foreground">
                                        Your Plan has been {isEdit ? 'updated' : 'created'} successfully!
                                    </h2>
                                    <p className="max-w-lg text-sm text-muted-foreground">
                                        All changes to the{' '}
                                        <span className="font-semibold text-emerald-600">
                                            {done?.name ?? form.name}
                                        </span>{' '}
                                        have been saved. The updated plan details are shown below.
                                    </p>

                                    <div className="flex w-full max-w-xl items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                        <p className="text-xs text-emerald-800">
                                            {active
                                                ? 'The updated plan is now active and available for new subscriptions.'
                                                : 'The plan is saved but inactive, so it is not offered for new subscriptions.'}
                                        </p>
                                    </div>

                                    <div className="mt-2 w-full max-w-2xl rounded-lg border border-border p-4 text-left">
                                        <div className="mb-4 flex flex-wrap items-center gap-2">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                                <FileText className="h-4 w-4" />
                                            </span>
                                            <span className="text-sm font-bold text-foreground">
                                                {done?.name ?? form.name}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[11px]',
                                                    active
                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-300 bg-slate-50 text-slate-600'
                                                )}
                                            >
                                                {active ? 'Active' : 'Inactive'}
                                            </Badge>
                                            {/* Read back from the saved row where possible, so this
                                                reflects what was actually persisted. */}
                                            {savedBadge && (
                                                <span {...badgeStyleProps(savedBadge.style as BadgeStyle, savedBadge.color)}>
                                                    {savedBadge.text}
                                                </span>
                                            )}
                                        </div>

                                        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                                            <SuccessRow label="Plan Code" value={done?.plan_code ?? form.plan_code} />
                                            <SuccessRow
                                                label={`Price (${cycle?.label ?? ''})`}
                                                value={`${currencySymbol(done?.currency_code ?? form.currency_code)} ${Number(done?.price ?? form.price ?? 0).toLocaleString()}`}
                                            />
                                            <SuccessRow label="Plan Type" value={done?.planType?.name ?? planTypeName} />
                                            <SuccessRow
                                                label="Status"
                                                value={
                                                    <span className={active ? 'text-emerald-600' : 'text-muted-foreground'}>
                                                        {active ? 'Active' : 'Inactive'}
                                                    </span>
                                                }
                                            />
                                            <SuccessRow label="Billing Cycle" value={cycle?.label ?? ''} />
                                            <SuccessRow label="Updated On" value={stamp(done?.updated_at)} />
                                            <SuccessRow
                                                label="Trial Period"
                                                value={`${done?.trial_days ?? form.trial_days} Days`}
                                            />
                                            <SuccessRow
                                                label="Updated By"
                                                value={done?.updater?.full_name ?? done?.creator?.full_name ?? '\u2014'}
                                            />
                                            <SuccessRow
                                                label="Trial Price"
                                                value={Number(done?.trial_days ?? form.trial_days) > 0 ? 'Free' : '\u2014'}
                                            />
                                            <SuccessRow
                                                label="Plan Badge"
                                                value={
                                                    savedBadge ? (
                                                        <span {...badgeStyleProps(savedBadge.style as BadgeStyle, savedBadge.color)}>
                                                            {savedBadge.text}
                                                        </span>
                                                    ) : (
                                                        'No badge'
                                                    )
                                                }
                                            />
                                        </dl>
                                    </div>

                                    <div className="mt-4 flex flex-col items-center gap-2">
                                        <Button
                                            onClick={() =>
                                                router.push(
                                                    done ? `/admin/subscriptions/${done.id}` : '/admin/subscriptions'
                                                )
                                            }
                                            className="h-10 w-56 gap-2"
                                        >
                                            <Eye className="h-4 w-4" /> View Plan Details
                                        </Button>
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
                })()}

                {/* Footer nav — hidden on the success screen, which has its own CTA */}
                {step < 6 && (
                    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                        {step > 1 ? (
                            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="h-9 gap-2">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => router.push('/admin/subscriptions')} className="h-9">
                                Cancel
                            </Button>
                        )}

                        {step < 5 ? (
                            <Button onClick={goNext} className="h-9 gap-2">
                                Next: {STEPS[step]} <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={submit} disabled={isSaving} className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700">
                                <Send className="h-4 w-4" />
                                {isEdit ? 'Update Plan' : 'Create Plan'}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </PermissionGuard>
    );
}

/* --------------------------------------------------------------- sub-components */

function StepBar({ step, onStepClick }: { step: number; onStepClick: (target: number) => void }) {
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-border bg-card p-3">
            {STEPS.map((label, i) => {
                const index = i + 1;
                const done = step > index;
                const active = step === index;
                return (
                    <button
                        key={label}
                        type="button"
                        // The success step is an outcome, not a destination.
                        disabled={index === 6}
                        onClick={() => onStepClick(index)}
                        className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors',
                            index !== 6 && 'hover:bg-muted',
                            active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                            index === 6 && 'cursor-default'
                        )}
                    >
                        <span
                            className={cn(
                                'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                                active && 'bg-primary text-primary-foreground',
                                done && 'bg-emerald-100 text-emerald-700',
                                !active && !done && 'bg-muted text-muted-foreground'
                            )}
                        >
                            {done ? <Check className="h-3 w-3" /> : index}
                        </span>
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function WizardCard({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-border bg-card shadow-xs">
            <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                    </span>
                    <div>
                        <CardTitle className="text-sm font-bold text-foreground">{title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">{children}</CardContent>
        </Card>
    );
}

function Field({
    label,
    required,
    helper,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    helper?: string;
    error?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            {helper && (
                <p className={cn('text-[11px]', error ? 'text-destructive' : 'text-muted-foreground')}>{helper}</p>
            )}
        </div>
    );
}

function ReviewCard({
    title,
    onEdit,
    rows,
}: {
    title: string;
    onEdit: () => void;
    rows: Array<[string, string]>;
}) {
    return (
        <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</span>
                <button type="button" onClick={onEdit} className="text-xs font-semibold text-primary hover:underline">
                    Edit
                </button>
            </div>
            <dl className="space-y-2 p-3">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                        <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
                        <dd className="break-all text-right text-xs font-medium text-foreground">{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/** "Label : Value", matching the rest of the subscription screens. */
function SuccessRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex min-w-0 items-start gap-2">
            <dt className="w-24 shrink-0 text-xs text-muted-foreground">{label}</dt>
            <span className="shrink-0 text-xs text-muted-foreground">:</span>
            <dd className="min-w-0 break-words text-sm font-medium text-foreground">{value}</dd>
        </div>
    );
}
