"use client";

import { useEffect, useState } from "react";
import {
    ArrowDown, Calendar, CalendarCheck, CalendarDays, CalendarX2, CheckCircle2, Clock, FileText, Info, Layers,
    Loader2, Pencil, PauseCircle, PlusCircle, Scale, Tag, Users, XCircle, Activity,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    BlockingDate, DayRow, blockingDates, errorMessage, prettyDate, prettyDateTime, prettyTime,
    useAvailabilityDay, useDayAction,
} from "@/hooks/use-event-availability";
import { DayStatusBadge, ErrorBox, FieldLabel, InfoRow, counter } from "./shared";

export type SheetMode = "view" | "edit" | "events" | "increase" | "full" | "disable";

const HEAD: Record<SheetMode, { title: string; sub: string; Icon: typeof Calendar }> = {
    view: { title: "Availability Details", sub: "Detailed configuration and booking information for the selected date.", Icon: CalendarDays },
    edit: { title: "Edit Daily Limit", sub: "Update the event booking limit for a specific date.", Icon: Pencil },
    events: { title: "Booked Events", sub: "Events already booked for this date.", Icon: CalendarCheck },
    increase: { title: "Increase Daily Limit", sub: "Increase the daily maximum event limit for the selected date.", Icon: PlusCircle },
    full: { title: "Mark Date as Fully Booked", sub: "Stop new bookings on this date.", Icon: CalendarX2 },
    disable: { title: "Disable Date", sub: "Organizers cannot book events on this date while it is disabled.", Icon: PauseCircle },
};

