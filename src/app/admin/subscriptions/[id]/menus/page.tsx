'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Eye,
    Search,
    Plus,
    RotateCcw,
    ShieldCheck,
    Smartphone,
    Info,
    Lightbulb,
    ArrowUp,
    ArrowDown,
    Save,
    LayoutList,
    Settings2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { DynamicIcon } from '@/components/common/dynamic-icon';
import { cn } from '@/lib/utils';
import { useEventMenus } from '@/hooks/use-menu-management';
import {
    useSubscriptionPlan,
    useSubscriptionPlans,
    useUpdateSubscriptionPlan,
} from '@/hooks/use-subscription-plans';

const ALL = 'all';

/**
 * Section order and labels for the Core / Additional / Custom grouping.
 *
 * `portal` holds the client-portal SIDEBAR sections (Guests, Messages, Splash
 * Screens, Analytics, Notification Templates). Granting one on Website is what
 * shows that section in the client's sidebar; they are not event features.
 */
const GROUPS = [
    { key: 'core', label: 'Core Menus' },
    { key: 'additional', label: 'Additional Menus' },
    { key: 'custom', label: 'Custom Menus' },
    { key: 'portal', label: 'Client Portal Sections' },
    // Mobile app features (Chat, Wishes, Invite & Share, …): granted by the plan
    // alone, not chosen per event — every event of a subscriber shows them.
    { key: 'app', label: 'Mobile App Features' },
] as const;

/** Present = the menu is in the plan. No platform of its own — see `toggle`. */
interface Selected {
    sort_order: number;
}

