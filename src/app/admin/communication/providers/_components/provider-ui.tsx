'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Shared building blocks for the provider settings pages (MSG91, WhatsApp), in the style of the 20261125 designs. */

export const LANG_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'ta', label: 'Tamil' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ml', label: 'Malayalam' },
    { value: 'te', label: 'Telugu' },
    { value: 'kn', label: 'Kannada' },
];

/** Light-blue band with a title, then the content (mockup "Provider Details", "Key Configuration"…). */
export function Section({ title, hint, action, children, className }: {
    title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
    return (
        <section className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950', className)}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-sky-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-sky-950/30">
                <div>
                    <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                    {hint && <p className="text-xs text-slate-500">{hint}</p>}
                </div>
                {action}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

export function Field({ label, required, hint, info, children, className }: {
    label: string; required?: boolean; hint?: string; info?: string; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label className="flex items-center gap-1 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                {label}
                {required && <span className="text-rose-500">*</span>}
                {info && (
                    <span title={info} className="cursor-help text-slate-400"><Info className="h-3.5 w-3.5" /></span>
                )}
            </label>
            {children}
            {hint && <p className="text-[11.5px] leading-snug text-slate-500">{hint}</p>}
        </div>
    );
}

const inputBase =
    'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => <input ref={ref} className={cn(inputBase, className)} {...props} />,
);
TextInput.displayName = 'TextInput';

export function NumberInput({ value, onChange, min, max, suffix, className }: {
    value: number; onChange: (n: number) => void; min?: number; max?: number; suffix?: string; className?: string;
}) {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <input
                type="number"
                className={cn(inputBase, suffix && "w-24 shrink-0")}
                value={Number.isFinite(value) ? value : ''}
                min={min}
                max={max}
                onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
            />
            {suffix && <span className="shrink-0 text-[12.5px] text-slate-500">{suffix}</span>}
        </div>
    );
}

export function SelectInput({ value, onChange, options, className, disabled, placeholder }: {
    value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
    className?: string; disabled?: boolean; placeholder?: string;
}) {
    return (
        <select className={cn(inputBase, 'pr-8', className)} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={cn(inputBase, 'h-auto min-h-[64px] py-2', props.className)} />;
}

/** Green pill toggle used across the designs. */
export function Toggle({ checked, onChange, disabled, label }: {
    checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50',
                checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700',
            )}
        >
            <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
        </button>
    );
}

/** Toggle + title + one-line explanation (mockup "Request Delivery Report (DLR)"). */
export function ToggleRow({ checked, onChange, title, hint, disabled }: {
    checked: boolean; onChange: (v: boolean) => void; title: string; hint?: string; disabled?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
            <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</div>
                {hint && <div className="text-[11.5px] leading-snug text-slate-500">{hint}</div>}
            </div>
        </div>
    );
}

export function Check({ checked, onChange, label, disabled }: {
    checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
    return (
        <label className={cn('inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300', disabled && 'cursor-not-allowed opacity-60')}>
            <input type="checkbox" className="h-4 w-4 accent-sky-600" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}

export function Radio({ checked, onChange, title, hint, name }: {
    checked: boolean; onChange: () => void; title: string; hint?: string; name: string;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-2.5">
            <input type="radio" name={name} className="mt-0.5 h-4 w-4 accent-sky-600" checked={checked} onChange={onChange} />
            <span>
                <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">{title}</span>
                {hint && <span className="block text-[11.5px] text-slate-500">{hint}</span>}
            </span>
        </label>
    );
}

const PILL_TONES = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
    red: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900',
    gray: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};
export type PillTone = keyof typeof PILL_TONES;

export function Pill({ tone = 'gray', children, className }: { tone?: PillTone; children: React.ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset', PILL_TONES[tone], className)}>
            {children}
        </span>
    );
}

export function InfoNote({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'amber' }) {
    return (
        <div className={cn(
            'flex gap-2 rounded-lg px-3 py-2.5 text-[12px] leading-relaxed',
            tone === 'blue' ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
        )}>
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{children}</div>
        </div>
    );
}

/** Right-column card (mockup "Provider Health", "Account & Balance"…). */
export function SideCard({ icon: Icon, title, action, children }: {
    icon: React.ComponentType<{ className?: string }>; title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-sky-600" />
                    <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

export const grid2 = 'grid grid-cols-1 gap-4 md:grid-cols-2';
export const grid3 = 'grid grid-cols-1 gap-4 md:grid-cols-3';
export const grid4 = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4';

export const formatDateTime = (v?: string | null) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};
