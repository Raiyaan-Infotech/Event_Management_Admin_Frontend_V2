"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    CalendarCheck, CalendarClock, CalendarDays, CalendarX2, Eye, ListChecks, Loader2, MoreHorizontal, Pencil,
    PauseCircle, PlayCircle, Plus, PlusCircle, RotateCcw, Search, Settings2, Trash2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/common/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { DayRow, errorMessage, prettyDate, prettyDateTime, useAvailabilityDaily, useDayAction } from "@/hooks/use-event-availability";
import { toast } from "sonner";
import { CategorySelect, DayStatusBadge, SectionCard, StatCard, ModuleHeader } from "./shared";
import { DaySheet, SheetMode } from "./day-sheets";

const monthRange = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const last = new Date(y, m + 1, 0).getDate();
    return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
};

const STATUS_LABEL: Record<string, string> = { all: "All Statuses", available: "Available", low: "Low Availability", full: "Fully Booked", disabled: "Disabled" };

export function DailyContent() {
    const initial = useMemo(monthRange, []);
    const [from, setFrom] = useState(initial.from);
    const [to, setTo] = useState(initial.to);
    const [category, setCategory] = useState("all");
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const q = useDebounce(search, 400);

    const params = { from, to, event_category_id: category === "all" ? undefined : category, status: status === "all" ? undefined : status, search: q || undefined, page, limit: 15 };
    const { data, isLoading, isFetching, error } = useAvailabilityDaily(params);
    const rows = data?.data ?? [];
    const stats = data?.stats;

    const [sheet, setSheet] = useState<{ row: DayRow; mode: SheetMode } | null>(null);
    const [toDelete, setToDelete] = useState<DayRow | null>(null);
    const action = useDayAction();

    const reset = () => { setFrom(initial.from); setTo(initial.to); setCategory("all"); setStatus("all"); setSearch(""); setPage(1); };
    const quick = (row: DayRow, body: Parameters<typeof action.mutate>[0]["body"]) =>
        action.mutate({ configId: row.config_id, date: row.date, body }, { onError: (e) => toast.error(errorMessage(e)) });

    return (
        <div className="space-y-4 [&_input]:text-[13px] [&_textarea]:text-[13px] [&_button[role=combobox]]:text-[13px]">
            <ModuleHeader
                title="Daily Event Booking Availability"
                description="Manage configured daily event booking limits, booked counts and balance status."
                action={
                    <div className="flex flex-nowrap gap-2">
                        <Button variant="outline" asChild><Link href="/admin/event-availability/overrides"><CalendarClock />Special Limits Override</Link></Button>
                        <Button variant="outline" asChild><Link href="/admin/event-availability/configs"><Settings2 />Configs</Link></Button>
                        <Button asChild><Link href="/admin/event-availability/create"><Plus />Create Config</Link></Button>
                    </div>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={<CalendarDays />} label="Total Configured Dates" value={stats?.configured ?? "—"} />
                <StatCard icon={<CalendarCheck />} label="Available Dates" value={stats?.available ?? "—"} tone="green" />
                <StatCard icon={<CalendarX2 />} label="Fully Booked Dates" value={stats?.fully_booked ?? "—"} tone="red" />
                <StatCard icon={<PauseCircle />} label="Disabled Dates" value={stats?.disabled ?? "—"} tone="muted" />
            </div>

            <SectionCard icon={<ListChecks />} title="Filter">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.3fr_auto] xl:items-end">
                    <div>
                        <p className="mb-1 text-[13px] font-medium">From</p>
                        <DatePicker value={from} onChange={(v) => { setFrom(v); setPage(1); }} />
                    </div>
                    <div>
                        <p className="mb-1 text-[13px] font-medium">To</p>
                        <DatePicker value={to} onChange={(v) => { setTo(v); setPage(1); }} />
                    </div>
                    <div>
                        <p className="mb-1 text-[13px] font-medium">Category</p>
                        <CategorySelect value={category} onChange={(v) => { setCategory(v); setPage(1); }} />
                    </div>
                    <div>
                        <p className="mb-1 text-[13px] font-medium">Status</p>
                        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                            <SelectTrigger className="h-9"><SelectValue>{STATUS_LABEL[status]}</SelectValue></SelectTrigger>
                            <SelectContent>
                                {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-9 pl-9" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <Button variant="outline" className="h-9" onClick={reset}><RotateCcw />Reset</Button>
                </div>
            </SectionCard>

            <SectionCard icon={<CalendarDays />} title="Booked Dates List" action={isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}>
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-[13px]">
                        <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                            <tr>
                                {["Date", "Day", "Category", "Daily Max Events", "Created Events", "Balance Slots", "Status", "Last Updated", ""].map((h) => (
                                    <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={9} className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading dates…</td></tr>
                            ) : error ? (
                                <tr><td colSpan={9} className="py-16 text-center text-destructive">{errorMessage(error)}</td></tr>
                            ) : !rows.length ? (
                                <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">
                                    No configured dates in this range. <Link href="/admin/event-availability/create" className="font-medium text-primary hover:underline">Create a config</Link> to open dates for booking.
                                </td></tr>
                            ) : rows.map((r) => (
                                <tr key={`${r.config_id}-${r.date}`} className="border-t hover:bg-muted/20">
                                    <td className="whitespace-nowrap px-3 py-2 font-medium"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />{prettyDate(r.date)}</span></td>
                                    <td className="px-3 py-2">{r.day}</td>
                                    <td className="px-3 py-2">{r.category_name}</td>
                                    <td className="px-3 py-2 text-center">{r.daily_max}</td>
                                    <td className="px-3 py-2 text-center">{r.booked}</td>
                                    <td className="px-3 py-2 text-center font-semibold">{r.balance}</td>
                                    <td className="px-3 py-2"><DayStatusBadge status={r.status} /></td>
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{prettyDateTime(r.last_updated)}</td>
                                    <td className="px-3 py-2 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Actions"><MoreHorizontal /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-52">
                                                <DropdownMenuItem onClick={() => setSheet({ row: r, mode: "view" })}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSheet({ row: r, mode: "edit" })}><Pencil className="mr-2 h-4 w-4" />Edit Limit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSheet({ row: r, mode: "events" })}><CalendarCheck className="mr-2 h-4 w-4" />View Booked Events</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSheet({ row: r, mode: "increase" })}><PlusCircle className="mr-2 h-4 w-4" />Increase Limit</DropdownMenuItem>
                                                {r.override_mode !== "full" && (
                                                    <DropdownMenuItem onClick={() => setSheet({ row: r, mode: "full" })}><XCircle className="mr-2 h-4 w-4" />Mark Fully Booked</DropdownMenuItem>
                                                )}
                                                {r.override_mode === "disabled" || r.override_mode === "full" ? (
                                                    <DropdownMenuItem onClick={() => quick(r, { action: "enable" })}><PlayCircle className="mr-2 h-4 w-4" />{r.override_mode === "disabled" ? "Enable Date" : "Open for Booking"}</DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => setSheet({ row: r, mode: "disable" })}><PauseCircle className="mr-2 h-4 w-4" />Disable Date</DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => setToDelete(r)}><Trash2 className="mr-2 h-4 w-4" />Delete Config</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {data && data.pagination.total > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                        <span>Showing {(page - 1) * data.pagination.limit + 1} – {Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} dates</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                            <span className="flex items-center px-2">Page {page} of {data.pagination.totalPages}</span>
                            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                        </div>
                    </div>
                )}
            </SectionCard>

            <DaySheet row={sheet?.row ?? null} mode={sheet?.mode ?? null} onClose={() => setSheet(null)} onMode={(m) => sheet && setSheet({ ...sheet, mode: m })} />

            <DeleteDialog
                open={!!toDelete}
                onOpenChange={(v) => !v && setToDelete(null)}
                title="Delete Availability Config"
                description={toDelete ? `Remove ${prettyDate(toDelete.date)} (${toDelete.category_name}) from "${toDelete.config_name}"? It will no longer appear in the daily list and organizers cannot book it (not configured). ${toDelete.booked ? `The ${toDelete.booked} booked event${toDelete.booked === 1 ? "" : "s"} stay. ` : ""}You can configure it again later.` : ""}
                confirmText="Delete Config"
                isDeleting={action.isPending}
                onConfirm={() => toDelete && action.mutate({ configId: toDelete.config_id, date: toDelete.date, body: { action: "remove" } }, {
                    onSuccess: () => setToDelete(null),
                    onError: (e) => toast.error(errorMessage(e)),
                })}
            />
        </div>
    );
}
