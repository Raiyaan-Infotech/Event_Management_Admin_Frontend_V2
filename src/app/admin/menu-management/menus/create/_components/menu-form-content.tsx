'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Globe,
    LayoutList,
    Plus,
    RotateCcw,
    Save,
    X,
    Smartphone,
    Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { cn } from '@/lib/utils';
import { IconField, ColorField } from '../../../_components/icon-color-fields';
import {
    useEventMenu,
    useEventMenus,
    useCreateEventMenu,
    useUpdateEventMenu,
    useEventCategories,
} from '@/hooks/use-menu-management';

interface FormState {
    name: string;
    description: string;
    remarks: string;
    event_category_id: string;
    is_active: boolean;
    is_default: boolean;
    /** Home Quick Action: offered on the app's Home, never an event tile. */
    quick_action: boolean;
    sort_order: number;
    icon: string;
    color: string;
}

const emptyForm = (): FormState => ({
    name: '',
    description: '',
    remarks: '',
    event_category_id: '',
    is_active: true,
    is_default: false,
    quick_action: false,
    sort_order: 1,
    icon: '',
    color: '#6E22FE',
});

/**
 * `menu_group`: Home Quick Action wins; otherwise the label follows Default
 * (core) / Add-on (addon), as it always has.
 */
const menuGroupOf = (form: FormState): 'core' | 'addon' | 'quick_action' =>
    form.quick_action ? 'quick_action' : form.is_default ? 'core' : 'addon';

