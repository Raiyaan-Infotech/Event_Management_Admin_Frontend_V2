"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { PageLoader } from "@/components/common/page-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DeleteDialog } from "@/components/common/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/lib/toast";
import {
    AvailabilityConfig, errorMessage, prettyRange, useAvailabilityConfigs, useConfigStatus, useDeleteConfig,
} from "@/hooks/use-event-availability";
import { SectionCard, ModuleHeader } from "./shared";

/** All availability configs (not in the designs — needed to edit or switch one off). */
export function ConfigsContent() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const q = useDebounce(search, 400);
    const { data, isLoading } = useAvailabilityConfigs({ search: q || undefined, page, limit: 15 });
    const status = useConfigStatus();
    const del = useDeleteConfig();
    const [toDelete, setToDelete] = useState<AvailabilityConfig | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const rows = data?.data ?? [];

    return (
        <div className="space-y-4 [&_input]:text-[13px] [&_textarea]:text-[13px] [&_button[role=combobox]]:text-[13px]">
            <PageLoader open={status.isPending || del.isPending} text={del.isPending ? "Deleting..." : "Saving..."} />
            <ModuleHeader
                title="Availability Configs"
                description="Each config sets the daily event limit for a category and date range."
                action={
                    <div className="flex gap-2">
                        <Button variant="outline" asChild><Link href="/admin/event-availability"><CalendarDays />Daily Booking</Link></Button>
                        <Button asChild><Link href="/admin/event-availability/create"><Plus />Create Config</Link></Button>
                    </div>
                }
            />
            <SectionCard icon={<Settings2 />} title="Config List" action={
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="h-9 pl-9" placeholder="Search by name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
            }>
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-[13px]">
                        <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                            <tr>{["Config Name", "Category", "Active Period", "Days", "Daily Max", "Publish", "Status", ""].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading configs…</td></tr>
                            ) : !rows.length ? (
                                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">No configs yet. <Link href="/admin/event-availability/create" className="font-medium text-primary hover:underline">Create the first one</Link>.</td></tr>
                            ) : rows.map((c) => (
                                <tr key={c.id} className="border-t hover:bg-muted/20">
                                    <td className="px-3 py-2 font-medium">{c.name}</td>
                                    <td className="px-3 py-2">{c.category_name}</td>
                                    <td className="whitespace-nowrap px-3 py-2">{prettyRange(c.start_date, c.end_date)}</td>
                                    <td className="px-3 py-2">{c.total_days}</td>
                                    <td className="px-3 py-2">{c.daily_max}</td>
                                    <td className="px-3 py-2">
                                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.publish_status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                                            {c.publish_status === "published" ? "Published" : "Draft"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <Switch
                                            checked={!!c.is_active}
                                            pending={busyId === c.id}
                                            onText="ON" offText="OFF"
                                            onCheckedChange={(v) => {
                                                setBusyId(c.id);
                                                status.mutate({ id: c.id, is_active: v }, {
                                                    onSettled: () => setBusyId(null),
                                                    onError: (e) => toast.error(errorMessage(e)),
                                                });
                                            }}
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label="Edit"><Link href={`/admin/event-availability/configs/${c.id}`}><Pencil /></Link></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete" onClick={() => setToDelete(c)}><Trash2 /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {data && data.pagination.totalPages > 1 && (
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                        <span className="flex items-center px-2 text-sm text-muted-foreground">Page {page} of {data.pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                    </div>
                )}
            </SectionCard>

            <DeleteDialog
                open={!!toDelete}
                onOpenChange={(v) => !v && setToDelete(null)}
                title="Delete Config"
                description={toDelete ? `Delete "${toDelete.name}" (${prettyRange(toDelete.start_date, toDelete.end_date)})? Its dates become not configured, so organizers cannot book them. Events already booked stay.` : ""}
                isDeleting={del.isPending}
                onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null), onError: (e) => toast.error(errorMessage(e)) })}
            />
        </div>
    );
}
