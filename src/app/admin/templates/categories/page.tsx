'use client';

/**
 * Template Categories — the DESIGN family a template or a frame belongs to
 * (Classic, Royal, Minimal, Elegant, Traditional).
 *
 * NOT `event_categories`, which is what kind of EVENT something is, and not the
 * Website Builder's own Template Categories at
 * `/admin/website-builder/templates/categories`, which classify WEBSITE themes.
 * A Floral frame suits a wedding and a birthday alike.
 *
 * ── LAID OUT LIKE THE WEBSITE BUILDER'S CATEGORIES SCREEN ────────────────────
 * Same shape by request: an inline add/edit card on top, a searchable,
 * drag-orderable table underneath. `BuilderDataTable` and `BuilderCountedInput`
 * are fully generic over their row type, so they are reused rather than copied.
 *
 * Three deliberate differences from that screen:
 *
 *  1. NO DESCRIPTION FIELD. This table is name + slug by design — the record
 *     exists to label and to group, and there is no column to write one to.
 *  2. The count column is FRAME STYLES, not templates, and comes from the API
 *     (`frame_styles_count`, one grouped query) rather than being counted in the
 *     browser against a second list.
 *  3. Reordering is SAVED. The builder's version only calls `setLocalCategories`,
 *     so its drag survives until the next refetch and no further — a control
 *     that appears to work and does not.
 */

import { useState, useEffect } from 'react';
import { Save, RotateCcw, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BuilderCountedInput } from '../../website-builder/_components/builder-field';
import { BuilderDataTable, type Column } from '../../website-builder/_components/builder-data-table';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { cn } from '@/lib/utils';
import {
    useTemplateCategories,
    useCreateTemplateCategory,
    useUpdateTemplateCategory,
    useUpdateTemplateCategoryStatus,
    useReorderTemplateCategories,
    useDeleteTemplateCategory,
    type TemplateCategory,
} from '@/hooks/use-template-categories';

/** Mirrors `slugify` in the backend service, so the preview matches what saves. */
const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const isActive = (val?: boolean | number | string) => val !== false && val !== 0 && val !== '0';

