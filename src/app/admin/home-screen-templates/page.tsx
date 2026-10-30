'use client';

/**
 * Template → Home Screen Templates: the mobile app's event home screen designs,
 * one or more per event category.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ImageOff, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { CommonTable, type CommonColumn } from '@/components/common/common-table';
import { PageLoader } from '@/components/common/page-loader';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEventCategories } from '@/hooks/use-menu-management';
import {
    useHomeScreenTemplates,
    useHomeScreenTemplateStats,
    useUpdateHomeScreenTemplateStatus,
    useDeleteHomeScreenTemplate,
    type HomeScreenTemplate,
} from '@/hooks/use-home-screen-templates';

const BASE = '/admin/home-screen-templates';

export default function HomeScreenTemplatesPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('all');
    const [status, setStatus] = useState('all');
    const [deleting, setDeleting] = useState<HomeScreenTemplate | null>(null);

    const { data, isLoading } = useHomeScreenTemplates({
        page,
        limit,
        search: search || undefined,
        event_category_id: categoryId === 'all' ? undefined : Number(categoryId),
        status: status === 'all' ? undefined : status,
    });
    const { data: stats } = useHomeScreenTemplateStats();
    const { data: eventCategories } = useEventCategories({ limit: 200, is_active: 1 });
    const toggleStatus = useUpdateHomeScreenTemplateStatus();
    const deleteTpl = useDeleteHomeScreenTemplate();

    const rows = data?.data ?? [];
    const pagination = data?.pagination;

    const statCards = [
        { key: 'total', label: 'Total Templates', value: stats?.total ?? 0 },
        { key: 'active', label: 'Active', value: stats?.active ?? 0 },
        { key: 'inactive', label: 'Inactive', value: stats?.inactive ?? 0 },
    ];

    const columns: CommonColumn<HomeScreenTemplate>[] = [
        {
            key: 'preview',
            header: 'Preview',
            className: 'w-[80px]',
            render: (row) => (
                <span className="flex h-16 w-9 items-center justify-center overflow-hidden rounded border border-border bg-muted/30">
                    {row.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                    )}
                </span>
            ),
        },
        {
            key: 'name',
            header: 'Template Name',
            className: 'min-w-[200px]',
            render: (row) => (
                <div className="min-w-0 max-w-[320px]">
                    <p className="break-all line-clamp-2 font-medium" title={row.name}>{row.name}</p>
                    {row.description ? (
                        <p className="mt-0.5 break-all line-clamp-2 text-xs text-muted-foreground" title={row.description}>
                            {row.description}
                        </p>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'event_category',
            header: 'Event Category',
            className: 'min-w-[120px]',
            render: (row) =>
                row.eventCategory ? (
                    <Badge variant="secondary">{row.eventCategory.name}</Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                ),
        },
        {
            key: 'style',
            header: 'Template Style',
            hideOnMobile: true,
            className: 'min-w-[110px]',
            render: (row) => <span className="text-sm">{row.style?.name ?? '—'}</span>,
        },
        {
            key: 'colors',
            header: 'Colors',
            hideOnMobile: true,
            className: 'min-w-[120px]',
            render: (row) => (
                <div className="flex items-center -space-x-1">
                    {(row.colors ?? []).map((c) => (
                        <span
                            key={c.key}
                            title={`${c.label}: ${c.hex}`}
                            className="h-5 w-5 rounded-full border-2 border-background"
                            style={{ backgroundColor: c.hex }}
                        />
                    ))}
                </div>
            ),
        },
    ];

    return (
        <>
            <PageLoader open={toggleStatus.isPending || deleteTpl.isPending} />

            <PageHeader
                title="Home Screen Templates"
                description="Mobile app home screen designs for each event category."
                action={
                    <Button onClick={() => router.push(`${BASE}/create`)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Template
                    </Button>
                }
            />

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {statCards.map((card) => (
                    <Card key={card.key} className="flex items-center gap-3 p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xl font-bold leading-none">{card.value}</p>
                            <p className="mt-1 break-words text-xs text-muted-foreground">{card.label}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Event Category</span>
                    <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
                        <SelectTrigger className="w-[190px]">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {(eventCategories?.data ?? []).map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <CommonTable<HomeScreenTemplate>
                columns={columns}
                data={rows}
                isLoading={isLoading}
                emptyMessage="No home screen templates yet. Add one to get started."
                searchPlaceholder="Search templates..."
                onSearch={(value) => { setSearch(value); setPage(1); }}
                onStatusToggle={(row, value) => toggleStatus.mutate({ id: row.id, is_active: value })}
                onEdit={(row) => router.push(`${BASE}/create?id=${row.id}`)}
                onDelete={(row) => setDeleting(row)}
                pagination={
                    pagination
                        ? {
                              page,
                              pageSize: limit,
                              totalItems: pagination.totalItems ?? 0,
                              totalPages: pagination.totalPages ?? 1,
                              onPageChange: setPage,
                              onPageSizeChange: (size) => { setLimit(size); setPage(1); },
                          }
                        : undefined
                }
            />

            <DeleteDialog
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete template"
                description={deleting ? `Delete "${deleting.name}"?` : ''}
                isDeleting={deleteTpl.isPending}
                onConfirm={() => {
                    if (deleting) deleteTpl.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
                }}
            />
        </>
    );
}
