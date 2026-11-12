"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    Activity, BarChart3, CalendarClock, CalendarDays, CheckCircle2, CircleSlash, Clock, Copy, Eye, FileText, Filter, Info,
    Layers, ListChecks, Loader2, MoreVertical, Pencil, PlusCircle, Save, Scale, Search, Trash2, User,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/common/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import {
    AvailabilityOverride, BlockingDate, OverridePayload, OverrideType, blockingDates, errorMessage, prettyDate, prettyDateTime,
    prettyRange, useAvailabilityConfigs, useAvailabilityOverride, useAvailabilityOverrides, useBulkOverrides, useCreateOverride,
    useDeleteOverride, useOverrideStatus, useUpdateOverride,
} from "@/hooks/use-event-availability";
import { ActiveBadge, ErrorBox, FieldLabel, InfoRow, OverrideTypeBadge, SectionCard, counter } from "./shared";

const TYPES: { value: OverrideType; label: string }[] = [
    { value: "custom", label: "Set Custom Limit" },
    { value: "increase", label: "Increase Limit" },
    { value: "reduce", label: "Reduce Limit" },
    { value: "block", label: "Block Date (limit 0)" },
    { value: "full", label: "Mark Fully Booked" },
    { value: "disabled", label: "Disable Date" },
];
const needsLimit = (t: OverrideType) => t === "custom" || t === "increase" || t === "reduce";

type FormState = { config_id: string; range: boolean; start_date: string; end_date: string; override_type: OverrideType; daily_limit: string; reason: string; is_active: boolean };
const emptyForm = (configId = ""): FormState => ({ config_id: configId, range: false, start_date: "", end_date: "", override_type: "custom", daily_limit: "", reason: "", is_active: true });
const fromOverride = (o: AvailabilityOverride): FormState => ({
    config_id: String(o.config_id), range: o.start_date !== o.end_date, start_date: o.start_date, end_date: o.end_date,
    // Increase / Reduce are labels worked out from the number, so editing starts as "Set Custom Limit":
    // any new number is accepted and the label follows it.
    override_type: (["increase", "reduce", "custom", "removed"].includes(o.type) ? "custom" : o.type) as OverrideType, daily_limit: o.daily_limit == null ? "" : String(o.daily_limit),
    reason: o.reason ?? "", is_active: !!o.is_active,
});

/* --------------------------------------------------------------- the form -- */

function useOverrideForm(initial: FormState, editId?: number, onSaved?: () => void) {
    const [f, setF] = useState<FormState>(initial);
    const [error, setError] = useState("");
    const [blocked, setBlocked] = useState<BlockingDate[]>([]);
    const create = useCreateOverride();
    const update = useUpdateOverride();
    useEffect(() => { setF(initial); setError(""); setBlocked([]); }, [initial]);

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => { setF((p) => ({ ...p, [k]: v })); setError(""); };
    const saving = create.isPending || update.isPending;

    const save = () => {
        setBlocked([]);
        if (!f.config_id) return setError("Please choose the availability config.");
        if (!f.start_date) return setError("Please choose the date.");
        if (f.range && !f.end_date) return setError("Please choose the end date.");
        if (f.range && f.end_date < f.start_date) return setError("The end date cannot be before the start date.");
        if (needsLimit(f.override_type) && (f.daily_limit === "" || !Number.isInteger(Number(f.daily_limit)) || Number(f.daily_limit) < 0)) {
            return setError("Please enter the daily event limit.");
        }
        if (f.override_type === "disabled" && !f.reason.trim()) return setError("Please enter the reason for disabling these dates.");
        const data: OverridePayload = {
            config_id: Number(f.config_id), start_date: f.start_date, end_date: f.range ? f.end_date : f.start_date,
            override_type: f.override_type, daily_limit: needsLimit(f.override_type) ? Number(f.daily_limit) : null,
            reason: f.reason.trim(), is_active: f.is_active,
        };
        const opts = {
            onSuccess: () => onSaved?.(),
            onError: (e: unknown) => { setError(errorMessage(e)); setBlocked(blockingDates(e)); },
        };
        if (editId) update.mutate({ id: editId, data }, opts);
        else create.mutate(data, opts);
    };
    return { f, set, save, saving, error, blocked };
}