export default function ManagePlanMenusPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [tab, setTab] = useState<'menus' | 'settings'>('menus');
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState(ALL);
    const [selection, setSelection] = useState<Record<number, Selected>>({});
    const [loadedId, setLoadedId] = useState<string | null>(null);

    const { data: plan, isLoading } = useSubscriptionPlan(id);
    const { data: allPlans } = useSubscriptionPlans({ limit: 200 });

    // Every menu the plan could offer: those in the plan's category. Menus carry
    // no event type or religion, so each one is listed once.
    const { data: menusData, isLoading: loadingMenus } = useEventMenus({
        limit: 200,
        is_active: true,
        event_category_id: plan?.event_category_id ?? undefined,
    });

    /*
      Client Portal Sections are NOT scoped by event category — Guests or
      Messages is the same section whatever event a plan is for — so the scoped
      query above never returns them (their category is NULL). Fetched on their
      own and merged, otherwise the group renders empty and the admin cannot
      grant or remove a section.
    */
    const { data: portalData } = useEventMenus({ limit: 200, is_active: true, menu_group: 'portal' });
    // Same reason for Mobile App Features: no category/type scope.
    const { data: appData } = useEventMenus({ limit: 200, is_active: true, menu_group: 'app' });

    const allMenus = useMemo(() => {
        const scoped = menusData?.data ?? [];
        const seen = new Set(scoped.map((m) => m.id));
        const extra = [...(portalData?.data ?? []), ...(appData?.data ?? [])].filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });
        return [...scoped, ...extra];
    }, [menusData, portalData, appData]);

    const updatePlan = useUpdateSubscriptionPlan(() => {
        toast.success('Menus updated for this plan');
    });

    // Seed the toggles from the plan once per id — a refetch must not discard
    // changes made since.
    useEffect(() => {
        if (!plan || loadedId === id) return;
        const next: Record<number, Selected> = {};
        (plan.planMenus ?? []).forEach((pm, i) => {
            next[pm.menu_id] = {
                sort_order: pm.sort_order ?? i,
            };
        });
        setSelection(next);
        setLoadedId(id);
    }, [plan, id, loadedId]);

    const isOn = (menuId: number) => !!selection[menuId];

    /**
     * One switch per menu, not per platform: this screen is "is this menu in the
     * plan". Where it shows is the menu's own Active switch in Menu Management.
     */
    const toggle = (menuId: number, on: boolean) => {
        setSelection((prev) => {
            const next = { ...prev };
            if (!on) {
                delete next[menuId];
                return next;
            }
            const existing = prev[menuId];
            next[menuId] = {
                sort_order: existing?.sort_order ?? Object.keys(prev).length,
            };
            return next;
        });
    };

    /**
     * Only the categories this plan's own menus belong to.
     *
     * `allMenus` is already fetched scoped to the plan, so listing every
     * company category let you select one that can only ever match nothing —
     * and a filter matching nothing is what made "Reset to Default" look
     * broken: the toggles did revert, behind an empty list.
     */
    const categoryOptions = useMemo(() => {
        const seen = new Map<string, string>();
        allMenus.forEach((m) => {
            if (!m.event_category_id) return;
            const key = String(m.event_category_id);
            if (!seen.has(key)) seen.set(key, m.category?.name ?? key);
        });
        return Array.from(seen, ([value, label]) => ({ value, label }));
    }, [allMenus]);

    /** Discards unsaved toggles by clearing the load guard, which re-seeds from
     *  the plan. The filters go with it, so the revert is actually visible. */
    const resetToSaved = () => {
        setLoadedId(null);
        setSearch('');
        setCategoryId(ALL);
        toast.success('Reverted to the saved menu selection');
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allMenus.filter((m) => {
            if (q && !m.name.toLowerCase().includes(q) && !m.slug.toLowerCase().includes(q)) return false;
            if (categoryId !== ALL && String(m.event_category_id) !== categoryId) return false;
            return true;
        });
    }, [allMenus, search, categoryId]);

    const grouped = useMemo(
        () =>
            GROUPS.map((g) => ({
                ...g,
                menus: filtered.filter((m) => (m.menu_group ?? 'core') === g.key),
            })).filter((g) => g.menus.length > 0 || g.key !== 'custom'),
        [filtered]
    );

    const enabledCount = allMenus.filter((m) => isOn(m.id)).length;
    const disabledCount = allMenus.length - enabledCount;

    const allVisibleOn = filtered.length > 0 && filtered.every((m) => isOn(m.id));
    const toggleAll = (on: boolean) => filtered.forEach((m) => toggle(m.id, on));

    const save = () => {
        const menus = Object.entries(selection)
            .sort(([, a], [, b]) => a.sort_order - b.sort_order)
            .map(([menuId, s], i) => ({
                menu_id: Number(menuId),
                sort_order: i,
            }));
        updatePlan.mutate({ id: Number(id), data: { menus } });
    };

    const move = (menuId: number, direction: -1 | 1) => {
        setSelection((prev) => {
            const ordered = Object.entries(prev).sort(([, a], [, b]) => a.sort_order - b.sort_order);
            const index = ordered.findIndex(([k]) => Number(k) === menuId);
            const target = index + direction;
            if (index < 0 || target < 0 || target >= ordered.length) return prev;
            [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
            const next: Record<number, Selected> = {};
            ordered.forEach(([k, v], i) => { next[Number(k)] = { ...v, sort_order: i }; });
            return next;
        });
    };

    // Covers the save as well as the initial load — saving a menu selection
    // showed nothing before.
    if (isLoading) return <PageLoader open />;
    if (!plan) {
        return (
            <div className="py-20 text-center text-sm text-muted-foreground">
                Plan not found.
                <div className="mt-4">
                    <Button variant="outline" onClick={() => router.push('/admin/subscriptions')}>
                        Back to Plans
                    </Button>
                </div>
            </div>
        );
    }

    const isActive = Number(plan.is_active) === 1;
    const orderedSelection = Object.entries(selection)
        .sort(([, a], [, b]) => a.sort_order - b.sort_order)
        .map(([k]) => allMenus.find((m) => m.id === Number(k)))
        .filter(Boolean);

    return (
        <PermissionGuard permission="subscription_plans.edit">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
                <PageLoader open={updatePlan.isPending} />
                {/* ---------------------------------------------------------- main */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-foreground">Manage Plan Menus</h1>
                            <p className="text-xs text-muted-foreground">
                                Enable or disable menus for this plan. Changes will reflect for all subscribers of this plan.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/admin/subscriptions/${plan.id}`)}
                            className="h-9 gap-2"
                        >
                            <Eye className="h-4 w-4" /> Preview Plan
                        </Button>
                    </div>

                    {/* Plan switcher */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="flex flex-wrap items-center gap-3 p-4">
                            <Label className="shrink-0 text-sm font-medium">Select Plan</Label>
                            <div className="min-w-[240px] flex-1">
                                <Select
                                    value={String(plan.id)}
                                    // Switching plan is a navigation, so the new plan's
                                    // menus load through the same effect.
                                    onValueChange={(v) => router.push(`/admin/subscriptions/${v}/menus`)}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(allPlans?.data ?? []).map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.name} ({p.plan_code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Badge
                                variant="outline"
                                className={cn(
                                    'shrink-0 text-[11px]',
                                    isActive
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-300 bg-slate-50 text-slate-600'
                                )}
                            >
                                {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 border-b border-border">
                        {([
                            ['menus', 'Menu Management', <LayoutList key="a" className="h-4 w-4" />],
                            ['settings', 'Menu Settings', <Settings2 key="b" className="h-4 w-4" />],
                        ] as const).map(([key, label, icon]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTab(key as 'menus' | 'settings')}
                                className={cn(
                                    'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors',
                                    tab === key
                                        ? 'border-primary font-semibold text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === 'menus' ? (
                        <Card className="border-border bg-card shadow-xs">
                            <CardContent className="space-y-5 p-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="relative min-w-[200px] flex-1">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search menu..."
                                            className="h-9 pl-9"
                                        />
                                    </div>
                                    {/* Hidden when the plan's menus span a single
                                        category — the filter would have exactly
                                        one meaningful choice. */}
                                    {categoryOptions.length > 1 && (
                                        <Select value={categoryId} onValueChange={setCategoryId}>
                                            <SelectTrigger className="h-9 w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ALL}>All Categories</SelectItem>
                                                {categoryOptions.map((c) => (
                                                    <SelectItem key={c.value} value={c.value}>
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Select All</span>
                                        <Switch checked={allVisibleOn} onCheckedChange={toggleAll} />
                                    </div>
                                </div>

                                {loadingMenus ? (
                                    <p className="py-10 text-center text-sm text-muted-foreground">Loading menus…</p>
                                ) : filtered.length === 0 ? (
                                    <p className="py-10 text-center text-sm text-muted-foreground">
                                        No menus match this plan&apos;s scope.
                                    </p>
                                ) : (
                                    grouped.map((group) => (
                                        <div key={group.key} className="space-y-3">
                                            <p className="text-sm font-bold text-foreground">{group.label}</p>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                {group.menus.map((m) => (
                                                    <label
                                                        key={m.id}
                                                        className={cn(
                                                            'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                                                            isOn(m.id)
                                                                ? 'border-primary/30 bg-primary/[0.03]'
                                                                : 'border-border hover:bg-muted/40'
                                                        )}
                                                    >
                                                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                                                            <DynamicIcon name={m.icon} color={m.color} size="h-4 w-4" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block break-words text-sm font-semibold text-foreground">
                                                                {m.name}
                                                            </span>
                                                            <span className="block break-all font-mono text-[11px] text-muted-foreground">
                                                                /{m.slug}
                                                            </span>
                                                        </span>
                                                        <Switch
                                                            checked={isOn(m.id)}
                                                            onCheckedChange={(v) => toggle(m.id, v)}
                                                        />
                                                    </label>
                                                ))}

                                                {/* Custom menus are created in Menu Management, so this
                                                    links there rather than opening an inline form. */}
                                                {group.key === 'custom' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push('/admin/menu-management/menus/create')}
                                                        className="flex items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/[0.03] p-3 text-left transition-colors hover:bg-primary/[0.07]"
                                                    >
                                                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary">
                                                            <Plus className="h-5 w-5" />
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-semibold text-primary">
                                                                Add Custom Menu
                                                            </span>
                                                            <span className="block text-[11px] text-muted-foreground">
                                                                Create a custom menu for this plan
                                                            </span>
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-border bg-card shadow-xs">
                            <CardContent className="space-y-3 p-4">
                                <div>
                                    <p className="text-sm font-bold text-foreground">Menu Order</p>
                                    <p className="text-xs text-muted-foreground">
                                        The order menus appear in for subscribers on this plan.
                                    </p>
                                </div>

                                {orderedSelection.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No menus enabled yet. Enable some in Menu Management first.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {orderedSelection.map((m, i) => (
                                            <div
                                                key={m!.id}
                                                className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                                            >
                                                <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                                                    {i + 1}
                                                </span>
                                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                                                    <DynamicIcon name={m!.icon} color={m!.color} size="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0 flex-1 break-words text-sm font-medium">
                                                    {m!.name}
                                                </span>
                                                <div className="flex shrink-0 gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        disabled={i === 0}
                                                        onClick={() => move(m!.id, -1)}
                                                    >
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        disabled={i === orderedSelection.length - 1}
                                                        onClick={() => move(m!.id, 1)}
                                                    >
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                        <Button variant="outline" onClick={() => router.push('/admin/subscriptions')} className="h-9">
                            Cancel
                        </Button>
                        <Button onClick={save} disabled={updatePlan.isPending} className="h-9 gap-2">
                            <Save className="h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* ------------------------------------------------------- sidebar */}
                <div className="space-y-4 lg:sticky lg:top-6">
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-4 p-4">
                            <p className="text-sm font-bold text-foreground">Plan Summary</p>

                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                    <ShieldCheck className="h-5 w-5" />
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

                            <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border text-center">
                                <Stat label="Total Menus" value={allMenus.length} />
                                <Stat label="Enabled" value={enabledCount} className="text-emerald-600" />
                                <Stat label="Disabled" value={disabledCount} className="text-rose-600" />
                            </div>

                            <div className="space-y-2 border-t border-border pt-3">
                                <p className="text-xs font-bold text-foreground">Category Wise Count</p>
                                {GROUPS.map((g) => {
                                    const inGroup = allMenus.filter((m) => (m.menu_group ?? 'core') === g.key);
                                    const on = inGroup.filter((m) => isOn(m.id)).length;
                                    return (
                                        <div key={g.key} className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-muted-foreground">{g.label}</span>
                                            <span
                                                className={cn(
                                                    'text-xs font-semibold',
                                                    inGroup.length === 0
                                                        ? 'text-muted-foreground'
                                                        : on === inGroup.length
                                                            ? 'text-emerald-600'
                                                            : 'text-amber-600'
                                                )}
                                            >
                                                {on} / {inGroup.length}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p className="text-[11px] text-muted-foreground">
                                    Disabled menus will be hidden from your event app.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="space-y-2 p-4">
                            <p className="text-xs font-bold text-foreground">Quick Actions</p>

                            <QuickAction
                                icon={<RotateCcw className="h-4 w-4" />}
                                label="Reset to Default"
                                // Back to what is saved, not "everything on" — reset
                                // should discard edits, not invent a new state.
                                onClick={resetToSaved}
                            />
                            <QuickAction
                                icon={<ShieldCheck className="h-4 w-4" />}
                                label="Enable Recommended"
                                onClick={() => {
                                    // Core menus are the recommended baseline.
                                    allMenus
                                        .filter((m) => (m.menu_group ?? 'core') === 'core')
                                        .forEach((m) => toggle(m.id, true));
                                    toast.success('Core menus enabled');
                                }}
                            />
                            <QuickAction
                                icon={<Smartphone className="h-4 w-4" />}
                                label="Preview in App"
                                onClick={() => router.push(`/admin/subscriptions/${plan.id}`)}
                            />

                            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                <p className="text-[11px] text-amber-800">
                                    You can reorder menus from the Menu Settings tab.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PermissionGuard>
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
