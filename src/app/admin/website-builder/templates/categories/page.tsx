'use client';

import { useState, useEffect } from 'react';
import {
    Save,
    RotateCcw,
    HelpCircle,
    Pencil,
    Trash2,
    Search,
    GripVertical,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    BuilderCountedInput,
    BuilderCountedTextarea,
} from '../../_components/builder-field';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { cn } from '@/lib/utils';
import {
    useTemplateCategories,
    useSaveTemplateCategory,
    useToggleTemplateCategoryStatus,
    useDeleteTemplateCategory,
    type TemplateCategory,
} from '@/hooks/useTemplates';

import { DeleteDialog } from '@/components/common/delete-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { useTemplates } from '@/hooks/useTemplates';

import { BuilderDataTable, Column } from '../../_components/builder-data-table';
import { RowTranslateButton } from '../../_components/row-translate-dialog';

export default function TemplateCategoriesPage() {
    const { data: dbCategories, isLoading } = useTemplateCategories();
    const { data: dbTemplates } = useTemplates();
    const saveCategoryMutation = useSaveTemplateCategory();
    const toggleStatusMutation = useToggleTemplateCategoryStatus();
    const deleteCategoryMutation = useDeleteTemplateCategory();

    const [localCategories, setLocalCategories] = useState<TemplateCategory[] | null>(null);

    useEffect(() => {
        if (dbCategories) {
            setLocalCategories(dbCategories);
        }
    }, [dbCategories]);

    const categories = localCategories ?? dbCategories ?? [];
    const templates = dbTemplates || [];

    const isCategoryActive = (val?: boolean | number | string) => val !== false && val !== 0 && val !== '0';

    const handleToggleStatus = (id?: number, currentActive?: boolean) => {
        if (id === undefined) return;
        const nextActive = !currentActive;
        const updated = categories.map((c) => (c.id === id ? { ...c, is_active: nextActive } : c));
        setLocalCategories(updated);
        toggleStatusMutation.mutate({ id, is_active: nextActive });
    };

    const [editingId, setEditingId] = useState<number | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState(true);
    const [displayOrder, setDisplayOrder] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [errors, setErrors] = useState<{ name?: boolean; slug?: boolean }>({});

    const isSaving = saveCategoryMutation.isPending;

    const handleCategoryNameChange = (val: string) => {
        setCategoryName(val);
        if (errors.name) setErrors(prev => ({ ...prev, name: false }));
        if (!editingId) {
            const generated = val
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            setSlug(generated);
            if (errors.slug) setErrors(prev => ({ ...prev, slug: false }));
        }
    };

    const handleSaveCategory = () => {
        const newErrors: typeof errors = {};
        if (!categoryName.trim()) newErrors.name = true;
        if (!slug.trim()) newErrors.slug = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Category Name and Slug are required.');
            return;
        }
        setErrors({});

        saveCategoryMutation.mutate(
            {
                id: editingId || undefined,
                name: categoryName,
                slug: slug || categoryName.toLowerCase().replace(/\s+/g, '-'),
                description,
                is_active: status,
                sort_order: displayOrder,
            },
            {
                onSuccess: () => {
                    handleCancel();
                },
            }
        );
    };

    const handleEdit = (cat: TemplateCategory) => {
        setEditingId(cat.id || null);
        setCategoryName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description || '');
        setStatus(cat.is_active !== false);
        setDisplayOrder(cat.sort_order || 1);
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = () => {
        if (!deleteId) return;
        deleteCategoryMutation.mutate(deleteId, {
            onSuccess: () => setDeleteId(null),
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setCategoryName('');
        setSlug('');
        setDescription('');
        setStatus(true);
        setDisplayOrder((categories.length || 0) + 1);
        setErrors({});
    };

    const filteredCategories = categories.filter(
        (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns: Column<TemplateCategory>[] = [
        {
            header: 'Category',
            cell: (cat) => (
                <div className="font-semibold text-foreground">
                    <div>{cat.name}</div>
                    {cat.description ? (
                        <p className="text-[10px] font-normal text-muted-foreground truncate max-w-xs">
                            {cat.description}
                        </p>
                    ) : null}
                </div>
            ),
        },
        {
            header: 'Slug',
            cell: (cat) => (
                <span className="font-mono text-[11px] text-muted-foreground">{cat.slug}</span>
            ),
        },
        {
            header: 'Templates',
            headerClassName: 'text-center',
            className: 'text-center font-medium text-foreground',
            cell: (cat) => {
                const count = templates.filter(
                    (t) => String(t.category_id) === String(cat.id) || t.category_name?.toLowerCase() === cat.name.toLowerCase()
                ).length;
                return cat.templates_count ?? count;
            },
        },
        {
            header: 'Status',
            headerClassName: 'text-center',
            className: 'text-center',
            cell: (cat) => (
                <div className="flex items-center justify-center">
                    <Switch
                        checked={isCategoryActive(cat.is_active)}
                        onCheckedChange={() => handleToggleStatus(cat.id, isCategoryActive(cat.is_active))}
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
                        <RowTranslateButton
                            section="template-categories"
                            recordId={Number(cat.id) || undefined}
                            rowLabel={cat.name}
                            fields={[
                                { key: 'name', label: 'Category Name', value: cat.name || '', required: true },
                                { key: 'description', label: 'Description', value: (cat as any).description || '', type: 'textarea' },
                            ]}
                        />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => cat.id !== undefined && setDeleteId(cat.id)}
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

            {/* Header Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-foreground">Template Categories</h1>
                    <p className="text-xs text-muted-foreground">
                        Create and manage categories that organize your invitation and card templates.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset Form
                    </Button>
                </div>
            </div>

            {/* Top Card: Add New Category */}
            <Card className="shadow-xs border-border bg-card">
                <CardHeader className="py-3 px-4 border-b border-border bg-muted/40">
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wide">
                        {editingId ? 'Edit Category' : 'Add New Category'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    {/* Row 1: Category Name, Slug, Description */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <BuilderCountedInput
                            label="Category Name"
                            required
                            placeholder="e.g. Wedding"
                            value={categoryName}
                            onChange={handleCategoryNameChange}
                            maxLength={50}
                            inputClassName={cn('!h-9 text-xs border-border bg-card text-foreground', errors.name && 'border-red-500 ring-1 ring-red-500 bg-red-50/20')}
                        />
                        <BuilderCountedInput
                            label="Slug"
                            required
                            placeholder="e.g. wedding"
                            value={slug}
                            onChange={(val) => {
                                setSlug(val);
                                if (errors.slug) setErrors(prev => ({ ...prev, slug: false }));
                            }}
                            maxLength={50}
                            inputClassName={cn('!h-9 text-xs font-mono border-border bg-card text-foreground', errors.slug && 'border-red-500 ring-1 ring-red-500 bg-red-50/20')}
                        />
                        <BuilderCountedTextarea
                            label="Description (Optional)"
                            placeholder="Write a short description..."
                            value={description}
                            onChange={setDescription}
                            maxLength={150}
                            textareaClassName="min-h-[38px] max-h-[38px] text-xs py-1.5 border-border bg-card text-foreground"
                        />
                    </div>

                    {/* Row 2: Status, Display Order, Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {/* Status Switch Box */}
                        <div className="rounded-lg border border-border p-2.5 flex items-center justify-between bg-card h-9">
                            <span className="text-xs font-semibold text-foreground">Active</span>
                            <Switch checked={status} onCheckedChange={setStatus} />
                        </div>

                        {/* Display Order */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                                Display Order
                            </label>
                            <Input
                                type="number"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                                min={1}
                                className="h-9 text-xs border-border bg-card font-semibold text-foreground"
                            />
                        </div>

                        {/* Single Form Save Action Button */}
                        <div className="flex items-center gap-2">
                            {editingId ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="h-9 flex-1 text-xs font-bold border-border text-foreground bg-card hover:bg-muted cursor-pointer"
                                >
                                    Cancel
                                </Button>
                            ) : null}
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveCategory}
                                disabled={isSaving}
                                className="h-9 flex-1 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5 cursor-pointer"
                            >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                {isSaving ? 'Saving...' : editingId ? 'Update Category' : 'Save Category'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Section: Reusable BuilderDataTable */}
            <BuilderDataTable
                title="Categories"
                data={filteredCategories}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No categories found yet."
                searchPlaceholder="Search categories..."
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                keyExtractor={(item, index) => item.id || index}
                pageSize={10}
                enableDragAndDrop
                onReorder={(reordered) => {
                    setLocalCategories(reordered);
                }}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteDialog
                open={deleteId !== null}
                onOpenChange={(open) => !open && setDeleteId(null)}
                onConfirm={confirmDelete}
                isDeleting={deleteCategoryMutation.isPending}
                title="Delete Template Category"
                description="Are you sure you want to delete this template category? Templates in this category may be affected."
            />

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleCancel}
            />
        </div>
    );
}
