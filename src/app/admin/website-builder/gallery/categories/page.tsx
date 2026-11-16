'use client';

import { useMemo, useState } from 'react';
import {
    Save,
    RotateCcw,
    HelpCircle,
    Pencil,
    Trash2,
    Search,
    GripVertical,
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
import { RowTranslateButton } from '../../_components/row-translate-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { cn } from '@/lib/utils';
import {
    useCompanyGalleryCategories,
    useCompanyGalleryItems,
} from '@/hooks/useCompanyWebsiteBuilder';

/**
 * Gallery > Categories — backed by `company_website_gallery_categories`.
 *
 * Persisted per row (create / update / remove). The bulk `replace` mutation is
 * deliberately unused: it DELETEs and re-INSERTs the table, reassigning ids and
 * orphaning translations addressed by `record_id` (session.md §64).
 */
interface CategoryRow {
    id: number;
    name: string;
    slug: string;
    description: string;
    is_active: boolean;
    sort_order: number;
    imageCount: number;
}

const slugify = (val: string) =>
    val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export default function GalleryCategoriesPage() {
    const {
        data: categoriesData,
        isLoading,
        create,
        update,
        remove,
        refetch,
    } = useCompanyGalleryCategories();
    const { data: galleryItems } = useCompanyGalleryItems();

    const [editingId, setEditingId] = useState<number | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const [categoryName, setCategoryName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState(true);
    const [displayOrder, setDisplayOrder] = useState(1);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [savingLabel, setSavingLabel] = useState('Saving category...');

    const imageCounts = useMemo(() => {
        const counts = new Map<number, number>();
        (galleryItems || []).forEach((item: any) => {
            const key = Number(item.category_id);
            if (!key) return;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return counts;
    }, [galleryItems]);

    const categories: CategoryRow[] = useMemo(
        () =>
            (categoriesData || []).map((row: any, index: number) => ({
                id: Number(row.id),
                name: row.name || '',
                slug: row.slug || '',
                description: row.description || '',
                is_active: Number(row.is_active) === 1,
                sort_order: Number(row.sort_order) || index + 1,
                imageCount: imageCounts.get(Number(row.id)) || 0,
            })),
        [categoriesData, imageCounts]
    );

    const handleCategoryNameChange = (val: string) => {
        setCategoryName(val);
        if (!editingId) setSlug(slugify(val));
    };

    const handleSaveCategory = async () => {
        const name = categoryName.trim();
        if (!name) {
            toast.error('Category Name is required.');
            return;
        }

        setSavingLabel(editingId ? 'Updating category...' : 'Creating category...');
        setIsSaving(true);
        try {
            const payload = {
                name,
                slug: slug.trim() || slugify(name),
                description,
                sort_order: displayOrder,
                is_active: status ? 1 : 0,
            };

            if (editingId) {
                await update({ id: editingId, ...payload } as any);
                toast.success('Category updated successfully!');
            } else {
                await create(payload as any);
                toast.success('Category created successfully!');
            }
            handleCancel();
        } catch {
            toast.error('Could not save the category. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (cat: CategoryRow) => {
        setEditingId(cat.id);
        setCategoryName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description);
        setStatus(cat.is_active);
        setDisplayOrder(cat.sort_order);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (cat: CategoryRow) => {
        setSavingLabel('Deleting category...');
        setIsSaving(true);
        try {
            await remove(cat.id);
            if (editingId === cat.id) handleCancel();
            toast.success('Category deleted.');
        } catch {
            toast.error('Could not delete the category. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (cat: CategoryRow, next: boolean) => {
        try {
            await update({ id: cat.id, is_active: next ? 1 : 0 } as any);
        } catch {
            toast.error('Could not update the status. Please try again.');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setCategoryName('');
        setSlug('');
        setDescription('');
        setStatus(true);
        setDisplayOrder(categories.length + 1);
    };

    /** Discards the in-progress form and re-reads the stored list. */
    const handleReset = async () => {
        handleCancel();
        await refetch();
        toast.info('Reloaded categories from the saved list.');
    };

    const filteredCategories = categories.filter(
        (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-5">
            <PageLoader open={isLoading || isSaving} text={isLoading ? 'Loading Categories...' : savingLabel} />
            {/* Header Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Categories</h1>
                    <p className="text-xs text-slate-500">
                        Create and manage categories that organize your gallery images.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveCategory}
                        disabled={isSaving}
                        className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        <Save className="h-3.5 w-3.5 mr-1" /> {isSaving ? 'Saving...' : 'Save Category'}
                    </Button>
                </div>
            </div>

            {/* Top Card: Add New Category */}
            <Card className="shadow-xs border-slate-200">
                <CardHeader className="py-3 px-4 border-b bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
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
                            inputClassName="!h-9 text-xs"
                        />
                        <BuilderCountedInput
                            label="Slug"
                            required
                            placeholder="e.g. wedding"
                            value={slug}
                            onChange={setSlug}
                            maxLength={50}
                            inputClassName="!h-9 text-xs font-mono"
                        />
                        <BuilderCountedTextarea
                            label="Description (Optional)"
                            placeholder="Write a short description..."
                            value={description}
                            onChange={setDescription}
                            maxLength={150}
                            textareaClassName="min-h-[38px] max-h-[38px] text-xs py-1.5"
                        />
                    </div>

                    {/* Row 2: Status, Display Order, Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {/* Status Switch Box */}
                        <div className="rounded-lg border border-slate-200 p-2.5 flex items-center justify-between bg-card h-9">
                            <span className="text-xs font-semibold text-slate-700">Active</span>
                            <Switch checked={status} onCheckedChange={setStatus} />
                        </div>

                        {/* Display Order */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                                Display Order
                            </label>
                            <Input
                                type="number"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                                min={1}
                                className="h-9 text-xs border-slate-200 font-semibold"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                className="h-9 w-full text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg shadow-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveCategory}
                                disabled={isSaving}
                                className="h-9 w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                            >
                                Save Category
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Card: Categories Table */}
            <Card className="shadow-xs border-slate-200">
                <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between space-y-0 bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Categories
                    </CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs border-slate-200 bg-white"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b">
                                <tr>
                                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                                    <th className="py-2.5 px-3">Category</th>
                                    <th className="py-2.5 px-3">Slug</th>
                                    <th className="py-2.5 px-3 text-center">Images</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                    <th className="py-2.5 px-3 text-center">Order</th>
                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map((cat, idx) => (
                                        <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3 px-3 text-center text-slate-400 font-mono">
                                                <div className="flex items-center justify-center gap-1">
                                                    <GripVertical className="h-3.5 w-3.5 text-slate-300" />
                                                    <span>{idx + 1}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 font-semibold text-slate-900">
                                                {cat.name}
                                                {cat.description ? (
                                                    <p className="text-[10px] font-normal text-slate-400 truncate max-w-xs">
                                                        {cat.description}
                                                    </p>
                                                ) : null}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                                                {cat.slug}
                                            </td>
                                            <td className="py-3 px-3 text-center font-medium text-slate-600">
                                                {cat.imageCount}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="flex items-center justify-center">
                                                    <Switch
                                                        checked={cat.is_active}
                                                        onCheckedChange={(val) => handleToggleStatus(cat, val)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center font-semibold text-slate-700">
                                                {cat.sort_order}
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <RowTranslateButton
                                                        section="gallery-categories"
                                                        recordId={cat.id}
                                                        rowLabel={cat.name}
                                                        fields={[
                                                            { key: 'name', label: 'Category Name', value: cat.name, required: true },
                                                            { key: 'description', label: 'Description', value: cat.description, type: 'textarea' },
                                                        ]}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleEdit(cat)}
                                                        className={cn(
                                                            'h-8 w-8 rounded-lg p-0 transition-colors',
                                                            editingId === cat.id
                                                                ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-xs'
                                                                : 'border-slate-200 text-slate-500 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50'
                                                        )}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDelete(cat)}
                                                        className="h-8 w-8 rounded-lg p-0 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                                            No categories found yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50 text-xs text-slate-500">
                        <span>Showing {filteredCategories.length} of {categories.length} categories</span>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs bg-blue-600 text-white border-blue-600">
                                1
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}
