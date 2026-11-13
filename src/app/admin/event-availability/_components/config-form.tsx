"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    CalendarClock, CalendarDays, CalendarRange, ClipboardList, Info, Layers, Pencil, Rocket, Save, Settings,
    SlidersHorizontal, Sparkles, Tag, Users, X,
} from "lucide-react";
import { PageLoader } from "@/components/common/page-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { useEventCategories } from "@/hooks/use-menu-management";
import {
    AvailabilityConfig, BlockingDate, ConfigPayload, blockingDates, daysInclusive, errorMessage, prettyDate, prettyRange,
    useAvailabilityConfig, useAvailabilityOverrides, useCreateConfig, useUpdateConfig,
} from "@/hooks/use-event-availability";
import { ActiveBadge, CategorySelect, ErrorBox, FieldLabel, InfoRow, OverrideTypeBadge, SectionCard, counter, ModuleHeader } from "./shared";

const EMPTY: ConfigPayload = {
    name: "", event_category_id: null, start_date: "", end_date: "", daily_max: "",
    allow_single_date: true, allow_multi_date: true, auto_full: true, block_weekends: false, exclude_holidays: false,
    holidays: [], notes: "", is_active: true, publish_status: "draft",
};

const fromConfig = (c: AvailabilityConfig): ConfigPayload => ({
    name: c.name, event_category_id: c.event_category_id, start_date: c.start_date, end_date: c.end_date, daily_max: c.daily_max,
    allow_single_date: !!c.allow_single_date, allow_multi_date: !!c.allow_multi_date, auto_full: !!c.auto_full,
    block_weekends: !!c.block_weekends, exclude_holidays: !!c.exclude_holidays, holidays: c.holidays ?? [],
    notes: c.notes ?? "", is_active: !!c.is_active, publish_status: c.publish_status,
});

/** Days in the range left after weekends / holidays are taken out (the summary's estimate). */
const openDays = (f: ConfigPayload) => {
    const n = daysInclusive(f.start_date, f.end_date);
    if (!n) return 0;
    let open = 0;
    for (let i = 0; i < n; i++) {
        const d = new Date(Date.parse(`${f.start_date}T00:00:00Z`) + i * 86400000);
        const iso = d.toISOString().slice(0, 10);
        if (f.block_weekends && [0, 6].includes(d.getUTCDay())) continue;
        if (f.exclude_holidays && f.holidays.includes(iso)) continue;
        open++;
    }
    return open;
};

function ToggleRow({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint: string }) {
    return (
        <label className="flex items-center gap-2.5" title={hint}>
            <Switch checked={checked} onCheckedChange={onChange} onText="ON" offText="OFF" />
            <span className="text-[13px] font-medium">{label}</span>
            <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label={hint} />
        </label>
    );
}

