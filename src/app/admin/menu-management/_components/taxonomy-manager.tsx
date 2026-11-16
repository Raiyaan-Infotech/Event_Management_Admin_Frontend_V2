'use client';

import { useState, useMemo } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from '@/lib/toast';
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
import { CommonTable, type CommonColumn } from '@/components/common/common-table';
import { TablePagination, type PaginationMeta } from '@/components/common/table-pagination';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { DynamicIcon } from '@/components/common/dynamic-icon';
import { IconField, ColorField } from './icon-color-fields';
import { cn } from '@/lib/utils';
import type { TaxonomyRecord, TaxonomyPayload } from '@/hooks/use-menu-management';

/**
 * Event Categories, the guest-registration lists and Notification Categories
 * are the same screen with different labels, so they share this component.
 *
 * Layout follows the Template Categories page (form card on top, searchable
 * table below); the field set follows the Menu Management mockup.
 */

export interface TaxonomyManagerProps<T extends TaxonomyRecord> {
    /** e.g. "Event Category" — used for headings, toasts and dialog copy. */
    entityLabel: string;
    /** Plural, for the table heading and empty state. */
    entityPlural: string;
    description: string;
    /** Field label for the name input, e.g. "Category Name". */
    nameLabel: string;
    namePlaceholder: string;
    iconLabel: string;
    colorLabel: string;
    /** Permission slug prefix, e.g. "event_categories". */
    permissionPrefix: string;
    /** Default colour for a fresh form. */
    defaultColor?: string;

    /**
     * Scope selects rendered before the name field — the guest-registration
     * lists have one (Event Category). Each entry names the payload key it
     * writes, so the component does not need to know the domain.
     */
    scopeSelects?: Array<{
        key: 'event_category_id';
        label: string;
        placeholder: string;
        options: Array<{ id: number; name: string }>;
        isLoading?: boolean;
        /** Shown in place of the option list when there is nothing to choose. */
        emptyHint?: string;
        /** Locked until an earlier select has a value. */
        disabledUntil?: 'event_category_id';
        /** Cleared when this select changes, so a stale child can't survive. */
        clears?: Array<'event_category_id'>;
        /**
         * Allow the scope to be left empty, sending `null` instead of an id.
         *
         * The guest-registration lists use it: their NULL-scope rows ARE the
         * fallback list every uncategorised event falls back to, and without
         * this there is no way to author one.
         */
        optional?: boolean;
        /** Wording for the empty choice, e.g. "All categories (general)". */
        optionalLabel?: string;
    }>;

    /**
     * Fields to leave out entirely — hidden from the form, skipped by
     * validation, omitted from the payload and dropped from the table.
     *
     * Defaults to showing everything, so the three existing taxonomy screens
     * are unaffected. The guest-registration lists hide all three: they are
     * hundreds of plain labels ("Vegetarian", "Bride's Father") and demanding
     * an icon, a colour and a description for each would be busywork that
     * nothing ever reads.
     */
    hiddenFields?: Array<'description' | 'icon' | 'color'>;

    /**
     * Fired whenever a scope value changes — on selection, on edit, and on
     * reset, for a page that needs to refetch a dependent list.
     */
    onScopeChange?: (key: 'event_category_id', value: string) => void;

    data: T[];
    pagination: PaginationMeta | null;
    isLoading: boolean;
    isSaving: boolean;
    isDeleting: boolean;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    onSearch: (value: string) => void;
    onCreate: (payload: TaxonomyPayload, done: () => void) => void;
    onUpdate: (id: number, payload: Partial<TaxonomyPayload>, done: () => void) => void;
    onToggleStatus: (id: number, isActive: boolean) => void;
    onDelete: (id: number, done: () => void) => void;
}

interface FormState {
    name: string;
    description: string;
    icon: string;
    color: string;
    is_active: boolean;
    event_category_id: string;
}

/**
 * Stand-in value for "no scope chosen" on an optional select.
 *
 * Radix Select cannot hold an empty string as an item value — it reserves it
 * for the placeholder — so the empty choice needs a sentinel that is mapped
 * back to `null` on save and never leaves this component.
 */
