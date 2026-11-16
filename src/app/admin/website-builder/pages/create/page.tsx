'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, ArrowLeft, Eye, HelpCircle, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/common/rich-text-editor';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { cn } from '@/lib/utils';
import { useCompanyPages } from '@/hooks/useCompanyWebsiteBuilder';

const slugify = (val: string) =>
    val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

/**
 * Create / edit a Website Builder page — backed by `company_website_pages`.
 *
 * `?edit=<id>` switches the form into edit mode. After a create the route is
 * replaced with the new row's id rather than navigating away, so the record
 * exists at a stable id for anything keyed on it (translations included).
 */
function PageFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = Number(searchParams.get('edit')) || null;

    const { data: pagesData, isLoading, create, update, refetch } = useCompanyPages();

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [isPublished, setIsPublished] = useState(true);
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    // Guards the load-once effect so typing isn't overwritten by a refetch.
    const [loadedId, setLoadedId] = useState<number | null>(null);

    const existing = useMemo(
        () => (pagesData || []).find((p: any) => Number(p.id) === editId),
        [pagesData, editId]
    );

    useEffect(() => {
        if (!editId || !existing || loadedId === editId) return;
        setTitle(existing.title || '');
        setSlug(existing.slug || '');
        setContent(existing.content || '');
        setIsPublished((existing.status || 'published') === 'published');
        setLoadedId(editId);
    }, [editId, existing, loadedId]);

    const isSystemPage = Number(existing?.is_system) === 1;

    const handleTitleChange = (val: string) => {
        setTitle(val);
        // Only auto-derive the slug for new pages — changing a live page's slug
        // would break any menu entry or footer link already pointing at it.
        if (!editId) setSlug(slugify(val));
    };

    const handleReset = async () => {
        if (editId) {
            setLoadedId(null);
            await refetch();
            toast.info('Reloaded the page from the saved version.');
            return;
        }
        setTitle('');
        setSlug('');
        setIsPublished(true);
        setContent('');
        toast.info('Create page form reset to defaults.');
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Page title is required.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                title: title.trim(),
                slug: slug.trim() || slugify(title),
                content,
                status: isPublished ? 'published' : 'draft',
            };

            if (editId) {
                await update({ id: editId, ...payload } as any);
                toast.success(`Page "${payload.title}" updated successfully!`);
            } else {
                const created: any = await create({ ...payload, page_type: 'custom', is_active: 1 } as any);
                const newId = Number(created?.id);
                toast.success(`Custom page "${payload.title}" saved successfully!`);
                // Stay on the form at the saved record's id (session.md §66).
                if (newId) {
                    setLoadedId(newId);
                    router.replace(`/admin/website-builder/pages/create?edit=${newId}`);
                }
            }
        } catch {
            toast.error('Could not save the page. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageLoader
                open={(isLoading && !!editId) || isSaving}
                text={isSaving ? 'Saving page...' : 'Loading page...'}
            />
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" asChild className="gap-1.5 h-9">
                        <Link href="/admin/website-builder/pages">
                            <ArrowLeft className="h-4 w-4" /> Back to Pages
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight mt-1">
                            {editId ? 'Edit Page' : 'Create Custom Page'}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {editId
                                ? 'Update this page’s title, status and rich text content.'
                                : 'Add a new custom page to the website with rich text formatting.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Create custom content pages with title, slug, and rich text editor.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-bold shadow-xs">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving ? 'Saving...' : editId ? 'Save Changes' : 'Save & Publish Page'}
                    </Button>
                </div>
            </div>

            {/* Form Card */}
            <Card className="shadow-xs">
                <CardHeader className="border-b pb-4">
                    <CardTitle className="text-base font-bold">Page Details & Rich Content</CardTitle>
                    <CardDescription className="text-xs">Specify page title, published status switch, and format body content.</CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                    {/* Title & Status Switch Row */}
                    <div className="grid gap-6 md:grid-cols-12 items-end">
                        {/* Page Title (5 cols) */}
                        <div className="md:col-span-5 space-y-1.5">
                            <Label htmlFor="pageTitle" className="text-xs font-semibold text-foreground">Page Title</Label>
                            <Input
                                id="pageTitle"
                                value={title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                placeholder="e.g. Terms of Service, Event Guidelines, Booking Terms"
                                className="h-9.5 text-sm"
                            />
                        </div>

                        {/* Slug (3 cols) */}
                        <div className="md:col-span-3 space-y-1.5">
                            <Label htmlFor="pageSlug" className="text-xs font-semibold text-foreground">Slug</Label>
                            <Input
                                id="pageSlug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                disabled={isSystemPage}
                                placeholder="e.g. terms-of-service"
                                className="h-9.5 text-sm font-mono"
                            />
                            {isSystemPage ? (
                                <p className="text-[10px] text-slate-400">System page — the slug is fixed.</p>
                            ) : null}
                        </div>

                        {/* Published Status Switch (4 cols) */}
                        <div className="md:col-span-4 space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">Published Status</Label>
                            <div className="flex items-center gap-3 rounded-lg border p-2 bg-muted/20 h-9.5">
                                <div className={cn(
                                    "flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded",
                                    isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                                )}>
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>{isPublished ? 'Published' : 'Draft Mode'}</span>
                                </div>
                                <Switch
                                    checked={isPublished}
                                    onCheckedChange={setIsPublished}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rich Text Body Content */}
                    <div className="space-y-1.5">
                        <Label htmlFor="pageContent" className="text-xs font-semibold text-foreground">Body Content</Label>
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            placeholder="Write page content here..."
                            className="min-h-[300px]"
                            variant="full"
                        />
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

export default function CreateCustomPage() {
    return (
        <Suspense fallback={
            <div className="py-12 text-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Loading page editor...
            </div>
        }>
            <PageFormContent />
        </Suspense>
    );
}
