'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, FileText, Pencil, Search, HelpCircle, RotateCcw } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RowTranslateButton } from '../_components/row-translate-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { cn } from '@/lib/utils';
import { useCompanyPages } from '@/hooks/useCompanyWebsiteBuilder';

/**
 * Pages List — backed by `company_website_pages`.
 *
 * Deletes go through the per-row endpoint, never the bulk `replace` one: that
 * DELETEs and re-INSERTs the whole table, reassigning ids and orphaning every
 * translation addressed by `record_id` (session.md §64).
 */
interface WebPageRow {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    isSystem: boolean;
    isPublished: boolean;
}

export default function PagesListPage() {
    const { data: pagesData, isLoading, remove, refetch } = useCompanyPages();

    const [searchQuery, setSearchQuery] = useState('');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const pages: WebPageRow[] = useMemo(
        () =>
            (pagesData || []).map((row: any) => ({
                id: Number(row.id),
                title: row.title || '',
                slug: row.slug || '',
                excerpt: row.excerpt || '',
                seoTitle: row.seo_title || '',
                seoDescription: row.seo_description || '',
                isSystem: Number(row.is_system) === 1,
                isPublished: (row.status || 'published') === 'published',
            })),
        [pagesData]
    );

    const filteredPages = useMemo(() => {
        if (!searchQuery.trim()) return pages;
        const q = searchQuery.toLowerCase();
        return pages.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }, [pages, searchQuery]);

    const handleReset = async () => {
        setSearchQuery('');
        await refetch();
        toast.info('Reloaded pages from the saved list.');
    };

    const handleDeletePage = async (page: WebPageRow) => {
        if (page.isSystem) {
            toast.error('Fixed system pages cannot be deleted.');
            return;
        }

        setIsDeleting(true);
        try {
            await remove(page.id);
            toast.success('Page deleted successfully.');
        } catch {
            toast.error('Could not delete the page. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageLoader open={isLoading || isDeleting} text={isDeleting ? 'Deleting page...' : 'Loading Pages...'} />
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Pages List</h1>
                    <p className="text-sm text-muted-foreground">View and manage all your website pages.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('View, create, and manage fixed or custom site CMS pages.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button size="sm" asChild className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-bold shadow-xs">
                        <Link href="/admin/website-builder/pages/create">
                            <Plus className="h-4 w-4" /> Create Page
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Main Card */}
            <Card className="shadow-xs border-slate-200">
                <CardHeader className="pb-3 border-b">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-bold text-foreground">Pages</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">All fixed and dynamic pages of your website.</CardDescription>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search pages..."
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
                                    <TableHead className="w-[60px] font-bold text-[11px] text-slate-500 uppercase">#</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase">PAGE</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase w-[120px]">TYPE</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase w-[140px]">STATUS</TableHead>
                                    <TableHead className="font-bold text-[11px] text-slate-500 uppercase w-[140px] text-right">ACTIONS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPages.map((page, idx) => (
                                    <TableRow key={page.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                                        {/* Column 1: # Index */}
                                        <TableCell className="font-bold text-xs text-slate-700 w-[60px]">
                                            {idx + 1}
                                        </TableCell>

                                        {/* Column 2: Page Title & Slug */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-xs text-slate-800 block">{page.title}</span>
                                                    <span className="text-[11px] text-slate-400 block font-mono">/{page.slug}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Column 3: Type (Yellow/Orange Pill) */}
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                                {page.isSystem ? 'Fixed' : 'Custom'}
                                            </span>
                                        </TableCell>

                                        {/* Column 4: Status Pill */}
                                        <TableCell>
                                            <span className={cn(
                                                'inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold border',
                                                page.isPublished
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                            )}>
                                                {page.isPublished ? 'Published' : 'Unpublished'}
                                            </span>
                                        </TableCell>

                                        {/* Column 5: Actions */}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <RowTranslateButton
                                                    section="pages"
                                                    recordId={page.id}
                                                    rowLabel={page.title}
                                                    fields={[
                                                        { key: 'title', label: 'Title', value: page.title, required: true },
                                                        { key: 'excerpt', label: 'Excerpt', value: page.excerpt, type: 'textarea' },
                                                        { key: 'seo_title', label: 'SEO Title', value: page.seoTitle },
                                                        { key: 'seo_description', label: 'SEO Description', value: page.seoDescription, type: 'textarea' },
                                                    ]}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    asChild
                                                    className="h-8 w-8 rounded-lg p-0 border-slate-200 text-slate-500 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                                                >
                                                    <Link href={`/admin/website-builder/pages/create?edit=${page.id}`}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleDeletePage(page)}
                                                    disabled={page.isSystem || isDeleting}
                                                    className="h-8 w-8 rounded-lg p-0 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 disabled:opacity-40"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!isLoading && filteredPages.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-xs text-slate-400">
                                            No pages found yet.
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
                onConfirm={handleReset}
            />
        </div>
    );
}