export default function TemplateCategoriesPage() {
    const [searchQuery, setSearchQuery] = useState('');

    // The list is paged server-side everywhere else; here the whole set is
    // fetched because the table sorts, searches and DRAGS across it — reordering
    // row 1 past row 40 is meaningless if only page one is loaded.
    const { data, isLoading } = useTemplateCategories({ limit: 200 });

    const createCategory = useCreateTemplateCategory();
    const updateCategory = useUpdateTemplateCategory();
    const toggleStatus = useUpdateTemplateCategoryStatus();
    const reorderCategories = useReorderTemplateCategories();
    const deleteCategory = useDeleteTemplateCategory();

    /**
     * A local copy, so a drag or a status flip paints immediately instead of
     * waiting for the round trip. Re-seeded whenever the server answers, which
     * is what makes the optimistic edit converge rather than stick.
     */
    const [localCategories, setLocalCategories] = useState<TemplateCategory[] | null>(null);
    useEffect(() => {
        if (data?.data) setLocalCategories(data.data);
    }, [data]);

    const categories = localCategories ?? data?.data ?? [];

    /* ── the form ────────────────────────────────────────────────────────── */

    const [editingId, setEditingId] = useState<number | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [slug, setSlug] = useState('');
    const [status, setStatus] = useState(true);
    const [displayOrder, setDisplayOrder] = useState(1);
    const [errors, setErrors] = useState<{ name?: boolean; slug?: boolean }>({});
    const [slugTouched, setSlugTouched] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TemplateCategory | null>(null);

    const isSaving = createCategory.isPending || updateCategory.isPending;

    const handleCancel = () => {
        setEditingId(null);
        setCategoryName('');
        setSlug('');
        setStatus(true);
        setDisplayOrder((categories.length || 0) + 1);
        setErrors({});
        setSlugTouched(false);
    };

    const handleNameChange = (val: string) => {
        setCategoryName(val);
        if (errors.name) setErrors((prev) => ({ ...prev, name: false }));
        // Follows the name only while ADDING and only until the slug is edited
        // by hand, or every further keystroke would wipe what was just typed.
        if (!editingId && !slugTouched) {
            setSlug(slugify(val));
            if (errors.slug) setErrors((prev) => ({ ...prev, slug: false }));
        }
    };

    const handleSave = () => {
        const nextErrors: typeof errors = {};
        if (!categoryName.trim()) nextErrors.name = true;
        if (!slug.trim()) nextErrors.slug = true;

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            toast.error('Please fill all mandatory fields.');
            return;
        }
        setErrors({});

        const payload = {
            name: categoryName.trim(),
            is_active: status ? 1 : 0,
            sort_order: displayOrder,
            /**
             * On EDIT the slug is sent only when it was actually touched.
             *
             * Sending it every save would re-derive it on a save that merely
             * flipped the toggle — and frame styles are filtered by the slug, so
             * anything holding the old one silently stops matching.
             */
            ...(!editingId || slugTouched ? { slug: slug.trim() } : {}),
        };

        if (editingId) {
            updateCategory.mutate({ id: editingId, data: payload }, { onSuccess: handleCancel });
        } else {
            createCategory.mutate(payload, { onSuccess: handleCancel });
        }
    };

    const handleEdit = (cat: TemplateCategory) => {
        setEditingId(cat.id);
        setCategoryName(cat.name);
        setSlug(cat.slug);
        setStatus(isActive(cat.is_active));
        setDisplayOrder(cat.sort_order || 1);
        setErrors({});
        setSlugTouched(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleToggleStatus = (cat: TemplateCategory) => {
        const next = !isActive(cat.is_active);
        setLocalCategories(categories.map((c) => (c.id === cat.id ? { ...c, is_active: next } : c)));
        toggleStatus.mutate({ id: cat.id, is_active: next });
    };

    const filtered = categories.filter(
        (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    /* ── the table ───────────────────────────────────────────────────────── */

    const columns: Column<TemplateCategory>[] = [
        {
            header: 'Category',
            cell: (cat) => (
                <div className="font-semibold text-foreground break-words">{cat.name}</div>
            ),
        },
        {
            header: 'Slug',
            cell: (cat) => (
                <span className="font-mono text-[11px] break-all text-muted-foreground">{cat.slug}</span>
            ),
        },
        {
            header: 'Frame Styles',
            headerClassName: 'text-center',
            className: 'text-center font-medium text-foreground',
            // From the API, not counted in the browser: a second list would have
            // to be fetched in full just to count against it.
            cell: (cat) => cat.frame_styles_count ?? 0,
        },
        {
            header: 'Status',
            headerClassName: 'text-center',
            className: 'text-center',
            cell: (cat) => (
                <div className="flex items-center justify-center">
                    <Switch
                        checked={isActive(cat.is_active)}
                        onCheckedChange={() => handleToggleStatus(cat)}
                    />
                </div>
            ),
        },
        {
            header: 'Order',
            headerClassName: 'text-center',
            className: 'text-center font-semibold text-foreground',
            cell: (cat, idx) => cat.sort_order || idx + 1,
        },
        {
            header: 'Actions',
            headerClassName: 'text-right',
            className: 'text-right',
            cell: (cat) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(cat)}
                        className={cn(
                            'h-8 w-8 rounded-lg p-0 transition-colors cursor-pointer',
                            editingId === cat.id
                                ? 'border-primary bg-primary/10 text-primary shadow-xs'
                                : 'border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5'
                        )}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteTarget(cat)}
                        className="h-8 w-8 rounded-lg p-0 text-rose-500 border-rose-200 hover:bg-rose-50 hover:border-rose-300 cursor-pointer"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageLoader open={isLoading} text="Loading template categories..." />

            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                        Template Categories
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        The design family a template or frame style belongs to.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResetDialogOpen(true)}
                        className="h-8 cursor-pointer border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                        <RotateCcw className="mr-1 h-3.5 w-3.5 text-rose-500" /> Reset Form
                    </Button>
                </div>
            </div>

            {/* ── add / edit ──────────────────────────────────────────────── */}
            <Card className="border-border bg-card shadow-xs">
                <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                        {editingId ? 'Edit Category' : 'Add New Category'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                    {/* Two columns, not three — there is no description column on
                        this table, and a field with nothing behind it is worse
                        than a missing one. */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <BuilderCountedInput
                            label="Category Name"
                            required
                            placeholder="e.g. Traditional"
                            value={categoryName}
                            onChange={handleNameChange}
                            maxLength={50}
                            inputClassName={cn(
                                '!h-9 text-xs border-border bg-card text-foreground',
                                errors.name && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                            )}
                        />
                        <BuilderCountedInput
                            label="Slug"
                            required
                            placeholder="e.g. traditional"
                            value={slug}
                            onChange={(val) => {
                                setSlugTouched(true);
                                setSlug(val);
                                if (errors.slug) setErrors((prev) => ({ ...prev, slug: false }));
                            }}
                            maxLength={50}
                            inputClassName={cn(
                                '!h-9 text-xs font-mono border-border bg-card text-foreground',
                                errors.slug && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                        <div className="flex h-9 items-center justify-between rounded-lg border border-border bg-card p-2.5">
                            <span className="text-xs font-semibold text-foreground">Active</span>
                            <Switch checked={status} onCheckedChange={setStatus} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                                Display Order
                            </label>
                            <Input
                                type="number"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                                min={1}
                                className="h-9 border-border bg-card text-xs font-semibold text-foreground"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {editingId ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="h-9 flex-1 cursor-pointer border-border bg-card text-xs font-bold text-foreground hover:bg-muted"
                                >
                                    Cancel
                                </Button>
                            ) : null}
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-9 flex-1 cursor-pointer gap-1.5 bg-primary text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                {isSaving ? 'Saving...' : editingId ? 'Update Category' : 'Save Category'}
                            </Button>
                        </div>
                    </div>

                    {editingId ? (
                        <p className="text-[11px] text-muted-foreground">
                            Frame styles are filtered by the slug. Renaming alone leaves it alone —
                            edit the slug only if you mean to.
                        </p>
                    ) : null}
                </CardContent>
            </Card>

            {/* ── the list ────────────────────────────────────────────────── */}
            <BuilderDataTable
                title="Categories"
                data={filtered}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No categories yet. Add one to start classifying frame styles."
                searchPlaceholder="Search categories..."
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                keyExtractor={(item, index) => item.id ?? index}
                pageSize={10}
                enableDragAndDrop
                onReorder={(reordered) => {
                    // Paint first, then persist. Without the second half the drag
                    // survives only until the next refetch.
                    setLocalCategories(reordered);
                    reorderCategories.mutate(
                        reordered.map((c, index) => ({ id: c.id, sort_order: index + 1 }))
                    );
                }}
            />

            <DeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget) {
                        deleteCategory.mutate(deleteTarget.id, {
                            onSuccess: () => setDeleteTarget(null),
                        });
                    }
                }}
                isDeleting={deleteCategory.isPending}
                title="Delete Template Category"
                /* Says what actually happens. The frames keep their artwork and
                   show as uncategorised — and restoring the category would put
                   them back — so "this cannot be undone" would be a lie. */
                description={
                    deleteTarget
                        ? `Delete "${deleteTarget.name}"? Its ${deleteTarget.frame_styles_count ?? 0} frame style(s) are kept, and will show as uncategorised.`
                        : ''
                }
            />

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleCancel}
            />
        </div>
    );
}