function FormFields({ form, configs, stacked }: { form: ReturnType<typeof useOverrideForm>; configs: { id: number; name: string; category_name: string | null; start_date: string; end_date: string; daily_max: number }[]; stacked?: boolean }) {
    const { f, set } = form;
    const cfg = configs.find((c) => String(c.id) === f.config_id);
    return (
        <div className={stacked ? "space-y-4" : "grid gap-4 md:grid-cols-2"}>
            <div className={stacked ? "" : "md:col-span-2"}>
                <FieldLabel required>Availability Config</FieldLabel>
                <Select value={f.config_id} onValueChange={(v) => set("config_id", v)}>
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="Choose config">{cfg ? `${cfg.name} · ${cfg.category_name} · ${prettyRange(cfg.start_date, cfg.end_date)}` : "Choose config"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {configs.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} · {c.category_name} · {prettyRange(c.start_date, c.end_date)}</SelectItem>)}
                    </SelectContent>
                </Select>
                {cfg && <p className="mt-1 text-xs text-muted-foreground">Default limit {cfg.daily_max} / day. Dates must be inside {prettyRange(cfg.start_date, cfg.end_date)}.</p>}
            </div>
            <div>
                <FieldLabel required>Date Type</FieldLabel>
                <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
                    {[["Single Date", false], ["Date Range", true]].map(([l, v]) => (
                        <button key={String(l)} type="button" onClick={() => set("range", v as boolean)}
                            className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium ${f.range === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                            <CalendarDays className="h-4 w-4" />{l as string}
                        </button>
                    ))}
                </div>
            </div>
            <div className={f.range ? "grid grid-cols-2 gap-2" : ""}>
                <DatePicker label={f.range ? "From" : "Date"} required value={f.start_date} onChange={(v) => set("start_date", v)} />
                {f.range && <DatePicker label="To" required value={f.end_date} onChange={(v) => set("end_date", v)} />}
            </div>
            <div>
                <FieldLabel required>Override Type</FieldLabel>
                <Select value={f.override_type} onValueChange={(v) => set("override_type", v as OverrideType)}>
                    <SelectTrigger className="h-10"><SelectValue>{TYPES.find((t) => t.value === f.override_type)?.label}</SelectValue></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                <div>
                    <FieldLabel required={needsLimit(f.override_type)}>Daily Event Limit</FieldLabel>
                    <Input type="number" min={0} disabled={!needsLimit(f.override_type)} value={needsLimit(f.override_type) ? f.daily_limit : (f.override_type === "block" ? "0" : "")}
                        onChange={(e) => set("daily_limit", e.target.value)} placeholder={needsLimit(f.override_type) ? "e.g. 20" : "—"} />
                </div>
                <div>
                    <FieldLabel>Status</FieldLabel>
                    <div className="flex h-10 items-center"><Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} onText="Active" offText="Off" /></div>
                </div>
            </div>
            <div className={stacked ? "" : "md:col-span-2"}>
                <FieldLabel required={f.override_type === "disabled"} hint={f.override_type === "disabled" ? undefined : "(Optional)"}>Reason / Notes</FieldLabel>
                <Textarea rows={2} maxLength={250} value={f.reason} onChange={(e) => set("reason", e.target.value)} placeholder="e.g. Increased limit for high demand wedding bookings." />
                {counter(f.reason, 250)}
            </div>
            <div className={stacked ? "" : "md:col-span-2"}><ErrorBox message={form.error} dates={form.blocked} /></div>
        </div>
    );
}

/* ------------------------------------------------------------------ page -- */

