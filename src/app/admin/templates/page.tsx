'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    RotateCcw,
    Filter,
    MoreVertical,
    Eye,
    Pencil,
    Copy,
    Star,
    ToggleLeft,
    Share2,
    Trash2,
    LayoutTemplate,
    CheckCircle2,
    XCircle,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/common/table-pagination';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { cn } from '@/lib/utils';
import { TemplatePreview } from './_components/template-preview';
import { useEventCategories } from '@/hooks/use-menu-management';
import { useTemplateCategories } from '@/hooks/use-template-categories';
import {
    useEventTemplates,
    useEventTemplateStats,
    useUpdateEventTemplateStatus,
    useUpdateEventTemplateFeatured,
    useDuplicateEventTemplate,
    useDeleteEventTemplate,
    type EventTemplate,
} from '@/hooks/use-event-templates';

const ALL = 'all';

/** dd MMM yyyy over two lines, matching the design's Created On column. */
function formatCreated(value?: string) {
    if (!value) return { date: '—', time: '' };
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
    return {
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
    };
}

export default function TemplateListPage() {
    const router = useRouter();

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState(ALL);
    const [templateCategoryId, setTemplateCategoryId] = useState(ALL);
    const [status, setStatus] = useState(ALL);

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, isLoading } = useEventTemplates({
        page,
        limit,
        search: search || undefined,
        event_category_id: categoryId === ALL ? undefined : categoryId,
        template_category_id: templateCategoryId === ALL ? undefined : templateCategoryId,
        status: status === ALL ? undefined : status,
    });

    // The tiles count the whole catalogue, not the filtered page — a "Total
    // Templates" that changes when you type in the search box is not a total.
    const { data: stats } = useEventTemplateStats();

    // Filter dropdowns. limit:200 because a filter that only lists the first
    // page of options silently hides the rest.
    const { data: categories } = useEventCategories({ limit: 200, is_active: true });
    // The DESIGN family (Elegant, Floral, Minimal, ...) — a different facet
    // from Event Category (Wedding, Birthday, ...) above; see use-template-categories.ts.
    const { data: templateCategories } = useTemplateCategories({ limit: 200, is_active: true });
    const updateStatus = useUpdateEventTemplateStatus();
    const updateFeatured = useUpdateEventTemplateFeatured();
    const duplicateTemplate = useDuplicateEventTemplate();
    const deleteTemplate = useDeleteEventTemplate();

    const templates = data?.data ?? [];
    const pagination = data?.pagination ?? null;
    const hasFilters =
        !!search || categoryId !== ALL || templateCategoryId !== ALL || status !== ALL;

    const clearFilters = () => {
        setSearch('');
        setCategoryId(ALL);
        setTemplateCategoryId(ALL);
        setStatus(ALL);
        setPage(1);
    };

    /**
     * "Share Template" copies the public template link.
     *
     * `navigator.clipboard` is undefined outside a secure context — over plain
     * HTTP on a LAN address, which is exactly how this app is tested — so the
     * failure is caught and the URL shown instead of the action silently doing
     * nothing.
     */
    const shareTemplate = async (template: EventTemplate) => {
        const url = `${window.location.origin}/admin/templates/${template.id}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Template link copied to clipboard');
        } catch {
            toast.info(url, { description: 'Copy this link manually — clipboard access was blocked.' });
        }
    };

    // isLoading covers the first fetch; a background refetch must not flash the
    // overlay over a table that already has rows.
    const isBusy = isLoading || duplicateTemplate.isPending || deleteTemplate.isPending;

    const tiles = [
        {
            label: 'Total Templates',
            value: stats?.total ?? 0,
            hint: 'All templates created',
            icon: LayoutTemplate,
            tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10',
        },
        {
            label: 'Active Templates',
            value: stats?.active ?? 0,
            hint: 'Currently active',
            icon: CheckCircle2,
            tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
        },
        {
            label: 'Inactive Templates',
            value: stats?.inactive ?? 0,
            hint: 'Not active',
            icon: XCircle,
            tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
        },
        {
            // Featured overlaps the other three — a featured template is also
            // active or inactive. It is a fourth fact, not a fourth slice.
            label: 'Featured Templates',
            value: stats?.featured ?? 0,
            hint: 'Featured to clients',
            icon: Sparkles,
            tone: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10',
        },
    ];

    return (
        <PermissionGuard permission="event_templates.view">
            <div className="space-y-5">
                <PageLoader open={isBusy} text={isLoading ? 'Loading templates...' : 'Loading...'} />

                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-foreground">Invitation Templates</h1>
                        <p className="text-xs text-muted-foreground">
                            Design, manage and organize your event invitation templates.
                        </p>
                    </div>

                    <Button onClick={() => router.push('/admin/templates/create')} className="h-9 gap-2">
                        <Plus className="h-4 w-4" /> Create Template
                    </Button>
                </div>

                {/* Tiles */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {tiles.map((tile) => (
                        <Card key={tile.label} className="border-border bg-card shadow-xs">
                            <CardContent className="flex items-center gap-3 p-4">
                                <span
                                    className={cn(
                                        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                                        tile.tone
                                    )}
                                >
                                    <tile.icon className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold text-muted-foreground">
                                        {tile.label}
                                    </div>
                                    <div className="text-2xl font-extrabold leading-tight text-foreground">
                                        {tile.value}
                                    </div>
                                    <div className="truncate text-[11px] text-muted-foreground">{tile.hint}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filters */}
                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="space-y-3 p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Search
                                </Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search templates by name, code..."
                                        className="h-10 pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Event Category
                                </Label>
                                <Select
                                    value={categoryId}
                                    onValueChange={(v) => {
                                        setCategoryId(v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All Categories</SelectItem>
                                        {(categories?.data ?? []).map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Template Category
                                </Label>
                                <Select
                                    value={templateCategoryId}
                                    onValueChange={(v) => {
                                        setTemplateCategoryId(v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All Template Categories</SelectItem>
                                        {(templateCategories?.data ?? []).map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Status
                                </Label>
                                <Select
                                    value={status}
                                    onValueChange={(v) => {
                                        setStatus(v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        {/* Draft is a different question from Active —
                                            see the migration. Both are offered so the
                                            filter can answer either. */}
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* The mockup put a "Filter" button beside Reset. Filters
                            apply as they change, so a button that re-runs nothing is
                            a control people click at and get no feedback from — said
                            in text instead. */}
                        <div className="flex items-center justify-end gap-3">
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Filter className="h-3.5 w-3.5" /> Filters apply as you change them
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                disabled={!hasFilters}
                                className="h-9 gap-2 text-xs"
                            >
                                <RotateCcw className="h-3.5 w-3.5" /> Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="p-0">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-border/60 hover:bg-transparent">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead className="min-w-[220px]">Template</TableHead>
                                        <TableHead className="whitespace-nowrap">Category</TableHead>
                                        <TableHead className="whitespace-nowrap text-center">Status</TableHead>
                                        <TableHead className="whitespace-nowrap text-center">Featured</TableHead>
                                        <TableHead className="whitespace-nowrap">Created On</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                                                Loading templates...
                                            </TableCell>
                                        </TableRow>
                                    ) : templates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                                                {hasFilters
                                                    ? 'No templates match these filters.'
                                                    : 'No templates yet. Click "Create Template" to design your first one.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        templates.map((row, index) => {
                                            const locked = !!row.has_pending_approval;
                                            const rowNumber =
                                                ((pagination?.page ?? 1) - 1) * (pagination?.limit ?? limit) + index + 1;
                                            const created = formatCreated(row.created_at);
                                            const active = !!Number(row.is_active);
                                            const featured = !!Number(row.is_featured);

                                            return (
                                                <TableRow key={row.id} className="border-b border-border/40">
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {rowNumber}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-2.5">
                                                            {/*
                                                              The template itself, small: the same
                                                              card the wizard's Live Preview draws
                                                              (background, shade, border, words),
                                                              scaled from 248px to 54px. It used to
                                                              be a square of the background colour
                                                              with an image icon on it. An uploaded
                                                              gallery thumbnail still wins.
                                                            */}
                                                            <span className="relative block h-24 w-[54px] shrink-0 overflow-hidden rounded-md border border-border bg-muted/40">
                                                                {row.thumbnail ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={row.thumbnail}
                                                                        alt=""
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="pointer-events-none absolute left-0 top-0 block w-[248px] origin-top-left"
                                                                        style={{ transform: 'scale(0.2177)' }}
                                                                        aria-hidden
                                                                    >
                                                                        <TemplatePreview
                                                                            bare
                                                                            template={{
                                                                                ...row,
                                                                                frameUrl: row.frameStyle?.file_url ?? null,
                                                                                decorationItems: row.decorationItems ?? [],
                                                                            }}
                                                                        />
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {/* break-all, never truncate: the table is
                                                                auto-layout, so a long name must wrap. */}
                                                            <div className="min-w-0 max-w-[240px]">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="break-all text-sm font-semibold text-foreground">
                                                                        {row.name}
                                                                    </span>
                                                                    {row.status === 'draft' && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="h-4 shrink-0 border-amber-300 px-1 text-[9px] font-bold uppercase text-amber-700"
                                                                        >
                                                                            Draft
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="break-all font-mono text-[11px] uppercase text-muted-foreground">
                                                                    {row.code}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-sm text-foreground">
                                                        {row.category?.name ?? '—'}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {/* A real toggle, not a read-only Badge — the row
                                                            below (Featured) stays a Badge because there is
                                                            no quick-toggle affordance for it in the design,
                                                            but Status has always had one in every other
                                                            module's list (frame styles, decorations). */}
                                                        <Switch
                                                            checked={active}
                                                            disabled={locked || updateStatus.isPending}
                                                            onCheckedChange={(value) =>
                                                                updateStatus.mutate({ id: row.id, is_active: value })
                                                            }
                                                            className="mx-auto"
                                                        />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'whitespace-nowrap text-[11px] font-semibold',
                                                                featured
                                                                    ? 'border-violet-300 text-violet-700 dark:text-violet-400'
                                                                    : 'border-border text-muted-foreground'
                                                            )}
                                                        >
                                                            {featured ? 'Yes' : 'No'}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="whitespace-nowrap">
                                                        <div className="text-sm text-foreground">{created.date}</div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {created.time}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    disabled={locked}
                                                                    title={
                                                                        locked
                                                                            ? 'This template has a change awaiting approval.'
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-52">
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        router.push(`/admin/templates/${row.id}`)
                                                                    }
                                                                >
                                                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        router.push(
                                                                            `/admin/templates/create?id=${row.id}`
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" /> Edit Template
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => duplicateTemplate.mutate(row.id)}
                                                                >
                                                                    <Copy className="mr-2 h-4 w-4" /> Duplicate Template
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        // Preview opens in a new tab, never as a dialog.
                                                                        window.open(
                                                                            `/admin/templates/${row.id}?preview=1`,
                                                                            '_blank'
                                                                        )
                                                                    }
                                                                >
                                                                    <Eye className="mr-2 h-4 w-4" /> Preview Template
                                                                </DropdownMenuItem>

                                                                <DropdownMenuSeparator />

                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        updateFeatured.mutate({
                                                                            id: row.id,
                                                                            is_featured: !featured,
                                                                        })
                                                                    }
                                                                >
                                                                    <Star className="mr-2 h-4 w-4" />
                                                                    {featured ? 'Remove from Featured' : 'Set as Featured'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        updateStatus.mutate({
                                                                            id: row.id,
                                                                            is_active: !active,
                                                                        })
                                                                    }
                                                                >
                                                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                                                    {active ? 'Set Inactive' : 'Set Active'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => shareTemplate(row)}>
                                                                    <Share2 className="mr-2 h-4 w-4" /> Share Template
                                                                </DropdownMenuItem>

                                                                <DropdownMenuSeparator />

                                                                <DropdownMenuItem
                                                                    onClick={() => setDeleteId(row.id)}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Template
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {pagination && pagination.totalItems > 0 && (
                            <div className="border-t border-border px-4 py-3">
                                <TablePagination
                                    pagination={pagination}
                                    onPageChange={setPage}
                                    onLimitChange={(v) => {
                                        setLimit(v);
                                        setPage(1);
                                    }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <DeleteDialog
                    open={deleteId !== null}
                    onOpenChange={(open: boolean) => !open && setDeleteId(null)}
                    title="Delete Template"
                    description="Are you sure you want to delete this template? Events already using it keep their design, but no new event will be able to choose it."
                    isDeleting={deleteTemplate.isPending}
                    onConfirm={() => {
                        if (deleteId !== null) {
                            deleteTemplate.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
                        }
                    }}
                />
            </div>
        </PermissionGuard>
    );
}
