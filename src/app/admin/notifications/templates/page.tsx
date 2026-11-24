'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    Copy,
    Eye,
    Layers,
    Mail,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    Plus,
    Power,
    RotateCcw,
    Search,
    Send,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/common/table-pagination';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { DynamicIcon } from '@/components/common/dynamic-icon';
import { cn } from '@/lib/utils';
import { useQueryParam } from '@/lib/client-only';
import {
    useNotificationTemplates,
    useNotificationTemplateCounts,
    useSystemTriggers,
    useUpdateNotificationTemplateStatus,
    useDuplicateNotificationTemplate,
    useDeleteNotificationTemplate,
    type NotificationTemplate,
} from '@/hooks/use-notification-templates';
import { AUDIENCES, AUDIENCE_LABELS, CategoryPill, ChannelIcons, TEMPLATE_TYPES, TEMPLATE_TYPE_LABELS, formatDateTime, templateCode } from './_components/template-shared';
import { SendTestDialog, StatusPill } from './_components/send-test-dialog';
import { DeleteTemplateDialog } from './_components/delete-template-dialog';

const ALL = 'all';
const BASE = '/admin/notifications/templates';

const CHANNEL_TABS = [
    { key: ALL, label: 'All Templates', icon: Layers, count: 'all' },
    { key: 'email', label: 'Email', icon: Mail, count: 'email' },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, count: 'whatsapp' },
    { key: 'in_app', label: 'In-App (Push)', icon: Bell, count: 'in_app' },
    { key: 'transactional', label: 'Transactional', icon: Layers, count: 'transactional' },
    { key: 'campaign', label: 'Campaign', icon: Send, count: 'campaign' },
    { key: 'custom', label: 'Custom', icon: Pencil, count: 'custom' },
] as const;
const TYPE_TABS: string[] = ['transactional', 'campaign', 'custom'];