export function MenuFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const isEdit = !!id;

    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [resetOpen, setResetOpen] = useState(false);
    const [loadedId, setLoadedId] = useState<string | null>(null);

    const { data: existing, isLoading: loadingMenu, refetch } = useEventMenu(id ?? undefined);
    // A menu is scoped by category only — no event type, religion or
    // Website/Mobile type. Which platform it shows on is its Active switch below.
    const { data: categories, isLoading: loadingCategories } = useEventCategories({ limit: 200, is_active: true });

    /**
     * No navigation on the hook: it fires for EVERY create, so a redirect here
     * also dragged "Save & Add Another" onto the edit form the moment it saved.
     * Each button now says where it goes at its own call site.
     */
    const createMenu = useCreateEventMenu();
    const updateMenu = useUpdateEventMenu();

    const backToList = () => router.push('/admin/menu-management/menus');

    /**
     * Sort Order seeds to the next free position. It was a literal 1 in
     * emptyForm(), so every menu created from this form landed on 1 and the
     * list showed a block of rows all claiming the same position — with no
     * tiebreak behind it, their order was then arbitrary.
     */
    const { data: lastByOrder } = useEventMenus({
        limit: 1,
        sort_by: 'sort_order',
        sort_order: 'DESC',
    });
    const nextSortOrder = (Number(lastByOrder?.data?.[0]?.sort_order) || 0) + 1;
    const [sortSeeded, setSortSeeded] = useState(false);

    // Seeded once, and never in edit mode — the saved row already has its own
    // position, and re-seeding would silently move it.
    useEffect(() => {
        if (isEdit || sortSeeded || !lastByOrder) return;
        setForm((prev) => ({ ...prev, sort_order: nextSortOrder }));
        setSortSeeded(true);
    }, [isEdit, sortSeeded, lastByOrder, nextSortOrder]);

    const applyRecord = (record: NonNullable<typeof existing>) => {
        setForm({
            name: record.name ?? '',
            description: record.description ?? '',
            remarks: record.remarks ?? '',
            event_category_id: record.event_category_id ? String(record.event_category_id) : '',
            is_active: !!Number(record.is_active),
            is_default: !!Number(record.is_default),
            quick_action: record.menu_group === 'quick_action',
            sort_order: record.sort_order ?? 1,
            icon: record.icon ?? '',
            color: record.color ?? '#6E22FE',
        });
        setErrors({});
    };

    // Load once per id. Without the guard, every refetch would clobber whatever
    // the user has typed since.
    useEffect(() => {
        if (existing && id && loadedId !== id) {
            applyRecord(existing);
            setLoadedId(id);
        }
    }, [existing, id, loadedId]);

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: false } : prev));
    };

    const handleSave = () => {
        const next: Record<string, boolean> = {};
        if (!form.name.trim()) next.name = true;
        if (!form.event_category_id) next.event_category_id = true;
        if (!form.icon.trim()) next.icon = true;
        if (!form.color.trim()) next.color = true;

        if (Object.keys(next).length > 0) {
            setErrors(next);
            toast.error('Please fill all mandatory fields.');
            return;
        }
        setErrors({});

        const payload = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            remarks: form.remarks.trim() || null,
                        event_category_id: Number(form.event_category_id),
            is_active: form.is_active,
            is_default: form.is_default,
            menu_group: menuGroupOf(form),
            sort_order: Number(form.sort_order) || 0,
            icon: form.icon,
            color: form.color,
        };

        // Both paths land on the Menu List — saving is the end of this task, so
        // the saved row belongs in front of the user in context.
        if (isEdit && id) {
            updateMenu.mutate({ id: Number(id), data: payload }, { onSuccess: backToList });
        } else {
            createMenu.mutate(payload, { onSuccess: backToList });
        }
    };

    const handleSaveAndAddAnother = () => {
        const next: Record<string, boolean> = {};
        if (!form.name.trim()) next.name = true;
        if (!form.event_category_id) next.event_category_id = true;
        if (!form.icon.trim()) next.icon = true;
        if (!form.color.trim()) next.color = true;

        if (Object.keys(next).length > 0) {
            setErrors(next);
            toast.error('Please fill all mandatory fields.');
            return;
        }
        setErrors({});

        createMenu.mutate(
            {
                name: form.name.trim(),
                description: form.description.trim() || null,
                remarks: form.remarks.trim() || null,
                                event_category_id: Number(form.event_category_id),
                is_active: form.is_active,
                is_default: form.is_default,
                menu_group: menuGroupOf(form),
                sort_order: Number(form.sort_order) || 0,
                icon: form.icon,
                color: form.color,
            },
            {
                // Stays on this form — deliberately no navigation, which is the
                // whole point of the button. Keeps the category (consecutive
                // menus almost always belong to the same event)
                // and clears what is specific to the menu just saved.
                onSuccess: () => {
                    setForm((prev) => ({
                        ...prev,
                        name: '',
                        icon: '',
                        description: '',
                        remarks: '',
                        sort_order: (Number(prev.sort_order) || 0) + 1,
                    }));
                    setErrors({});
                },
            }
        );
    };

    /**
     * Reset re-reads the saved record rather than reverting to local state, so
     * it genuinely discards unsaved edits instead of restoring a stale copy.
     */
    const handleReset = async () => {
        if (isEdit && id) {
            const fresh = await refetch();
            if (fresh.data) applyRecord(fresh.data);
        } else {
            // Back to a blank form, but keep the seeded position rather than
            // dropping to emptyForm()'s literal 1.
            setForm({ ...emptyForm(), sort_order: nextSortOrder });
            setErrors({});
        }
    };

    const isSaving = createMenu.isPending || updateMenu.isPending;
    const categoryOptions = categories?.data ?? [];

    return (
        <PermissionGuard permission={isEdit ? 'event_menus.edit' : 'event_menus.create'}>
            <div className="space-y-5">
                <PageLoader open={isSaving || (isEdit && loadingMenu)} />

                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                            {isEdit ? 'Edit Menu' : 'Add Menu Name'}
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setResetOpen(true)}
                            className="h-9 gap-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                            <RotateCcw className="h-4 w-4" /> Reset
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={backToList}
                            className="h-9 gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Menu List
                        </Button>
                    </div>
                </div>

                <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <LayoutList className="h-4 w-4" />
                            </span>
                            <div>
                                <CardTitle className="text-sm font-bold text-foreground">Menu Information</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    Create a new menu for website and mobile app.
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-5 p-4">
                        {/* Row 1 — name + category */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">
                                    Menu Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setField('name', e.target.value)}
                                    placeholder="Enter menu name (e.g. Home, Gallery, Agenda)"
                                    maxLength={150}
                                    className={cn('h-10', errors.name && 'border-destructive')}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    This name will be used to identify the menu.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">
                                    Event Category <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={form.event_category_id}
                                    onValueChange={(v) => setField('event_category_id', v)}
                                >
                                    <SelectTrigger className={cn('h-10', errors.event_category_id && 'border-destructive')}>
                                        <SelectValue placeholder="Select event category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.length === 0 ? (
                                            <div className="px-2 py-3 text-xs text-muted-foreground">
                                                {loadingCategories ? 'Loading…' : 'No event categories yet.'}
                                            </div>
                                        ) : (
                                            categoryOptions.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                    The menu is offered for every event in this category.
                                </p>
                            </div>
                        </div>

                        {/* Row 2 — one Active/Inactive switch, not a per-platform
                            split. Turning it off hides the menu everywhere. */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-border bg-card p-4">
                                <p className="text-sm font-semibold text-foreground">Active / Inactive Status</p>
                                <p className="mb-3 text-xs text-muted-foreground">
                                    Activate or deactivate this menu.
                                </p>
                                <StatusRow
                                    icon={<Globe className="h-4 w-4" />}
                                    title={form.is_active ? 'Active' : 'Inactive'}
                                    subtitle={form.is_active ? 'Menu is active' : 'Menu is deactivated'}
                                    checked={form.is_active}
                                    onChange={(v) => setField('is_active', v)}
                                />
                            </div>

                            {/* Default vs add-on — the ONLY place that decides it.
                                Default: every plan grants it and no event can
                                switch it off. Add-on: optional on a plan,
                                switchable per event. */}
                            {/* Menu Type as two clear choices (Jamal, 2026-11-06: the small "Plan
                                Default" switch read as missing). Same words as the list's
                                Menu Type filter. Default also grants the menu to every plan. */}
                            <div className="rounded-lg border border-border bg-card p-4">
                                <p className="text-sm font-semibold text-foreground">
                                    Menu Type <span className="text-destructive">*</span>
                                </p>
                                <p className="mb-3 text-xs text-muted-foreground">
                                    Default menus are on every plan and every event. Add-ons are chosen per plan and switched per event.
                                </p>
                                <div role="radiogroup" aria-label="Menu Type" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {([
                                        { value: true, title: 'Default Menu', text: 'Always included — every plan, every event' },
                                        { value: false, title: 'Add-on Menu', text: 'Optional — plans add it, events can switch it off' },
                                    ] as const).map((o) => {
                                        const on = form.is_default === o.value;
                                        return (
                                            <button
                                                key={o.title}
                                                type="button"
                                                role="radio"
                                                aria-checked={on}
                                                onClick={() => setField('is_default', o.value)}
                                                className={cn(
                                                    'flex items-start gap-2.5 rounded-lg border p-3 text-left transition',
                                                    on ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/50'
                                                )}
                                            >
                                                <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2', on ? 'border-primary' : 'border-muted-foreground/40')}>
                                                    {on && <span className="h-2 w-2 rounded-full bg-primary" />}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                        {o.value && <Star className="h-3.5 w-3.5 text-primary" />} {o.title}
                                                    </span>
                                                    <span className="block text-xs text-muted-foreground">{o.text}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* The "Home Quick Action" switch was removed (Jamal,
                            2026-10-26): every plan menu can be a Quick Action
                            / Quick View tile. An existing Home-only menu (QR
                            Code, My Plan…) keeps its group — form.quick_action
                            is still read from the record and saved back. */}

                        {/* Row 3 — order, icon, colour */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">
                                    Sort Order <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.sort_order}
                                    onChange={(e) => {
                                        // Counts as seeded, so a slow list query
                                        // landing afterwards cannot overwrite a
                                        // position typed by hand.
                                        setSortSeeded(true);
                                        setField('sort_order', Number(e.target.value));
                                    }}
                                    className="h-10"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Lower numbers will appear first in the menu list.
                                </p>
                            </div>

                            <IconField
                                label="Menu Icon"
                                required
                                value={form.icon}
                                onChange={(v) => setField('icon', v)}
                                color={form.color}
                                error={errors.icon}
                                helper="Select an icon to represent this menu."
                            />

                            <ColorField
                                label="Menu Color"
                                required
                                value={form.color}
                                onChange={(v) => setField('color', v)}
                                error={errors.color}
                                helper="Choose a color for the menu icon and highlights."
                            />
                        </div>
                        {/* Row 4 — free text. Optional: a menu is usable without either. */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Description</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setField('description', e.target.value)}
                                    placeholder="What this menu is for"
                                    className="min-h-[80px] text-sm"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Shown on the menu's view page.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Remarks</Label>
                                <Textarea
                                    value={form.remarks}
                                    onChange={(e) => setField('remarks', e.target.value.slice(0, 300))}
                                    placeholder="Internal note"
                                    className="min-h-[80px] text-sm"
                                />
                                <p className="text-right text-[11px] text-muted-foreground">
                                    {form.remarks.length}/300
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer actions — Reset now sits in the header beside Back. */}
                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" onClick={handleSave} disabled={isSaving} className="h-9 gap-2">
                            <Save className="h-4 w-4" />
                            {isEdit ? 'Update Menu' : 'Save Menu'}
                        </Button>
                        {/* Only meaningful when creating — in edit mode there is
                            no "another" to chain from. */}
                        {!isEdit && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleSaveAndAddAnother}
                                disabled={isSaving}
                                className="h-9 gap-2"
                            >
                                <Plus className="h-4 w-4" /> Save &amp; Add Another
                            </Button>
                        )}
                    </div>
                </div>

                <ConfirmResetDialog open={resetOpen} onOpenChange={setResetOpen} onConfirm={handleReset} />
            </div>
        </PermissionGuard>
    );
}

function StatusPanel({
    title,
    subtitle,
    websiteLabel,
    mobileLabel,
    websiteValue,
    mobileValue,
    onWebsiteChange,
    onMobileChange,
}: {
    title: string;
    subtitle: string;
    websiteLabel: string;
    mobileLabel: string;
    websiteValue: boolean;
    mobileValue: boolean;
    onWebsiteChange: (value: boolean) => void;
    onMobileChange: (value: boolean) => void;
}) {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">
                {title} <span className="text-destructive">*</span>
            </p>
            <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>

            <div className="divide-y divide-border">
                <StatusRow
                    icon={<Globe className="h-4 w-4" />}
                    title="Website"
                    subtitle={websiteLabel}
                    checked={websiteValue}
                    onChange={onWebsiteChange}
                />
                <StatusRow
                    icon={<Smartphone className="h-4 w-4" />}
                    title="Mobile App"
                    subtitle={mobileLabel}
                    checked={mobileValue}
                    onChange={onMobileChange}
                />
            </div>
        </div>
    );
}

function StatusRow({
    icon,
    title,
    subtitle,
    checked,
    onChange,
    disabled = false,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {icon}
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="break-words text-xs text-muted-foreground">{subtitle}</p>
                </div>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
        </div>
    );
}
