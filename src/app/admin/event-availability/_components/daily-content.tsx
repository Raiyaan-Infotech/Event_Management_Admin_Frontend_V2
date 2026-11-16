"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Eye, Layers, Loader2, MoreHorizontal, Pencil,
    PauseCircle, PlayCircle, Plus, PlusCircle, RotateCcw, Search, Trash2, Users, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/common/page-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/common/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { DayRow, errorMessage, prettyDate, prettyDateTime, useAvailabilityDaily, useDayAction } from "@/hooks/use-event-availability";
import { toast } from "@/lib/toast";
import { CategorySelect, DayStatusBadge } from "./shared";
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

/** Stat card from the design layout: tinted icon tile + label + large number (theme colour, green for Available). */
function StatTile({ icon, label, value, tone = "primary" }: { icon: React.ReactNode; label: string; value?: number; tone?: "primary" | "green" }) {
    return (
        <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl [&_svg]:h-6 [&_svg]:w-6",
                tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-primary/10 text-primary")}>{icon}</div>
            <div>
                <p className="text-[13px] text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold leading-tight text-foreground">{value ?? "—"}</p>
            </div>
        </div>
    );
}

/** Up to 5 page numbers around the current page. */
const pageWindow = (page: number, total: number) => {
    const start = Math.max(1, Math.min(page - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => start + i);
};

export function DailyContent() {
    const initial = useMemo(monthRange, []);
    const [from, setFrom] = useState(initial.from);
    const [to, setTo] = useState(initial.to);
    const [category, setCategory] = useState("all");
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const q = useDebounce(search, 400);

    const params = { from, to, event_category_id: category === "all" ? undefined : category, status: status === "all" ? undefined : status, search: q || undefined, page, limit: 8 };
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
            <PageLoader open={action.isPending} text={toDelete ? "Deleting..." : "Saving..."} />
            {/* Header — Jamal's design (Daily Event Booking Availability, 2026-11-16): title only; Create Config sits in the filter row. */}
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Daily Event Booking Availability</h1>
                <p className="text-sm text-muted-foreground">Manage configured daily event booking limits, booked counts and balance status.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile icon={<CalendarDays />} label="Configured Dates" value={stats?.configured} />
                <StatTile icon={<CircleCheck />} label="Fully Booked" value={stats?.fully_booked} />
                <StatTile icon={<CalendarCheck />} label="Available Dates" value={stats?.available} tone="green" />
                <StatTile icon={<Layers />} label="Total Bookings" value={stats?.total_booked} />
            </div>

            {/* One filter row: Date Range · Event Category · Applies To · Status · Search · Reset · Create Config */}
            <section className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-end gap-3 xl:flex-nowrap">
                    <div>
                        <p className="mb-1 text-[12.5px] font-medium text-muted-foreground">Date Range</p>
                        <div className="flex items-center gap-2">
                            <div className="w-[152px] [&_button]:w-full [&_button]:px-2.5 [&_button]:text-[12.5px] [&>div]:w-full"><DatePicker value={from} onChange={(v) => { setFrom(v); setPage(1); }} /></div>
                            <span className="text-muted-foreground">–</span>
                            <div className="w-[152px] [&_button]:w-full [&_button]:px-2.5 [&_button]:text-[12.5px] [&>div]:w-full"><DatePicker value={to} onChange={(v) => { setTo(v); setPage(1); }} /></div>
                        </div>
                    </div>
                    <div className="w-[150px] shrink-0">
                        <p className="mb-1 text-[12.5px] font-medium text-muted-foreground">Event Category</p>
                        <CategorySelect value={category} onChange={(v) => { setCategory(v); setPage(1); }} />
                    </div>
                    <div className="w-[152px] shrink-0">
                        <p className="mb-1 text-[12.5px] font-medium text-muted-foreground">Applies To</p>
                        {/* The daily limit is shared by every organizer, so this is the only scope there is. */}
                        <Select value="all" onValueChange={() => {}}>
                            <SelectTrigger className="h-9"><span className="flex items-center gap-2 whitespace-nowrap"><Users className="h-4 w-4 text-muted-foreground" />All Organizers</span></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Organizers</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="w-[152px] shrink-0">
                        <p className="mb-1 text-[12.5px] font-medium text-muted-foreground">Status</p>
                        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                            <SelectTrigger className="h-9 justify-start gap-2"><CircleCheck className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="flex-1 truncate text-left">{STATUS_LABEL[status]}</span></SelectTrigger>
                            <SelectContent>
                                {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="relative min-w-[110px] flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-9 pl-9" placeholder="Search by date, category..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <Button variant="outline" className="h-9 shrink-0" onClick={reset}><RotateCcw />Reset</Button>
                    <Button asChild className="h-9 shrink-0"><Link href="/admin/event-availability/create"><Plus />Create Config</Link></Button>
                </div>
            </section>

            <section className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4"><CalendarDays /></span>
                        <h2 className="text-[16px] font-bold text-foreground">Booked Dates List</h2>
                    </div>
                    {isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead className="bg-muted/50 text-left text-[12.5px] font-semibold text-foreground/80 [&_th:first-child]:rounded-l-lg [&_th:last-child]:rounded-r-lg">
                            <tr>
                                {["Date", "Day", "Category", "Daily Max Events", "Created Events", "Balance Slots", "Status", "Last Updated", "Actions"].map((h, i) => (
                                    <th key={h} className={cn("whitespace-nowrap px-3 py-2.5", i >= 3 && i <= 5 && "text-center", i === 8 && "text-right")}>{h}</th>
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
                                <tr key={`${r.config_id}-${r.date}`} className="border-b last:border-b-0 hover:bg-muted/20">
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
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /></Button>
                            {pageWindow(page, data.pagination.totalPages).map((n) => (
                                <Button key={n} variant="outline" size="icon" aria-label={`Page ${n}`} aria-current={n === page ? "page" : undefined}
                                    className={cn("h-9 w-9 text-[13px]", n === page && "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
                                    onClick={() => setPage(n)}>{n}</Button>
                            ))}
                            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Next page" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}><ChevronRight /></Button>
                        </div>
                    </div>
                )}
            </section>

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