export function ConfigForm({ id }: { id?: number }) {
    const router = useRouter();
    const editing = !!id;
    const { data: existing, isLoading } = useAvailabilityConfig(id);
    const { data: overrides } = useAvailabilityOverrides({ config_id: id, limit: 50 });
    const { data: catData } = useEventCategories({ limit: 100 });
    const create = useCreateConfig();
    const update = useUpdateConfig();

    const [f, setF] = useState<ConfigPayload>(EMPTY);
    const [holiday, setHoliday] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState("");
    const [blocked, setBlocked] = useState<BlockingDate[]>([]);
    const [saving, setSaving] = useState<"draft" | "published" | null>(null);

    useEffect(() => { if (existing) setF(fromConfig(existing)); }, [existing]);

    const set = <K extends keyof ConfigPayload>(k: K, v: ConfigPayload[K]) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };
    const catName = f.event_category_id == null ? "All Categories" : ((catData?.data ?? []) as { id: number; name: string }[]).find((c) => c.id === f.event_category_id)?.name ?? "—";
    const totalDays = daysInclusive(f.start_date, f.end_date);
    const open = openDays(f);
    const max = Number(f.daily_max) || 0;
    const configOverrides = editing ? (overrides?.data ?? []) : [];

    const validate = () => {
        const e: Record<string, string> = {};
        if (!f.name.trim()) e.name = "Please enter the config name.";
        if (!f.start_date) e.start_date = "Please choose the start date.";
        if (!f.end_date) e.end_date = "Please choose the end date.";
        if (f.start_date && f.end_date && f.end_date < f.start_date) e.end_date = "The end date cannot be before the start date.";
        if (!Number.isInteger(Number(f.daily_max)) || Number(f.daily_max) < 1) e.daily_max = "Please enter the daily max events (1 or more).";
        if (!f.allow_single_date && !f.allow_multi_date) e.booking = "Allow single date booking, multiple date booking, or both.";
        if (f.exclude_holidays && !f.holidays.length) e.holidays = "Add the public holiday dates, or switch Exclude Public Holidays off.";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const save = (publish_status: "draft" | "published") => {
        setServerError("");
        setBlocked([]);
        if (!validate()) return;
        setSaving(publish_status);
        const data = { ...f, publish_status, daily_max: Number(f.daily_max), notes: f.notes.trim() };
        const done = { onSettled: () => setSaving(null), onError: (e: unknown) => { setServerError(errorMessage(e)); setBlocked(blockingDates(e)); } };
        if (editing) update.mutate({ id: id!, data }, { ...done, onSuccess: () => router.push("/admin/event-availability/configs") });
        else create.mutate(data, { ...done, onSuccess: () => router.push("/admin/event-availability/configs") });
    };

    if (editing && isLoading) return <PageLoader open text="Loading..." />;

    const err = (k: string) => errors[k] ? <p className="mt-1 text-xs font-medium text-destructive">{errors[k]}</p> : null;

    return (
        <div className="space-y-4 [&_input]:text-[13px] [&_textarea]:text-[13px] [&_button[role=combobox]]:text-[13px]">
            <PageLoader open={!!saving} text={saving === "published" ? "Publishing..." : "Saving..."} />
            <ModuleHeader
                title={editing ? "Edit Event Availability Configuration" : "Create Event Availability Configuration"}
                description="Set daily event booking limits and availability rules for organizer event creation."
            />

            <div className="grid gap-4 xl:grid-cols-[1fr_300px] xl:items-start">
                <div className="space-y-4">
                    <SectionCard icon={<Settings />} title="1. Basic Configuration">
                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-[1.4fr_1fr_1fr_auto]">
                            <div>
                                <FieldLabel required>Config Name</FieldLabel>
                                <Input maxLength={120} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. November Wedding Availability" />
                                {err("name")}
                            </div>
                            <div>
                                <FieldLabel required>Event Category</FieldLabel>
                                <CategorySelect value={f.event_category_id == null ? "all" : String(f.event_category_id)} onChange={(v) => set("event_category_id", v === "all" ? null : Number(v))} />
                            </div>
                            <div>
                                <FieldLabel required>Applies To</FieldLabel>
                                <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md border bg-muted/30 px-3 text-[13px]"><Users className="h-4 w-4 shrink-0 text-muted-foreground" />All Organizers</div>
                            </div>
                            <div>
                                <FieldLabel>Status</FieldLabel>
                                <div className="flex h-9 items-center gap-2"><Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} onText="ON" offText="OFF" /><span className="text-[13px] text-muted-foreground">{f.is_active ? "Active" : "Inactive"}</span></div>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard icon={<CalendarDays />} title="2. Availability Rules">
                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                            <div>
                                <FieldLabel required>Configuration Type</FieldLabel>
                                <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md border bg-muted/30 px-3 text-[13px]"><Layers className="h-4 w-4 shrink-0 text-muted-foreground" />Daily Limit</div>
                            </div>
                            <div>
                                <FieldLabel required>Start Date</FieldLabel>
                                <div className="[&_button]:w-full [&>div]:w-full"><DatePicker value={f.start_date} onChange={(v) => set("start_date", v)} /></div>
                                {err("start_date")}
                            </div>
                            <div>
                                <FieldLabel required>End Date</FieldLabel>
                                <div className="[&_button]:w-full [&>div]:w-full"><DatePicker value={f.end_date} onChange={(v) => set("end_date", v)} /></div>
                                {err("end_date")}
                            </div>
                            <div>
                                <FieldLabel required>Daily Max Events</FieldLabel>
                                <Input type="number" min={1} value={f.daily_max} onChange={(e) => set("daily_max", e.target.value)} placeholder="e.g. 10" />
                                {err("daily_max")}
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                            <ToggleRow label="Allow Single Date Booking" checked={f.allow_single_date} onChange={(v) => set("allow_single_date", v)} hint="Organizers may create a one-day event." />
                            <ToggleRow label="Allow Multiple Date Booking" checked={f.allow_multi_date} onChange={(v) => set("allow_multi_date", v)} hint="Organizers may create an event over several days. It takes one slot on every day." />
                            <ToggleRow label="Auto Mark Fully Booked when balance reaches 0" checked={f.auto_full} onChange={(v) => set("auto_full", v)} hint="The date shows Fully Booked when no slots are left." />
                        </div>
                        {err("booking")}
                    </SectionCard>

                    <SectionCard icon={<SlidersHorizontal />} title="3. Optional Rules">
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                            <ToggleRow label="Block Weekends" checked={f.block_weekends} onChange={(v) => set("block_weekends", v)} hint="No events on Saturdays and Sundays." />
                            <ToggleRow label="Exclude Public Holidays" checked={f.exclude_holidays} onChange={(v) => set("exclude_holidays", v)} hint="No events on the holiday dates you add." />
                            {editing ? (
                                <Button variant="outline" className="border-primary/40 text-primary" asChild>
                                    <Link href={`/admin/event-availability/overrides?config_id=${id}`}><CalendarClock />Special Limit Override</Link>
                                </Button>
                            ) : (
                                <span className="text-xs text-muted-foreground">Save the config first, then add Special Limit Overrides.</span>
                            )}
                        </div>

                        {f.exclude_holidays && (
                            <div className="mt-4 rounded-lg border bg-muted/20 p-4">
                                <p className="mb-2 text-sm font-medium">Public Holiday Dates</p>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="w-56"><DatePicker value={holiday} onChange={setHoliday} placeholder="Pick a date" /></div>
                                    <Button variant="outline" onClick={() => {
                                        if (!holiday) return;
                                        if (f.start_date && f.end_date && (holiday < f.start_date || holiday > f.end_date)) {
                                            setErrors((e) => ({ ...e, holidays: "Holiday dates must be inside the date range." }));
                                            return;
                                        }
                                        set("holidays", [...new Set([...f.holidays, holiday])].sort());
                                        setHoliday("");
                                    }}>Add Holiday</Button>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {f.holidays.map((h) => (
                                        <span key={h} className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs">
                                            {prettyDate(h)}
                                            <button type="button" onClick={() => set("holidays", f.holidays.filter((x) => x !== h))} aria-label={`Remove ${h}`}><X className="h-3 w-3" /></button>
                                        </span>
                                    ))}
                                    {!f.holidays.length && <span className="text-xs text-muted-foreground">No holiday dates added yet.</span>}
                                </div>
                                {err("holidays")}
                            </div>
                        )}

                        <div className="mt-4">
                            <FieldLabel>Notes</FieldLabel>
                            <Textarea rows={2} maxLength={500} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal note for reference" />
                            {counter(f.notes, 500)}
                        </div>
                    </SectionCard>

                    <SectionCard icon={<CalendarRange />} title="4. Special Date Overrides">
                        {!editing ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">Overrides for this config show here after it is saved.</p>
                        ) : !configOverrides.length ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No special dates yet. Use <b>Special Limit Override</b> to raise, lower or block a date.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-[13px]">
                                    <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                                        <tr>{["Date", "Type", "Max Events", "Booked", "Balance", "Status", ""].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {configOverrides.map((o) => (
                                            <tr key={o.id} className="border-t">
                                                <td className="whitespace-nowrap px-3 py-2 font-medium">{prettyRange(o.start_date, o.end_date)}</td>
                                                <td className="px-3 py-2"><OverrideTypeBadge type={o.type} /></td>
                                                <td className="px-3 py-2">{o.override_limit ?? "—"}</td>
                                                <td className="px-3 py-2">{o.booked}</td>
                                                <td className="px-3 py-2">{o.balance}</td>
                                                <td className="px-3 py-2"><ActiveBadge active={o.is_active} /></td>
                                                <td className="px-3 py-2 text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label="Edit override">
                                                        <Link href={`/admin/event-availability/overrides?config_id=${id}&edit=${o.id}`}><Pencil /></Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>

                    <ErrorBox message={serverError} dates={blocked} />

                    <div className="flex flex-wrap justify-end gap-3">
                        <Button variant="outline" onClick={() => router.push("/admin/event-availability/configs")} disabled={!!saving}>Cancel</Button>
                        <Button variant="outline" className="border-primary/40 text-primary" isLoading={saving === "draft"} disabled={!!saving} onClick={() => save("draft")}>
                            {saving !== "draft" && <Save />}{saving === "draft" ? "Saving..." : "Save Draft"}
                        </Button>
                        <Button isLoading={saving === "published"} disabled={!!saving} onClick={() => save("published")}>
                            {saving !== "published" && <Rocket />}{saving === "published" ? "Publishing..." : "Save & Publish"}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 xl:sticky xl:top-6">
                    <SectionCard icon={<ClipboardList />} title="Configuration Summary" className="border-primary/20">
                        <InfoRow icon={<Users />} label="Scope" value="All Organizers" />
                        <InfoRow icon={<Tag />} label="Event Category" value={catName} />
                        <InfoRow icon={<CalendarDays />} label="Active Period" value={f.start_date && f.end_date ? prettyRange(f.start_date, f.end_date) : "—"} />
                        <InfoRow icon={<Layers />} label="Default Daily Limit" value={max ? `${max} Events / Day` : "—"} />
                        <InfoRow icon={<CalendarClock />} label="Overrides Configured" value={editing ? `${existing?.override_count ?? 0} ${existing?.override_count === 1 ? "Date" : "Dates"}` : "0 Dates"} />
                        <InfoRow icon={<CalendarRange />} label="Total Days" value={totalDays ? `${totalDays} Days` : "—"} />
                        <InfoRow icon={<CalendarDays />} label="Open Days" value={totalDays ? `${open} Days` : "—"} />
                        <InfoRow icon={<Sparkles />} label="Estimated Total Capacity" value={max && open ? <span>{max * open} Events<br /><span className="text-xs font-normal text-muted-foreground">({max} × {open} days)</span></span> : "—"} />
                        {editing && existing && (
                            <>
                                <InfoRow label="Events Booked" value={existing.total_booked ?? 0} />
                                <InfoRow label="Available Days" value={existing.available_days ?? 0} />
                                <InfoRow label="Status" value={<span className="capitalize">{existing.publish_status}{existing.is_active ? "" : " · inactive"}</span>} />
                            </>
                        )}
                    </SectionCard>

                    <SectionCard icon={<Info />} title="How It Works?" className="bg-sky-50/40">
                        <ol className="space-y-2 text-[13px]">
                            {[
                                "Super Admin sets the event availability rules (daily limit, date range, category).",
                                "Organizers see only available dates and the balance count while creating an event.",
                                "When the daily limit is reached, the date shows as \"Fully Booked\" and event creation is blocked.",
                                "Dates outside every published config are not open: organizers are asked to contact admin.",
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white">{i + 1}</span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ol>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