export function DaySheet({ row, mode, onClose, onMode }: { row: DayRow | null; mode: SheetMode | null; onClose: () => void; onMode: (m: SheetMode) => void }) {
    const open = !!row && !!mode;
    const { data: day, isLoading } = useAvailabilityDay(row?.config_id, row?.date);
    const action = useDayAction();
    const [limit, setLimit] = useState("");
    const [by, setBy] = useState("1");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [blocked, setBlocked] = useState<BlockingDate[]>([]);

    useEffect(() => {
        if (!open) return;
        setLimit(String(row?.daily_max ?? ""));
        setBy("1");
        setReason("");
        setError("");
        setBlocked([]);
    }, [open, mode, row?.config_id, row?.date, row?.daily_max]);

    if (!row || !mode) return null;
    const head = HEAD[mode];
    const current = day ?? row;
    const booked = current.booked;

    const submit = (body: Parameters<typeof action.mutate>[0]["body"]) => {
        setError("");
        setBlocked([]);
        action.mutate({ configId: row.config_id, date: row.date, body }, {
            onSuccess: () => onClose(),
            onError: (e) => { setError(errorMessage(e)); setBlocked(blockingDates(e)); },
        });
    };

    const newLimitNum = Number(limit);
    const increaseNum = Number(by) || 0;

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:w-[500px]">
                <SheetHeader className="border-b p-4 pr-12">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><head.Icon className="h-5 w-5" /></span>
                        <div>
                            <SheetTitle className="text-base">{mode === "events" ? `Booked Events on ${prettyDate(row.date)}` : head.title}</SheetTitle>
                            <SheetDescription>{mode === "events" ? `${booked} of ${current.daily_max} slots used.` : head.sub}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 space-y-4 p-4">
                    {/* date banner */}
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div>
                            <p className="text-lg font-bold text-foreground">{prettyDate(row.date)}</p>
                            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />{row.day} · {row.category_name}</p>
                        </div>
                        <div className="text-right">
                            <DayStatusBadge status={current.status} />
                            <p className="mt-1 text-xs text-muted-foreground">{current.balance} of {current.daily_max} slots remaining</p>
                        </div>
                    </div>

                    {isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>}

                    {mode === "view" && day && (
                        <>
                            <div className="rounded-lg border p-3">
                                <p className="mb-2 font-semibold">Configuration Details</p>
                                <InfoRow icon={<FileText />} label="Config" value={day.config_name} />
                                <InfoRow icon={<Tag />} label="Category" value={day.category_name} />
                                <InfoRow icon={<Users />} label="Organizer Scope" value="All Organizers" />
                                <InfoRow icon={<Layers />} label="Daily Max Events" value={day.daily_max} />
                                <InfoRow icon={<CalendarCheck />} label="Created Events" value={day.booked} />
                                <InfoRow icon={<Scale />} label="Balance Slots" value={day.balance} />
                                <InfoRow icon={<Activity />} label="Status" value={<DayStatusBadge status={day.status} />} />
                                {day.disabled_reason && <InfoRow icon={<PauseCircle />} label="Disabled Because" value={day.disabled_reason} />}
                                <InfoRow icon={<Clock />} label="Last Updated" value={prettyDateTime(day.last_updated)} />
                                {day.notes && <InfoRow icon={<FileText />} label="Notes" value={day.notes} />}
                            </div>
                            <EventsList events={day.events} />
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => onMode("edit")}><Pencil />Edit Limit</Button>
                                {current.status === "disabled" || row.override_mode === "full" ? (
                                    <Button variant="outline" size="sm" isLoading={action.isPending} onClick={() => submit({ action: "enable" })}><CheckCircle2 />Back to Default</Button>
                                ) : null}
                            </div>
                        </>
                    )}

                    {mode === "events" && day && <EventsList events={day.events} big />}

                    {mode === "edit" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><FieldLabel>Current Daily Max Events</FieldLabel><Input value={current.daily_max} disabled /></div>
                                <div>
                                    <FieldLabel required>New Daily Max Events</FieldLabel>
                                    <Input type="number" min={0} value={limit} onChange={(e) => setLimit(e.target.value)} />
                                </div>
                                <div><FieldLabel hint="(Already Booked)">Created Events</FieldLabel><Input value={booked} disabled /></div>
                                <div>
                                    <FieldLabel>Balance Preview</FieldLabel>
                                    <div className={`flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${newLimitNum - booked < 0 ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                                        <Scale className="h-4 w-4" />{limit === "" ? "—" : `${Math.max(0, newLimitNum - booked)} slots (${newLimitNum} – ${booked})`}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <FieldLabel>Reason / Notes</FieldLabel>
                                <Textarea rows={3} maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why the limit changes" />
                                {counter(reason, 250)}
                            </div>
                        </div>
                    )}

                    {mode === "increase" && (
                        <div className="space-y-3">
                            <div className="rounded-lg border p-3">
                                <InfoRow icon={<Layers />} label="Current Limit" value={current.daily_max} />
                                <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2.5">
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground"><PlusCircle className="h-4 w-4" />Increase By <span className="text-destructive">*</span></span>
                                    <Input type="number" min={1} value={by} onChange={(e) => setBy(e.target.value)} className="h-9 w-24 text-right" />
                                </div>
                                <InfoRow icon={<Layers />} label="New Limit" value={<span className="text-emerald-600">{current.daily_max + increaseNum}</span>} />
                                <InfoRow icon={<CalendarCheck />} label="Created Events" value={booked} />
                                <InfoRow icon={<Scale />} label="Updated Balance Preview" value={<span className="text-sky-600">{Math.max(0, current.daily_max + increaseNum - booked)}</span>} />
                            </div>
                            <div>
                                <FieldLabel required>Reason for Increase</FieldLabel>
                                <Textarea rows={3} maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Extra wedding bookings for high demand" />
                                {counter(reason, 250)}
                            </div>
                        </div>
                    )}

                    {mode === "full" && (
                        <div className="space-y-4">
                            <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                                <p><b>The selected date will stop accepting new event bookings</b> and its balance will become 0. Existing booked events will remain unchanged.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                {[["Daily Max", current.daily_max], ["Created", booked], ["Balance", current.balance]].map(([l, v]) => (
                                    <div key={l} className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v}</p></div>
                                ))}
                            </div>
                            <div className="flex justify-center text-primary"><ArrowDown className="h-5 w-5" /></div>
                            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/60 p-4">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-red-600"><XCircle className="h-4 w-4" />Fully Booked</span>
                                <span className="text-sm">Balance Slots <b className="ml-1 text-lg">0</b></span>
                            </div>
                            <div>
                                <FieldLabel hint="(Optional)">Reason / Notes</FieldLabel>
                                <Textarea rows={2} maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {mode === "disable" && (
                        <div className="space-y-4">
                            <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                                <p><b>Organizers will no longer be able to book events on this date while it is disabled.</b> Existing booked events stay. Enable it again any time.</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <InfoRow label="Current Daily Max Events" value={current.daily_max} />
                                <InfoRow label="Created Events" value={booked} />
                                <InfoRow label="Current Status" value={<DayStatusBadge status={current.status} />} />
                            </div>
                            <div>
                                <FieldLabel required>Disable Reason</FieldLabel>
                                <Textarea rows={3} maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Venue maintenance on this date" />
                                {counter(reason, 250)}
                            </div>
                        </div>
                    )}

                    <ErrorBox message={error} dates={blocked} />
                </div>

                <div className="flex justify-end gap-3 border-t p-4">
                    <Button variant="outline" onClick={onClose} disabled={action.isPending}>{mode === "view" || mode === "events" ? "Close" : "Cancel"}</Button>
                    {mode === "edit" && (
                        <Button isLoading={action.isPending} onClick={() => {
                            if (limit === "" || !Number.isInteger(newLimitNum) || newLimitNum < 0) return setError("Please enter the new daily max events.");
                            submit({ action: "limit", daily_limit: newLimitNum, reason: reason.trim() || undefined });
                        }}>{action.isPending ? "Saving..." : "Save Changes"}</Button>
                    )}
                    {mode === "increase" && (
                        <Button isLoading={action.isPending} onClick={() => {
                            if (!Number.isInteger(increaseNum) || increaseNum < 1) return setError("Please enter how many events to add.");
                            if (!reason.trim()) return setError("Please enter the reason for the increase.");
                            submit({ action: "increase", increase_by: increaseNum, reason: reason.trim() });
                        }}>{action.isPending ? "Saving..." : "Increase Limit"}</Button>
                    )}
                    {mode === "full" && (
                        <Button isLoading={action.isPending} onClick={() => submit({ action: "full", reason: reason.trim() || undefined })}>
                            {action.isPending ? "Saving..." : "Confirm & Mark Fully Booked"}
                        </Button>
                    )}
                    {mode === "disable" && (
                        <Button isLoading={action.isPending} onClick={() => {
                            if (!reason.trim()) return setError("Please enter the reason for disabling this date.");
                            submit({ action: "disable", reason: reason.trim() });
                        }}>{action.isPending ? "Saving..." : "Confirm Disable"}</Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function EventsList({ events, big }: { events: { id: number; name: string; client_name: string | null; start_time: string | null; venue_name: string | null; status: string }[]; big?: boolean }) {
    return (
        <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">Booked Events</p>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{events.length} Event{events.length === 1 ? "" : "s"}</span>
            </div>
            {!events.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No events booked on this date yet.</p>
            ) : (
                <ul className="divide-y">
                    {events.map((e, i) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                            <div className="flex items-start gap-2.5">
                                {big ? <span className="w-5 text-muted-foreground">{i + 1}</span> : <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />}
                                <div>
                                    <p className="font-medium text-foreground">{e.name}</p>
                                    <p className="text-xs text-muted-foreground">{[e.client_name, e.venue_name].filter(Boolean).join(" · ") || "—"}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="whitespace-nowrap text-xs font-medium">{prettyTime(e.start_time)}</p>
                                <p className="text-xs capitalize text-muted-foreground">{e.status === "upcoming" ? "Confirmed" : e.status}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
