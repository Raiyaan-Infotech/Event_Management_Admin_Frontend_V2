"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Eye, Inbox, Loader2, Mail, MoreHorizontal, Phone, RotateCcw, Search, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { errorMessage, prettyDate, prettyDateTime, prettyRange, useAllocationRequests, type RequestStatus } from "@/hooks/use-event-availability";
import { ModuleHeader, SectionCard, StatCard } from "./shared";

/** Super Admin → Event Availability → Allocation Requests (Jamal's design 01_Allocation_Request_Inbox). */

export const REQUEST_STATUS: Record<RequestStatus, { label: string; cls: string }> = {
    pending: { label: "Pending Review", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    approved: { label: "Approved", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    rejected: { label: "Rejected", cls: "border-red-200 bg-red-50 text-red-600" },
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
    const s = REQUEST_STATUS[status] ?? REQUEST_STATUS.pending;
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

const STATUS_LABEL: Record<string, string> = { all: "All Statuses", pending: "Pending Review", approved: "Approved", rejected: "Rejected" };

export function RequestsContent() {
    const router = useRouter();
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const q = useDebounce(search, 400);
    const { data, isLoading, isFetching, error } = useAllocationRequests({
        from: from || undefined, to: to || undefined, status: status === "all" ? undefined : status, search: q || undefined, page, limit: 10,
    });
    const rows = data?.data ?? [];
    const stats = data?.stats;
    const reset = () => { setFrom(""); setTo(""); setStatus("all"); setSearch(""); setPage(1); };

    return (
        <div className="space-y-4 [&_input]:text-[13px] [&_textarea]:text-[13px]">
            <ModuleHeader title="Event Allocation Requests" description="Review client requests for dates that are fully booked or not open." />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={<Inbox />} label="Total Requests" value={stats?.total ?? "—"} />
                <StatCard icon={<Clock />} label="Pending Review" value={stats?.pending ?? "—"} tone="muted" />
                <StatCard icon={<CheckCircle2 />} label="Approved" value={stats?.approved ?? "—"} tone="green" />
                <StatCard icon={<XCircle />} label="Rejected" value={stats?.rejected ?? "—"} tone="red" />
            </div>

            <SectionCard icon={<Search />} title="Filter">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.4fr_auto] xl:items-end">
                    <div><p className="mb-1 text-[13px] font-medium">Submitted From</p><div className="[&_button]:w-full [&>div]:w-full [&_.inline-block]:!block [&_.inline-block]:w-full"><DatePicker value={from} onChange={(v) => { setFrom(v); setPage(1); }} /></div></div>
                    <div><p className="mb-1 text-[13px] font-medium">Submitted To</p><div className="[&_button]:w-full [&>div]:w-full [&_.inline-block]:!block [&_.inline-block]:w-full"><DatePicker value={to} onChange={(v) => { setTo(v); setPage(1); }} /></div></div>
                    <div>
                        <p className="mb-1 text-[13px] font-medium">Status</p>
                        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                            <SelectTrigger className="h-9"><SelectValue>{STATUS_LABEL[status]}</SelectValue></SelectTrigger>
                            <SelectContent>{Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-9 pl-9" placeholder="Search by client or request ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <Button variant="outline" className="h-9" onClick={reset}><RotateCcw />Reset</Button>
                </div>
            </SectionCard>

            <SectionCard icon={<Inbox />} title="Allocation Requests List" action={
                <span className="flex items-center gap-2 text-[12px] text-muted-foreground">{isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin" />}({data?.pagination.total ?? 0} total)</span>
            }>
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full whitespace-nowrap text-[13px]">
                        <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                            <tr>{["Request ID", "Client", "Requested Dates", "Unavailable", "Contact", "Status", "Submitted", ""].map((h) => <th key={h} className="px-2.5 py-2.5">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading requests…</td></tr>
                            ) : error ? (
                                <tr><td colSpan={8} className="py-16 text-center text-destructive">{errorMessage(error)}</td></tr>
                            ) : !rows.length ? (
                                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">No allocation requests yet.</td></tr>
                            ) : rows.map((r) => (
                                <tr key={r.id} className={`border-t hover:bg-muted/20 ${r.status === "pending" ? "bg-primary/[0.03]" : ""}`}>
                                    <td className="px-2.5 py-2 font-semibold"><Link href={`/admin/event-availability/requests/${r.id}`} className="hover:underline">{r.ticket_no}</Link></td>
                                    <td className="px-2.5 py-2"><p className="font-medium">{r.client.name || r.contact_name}</p><p className="text-xs text-muted-foreground">{r.client.company_name || "Client account"}</p></td>
                                    <td className="px-2.5 py-2"><p>{prettyRange(r.start_date, r.end_date)}</p><p className="text-xs text-muted-foreground">{r.booking_type === "multiple" ? "Multi Date Event" : "Single Date Event"}</p></td>
                                    <td className="px-2.5 py-2">
                                        <span className="flex flex-wrap gap-1">
                                            {r.unavailable_dates.slice(0, 2).map((u) => <span key={u.date} className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600">{prettyDate(u.date)}</span>)}
                                            {r.unavailable_dates.length > 2 && <span className="text-xs text-muted-foreground">+{r.unavailable_dates.length - 2}</span>}
                                        </span>
                                    </td>
                                    <td className="px-2.5 py-2">
                                        <span className="inline-flex items-center gap-1 text-xs">{r.contact_method === "call" ? <><Phone className="h-3.5 w-3.5" />Call back</> : <><Mail className="h-3.5 w-3.5" />Email</>}</span>
                                    </td>
                                    <td className="px-2.5 py-2"><RequestStatusBadge status={r.status} /></td>
                                    <td className="px-2.5 py-2 text-xs text-muted-foreground">{prettyDateTime(r.created_at)}</td>
                                    <td className="px-2.5 py-2 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-7 w-7" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => router.push(`/admin/event-availability/requests/${r.id}`)}><Eye className="mr-2 h-4 w-4" />View Request</DropdownMenuItem>
                                                {r.status === "pending" && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => router.push(`/admin/event-availability/requests/${r.id}?action=approve`)}><ShieldCheck className="mr-2 h-4 w-4" />Override &amp; Approve</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => router.push(`/admin/event-availability/requests/${r.id}?action=reject`)}><XCircle className="mr-2 h-4 w-4" />Reject Request</DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {data && data.pagination.totalPages > 1 && (
                    <div className="mt-3 flex items-center justify-between text-[13px] text-muted-foreground">
                        <span>Showing {(page - 1) * 10 + 1} – {Math.min(page * 10, data.pagination.total)} of {data.pagination.total} requests</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
