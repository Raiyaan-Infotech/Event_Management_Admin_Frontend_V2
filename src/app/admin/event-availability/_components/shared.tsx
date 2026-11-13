"use client";

import { ReactNode } from "react";
import {
    AlertTriangle, ArrowDown, ArrowUp, Ban, CheckCircle2, CircleSlash, Layers, PauseCircle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEventCategories } from "@/hooks/use-menu-management";
import {
    BlockingDate, DayStatus, OverrideType, prettyDate, prettyTime,
} from "@/hooks/use-event-availability";

/* ----------------------------------------------------------- status badge -- */

const DAY_STATUS: Record<DayStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    available: { label: "Available", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
    low: { label: "Low Availability", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: AlertTriangle },
    full: { label: "Fully Booked", cls: "bg-red-50 text-red-600 border-red-200", Icon: XCircle },
    disabled: { label: "Disabled", cls: "bg-muted text-muted-foreground border-border", Icon: PauseCircle },
};

export function DayStatusBadge({ status, className }: { status: DayStatus; className?: string }) {
    const s = DAY_STATUS[status] ?? DAY_STATUS.available;
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", s.cls, className)}>
            <s.Icon className="h-3 w-3" /> {s.label}
        </span>
    );
}

const TYPE: Record<string, { label: string; cls: string; Icon: typeof ArrowUp }> = {
    increase: { label: "Increase Limit", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: ArrowUp },
    reduce: { label: "Reduce Limit", cls: "bg-red-50 text-red-600 border-red-200", Icon: ArrowDown },
    block: { label: "Block Date", cls: "bg-red-50 text-red-600 border-red-200", Icon: Ban },
    custom: { label: "Custom Limit", cls: "bg-sky-50 text-sky-700 border-sky-200", Icon: Layers },
    full: { label: "Fully Booked", cls: "bg-red-50 text-red-600 border-red-200", Icon: XCircle },
    disabled: { label: "Disabled", cls: "bg-muted text-muted-foreground border-border", Icon: PauseCircle },
};

export function OverrideTypeBadge({ type }: { type: OverrideType | string }) {
    const t = TYPE[type] ?? TYPE.custom;
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap", t.cls)}>
            <t.Icon className="h-3.5 w-3.5" /> {t.label}
        </span>
    );
}

export function ActiveBadge({ active }: { active: boolean | number }) {
    return active ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <CircleSlash className="h-3 w-3" /> Inactive
        </span>
    );
}

/* ------------------------------------------------------------- layout bits -- */

/** The compact page header the other admin pages use (e.g. Subscription Plans). */
export function ModuleHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            {action && <div className="flex shrink-0 flex-wrap items-center gap-2 [&_a]:h-8 [&_a]:text-[13px] [&_button]:h-8 [&_button]:text-[13px]">{action}</div>}
        </div>
    );
}

export function StatCard({ icon, label, value, tone = "primary" }: { icon: ReactNode; label: string; value: ReactNode; tone?: "primary" | "green" | "red" | "muted" }) {
    const tones = {
        primary: "bg-primary/10 text-primary",
        green: "bg-emerald-50 text-emerald-600",
        red: "bg-red-50 text-red-500",
        muted: "bg-muted text-muted-foreground",
    };
    return (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5", tones[tone])}>{icon}</div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold leading-tight text-foreground">{value}</p>
            </div>
        </div>
    );
}

export function SectionCard({ icon, title, action, children, className }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn("rounded-lg border bg-card p-4 shadow-sm", className)}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
                    <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export function FieldLabel({ children, required, hint }: { children: ReactNode; required?: boolean; hint?: string }) {
    return (
        <Label className="mb-1 block text-[13px] font-medium">
            {children}
            {required && <span className="text-destructive"> *</span>}
            {hint && <span className="font-normal text-muted-foreground"> {hint}</span>}
        </Label>
    );
}

/** Key/value row used in the side panels. */
export function InfoRow({ icon, label, value }: { icon?: ReactNode; label: string; value: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2 last:border-0">
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}{label}</span>
            <span className="text-right text-[13px] font-medium text-foreground">{value}</span>
        </div>
    );
}

/* ------------------------------------------------- refused: already booked -- */

/**
 * Shown when the backend refuses a limit below the booked count. Lists the events already booked
 * on each date (Jamal: "show the list of events — unable to do that").
 */
export function ErrorBox({ message, dates }: { message: string; dates?: BlockingDate[] }) {
    if (!message) return null;
    return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="flex items-start gap-2 font-medium text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
            </p>
            {!!dates?.length && (
                <div className="mt-3 space-y-3">
                    {dates.map((d) => (
                        <div key={d.date}>
                            <p className="mb-1 text-xs font-semibold text-foreground">
                                {prettyDate(d.date)} — {d.booked} booked (new limit {d.limit})
                            </p>
                            <ul className="divide-y rounded-md border bg-background">
                                {d.events.map((e) => (
                                    <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                                        <span className="font-medium text-foreground">{e.name}</span>
                                        <span className="text-muted-foreground">{[e.client_name, prettyTime(e.start_time)].filter((x) => x && x !== '—').join(' · ')}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------------------------------------------------------- category pick -- */

export function CategorySelect({ value, onChange, allowAll = true, allLabel = "All Categories", className }: {
    value: string; onChange: (v: string) => void; allowAll?: boolean; allLabel?: string; className?: string;
}) {
    const { data } = useEventCategories({ limit: 100, sort_by: "sort_order", sort_order: "ASC" });
    const cats = (data?.data ?? []) as { id: number; name: string; is_active?: boolean | number }[];
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={cn("h-9", className)}>
                <SelectValue placeholder="Choose category">
                    {value === "all" ? allLabel : (cats.find((c) => String(c.id) === value)?.name ?? "Choose category")}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {allowAll && <SelectItem value="all">{allLabel}</SelectItem>}
                {cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

export const counter = (v: string, max: number) => <p className="mt-1 text-right text-xs text-muted-foreground">{v.length} / {max}</p>;
