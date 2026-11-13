"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowLeft, CalendarDays, CheckCircle2, Clock, Info, Loader2, Mail, Paperclip, Phone, ShieldCheck, User, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageLoader } from "@/components/common/page-loader";
import {
    REJECT_CATEGORIES, errorMessage, prettyDate, prettyDateTime, prettyRange, useAllocationRequest, useApproveRequest, useRejectRequest, weekday,
} from "@/hooks/use-event-availability";
import { ErrorBox, FieldLabel, InfoRow, ModuleHeader, SectionCard, counter } from "./shared";
import { RequestStatusBadge } from "./requests-content";

/**
 * Super Admin → Allocation Request Details (Jamal's designs 02–07): review the client's request, then
 * Override & Approve (a one-time exception for THIS request only — the general daily limit stays) or
 * Reject with a category + reason. Approved / rejected requests show the decision and its history.
 */

const DAY_TEXT: Record<string, string> = { available: "Available", low: "Available", full: "Fully Booked", disabled: "Disabled", not_configured: "Not Open" };
const isOpen = (s: string) => s === "available" || s === "low";

export function RequestDetail({ id }: { id: number }) {
    const params = useSearchParams();
    const initial = params.get("action");
    const { data: r, isLoading, error } = useAllocationRequest(id);
    const approve = useApproveRequest();
    const reject = useRejectRequest();

    const [mode, setMode] = useState<"view" | "approve">(initial === "approve" ? "approve" : "view");
    const [slots, setSlots] = useState("1");
    const [expiry, setExpiry] = useState("48");
    const [capacity, setCapacity] = useState(false);
    const [reason, setReason] = useState("");
    const [reviewOpen, setReviewOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(initial === "reject");
    const [category, setCategory] = useState(REJECT_CATEGORIES[0]);
    const [rejectReason, setRejectReason] = useState("");
    const [err, setErr] = useState("");

    if (isLoading) return <PageLoader open text="Loading..." />;
    if (error || !r) return <p className="py-16 text-center text-destructive">{errorMessage(error, "Request not found.")}</p>;

    const pending = r.status === "pending";
    const exceptionDates = r.decision?.dates ?? r.unavailable_dates.map((u) => u.date);
    const days = r.days ?? [];
    const client = r.client.name || r.contact_name;

    const toReview = () => {
        setErr("");
        const n = Number(slots);
        if (!Number.isInteger(n) || n < 1 || n > 10) return setErr("Exception slots must be between 1 and 10.");
        if (!capacity) return setErr("Please confirm the operational capacity check.");
        if (!reason.trim()) return setErr("Please enter the admin reason / notes.");
        setReviewOpen(true);
    };
    const confirmApprove = () => approve.mutate(
        { id: r.id, body: { exception_slots: Number(slots), expiry_hours: Number(expiry), capacity_checked: true, reason: reason.trim(), dates: exceptionDates } },
        { onSuccess: () => { setReviewOpen(false); setMode("view"); }, onError: (e) => { setReviewOpen(false); setErr(errorMessage(e)); } },
    );
    const confirmReject = () => {
        if (!rejectReason.trim()) return setErr("Please enter the rejection reason.");
        setErr("");
        reject.mutate({ id: r.id, body: { category, reason: rejectReason.trim() } }, {
            onSuccess: () => setRejectOpen(false),
            onError: (e) => setErr(errorMessage(e)),
        });
    };

    const title = r.status === "approved" ? "Allocation Request Approved" : r.status === "rejected" ? "Allocation Request Rejected"
        : mode === "approve" ? "Override Allocation for This Request" : "Allocation Request Details";
    const subtitle = r.status === "approved" ? "The request-specific exception is reserved; the client can now complete event creation."
        : r.status === "rejected" ? "The request was declined; the existing date limits and bookings remain unchanged."
            : mode === "approve" ? "Reserve an exception for this client and request only — the global daily booking limit does not change."
                : "Check booking limits, client information and the requested dates before making a decision.";

    return (
        <div className="space-y-4 [&_input]:text-[13px] [&_textarea]:text-[13px]">
            <PageLoader open={approve.isPending || reject.isPending} text={approve.isPending ? "Approving..." : "Rejecting..."} />
            <ModuleHeader title={title} description={subtitle} action={<RequestStatusBadge status={r.status} />} />

            {/* Request banner / decision banner */}
            {r.status === "approved" ? (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                    <div className="text-[13px]"><p className="font-semibold text-emerald-700">Request {r.ticket_no} approved</p>
                        <p>{exceptionDates.length > 1 ? `Additional reservations on ${exceptionDates.map(prettyDate).join(", ")} are` : `One additional reservation on ${prettyDate(exceptionDates[0])} is`} reserved for this client&apos;s event only.</p></div>
                </div>
            ) : r.status === "rejected" ? (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-4">
                    <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
                    <div className="text-[13px]"><p className="font-semibold text-red-600">Request {r.ticket_no} rejected</p><p>No additional booking slot was reserved. The existing date limits and bookings remain unchanged.</p></div>
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                    <div className="text-[13px]">
                        <p className="font-semibold">Request {r.ticket_no}</p>
                        <p className="text-muted-foreground">Submitted by {client} • {r.booking_type === "multiple" ? "Multi Date Event" : "Single Date Event"} • {prettyRange(r.start_date, r.end_date)}</p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Needs Override</span>
                </div>
            )}

            {mode === "approve" && pending ? (
                <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
                    <SectionCard icon={<CalendarDays />} title="Existing Allocation & Daily Limits">
                        <DaysTable days={days} />
                        <p className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12.5px]">
                            <b className="text-primary">Restriction:</b> keep the default daily limits. Approve only an exceptional reservation for request {r.ticket_no}, subject to operational capacity.
                        </p>
                    </SectionCard>
                    <SectionCard icon={<ShieldCheck />} title="Request-specific Allocation Override">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <FieldLabel required>Override {exceptionDates.length > 1 ? "Dates" : "Date"}</FieldLabel>
                                <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border bg-muted/30 px-2 py-1">
                                    {exceptionDates.map((d) => <span key={d} className="rounded bg-background px-1.5 py-0.5 text-[12px] font-medium">{prettyDate(d)}</span>)}
                                </div>
                            </div>
                            <div><FieldLabel required>Exception Slots</FieldLabel><Input type="number" min={1} max={10} value={slots} onChange={(e) => setSlots(e.target.value)} className="h-9" /></div>
                            <div><FieldLabel required>Override Scope</FieldLabel><div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-[13px]">Only {r.ticket_no}</div></div>
                            <div><FieldLabel>Client</FieldLabel><div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-[13px]">{client}</div></div>
                            <div className="md:col-span-2">
                                <FieldLabel required>Reservation Expiry</FieldLabel>
                                <Select value={expiry} onValueChange={setExpiry}>
                                    <SelectTrigger className="h-9"><SelectValue>{expiry} hours after approval</SelectValue></SelectTrigger>
                                    <SelectContent>{["24", "48", "72"].map((h) => <SelectItem key={h} value={h}>{h} hours after approval</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <label className="flex items-center gap-2 text-[13px] md:col-span-2">
                                <Checkbox checked={capacity} onCheckedChange={setCapacity} /> Operational capacity verified <span className="text-destructive">*</span>
                            </label>
                            <div className="md:col-span-2">
                                <FieldLabel required>Admin Reason / Notes</FieldLabel>
                                <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Approved an additional request-specific event slot after checking operational capacity." />
                                {counter(reason, 500)}
                            </div>
                        </div>
                        <p className="mt-2 rounded-md bg-primary/5 px-3 py-2 text-[12.5px]">
                            <b className="text-primary">Effect:</b> reserve {Number(slots) || 1} exceptional slot{Number(slots) > 1 ? "s" : ""} for {client}&apos;s event on {exceptionDates.map(prettyDate).join(", ")}. Other clients still see the date{exceptionDates.length > 1 ? "s" : ""} as unavailable, and the general daily limit does not change.
                        </p>
                        <ErrorBox message={err} />
                        <div className="mt-3 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setMode("view"); setErr(""); }}>Cancel</Button>
                            <Button onClick={toReview}>Review Override →</Button>
                        </div>
                    </SectionCard>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
                        <SectionCard icon={<User />} title="Client & Request">
                            <InfoRow label="Client" value={client} />
                            {r.client.company_name && <InfoRow label="Company" value={r.client.company_name} />}
                            <InfoRow icon={<Phone />} label="Mobile" value={r.contact_mobile || r.client.mobile || "—"} />
                            <InfoRow icon={<Mail />} label="Email" value={r.contact_email || r.client.email || "—"} />
                            <InfoRow label="Booking Type" value={r.booking_type === "multiple" ? "Multiple Date (Start → End)" : "Single Date"} />
                            <InfoRow label="Requested Range" value={`${prettyRange(r.start_date, r.end_date)}${r.booking_type === "multiple" ? ` (${days.length || "—"} days)` : ""}`} />
                            <InfoRow label="Request Status" value={<RequestStatusBadge status={r.status} />} />
                        </SectionCard>
                        <SectionCard icon={<Mail />} title="Request Message & Processing">
                            <p className="rounded-md bg-sky-50/60 px-3 py-2 text-[13px] italic">&ldquo;{r.message}&rdquo;</p>
                            <div className="mt-2">
                                <InfoRow label="Request Ticket" value={r.ticket_no} />
                                <InfoRow label="Submitted On" value={prettyDateTime(r.created_at)} />
                                <InfoRow label="Contact Method" value={r.contact_method === "call" ? "Request a Call Back" : "Email Support"} />
                                {r.contact_method === "call" && <InfoRow icon={<Clock />} label="Preferred Call Time" value={r.preferred_call_time || "—"} />}
                                {r.contact_method === "email" && <InfoRow label="Subject" value={r.subject || "—"} />}
                                {r.attachment_url && <InfoRow icon={<Paperclip />} label="Attachment" value={<a href={r.attachment_url} target="_blank" rel="noopener" className="text-primary hover:underline">{r.attachment_name || "Open file"}</a>} />}
                                <InfoRow label="Requested Exceptions" value={`${r.unavailable_dates.length} date${r.unavailable_dates.length === 1 ? "" : "s"} · 1 slot`} />
                            </div>
                        </SectionCard>
                    </div>

                    <SectionCard icon={<CalendarDays />} title="Date-wise Availability">
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {days.map((d) => (
                                <div key={d.date} className={`rounded-lg border p-3 text-center text-[13px] ${isOpen(d.status) ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/50"}`}>
                                    <p className="font-bold">{prettyDate(d.date)}</p>
                                    <p className="text-muted-foreground">{weekday(d.date)}</p>
                                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${isOpen(d.status) ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{DAY_TEXT[d.status] ?? d.status}</span>
                                    {d.status !== "not_configured" && <p className="mt-1 font-medium">{d.booked} booked · {d.balance} available</p>}
                                </div>
                            ))}
                        </div>
                        {pending && r.unavailable_dates.length > 0 && (
                            <p className="mt-3 rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-[12.5px]">
                                <b className="text-red-600">{r.unavailable_dates.map((u) => prettyDate(u.date)).join(", ")} {r.unavailable_dates.length > 1 ? "are" : "is"} not available.</b> A Super Admin may grant a one-time, request-specific exception after checking operational capacity. General availability for other clients stays unchanged.
                            </p>
                        )}
                    </SectionCard>

                    {r.status !== "pending" && (
                        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
                            <SectionCard icon={r.status === "approved" ? <CheckCircle2 /> : <XCircle />} title={r.status === "approved" ? "Approved Allocation" : "Rejection Details"}>
                                {r.status === "approved" ? (
                                    <>
                                        <InfoRow label="Exception Dates" value={exceptionDates.map(prettyDate).join(", ")} />
                                        <InfoRow label="Exception Capacity" value={`${r.decision?.exception_slots ?? 1} reserved slot${(r.decision?.exception_slots ?? 1) > 1 ? "s" : ""}`} />
                                        <InfoRow label="General Daily Limit" value="Unchanged" />
                                        <InfoRow label="Reservation Expires" value={prettyDateTime(r.decision?.expires_at ?? null)} />
                                        <InfoRow label="Used By Event" value={r.decision?.used_event_id ? `Event #${r.decision.used_event_id}` : "Not yet"} />
                                        <InfoRow label="Admin Notes" value={r.decision_reason || "—"} />
                                    </>
                                ) : (
                                    <>
                                        <InfoRow label="Unavailable Dates" value={r.unavailable_dates.map((u) => prettyDate(u.date)).join(", ")} />
                                        <InfoRow label="Rejection Category" value={r.decision?.category || "—"} />
                                        <InfoRow label="Exception Reserved" value="No" />
                                        <p className="mt-2 rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-[12.5px]"><b className="text-red-600">Rejection Reason:</b> {r.decision_reason}</p>
                                    </>
                                )}
                            </SectionCard>
                            <SectionCard icon={<Clock />} title="Decision History">
                                <ol className="relative ml-2 space-y-4 border-l border-primary/30 pl-4 text-[13px]">
                                    <li><span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full bg-primary" /><p className="font-semibold">Client requested allocation</p><p className="text-xs text-muted-foreground">{prettyDateTime(r.created_at)} · {prettyRange(r.start_date, r.end_date)}</p></li>
                                    <li><span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full bg-primary" /><p className="font-semibold">{r.status === "approved" ? "Exception reserved and request approved" : "Request rejected"}</p><p className="text-xs text-muted-foreground">{prettyDateTime(r.decided_at)}{r.decided_by_name ? ` · ${r.decided_by_name}` : ""}</p></li>
                                    {r.decision?.used_event_id && <li><span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" /><p className="font-semibold">Client created the event</p><p className="text-xs text-muted-foreground">{prettyDateTime(r.decision.used_at ?? null)}</p></li>}
                                </ol>
                            </SectionCard>
                        </div>
                    )}

                    {mode === "view" && err && <ErrorBox message={err} />}
                    <div className="flex flex-wrap justify-between gap-2">
                        <Button variant="outline" asChild><Link href="/admin/event-availability/requests"><ArrowLeft />Back to Requests</Link></Button>
                        {pending && (
                            <div className="flex gap-2">
                                <Button variant="destructive-outline" onClick={() => { setErr(""); setRejectOpen(true); }}><XCircle />Reject Request</Button>
                                <Button onClick={() => { setErr(""); setMode("approve"); }}><ShieldCheck />Override &amp; Approve</Button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Review & confirm (centre popup) */}
            <Dialog open={reviewOpen} onOpenChange={(v) => !approve.isPending && setReviewOpen(v)}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>Review &amp; Confirm Request-specific Override</DialogTitle>
                        <DialogDescription>Verify the exception before approving request {r.ticket_no}.</DialogDescription>
                    </DialogHeader>
                    <p className="rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[13px]"><b className="text-emerald-700">Only this request is affected.</b> Grant {slots} exceptional reservation{Number(slots) > 1 ? "s" : ""} for {exceptionDates.map(prettyDate).join(", ")}; do not change the public booking limit.</p>
                    <div className="grid grid-cols-2 gap-x-6 text-[13px]">
                        <InfoRow label="Daily Max Events" value="Unchanged" />
                        <InfoRow label="Client" value={client} />
                        <InfoRow label="Exceptional Reservation" value={`+${slots} (this request only)`} />
                        <InfoRow label="Expiration" value={`${expiry} hours`} />
                    </div>
                    <p className="flex items-start gap-1.5 rounded-md bg-muted/40 px-3 py-2 text-[12.5px]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />The client can then create the event on these dates. If the reservation expires unused, it is released automatically.</p>
                    <DialogFooter>
                        <Button variant="outline" disabled={approve.isPending} onClick={() => setReviewOpen(false)}>Back to Edit</Button>
                        <Button disabled={approve.isPending} onClick={confirmApprove}>{approve.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Confirm &amp; Approve</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject (centre popup) */}
            <Dialog open={rejectOpen && pending} onOpenChange={(v) => !reject.isPending && setRejectOpen(v)}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>Reject Event Allocation Request</DialogTitle>
                        <DialogDescription>Confirm rejection for ticket {r.ticket_no} — {client}.</DialogDescription>
                    </DialogHeader>
                    <p className="rounded-md border border-red-200 bg-red-50/70 px-3 py-2 text-[13px]"><b className="text-red-600">{r.unavailable_dates.map((u) => prettyDate(u.date)).join(", ")} {r.unavailable_dates.length > 1 ? "are" : "is"} not available.</b> This request will not receive any extra slot.</p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <FieldLabel required>Rejection Category</FieldLabel>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="h-9"><SelectValue>{category}</SelectValue></SelectTrigger>
                                <SelectContent>{REJECT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div><FieldLabel>Request Status</FieldLabel><div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-[13px]">Pending Review → Rejected</div></div>
                        <div className="md:col-span-2">
                            <FieldLabel required>Rejection Reason</FieldLabel>
                            <Textarea rows={3} maxLength={500} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. We are unable to allocate an additional slot due to the daily booking limit. Please select another date." />
                            {counter(rejectReason, 500)}
                        </div>
                    </div>
                    <ErrorBox message={rejectOpen ? err : ""} />
                    <DialogFooter>
                        <Button variant="outline" disabled={reject.isPending} onClick={() => setRejectOpen(false)}>Cancel</Button>
                        <Button variant="destructive-outline" disabled={reject.isPending} onClick={confirmReject}>{reject.isPending ? <Loader2 className="animate-spin" /> : <XCircle />}Confirm Rejection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function DaysTable({ days }: { days: { date: string; daily_max: number; booked: number; balance: number; status: string }[] }) {
    return (
        <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-[13px]">
                <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                    <tr>{["Date", "Daily Limit", "Created", "Balance", "Status"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                </thead>
                <tbody>
                    {days.map((d) => (
                        <tr key={d.date} className={`border-t ${isOpen(d.status) ? "" : "bg-red-50/50"}`}>
                            <td className="px-3 py-2 font-medium">{prettyDate(d.date)}</td>
                            <td className="px-3 py-2">{d.status === "not_configured" ? "—" : d.daily_max}</td>
                            <td className="px-3 py-2">{d.booked}</td>
                            <td className="px-3 py-2">{d.balance}</td>
                            <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isOpen(d.status) ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{DAY_TEXT[d.status] ?? d.status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
