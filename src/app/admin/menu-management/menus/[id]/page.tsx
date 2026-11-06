'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, LayoutList, Monitor, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { DynamicIcon } from '@/components/common/dynamic-icon';
import { cn } from '@/lib/utils';
import { useEventMenu } from '@/hooks/use-menu-management';

export default function ViewMenuPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: menu, isLoading } = useEventMenu(id);

    if (isLoading) return <PageLoader open />;
    if (!menu) {
        return (
            <div className="py-20 text-center text-sm text-muted-foreground">
                Menu not found.
                <div className="mt-4">
                    <Button variant="outline" onClick={() => router.push('/admin/menu-management/menus')}>
                        Back to Menu List
                    </Button>
                </div>
            </div>
        );
    }

    const isActive = Number(menu.is_active) === 1;

    const stamp = (value?: string | null) => {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '—';
        return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    };

    const statusBadge = (
        <Badge
            variant="outline"
            className={cn(
                'text-[11px]',
                isActive
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-300 bg-slate-50 text-slate-600'
            )}
        >
            {isActive ? 'Active' : 'Inactive'}
        </Badge>
    );

    return (
        <PermissionGuard permission="event_menus.view">
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => router.push('/admin/menu-management/menus')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-lg font-bold tracking-tight text-foreground">View Menu</h1>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => router.push(`/admin/menu-management/menus/create?id=${menu.id}`)}
                        className="h-9 gap-2 border-primary/40 text-primary hover:bg-primary/5"
                    >
                        <Pencil className="h-4 w-4" /> Edit Menu
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_330px] lg:items-start">
                    <div className="space-y-5">
                        <SectionCard icon={<LayoutList className="h-4 w-4" />} title="Menu Information">
                            <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
                                {/* Left column tracks the record; right column the audit trail. */}
                                <div className="space-y-4">
                                    <Row label="Menu Name" value={menu.name} />
                                    <Row label="Slug" value={menu.slug} mono />
                                    <Row label="Menu Category" value={menu.category?.name ?? '—'} />
                                    <Row label="Sort Order" value={String(menu.sort_order)} />
                                    <Row label="Status" value={statusBadge} />
                                </div>
                                <div className="space-y-4">
                                    <Row label="Created On" value={stamp(menu.created_at)} />
                                    <Row label="Created By" value={menu.creator?.full_name ?? '—'} />
                                    <Row label="Updated On" value={stamp(menu.updated_at)} />
                                    <Row label="Updated By" value={menu.updater?.full_name ?? '—'} />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard icon={<Monitor className="h-4 w-4" />} title="Platform Status">
                            <div className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
                                <div className="space-y-4">
                                    <p className="text-sm font-semibold text-foreground">Active Status</p>
                                    <StateRow
                                        label="Menu"
                                        on={Number(menu.is_active) === 1}
                                        onText="Active"
                                        offText="Inactive"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm font-semibold text-foreground">Menu Type</p>
                                    <StateRow
                                        label="Type"
                                        on={Number(menu.is_default) === 1}
                                        onText="Default Menu"
                                        offText="Add-on Menu"
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard icon={<Info className="h-4 w-4" />} title="Additional Information">
                            <div className="space-y-4">
                                <Row label="Description" value={menu.description || '—'} wide />
                                <Row
                                    label="Icon"
                                    value={
                                        <span className="flex items-center gap-2">
                                            <DynamicIcon name={menu.icon} color={menu.color} size="h-4 w-4" />
                                            <span>{menu.icon || '—'}</span>
                                        </span>
                                    }
                                />
                                {/* company_id is the tenant scope; null means it is not
                                    restricted to one. */}
                                <Row
                                    label="Applicable To"
                                    value={menu.company_id ? `Tenant #${menu.company_id}` : 'All Tenants'}
                                />
                                <Row label="Remarks" value={menu.remarks || '—'} wide />
                            </div>
                        </SectionCard>
                    </div>

                    {/* Identity card */}
                    <Card className="border-border bg-card shadow-xs lg:sticky lg:top-6">
                        <CardContent className="p-5">
                            <div className="flex justify-end">{statusBadge}</div>

                            <div className="flex flex-col items-center gap-3 pb-2 pt-1">
                                <span
                                    className="inline-flex h-24 w-24 items-center justify-center rounded-2xl text-white"
                                    style={{ backgroundColor: menu.color || 'var(--primary)' }}
                                >
                                    <DynamicIcon name={menu.icon} size="h-11 w-11" />
                                </span>
                                <p className="break-words text-center text-base font-bold text-foreground">
                                    {menu.name}
                                </p>
                                <Badge variant="secondary" className="font-mono text-[11px]">
                                    ID: {menu.id}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PermissionGuard>
    );
}

function SectionCard({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-5">
                <div className="mb-5 flex items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {icon}
                    </span>
                    <span className="text-sm font-bold text-foreground">{title}</span>
                </div>
                {children}
            </CardContent>
        </Card>
    );
}

/** "Label : Value", the layout used across the detail screens. */
function Row({
    label,
    value,
    mono,
    wide,
}: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    wide?: boolean;
}) {
    return (
        <div className={cn('flex min-w-0 items-start gap-2', wide && 'items-baseline')}>
            <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">:</span>
            <span
                className={cn(
                    'min-w-0 break-words text-sm font-medium text-foreground',
                    mono && 'font-mono text-[13px]'
                )}
            >
                {value}
            </span>
        </div>
    );
}

/**
 * A read-only switch. `pointer-events-none` rather than `disabled` so it keeps
 * its filled colour — a disabled switch greys out and would read as "off".
 */
function StateRow({
    label,
    on,
    onText,
    offText,
}: {
    label: string;
    on: boolean;
    onText: string;
    offText: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">:</span>
            <span className="pointer-events-none" aria-hidden="true">
                <Switch checked={on} />
            </span>
            <span className="text-sm font-medium text-foreground">{on ? onText : offText}</span>
        </div>
    );
}