export function OverridesContent() {
    const params = useSearchParams();
    const presetConfig = params.get("config_id") ?? "";
    const presetEdit = Number(params.get("edit")) || undefined;

    const { data: cfgData } = useAvailabilityConfigs({ limit: 100 });
    const configs = cfgData?.data ?? [];

    const [addInitial, setAddInitial] = useState<FormState>(() => emptyForm(presetConfig));
    const add = useOverrideForm(addInitial, undefined, () => setAddInitial(emptyForm(presetConfig)));

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);
    const q = useDebounce(search, 400);
    const { data, isLoading, isFetching } = useAvailabilityOverrides({
        search: q || undefined, status: status === "all" ? undefined : status, config_id: presetConfig || undefined, page, limit: 10,
    });
    const rows = data?.data ?? [];

    const [selected, setSelected] = useState<number[]>([]);
    const [viewId, setViewId] = useState<number | undefined>();
    const [editRow, setEditRow] = useState<AvailabilityOverride | null>(null);
    const [toDelete, setToDelete] = useState<AvailabilityOverride | null>(null);
    const [bulkDelete, setBulkDelete] = useState(false);
    const statusMut = useOverrideStatus();
    const del = useDeleteOverride();
    const bulk = useBulkOverrides();

    // ?edit=<id> from the config page opens that override's edit panel.
    useEffect(() => {
        if (presetEdit && rows.length && !editRow) {
            const r = rows.find((x) => x.id === presetEdit);
            if (r) setEditRow(r);
        }
    }, [presetEdit, rows, editRow]);

    const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r.id));
    const toggleAll = () => setSelected(allOnPage ? selected.filter((id) => !rows.some((r) => r.id === id)) : [...new Set([...selected, ...rows.map((r) => r.id)])]);
    const runBulk = (action: "activate" | "deactivate" | "delete") => bulk.mutate({ ids: selected, action }, {
        onSuccess: (res) => {
            setSelected([]);
            setBulkDelete(false);
            if (res.data.skipped.length) toast.warning(res.data.skipped.map((s) => s.reason).join(" "));
        },
        onError: (e) => toast.error(errorMessage(e)),
    });
    const setActive = (o: AvailabilityOverride, v: boolean) => statusMut.mutate({ id: o.id, is_active: v }, { onError: (e) => toast.error(errorMessage(e)) });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Special Limits Override"
                description="Set custom event booking limits for specific dates (e.g., festivals, high-demand days, or special occasions)."
                icon={<CalendarClock className="h-5 w-5" />}
                action={<Button variant="outline" asChild><Link href="/admin/event-availability"><CalendarDays />Daily Booking</Link></Button>}
            />

            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                    <p className="mb-3 flex items-center gap-2 text-lg font-semibold"><Info className="h-5 w-5 text-primary" />What is Special Limits Override?</p>
                    <p className="border-b border-primary/10 pb-4 text-sm">It allows you to set a different daily event limit for specific date(s) instead of the default limit.</p>
                    <p className="mb-2 mt-4 font-semibold text-primary">Use Cases:</p>
                    <ul className="space-y-2 text-sm">
                        {["Increase limits for high-demand dates (e.g., wedding season, holidays).", "Reduce limits for maintenance or resource constraints.",
                            "Block a date completely (set limit to 0) if no events are allowed."].map((t) => (
                            <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t}</li>
                        ))}
                    </ul>
                    <p className="mt-4 text-xs text-muted-foreground">A limit can never go below the events already booked. To stop new bookings and keep them, use Mark Fully Booked or Disable Date.</p>
                </div>

                <SectionCard icon={<PlusCircle />} title="Add Special Limit Override">
                    {!configs.length ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">Create an availability config first. <Link href="/admin/event-availability/create" className="font-medium text-primary hover:underline">Create Config</Link></p>
                    ) : (
                        <>
                            <FormFields form={add} configs={configs} />
                            <div className="mt-4 flex justify-end gap-3">
                                <Button variant="outline" disabled={add.saving} onClick={() => setAddInitial(emptyForm(presetConfig))}>Cancel</Button>
                                <Button isLoading={add.saving} onClick={add.save}>{!add.saving && <Save />}{add.saving ? "Saving..." : "Save Override"}</Button>
                            </div>
                        </>
                    )}
                </SectionCard>
            </div>

            <SectionCard icon={<ListChecks />} title="Special Limits Override List" action={
                <div className="flex flex-wrap items-center gap-2">
                    {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-10 pl-9" placeholder="Search by date, reason, or status..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                        <SelectTrigger className="h-10 w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue>{{ all: "All Statuses", active: "Active", inactive: "Inactive" }[status]}</SelectValue></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            }>
                {presetConfig && (
                    <p className="mb-3 text-sm text-muted-foreground">
                        Showing overrides of one config. <Link href="/admin/event-availability/overrides" className="font-medium text-primary hover:underline">Show all</Link>
                    </p>
                )}
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                            <tr>
                                <th className="w-10 px-4 py-3"><Checkbox checked={allOnPage} onCheckedChange={toggleAll} aria-label="Select all" /></th>
                                {["#", "Date / Date Range", "Type", "Default Limit", "Override Limit", "Booked", "Balance", "Status", "Reason / Notes", "Actions"].map((h) => (
                                    <th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={11} className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading overrides…</td></tr>
                            ) : !rows.length ? (
                                <tr><td colSpan={11} className="py-16 text-center text-muted-foreground">No overrides yet.</td></tr>
                            ) : rows.map((o, i) => (
                                <tr key={o.id} className="border-t hover:bg-muted/20">
                                    <td className="px-4 py-3"><Checkbox checked={selected.includes(o.id)} onCheckedChange={(v) => setSelected(v ? [...selected, o.id] : selected.filter((x) => x !== o.id))} aria-label={`Select ${o.code}`} /></td>
                                    <td className="px-4 py-3">{(page - 1) * 10 + i + 1}</td>
                                    <td className="whitespace-nowrap px-4 py-3 font-medium">{prettyRange(o.start_date, o.end_date)}<p className="text-xs font-normal text-muted-foreground">{o.category_name}</p></td>
                                    <td className="px-4 py-3"><OverrideTypeBadge type={o.type} /></td>
                                    <td className="px-4 py-3 text-center">{o.default_limit}</td>
                                    <td className="px-4 py-3 text-center font-bold">{o.override_limit ?? "—"}</td>
                                    <td className="px-4 py-3 text-center">{o.booked}</td>
                                    <td className="px-4 py-3 text-center">{o.balance}</td>
                                    <td className="px-4 py-3"><ActiveBadge active={o.is_active} /></td>
                                    <td className="max-w-[220px] px-4 py-3 text-xs">{o.reason || "—"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View details" onClick={() => setViewId(o.id)}><Eye /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit override" onClick={() => setEditRow(o)}><Pencil /></Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" aria-label="More actions"><MoreVertical /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => setViewId(o.id)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setEditRow(o)}><Pencil className="mr-2 h-4 w-4" />Edit Override</DropdownMenuItem>
                                                    {o.is_active ? (
                                                        <DropdownMenuItem onClick={() => setActive(o, false)}><CircleSlash className="mr-2 h-4 w-4" />Deactivate</DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => setActive(o, true)}><CheckCircle2 className="mr-2 h-4 w-4" />Activate</DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => setToDelete(o)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-sm"><Checkbox checked={allOnPage} onCheckedChange={toggleAll} />Select All</label>
                        <Button variant="outline" size="sm" disabled={!selected.length || bulk.isPending} onClick={() => runBulk("activate")}><CheckCircle2 />Activate</Button>
                        <Button variant="outline" size="sm" disabled={!selected.length || bulk.isPending} onClick={() => runBulk("deactivate")}><CircleSlash />Deactivate</Button>
                        <Button variant="destructive-outline" size="sm" disabled={!selected.length || bulk.isPending} onClick={() => setBulkDelete(true)}><Trash2 />Delete</Button>
                        {!!selected.length && <span className="text-xs text-muted-foreground">{selected.length} selected</span>}
                    </div>
                    {data && data.pagination.total > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Showing {(page - 1) * 10 + 1} – {Math.min(page * 10, data.pagination.total)} of {data.pagination.total}</span>
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                        </div>
                    )}
                </div>
            </SectionCard>

            <DetailsSheet id={viewId} onClose={() => setViewId(undefined)} onEdit={(o) => { setViewId(undefined); setEditRow(o); }} />
            <EditSheet row={editRow} configs={configs} onClose={() => setEditRow(null)} />

            <DeleteDialog
                open={!!toDelete}
                onOpenChange={(v) => !v && setToDelete(null)}
                title="Delete Override"
                description={toDelete ? `Deleting this override removes the special limit rule for ${prettyRange(toDelete.start_date, toDelete.end_date)} and reverts those dates to the default configuration (${toDelete.default_limit} / day).` : ""}
                isDeleting={del.isPending}
                onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => { setToDelete(null); setSelected(selected.filter((x) => x !== toDelete.id)); }, onError: (e) => toast.error(errorMessage(e)) })}
            />
            <DeleteDialog
                open={bulkDelete}
                onOpenChange={setBulkDelete}
                title="Delete Overrides"
                description={`Delete ${selected.length} selected override${selected.length === 1 ? "" : "s"}? Those dates go back to the default configuration.`}
                isDeleting={bulk.isPending}
                onConfirm={() => runBulk("delete")}
            />
        </div>
    );
}

/* ------------------------------------------------------------ side panels -- */

function DetailsSheet({ id, onClose, onEdit }: { id?: number; onClose: () => void; onEdit: (o: AvailabilityOverride) => void }) {
    const { data: o, isLoading } = useAvailabilityOverride(id);
    return (
        <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:w-[500px]">
                <SheetHeader className="border-b p-5 pr-12">
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-5 w-5" /></span>
                        <div><SheetTitle className="text-xl">Override Details</SheetTitle><SheetDescription>View the complete information for this special limit override.</SheetDescription></div>
                    </div>
                </SheetHeader>
                <div className="flex-1 space-y-5 p-5">
                    {isLoading || !o ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
                    ) : (
                        <>
                            <div className={`flex items-center justify-between rounded-xl border p-3 ${o.is_active ? "border-emerald-200 bg-emerald-50" : "bg-muted"}`}>
                                <ActiveBadge active={o.is_active} />
                                <span className="flex items-center gap-1.5 text-xs">Override ID: {o.code}
                                    <button type="button" aria-label="Copy override ID" onClick={() => { navigator.clipboard?.writeText(o.code); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" /></button>
                                </span>
                            </div>
                            <div className="rounded-xl border p-4">
                                <InfoRow icon={<CalendarDays />} label="Date / Date Range" value={prettyRange(o.start_date, o.end_date)} />
                                <InfoRow icon={<FileText />} label="Config" value={`${o.config_name} · ${o.category_name}`} />
                                <InfoRow icon={<Layers />} label="Type" value={<OverrideTypeBadge type={o.type} />} />
                                <InfoRow icon={<CalendarDays />} label="Default Limit" value={o.default_limit} />
                                <InfoRow icon={<CalendarDays />} label="Override Limit" value={o.override_limit ?? "—"} />
                                <InfoRow icon={<User />} label="Booked" value={o.booked} />
                                <InfoRow icon={<Scale />} label="Balance" value={o.balance} />
                                <InfoRow icon={<Activity />} label="Status" value={<ActiveBadge active={o.is_active} />} />
                                <InfoRow icon={<FileText />} label="Reason / Notes" value={o.reason || "—"} />
                            </div>
                            {o.override_limit !== null && (
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                                    <p className="mb-3 flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4 text-primary" />Impact Summary</p>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div><p className="text-xs text-muted-foreground">Limit Change</p><p className={`text-xl font-bold ${o.override_limit - o.default_limit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{o.override_limit - o.default_limit >= 0 ? "+" : ""}{o.override_limit - o.default_limit}</p><p className="text-xs text-muted-foreground">({o.default_limit} → {o.override_limit})</p></div>
                                        <div><p className="text-xs text-muted-foreground">Capacity Change</p><p className="text-xl font-bold">{o.default_limit ? `${Math.round(((o.override_limit - o.default_limit) / o.default_limit) * 100)}%` : "—"}</p></div>
                                        <div><p className="text-xs text-muted-foreground">Current Utilization</p><p className="text-xl font-bold">{o.utilization ?? 0}%</p><p className="text-xs text-muted-foreground">({o.booked} of {o.override_limit})</p></div>
                                    </div>
                                </div>
                            )}
                            <div className="rounded-xl border p-4">
                                <p className="mb-2 flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-primary" />Audit Information</p>
                                <InfoRow icon={<User />} label="Created By" value={o.created_by_name || "—"} />
                                <InfoRow icon={<CalendarDays />} label="Created On" value={prettyDateTime(o.created_at)} />
                                <InfoRow icon={<Pencil />} label="Last Updated" value={prettyDateTime(o.updated_at)} />
                            </div>
                        </>
                    )}
                </div>
                <div className="flex justify-end gap-3 border-t p-4">
                    {o && <Button variant="outline" onClick={() => onEdit(o)}><Pencil />Edit Override</Button>}
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function EditSheet({ row, configs, onClose }: { row: AvailabilityOverride | null; configs: Parameters<typeof FormFields>[0]["configs"]; onClose: () => void }) {
    const [initial, setInitial] = useState<FormState>(emptyForm());
    useEffect(() => { if (row) setInitial(fromOverride(row)); }, [row]);
    const form = useOverrideForm(initial, row?.id, onClose);
    return (
        <Sheet open={!!row} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:w-[500px]">
                <SheetHeader className="border-b p-5 pr-12">
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Pencil className="h-5 w-5" /></span>
                        <div><SheetTitle className="text-xl">Edit Special Limit Override</SheetTitle><SheetDescription>Update the override limit, date, status, or reason for this entry.</SheetDescription></div>
                    </div>
                </SheetHeader>
                <div className="flex-1 p-5">{row && <FormFields form={form} configs={configs} stacked />}</div>
                <div className="flex justify-end gap-3 border-t p-4">
                    <Button variant="outline" disabled={form.saving} onClick={onClose}>Cancel</Button>
                    <Button isLoading={form.saving} onClick={form.save}>{!form.saving && <Save />}{form.saving ? "Saving..." : "Save Changes"}</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
