'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVendors, useDeleteVendor, useUpdateVendorStatus, useImpersonateVendor, Vendor } from '@/hooks/use-vendors';
import { CommonTable } from '@/components/common/common-table';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { resolveMediaUrl } from '@/lib/utils';
import { Plus, Store, ExternalLink } from 'lucide-react';
import { toast } from '@/lib/toast';
import { PageLoader } from '@/components/common/page-loader';
import { TablePagination } from '@/components/common/table-pagination';

const MEMBERSHIP_COLORS: Record<string, string> = {
    basic: 'bg-gray-100 text-gray-700',
    silver: 'bg-slate-200 text-slate-700',
    gold: 'bg-yellow-100 text-yellow-700',
    platinum: 'bg-purple-100 text-purple-700',
};

export function VendorsContent() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [deleteId, setDeleteId] = useState<number | null>(null);


    const { data: vendorsRes, isLoading } = useVendors({ page, limit });
    const deleteVendor = useDeleteVendor();
    const updateStatus = useUpdateVendorStatus();
    const impersonate = useImpersonateVendor();

    const handleImpersonate = async (row: Vendor) => {
        try {
            await impersonate.mutateAsync(row.id);
            const vendorUrl = process.env.NEXT_PUBLIC_VENDOR_FRONTEND_URL || 'http://localhost:3001';
            toast.success(`Opening ${row.name}'s portal in a new tab`);
            window.open(`${vendorUrl}/dashboard`, '_blank');
        } catch {
            // toast is shown by the mutation hook
        }
    };

    const vendors: Vendor[] = (vendorsRes?.data || []).map((v: any) => ({
        ...v,
        created_at: v.created_at || v.createdAt || '',
    }));

    const columns = [
        {
            key: 'name',
            header: 'Vendor',
            render: (row: Vendor) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border">
                        <AvatarImage src={resolveMediaUrl(row.profile || '')} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {row.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{row.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'company_name',
            header: 'Company',
            render: (row: Vendor) => (
                <div className="flex items-center gap-3">
                    {row.company_logo ? (
                        <img
                            src={resolveMediaUrl(row.company_logo)}
                            alt={row.company_name}
                            className="h-8 w-16 object-contain rounded border border-border shrink-0 bg-muted/30"
                        />
                    ) : (
                        <div className="h-8 w-16 rounded border border-border bg-muted/30 flex items-center justify-center shrink-0">
                            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Logo</span>
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{row.company_name}</p>
                        {row.company_email ? (
                            <p className="text-xs text-muted-foreground truncate">{row.company_email}</p>
                        ) : null}
                    </div>
                </div>
            ),
        },
        {
            key: 'membership',
            header: 'Membership',
            render: (row: Vendor) => (
                <Badge className={`text-xs border-0 capitalize ${MEMBERSHIP_COLORS[row.membership] || ''}`}>
                    {row.membership}
                </Badge>
            ),
        },
        {
            key: 'contact',
            header: 'Contact',
            render: (row: Vendor) => (
                <span className="text-sm">{row.contact || row.company_contact || '—'}</span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: Vendor) => (
                <div onClick={(e) => e.stopPropagation()}>  {/* ← add this wrapper */}
            <Switch
                checked={row.status === 'active'}
                disabled={updateStatus.isPending && updateStatus.variables?.id === row.id}
                onCheckedChange={(checked) =>
                    updateStatus.mutate({ id: row.id, status: checked ? 'active' : 'inactive' })
                }
            />
        </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageLoader open={isLoading || deleteVendor.isPending || updateStatus.isPending} />
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Store className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Vendors</CardTitle>
                                <CardDescription>Manage vendor accounts and their details.</CardDescription>
                            </div>
                        </div>
                        <Button onClick={() => router.push('/admin/vendors/new')} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Vendor
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <CommonTable
                        data={vendors as any}
                        columns={columns}
                        isLoading={isLoading}
                        showStatus={false}
                        showCreated={true}
                        showActions={true}
                        onRowClick={(row) => router.push(`/admin/vendors/${row.id}`)}
                        onEdit={(row) => router.push(`/admin/vendors/${row.id}/edit`)}
                        onDelete={(row) => setDeleteId(row.id)}
                        disableEdit={(row) => !!(row as any).has_pending_approval}
                        disableDelete={(row) => !!(row as any).has_pending_approval}
                        extraActions={[{
                            icon: ExternalLink,
                            title: 'Open vendor portal as this vendor',
                            onClick: (row: Vendor) => handleImpersonate(row),
                            disabled: (row: Vendor) => (row as any).status !== 'active' || impersonate.isPending,
                        }]}
                        emptyMessage="No vendors found. Add your first vendor."
                    />
                    {vendorsRes?.pagination && (
                        <TablePagination
                            pagination={{ ...vendorsRes.pagination, limit }}
                            onPageChange={setPage}
                            onLimitChange={setLimit}
                        />
                    )}
                </CardContent>
            </Card>

            <DeleteDialog
                open={!!deleteId}
                onOpenChange={(open: boolean) => { if (!open) setDeleteId(null); }}
                title="Delete Vendor"
                description="Are you sure you want to delete this vendor? This action cannot be undone."
                isDeleting={deleteVendor.isPending}
                onConfirm={() => {
                    if (deleteId) {
                        deleteVendor.mutate(deleteId, {
                            onSuccess: () => setDeleteId(null),
                            onError: () => setDeleteId(null)
                        });
                    }
                }}
            />
        </div>
    );
}

