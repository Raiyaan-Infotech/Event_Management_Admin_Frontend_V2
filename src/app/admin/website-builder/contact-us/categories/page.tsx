'use client';

import { useState, useMemo } from 'react';
import { Save, RotateCcw, Search, Pencil, Trash2, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BuilderCountedInput, BuilderCountedTextarea } from '../../_components/builder-field';
import { RowTranslateButton } from '../../_components/row-translate-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { cn } from '@/lib/utils';
import { useCompanyContactCategories } from '@/hooks/useCompanyWebsiteBuilder';

/**
 * Contact Us > Categories — backed by `company_website_contact_categories`.
 *
 * Persisted per row (create / update / remove). The bulk `replace` mutation is
 * deliberately unused: it DELETEs and re-INSERTs the table, reassigning ids and
 * orphaning translations addressed by `record_id` (session.md §64).
 */
interface CategoryRow {
    id: number;
    name: string;
    description: string;
    slug: string;
    is_active: boolean;
    sort_order: number;
}

const slugify = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

export default function ContactCategoriesPage() {
    const {
        data: categoriesData,
        isLoading,
        create,
        update,
        remove,
        refetch,
    } = useCompanyContactCategories();

    // New Category Form State
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState(true);
    const [displayOrder, setDisplayOrder] = useState('1');

    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [savingLabel, setSavingLabel] = useState('Saving category...');

    const categories: CategoryRow[] = useMemo(
        () =>
            (categoriesData || []).map((row: any, index: number) => ({
                id: Number(row.id),
                name: row.name || '',
                description: row.description || '',
                slug: row.slug || '',
                is_active: Number(row.is_active) === 1,
                sort_order: Number(row.sort_order) || index + 1,
            })),
        [categoriesData]
    );

    const handleNameChange = (val: string) => {
        setName(val);
        if (!editingId) setSlug(slugify(val));
    };

    const clearForm = () => {
        setName('');
        setSlug('');
        setDescription('');
        setStatus(true);
        setDisplayOrder(String(categories.length + 1));
        setEditingId(null);
    };

    const handleSaveCategory = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error('Category Name is required.');
            return;
        }

        setSavingLabel(editingId ? 'Updating category...' : 'Creating category...');
        setIsSaving(true);
        try {
            const payload = {
                name: trimmed,
                slug: slug.trim() || slugify(trimmed),
                description,
                sort_order: parseInt(displayOrder, 10) || categories.length + 1,
                is_active: status ? 1 : 0,
            };

            if (editingId) {
                await update({ id: editingId, ...payload } as any);
                toast.success(`Category "${trimmed}" updated successfully.`);
            } else {
                await create(payload as any);
                toast.success(`Category "${trimmed}" created successfully.`);
            }
            clearForm();
        } catch {
            toast.error('Could not save the category. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (cat: CategoryRow) => {
        setEditingId(cat.id);
        setName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description);
        setStatus(cat.is_active);
        setDisplayOrder(String(cat.sort_order));
        toast.info(`Editing category "${cat.name}".`);
    };

    const handleDelete = async (cat: CategoryRow) => {
        setSavingLabel('Deleting category...');
        setIsSaving(true);
        try {
            await remove(cat.id);
            if (editingId === cat.id) clearForm();
            toast.success('Category deleted.');
        } catch {
            toast.error('Could not delete the category. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (cat: CategoryRow, newStatus: boolean) => {
        try {
            await update({ id: cat.id, is_active: newStatus ? 1 : 0 } as any);
        } catch {
            toast.error('Could not update the status. Please try again.');
        }
    };

    /** Discards the in-progress form and re-reads the stored list. */
    const handleResetForm = async () => {
        clearForm();
        await refetch();
        toast.info('Reloaded categories from the saved list.');
    };

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return categories;
        const q = searchQuery.toLowerCase();
        return categories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    }, [categories, searchQuery]);

    return (
        <div className="space-y-6">
            <PageLoader open={isLoading || isSaving} text={isLoading ? 'Loading Categories...' : savingLabel} />
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Contact Categories</h1>
                    <p className="text-sm text-muted-foreground">
                        Create categories used by the dynamic contact form.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Manage category topics for organizing customer contact form inquiries.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSaveCategory} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving ? 'Saving...' : 'Save Category'}
                    </Button>
                </div>
            </div>

            {/* Card 1: Add / Edit New Category Form */}
            <Card className="shadow-xs border-slate-200">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base font-bold text-foreground">
                        {editingId ? 'Edit Category' : 'Add New Category'}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        Create the categories visitors can choose from in the dynamic contact form.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3 items-end">
                        <BuilderCountedInput
                            label="Category Name *"
                            value={name}
                            onChange={handleNameChange}
                            maxLength={80}
                            placeholder="e.g. Wedding Enquiry"
                        />

                        <BuilderCountedInput
                            label="Slug *"
                            value={slug}
                            onChange={setSlug}
                            maxLength={80}
                            placeholder="e.g. wedding-enquiry"
                        />

                        <BuilderCountedTextarea
                            label="Description"
                            value={description}
                            onChange={setDescription}
                            maxLength={1000}
                            rows={3}
                            placeholder="Write a short description..."
                        />

                        {/* Status */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold text-slate-600">Status</Label>
                            <div className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 shadow-xs">
                                <span className="text-xs font-bold text-slate-700">
                                    {status ? 'Active' : 'Inactive'}
                                </span>
                                <Switch checked={status} onCheckedChange={setStatus} />
                            </div>
                        </div>

                        {/* Display Order */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold text-slate-600">Display Order</Label>
                            <Input
                                type="number"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(e.target.value)}
                                className="h-9 text-xs font-mono border-slate-200"
                            />
                        </div>

                        {/* Action Buttons: Cancel and Save Category */}
                        <div className="grid grid-cols-2 gap-2 h-9">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearForm}
                                className="h-9 text-xs font-semibold border-slate-200 hover:bg-slate-50"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveCategory}
                                disabled={isSaving}
                                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {isSaving ? 'Saving...' : 'Save Category'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Contact Categories Table List */}
            <Card className="shadow-xs border-slate-200">
                <CardHeader className="pb-3 border-b">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <CardTitle className="text-base font-bold text-foreground">Contact Categories</CardTitle>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8.5 pl-8 text-xs rounded-lg border-slate-200"
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/70">
                                <TableRow className="border-b border-slate-200">
                                    <TableHead className="w-[50px] font-bold text-[11px] text-slate-500 uppercase">#</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase">CATEGORY</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase w-[160px]">SLUG</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase w-[120px]">STATUS</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase w-[100px]">ORDER</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase w-[100px] text-right">ACTIONS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCategories.map((cat, idx) => (
                                    <TableRow key={cat.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                                        {/* Column 1: # Index */}
                                        <TableCell className="font-bold text-xs text-slate-700 w-[50px]">
                                            {idx + 1}
                                        </TableCell>

                                        {/* Column 2: Category Name & Description */}
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <span className="font-bold text-xs text-slate-800 block">{cat.name}</span>
                                                <span className="text-[11px] text-slate-400 block">{cat.description}</span>
                                            </div>
                                        </TableCell>

                                        {/* Column 3: Slug Pill */}
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600 border border-slate-200">
                                                {cat.slug}
                                            </span>
                                        </TableCell>

                                        {/* Column 4: Status Toggle */}
                                        <TableCell>
                                            <Switch
                                                checked={cat.is_active}
                                                onCheckedChange={(val) => handleToggleStatus(cat, val)}
                                            />
                                        </TableCell>

                                        {/* Column 5: Order */}
                                        <TableCell className="font-bold text-xs text-slate-700">
                                            {cat.sort_order}
                                        </TableCell>

                                        {/* Column 6: Actions */}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <RowTranslateButton
                                                    section="contact-categories"
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
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {filteredCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                                            No categories found yet.
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleResetForm}
            />
        </div>
    );
}