const NO_SCOPE = '__none__';

const emptyForm = (defaultColor: string): FormState => ({
    name: '',
    description: '',
    icon: '',
    color: defaultColor,
    is_active: true,
    event_category_id: '',
});

export function TaxonomyManager<T extends TaxonomyRecord>(props: TaxonomyManagerProps<T>) {
    const {
        entityLabel,
        entityPlural,
        description,
        nameLabel,
        namePlaceholder,
        iconLabel,
        colorLabel,
        permissionPrefix,
        defaultColor = '#6E22FE',
        scopeSelects = [],
        hiddenFields = [],
        onScopeChange,
        data,
        pagination,
        isLoading,
        isSaving,
        isDeleting,
        onPageChange,
        onLimitChange,
        onSearch,
        onCreate,
        onUpdate,
        onToggleStatus,
        onDelete,
    } = props;

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>(() => emptyForm(defaultColor));
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Functional updaters throughout: the icon picker resolves asynchronously,
    // and a `{ ...form }` spread would write back a stale snapshot and wipe
    // whatever was typed while it was open.
    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: false } : prev));
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm(defaultColor));
        setErrors({});
        // Tell the page the scope is cleared too, or a dependent list stays
        // filtered to the record that was just being edited.
        scopeSelects.forEach((s) => onScopeChange?.(s.key, ''));
    };

    const handleEdit = (row: T) => {
        setEditingId(row.id);
        setForm({
            name: row.name ?? '',
            description: row.description ?? '',
            icon: row.icon ?? '',
            color: row.color ?? defaultColor,
            is_active: Number(row.is_active) === 1,
            event_category_id: (row as any).event_category_id
                ? String((row as any).event_category_id)
                : '',
        });
        setErrors({});
        // Push the row's scope out so dependent lists load for THIS record —
        // otherwise a dependent dropdown opens empty on edit.
        scopeSelects.forEach((s) => {
            const raw = (row as any)[s.key];
            onScopeChange?.(s.key, raw ? String(raw) : '');
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isHidden = (field: 'description' | 'icon' | 'color') => hiddenFields.includes(field);

    const handleSave = () => {
        const next: Record<string, boolean> = {};
        if (!form.name.trim()) next.name = true;
        // A hidden field is never filled in, so requiring it would make the
        // form unsubmittable rather than merely strict.
        if (!isHidden('description') && !form.description.trim()) next.description = true;
        if (!isHidden('icon') && !form.icon.trim()) next.icon = true;
        if (!isHidden('color') && !form.color.trim()) next.color = true;
        // A configured scope select is mandatory unless it opts out — a record
        // with a missing scope can never be reached by the Menu form's cascade,
        // which is exactly why the guest lists, having no cascade, may opt out.
        scopeSelects.forEach((s) => {
            if (s.optional) return;
            if (!form[s.key]) next[s.key] = true;
        });

        if (Object.keys(next).length > 0) {
            setErrors(next);
            toast.error('Please fill all mandatory fields.');
            return;
        }
        setErrors({});

        const payload: TaxonomyPayload = {
            name: form.name.trim(),
            is_active: form.is_active,
            ...(isHidden('description') ? {} : { description: form.description.trim() }),
            ...(isHidden('icon') ? {} : { icon: form.icon }),
            ...(isHidden('color') ? {} : { color: form.color }),
            ...scopeSelects.reduce((acc, s) => {
                const raw = form[s.key];
                // The sentinel and a genuinely empty optional select both mean
                // "no scope", and the API expects null for that, not 0 —
                // Number('') is 0, which would point at a category id of zero.
                const value = !raw || raw === NO_SCOPE ? null : Number(raw);
                return { ...acc, [s.key]: value };
            }, {} as Record<string, number | null>),
        };

        if (editingId) {
            onUpdate(editingId, payload, resetForm);
        } else {
            onCreate(payload, resetForm);
        }
    };

    const columns: CommonColumn<T>[] = useMemo(() => {
        const cols: CommonColumn<T>[] = [
            {
                key: 'name',
                header: nameLabel,
                sortable: true,
                // Icon sits inside the name cell rather than in its own column —
                // it reads as part of the record and saves a column of width.
                render: (row) => (
                    <div className="flex items-center gap-2.5">
                        {/* An empty icon tile against every row would read as a
                            missing image rather than a deliberate absence. */}
                        {!hiddenFields.includes('icon') && (
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                                <DynamicIcon name={row.icon} color={row.color} size="h-4 w-4" />
                            </span>
                        )}
                        <span className="font-medium">{row.name}</span>
                    </div>
                ),
            },
        ];

        if (!hiddenFields.includes('description')) {
            cols.push({
                key: 'description',
                header: 'Description',
                render: (row) =>
                    row.description ? (
                        // break-all + line-clamp, never `truncate` — the table is
                        // auto-layout, so truncate has no width to work against.
                        <span
                            className="block max-w-xs break-all line-clamp-2 text-xs text-muted-foreground"
                            title={row.description}
                        >
                            {row.description}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            });
        }

        // One column per configured scope, reading the joined record the API
        // returns (`category`).
        scopeSelects.forEach((s) => {
            const relation = 'category';
            cols.push({
                key: relation,
                header: s.label,
                render: (row) => {
                    const joined = (row as any)[relation];
                    if (joined) return <span className="text-sm">{joined.name}</span>;
                    // On an optional scope, no category is a MEANING — this is the
                    // fallback row — so it is named rather than dashed out.
                    return s.optional ? (
                        <span className="text-xs font-medium text-muted-foreground">
                            {s.optionalLabel ?? 'None'}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    );
                },
            });
        });

        if (!hiddenFields.includes('color')) {
            cols.push({
                key: 'color',
                header: 'Color',
                render: (row) =>
                    row.color ? (
                        <div className="flex items-center gap-2">
                            <span
                                className="inline-block h-4 w-4 shrink-0 rounded-full border border-border"
                                style={{ background: row.color }}
                            />
                            <span className="font-mono text-[11px] text-muted-foreground">{row.color}</span>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            });
        }

        return cols;
    }, [nameLabel, scopeSelects, hiddenFields]);

    return (
        <PermissionGuard permission={`${permissionPrefix}.view`}>
            <div className="space-y-5">
                <PageLoader open={isSaving || isDeleting} />

                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-foreground">{entityPlural}</h1>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetForm}
                        className="h-8 cursor-pointer border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                        <RotateCcw className="mr-1 h-3.5 w-3.5 text-rose-500" /> Reset Form
                    </Button>
                </div>

                {/* Add / Edit form */}
                <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            {editingId ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {/* Scope selects */}
                            {scopeSelects.map((s) => {
                                const locked = !!s.disabledUntil && !form[s.disabledUntil];
                                return (
                                    <div key={s.key} className="space-y-1.5">
                                        <Label className="text-sm font-medium">
                                            {s.label}{' '}
                                            {s.optional ? (
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    (optional)
                                                </span>
                                            ) : (
                                                <span className="text-destructive">*</span>
                                            )}
                                        </Label>
                                        <Select
                                            value={form[s.key]}
                                            disabled={locked}
                                            onValueChange={(v) => {
                                                // The sentinel is this component's own; the page
                                                // and the payload only ever see an id or nothing.
                                                const next = v === NO_SCOPE ? '' : v;
                                                setField(s.key, next);
                                                onScopeChange?.(s.key, next);
                                                // A child select still holding a value from the
                                                // previous parent would fail server validation.
                                                s.clears?.forEach((k) => {
                                                    setField(k, '');
                                                    onScopeChange?.(k, '');
                                                });
                                            }}
                                        >
                                            <SelectTrigger
                                                className={cn('h-10', errors[s.key] && 'border-destructive')}
                                            >
                                                <SelectValue placeholder={s.placeholder} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* The empty choice stays available even while the
                                                    option list is loading or empty — it is a real
                                                    answer here, not the absence of one. */}
                                                {s.optional && (
                                                    <SelectItem value={NO_SCOPE}>
                                                        {s.optionalLabel ?? 'None'}
                                                    </SelectItem>
                                                )}
                                                {s.options.length === 0 ? (
                                                    !s.optional && (
                                                        <div className="px-2 py-3 text-xs text-muted-foreground">
                                                            {s.isLoading
                                                                ? 'Loading…'
                                                                : s.emptyHint ?? 'Nothing to choose yet.'}
                                                        </div>
                                                    )
                                                ) : (
                                                    s.options.map((o) => (
                                                        <SelectItem key={o.id} value={String(o.id)}>
                                                            {o.name}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}

                            {/* Name */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">
                                    {nameLabel} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setField('name', e.target.value)}
                                    placeholder={namePlaceholder}
                                    maxLength={100}
                                    className={cn('h-10', errors.name && 'border-destructive')}
                                />
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">
                                    Status <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex h-10 items-center justify-between rounded-md border border-border bg-card px-3">
                                    <span className="text-sm text-muted-foreground">
                                        {form.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <Switch
                                        checked={form.is_active}
                                        onCheckedChange={(v) => setField('is_active', v)}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            {!isHidden('description') && (
                                <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                                    <Label className="text-sm font-medium">
                                        Description <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={(e) => setField('description', e.target.value)}
                                        placeholder="Enter description"
                                        maxLength={255}
                                        className={cn('min-h-[80px] text-sm', errors.description && 'border-destructive')}
                                    />
                                </div>
                            )}

                            {!isHidden('icon') && (
                                <IconField
                                    label={iconLabel}
                                    required
                                    value={form.icon}
                                    onChange={(v) => setField('icon', v)}
                                    color={form.color}
                                    error={errors.icon}
                                    helper={`Select an icon to represent this ${entityLabel.toLowerCase()}.`}
                                />
                            )}

                            {!isHidden('color') && (
                                <ColorField
                                    label={colorLabel}
                                    required
                                    value={form.color}
                                    onChange={(v) => setField('color', v)}
                                    error={errors.color}
                                    helper={`Choose a color for this ${entityLabel.toLowerCase()}.`}
                                />
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                            {editingId && (
                                <Button type="button" variant="outline" size="sm" onClick={resetForm} className="h-9">
                                    Cancel
                                </Button>
                            )}
                            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="h-9 gap-1.5">
                                <Save className="h-3.5 w-3.5" />
                                {isSaving ? 'Saving...' : editingId ? `Update ${entityLabel}` : `Save ${entityLabel}`}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            {entityPlural} List
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <CommonTable
                            columns={columns}
                            data={data as any}
                            isLoading={isLoading}
                            emptyMessage={`No ${entityPlural.toLowerCase()} found. Create your first one above.`}
                            searchPlaceholder={`Search ${entityPlural.toLowerCase()}...`}
                            onSearch={onSearch}
                            onStatusToggle={(row, value) => onToggleStatus(row.id, value)}
                            onEdit={handleEdit}
                            onDelete={(row) => setDeleteId(row.id)}
                            disableStatusToggle={(row) => !!row.has_pending_approval}
                            disableEdit={(row) => !!row.has_pending_approval}
                            disableDelete={(row) => !!row.has_pending_approval}
                            showStatus
                            showCreated
                            showActions
                        />
                        {pagination && (
                            <TablePagination
                                pagination={pagination}
                                onPageChange={onPageChange}
                                onLimitChange={onLimitChange}
                            />
                        )}
                    </CardContent>
                </Card>

                <DeleteDialog
                    open={deleteId !== null}
                    onOpenChange={(open: boolean) => !open && setDeleteId(null)}
                    title={`Delete ${entityLabel}`}
                    description={`Are you sure you want to delete this ${entityLabel.toLowerCase()}? This action cannot be undone.`}
                    isDeleting={isDeleting}
                    onConfirm={() => {
                        if (deleteId !== null) {
                            onDelete(deleteId, () => {
                                setDeleteId(null);
                                // Clearing the form matters when the row being
                                // deleted is the one loaded into it.
                                if (editingId === deleteId) resetForm();
                            });
                        }
                    }}
                />
            </div>
        </PermissionGuard>
    );
}