export default function NotificationTemplatesPage() {
    const router = useRouter();

    // Old links (?preview=<id>) open the new View Details page.
    const previewParam = useQueryParam('preview');
    const [redirected, setRedirected] = useState(false);
    if (previewParam && !redirected && Number(previewParam) > 0) {
        setRedirected(true);
        router.replace(`${BASE}/${Number(previewParam)}`);
    }

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [channel, setChannel] = useState<string>(ALL);
    const [categoryId, setCategoryId] = useState(ALL);
    const [audience, setAudience] = useState(ALL);
    const [status, setStatus] = useState(ALL);
    const [deleteRow, setDeleteRow] = useState<NotificationTemplate | null>(null);
    const [testId, setTestId] = useState<number | null>(null);

    const { data: counts } = useNotificationTemplateCounts();
    const { data: catalog } = useSystemTriggers();
    const triggerMap = useMemo(() => new Map((catalog?.triggers ?? []).map((t) => [t.key, t])), [catalog]);

    const { data, isLoading } = useNotificationTemplates({
        page,
        limit,
        search: search || undefined,
        channel: channel === ALL || TYPE_TABS.includes(channel) ? undefined : channel,
        template_type: TYPE_TABS.includes(channel) ? channel : categoryId === ALL ? undefined : categoryId,
        audience: audience === ALL ? undefined : audience,
        is_active: status === ALL ? undefined : status === 'active',
        sort_by: 'updated_at',
        sort_order: 'DESC',
    });

    const updateStatus = useUpdateNotificationTemplateStatus();
    const duplicateTemplate = useDuplicateNotificationTemplate();
    const deleteTemplate = useDeleteNotificationTemplate();

    const templates = data?.data ?? [];
    const pagination = data?.pagination ?? null;
    const hasFilters = !!search || channel !== ALL || categoryId !== ALL || audience !== ALL || status !== ALL;

    const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
    const clearFilters = () => {
        setSearch(''); setChannel(ALL); setCategoryId(ALL); setAudience(ALL); setStatus(ALL); setPage(1);
    };

    const isBusy = isLoading || updateStatus.isPending || duplicateTemplate.isPending;

    return (
        <PermissionGuard permission="notification_templates.view">
            <div className="space-y-5">
                <PageLoader open={isBusy} text={updateStatus.isPending ? 'Updating status...' : 'Loading...'} />

                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Mail className="h-6 w-6" />
                        </span>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-foreground">Manage Message Templates</h1>
                            <p className="text-xs text-muted-foreground">
                                View, manage and monitor all Email, WhatsApp and In-App notification templates.
                            </p>
                        </div>
                    </div>
                    <Button onClick={() => router.push(`${BASE}/create`)} className="h-10 gap-2">
                        <Plus className="h-4 w-4" /> Create Template
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {CHANNEL_TABS.map((tab) => {
                        const active = channel === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => resetPage(setChannel)(tab.key)}
                                className={cn(
                                    'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors',
                                    active
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                        : 'border-border bg-card text-foreground hover:bg-muted',
                                )}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label} <span className={cn('text-xs', active ? 'opacity-90' : 'text-muted-foreground')}>({counts?.[tab.count] ?? 0})</span>
                            </button>
                        );
                    })}
                </div>

                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => resetPage(setSearch)(e.target.value)}
                                placeholder="Search template by name, subject or trigger…"
                                className="h-10 pl-9"
                            />
                        </div>
                        <Select value={categoryId} onValueChange={resetPage(setCategoryId)}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All Categories</SelectItem>
                                {TEMPLATE_TYPES.map((t) => <SelectItem key={t} value={t}>{TEMPLATE_TYPE_LABELS[t]}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={audience} onValueChange={resetPage(setAudience)}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All Audiences</SelectItem>
                                {AUDIENCES.map((a) => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={status} onValueChange={resetPage(setStatus)}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={clearFilters} disabled={!hasFilters} className="h-10 gap-2 text-xs">
                            <RotateCcw className="h-3.5 w-3.5" /> Reset
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="p-0">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-border/60 bg-pink-50/60 hover:bg-pink-50/60 dark:bg-pink-950/20">
                                        <TableHead className="min-w-[230px]">Template Name</TableHead>
                                        <TableHead className="whitespace-nowrap">Category</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead className="whitespace-nowrap">Audience</TableHead>
                                        <TableHead className="whitespace-nowrap">Last Updated</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="whitespace-nowrap">Mapped Trigger</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={8} className="py-16 text-center text-muted-foreground">Loading templates...</TableCell></TableRow>
                                    ) : templates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                                                {hasFilters ? 'No templates match these filters.' : 'No templates yet. Click "Create Template" to add the first one.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        templates.map((row) => {
                                            const locked = !!row.has_pending_approval;
                                            const active = !!Number(row.is_active);
                                            const trigger = row.trigger_key ? triggerMap.get(row.trigger_key) : undefined;
                                            const cat = row.notificationCategory;
                                            return (
                                                <TableRow key={row.id} className="border-b border-border/40">
                                                    <TableCell>
                                                        <button type="button" onClick={() => router.push(`${BASE}/${row.id}`)} className="flex items-center gap-2.5 text-left">
                                                            <span
                                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border"
                                                                style={cat?.color ? { backgroundColor: `${cat.color}1A` } : undefined}
                                                            >
                                                                <DynamicIcon name={cat?.icon} color={cat?.color} size="h-3.5 w-3.5" />
                                                            </span>
                                                            <span className="min-w-0">
                                                                <span className="block break-words text-sm font-semibold text-foreground hover:text-primary">{row.name}</span>
                                                                <span className="block text-[11px] text-muted-foreground">{templateCode(row)}</span>
                                                            </span>
                                                        </button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <CategoryPill type={row.template_type} />
                                                    </TableCell>
                                                    <TableCell><ChannelIcons channels={row.channels} /></TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm">{row.audience ? AUDIENCE_LABELS[row.audience] : '—'}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(row.updated_at || row.created_at)}</TableCell>
                                                    <TableCell><StatusPill active={active} /></TableCell>
                                                    <TableCell>
                                                        {row.trigger_key ? (
                                                            <span
                                                                className="inline-flex max-w-[180px] truncate rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                                                                title={trigger?.label ?? row.trigger_key}
                                                            >
                                                                {trigger?.label ?? row.trigger_key}
                                                            </span>
                                                        ) : <span className="text-xs text-muted-foreground">Not mapped</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost" size="icon" className="h-8 w-8" disabled={locked}
                                                                onClick={() => router.push(`${BASE}/create?id=${row.id}`)} title="Edit Template"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="outline" size="icon" className="h-8 w-8" disabled={locked}
                                                                        title={locked ? 'This template has a change awaiting approval.' : 'More actions'}
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-52">
                                                                    <DropdownMenuItem onClick={() => router.push(`${BASE}/${row.id}`)}>
                                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => router.push(`${BASE}/create?id=${row.id}`)}>
                                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Template
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => duplicateTemplate.mutate(row.id)}>
                                                                        <Copy className="mr-2 h-4 w-4" /> Duplicate Template
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => setTestId(row.id)}>
                                                                        <Send className="mr-2 h-4 w-4" /> Send Test Message
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: row.id, is_active: !active })}>
                                                                        <Power className="mr-2 h-4 w-4" /> {active ? 'Deactivate' : 'Activate'}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => setDeleteRow(row)} className="text-destructive focus:text-destructive">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
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
                                    onLimitChange={(v) => { setLimit(v); setPage(1); }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <SendTestDialog templateId={testId} open={testId !== null} onOpenChange={(o) => !o && setTestId(null)} />

                <DeleteTemplateDialog
                    template={deleteRow}
                    trigger={deleteRow?.trigger_key ? triggerMap.get(deleteRow.trigger_key) : undefined}
                    busy={deleteTemplate.isPending || updateStatus.isPending}
                    onClose={() => setDeleteRow(null)}
                    onDeactivate={() => deleteRow && updateStatus.mutate(
                        { id: deleteRow.id, is_active: false },
                        { onSuccess: () => setDeleteRow({ ...deleteRow, is_active: 0 }) },
                    )}
                    onDelete={() => deleteRow && deleteTemplate.mutate(deleteRow.id, { onSuccess: () => setDeleteRow(null) })}
                />
            </div>
        </PermissionGuard>
    );
}
