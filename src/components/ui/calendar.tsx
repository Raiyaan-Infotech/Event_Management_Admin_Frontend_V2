'use client';

/**
 * Calendar — pure React replacement for `react-day-picker` (uses only date-fns).
 *
 * - Day view with outside days, today ring, selected fill
 * - Click the caption to switch to a month grid, then a year grid
 * - Keyboard: ← → ↑ ↓ move a day/week, PageUp/PageDown change month, Enter selects
 * - `disabled(date)` plus `minDate` / `maxDate` limits
 */

import * as React from 'react';
import {
    addDays,
    addMonths,
    addYears,
    endOfMonth,
    endOfWeek,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    isToday,
    setMonth,
    setYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type View = 'days' | 'months' | 'years';

export interface CalendarProps {
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
    /** Controlled visible month. */
    month?: Date;
    onMonthChange?: (month: Date) => void;
    defaultMonth?: Date;
    disabled?: (date: Date) => boolean;
    minDate?: Date;
    maxDate?: Date;
    showOutsideDays?: boolean;
    /** 0 = Sunday, 1 = Monday. Default 0. */
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    /** Clicking the selected day again clears it. Default false. */
    allowDeselect?: boolean;
    className?: string;
}

const YEARS_PER_PAGE = 12;

export function Calendar({
    selected,
    onSelect,
    month: monthProp,
    onMonthChange,
    defaultMonth,
    disabled,
    minDate,
    maxDate,
    showOutsideDays = true,
    weekStartsOn = 0,
    allowDeselect = false,
    className,
}: CalendarProps) {
    const [innerMonth, setInnerMonth] = React.useState(() => startOfMonth(defaultMonth ?? selected ?? new Date()));
    const month = startOfMonth(monthProp ?? innerMonth);
    const [view, setView] = React.useState<View>('days');
    const [focused, setFocused] = React.useState<Date>(() => selected ?? new Date());
    const gridRef = React.useRef<HTMLDivElement>(null);

    const changeMonth = (next: Date) => {
        const m = startOfMonth(next);
        if (monthProp === undefined) setInnerMonth(m);
        onMonthChange?.(m);
    };

    const isDisabled = React.useCallback(
        (date: Date) => {
            const d = startOfDay(date);
            if (minDate && isBefore(d, startOfDay(minDate))) return true;
            if (maxDate && isAfter(d, startOfDay(maxDate))) return true;
            return disabled?.(date) ?? false;
        },
        [disabled, minDate, maxDate]
    );

    const weeks = React.useMemo(() => {
        const start = startOfWeek(startOfMonth(month), { weekStartsOn });
        const end = endOfWeek(endOfMonth(month), { weekStartsOn });
        const days: Date[] = [];
        for (let d = start; !isAfter(d, end); d = addDays(d, 1)) days.push(d);
        // Always render 6 rows so the popover height never jumps.
        while (days.length < 42) days.push(addDays(days[days.length - 1], 1));
        const rows: Date[][] = [];
        for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
        return rows;
    }, [month, weekStartsOn]);

    const weekdayLabels = React.useMemo(
        () => weeks[0].map((d) => format(d, 'EEEEEE')),
        [weeks]
    );

    const pick = (date: Date) => {
        if (isDisabled(date)) return;
        if (allowDeselect && selected && isSameDay(date, selected)) onSelect?.(undefined);
        else onSelect?.(date);
        setFocused(date);
        if (!isSameMonth(date, month)) changeMonth(date);
    };

    const moveFocus = (next: Date) => {
        setFocused(next);
        if (!isSameMonth(next, month)) changeMonth(next);
        requestAnimationFrame(() => {
            gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${format(next, 'yyyy-MM-dd')}"]`)?.focus();
        });
    };

    const onDayKeyDown = (e: React.KeyboardEvent, date: Date) => {
        const map: Record<string, () => Date> = {
            ArrowLeft: () => addDays(date, -1),
            ArrowRight: () => addDays(date, 1),
            ArrowUp: () => addDays(date, -7),
            ArrowDown: () => addDays(date, 7),
            PageUp: () => addMonths(date, -1),
            PageDown: () => addMonths(date, 1),
            Home: () => startOfWeek(date, { weekStartsOn }),
            End: () => endOfWeek(date, { weekStartsOn }),
        };
        const fn = map[e.key];
        if (fn) {
            e.preventDefault();
            moveFocus(fn());
        }
    };

    const yearPageStart = month.getFullYear() - (month.getFullYear() % YEARS_PER_PAGE);

    const navPrev = () => {
        if (view === 'days') changeMonth(addMonths(month, -1));
        else if (view === 'months') changeMonth(addYears(month, -1));
        else changeMonth(addYears(month, -YEARS_PER_PAGE));
    };
    const navNext = () => {
        if (view === 'days') changeMonth(addMonths(month, 1));
        else if (view === 'months') changeMonth(addYears(month, 1));
        else changeMonth(addYears(month, YEARS_PER_PAGE));
    };

    const caption =
        view === 'days'
            ? format(month, 'MMMM yyyy')
            : view === 'months'
              ? format(month, 'yyyy')
              : `${yearPageStart} – ${yearPageStart + YEARS_PER_PAGE - 1}`;

    const navBtn =
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

    const cellBtn = (active: boolean, current: boolean, off: boolean) =>
        cn(
            'h-10 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            active
                ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                : current
                  ? 'text-primary ring-1 ring-inset ring-primary/40 hover:bg-primary/10'
                  : 'text-foreground hover:bg-muted',
            off && 'pointer-events-none opacity-35'
        );

    return (
        <div data-slot="calendar" className={cn('w-[280px] select-none p-3', className)}>
            {/* Header */}
            <div className="mb-2 flex items-center justify-between gap-1">
                <button type="button" aria-label="Previous" onClick={navPrev} className={navBtn}>
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'days')}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-live="polite"
                >
                    {caption}
                    <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', view !== 'days' && 'rotate-180')} />
                </button>
                <button type="button" aria-label="Next" onClick={navNext} className={navBtn}>
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {view === 'days' && (
                <div ref={gridRef} role="grid" aria-label={format(month, 'MMMM yyyy')}>
                    <div role="row" className="mb-1 grid grid-cols-7">
                        {weekdayLabels.map((label, i) => (
                            <div
                                key={i}
                                role="columnheader"
                                className="flex h-8 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                    {weeks.map((week, wi) => (
                        <div role="row" key={wi} className="grid grid-cols-7 gap-0.5">
                            {week.map((date) => {
                                const outside = !isSameMonth(date, month);
                                const isSel = !!selected && isSameDay(date, selected);
                                const off = isDisabled(date);
                                const today = isToday(date);
                                const tabbable = isSameDay(date, focused) && !outside;

                                if (outside && !showOutsideDays) return <div key={date.toISOString()} className="h-9" />;

                                return (
                                    <button
                                        key={date.toISOString()}
                                        type="button"
                                        role="gridcell"
                                        data-day={format(date, 'yyyy-MM-dd')}
                                        aria-selected={isSel}
                                        aria-disabled={off}
                                        aria-label={format(date, 'EEEE, d MMMM yyyy')}
                                        tabIndex={tabbable || (!focused && today) ? 0 : -1}
                                        disabled={off}
                                        onClick={() => pick(date)}
                                        onKeyDown={(e) => onDayKeyDown(e, date)}
                                        className={cn(
                                            'relative flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                                            isSel
                                                ? 'bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90'
                                                : 'hover:bg-muted',
                                            !isSel && outside && 'text-muted-foreground/50',
                                            !isSel && today && 'font-semibold text-primary ring-1 ring-inset ring-primary/40',
                                            off && 'cursor-not-allowed text-muted-foreground/40 line-through decoration-muted-foreground/30 hover:bg-transparent'
                                        )}
                                    >
                                        {format(date, 'd')}
                                        {today && !isSel && (
                                            <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {view === 'months' && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {Array.from({ length: 12 }, (_, m) => {
                        const d = setMonth(month, m);
                        const off =
                            (!!minDate && isBefore(endOfMonth(d), startOfDay(minDate))) ||
                            (!!maxDate && isAfter(startOfMonth(d), maxDate));
                        return (
                            <button
                                key={m}
                                type="button"
                                disabled={off}
                                onClick={() => {
                                    changeMonth(d);
                                    setView('days');
                                }}
                                className={cellBtn(
                                    m === month.getMonth(),
                                    m === new Date().getMonth() && month.getFullYear() === new Date().getFullYear(),
                                    off
                                )}
                            >
                                {format(d, 'MMM')}
                            </button>
                        );
                    })}
                </div>
            )}

            {view === 'years' && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
                        const y = yearPageStart + i;
                        const off =
                            (!!minDate && y < minDate.getFullYear()) || (!!maxDate && y > maxDate.getFullYear());
                        return (
                            <button
                                key={y}
                                type="button"
                                disabled={off}
                                onClick={() => {
                                    changeMonth(setYear(month, y));
                                    setView('months');
                                }}
                                className={cellBtn(y === month.getFullYear(), y === new Date().getFullYear(), off)}
                            >
                                {y}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
