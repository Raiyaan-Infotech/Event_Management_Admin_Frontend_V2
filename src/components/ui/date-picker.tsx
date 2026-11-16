"use client";

import * as React from "react";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  label?: string;
  /** ISO date string `yyyy-MM-dd`. */
  value?: string;
  onChange: (val: string) => void;
  required?: boolean;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  /** Year range: how many years back from current year */
  yearRangeStart?: number;
  /** Year range: how many years forward from current year */
  yearRangeEnd?: number;
}

export function DatePicker({
  label,
  value,
  onChange,
  required,
  error,
  minDate,
  maxDate,
  placeholder = "DD-MM-YYYY",
  disabled,
  yearRangeStart = 80,
  yearRangeEnd = 10,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  const [month, setMonth] = React.useState<Date>(selected ?? new Date());

  // Jump to the selected month each time the picker opens.
  React.useEffect(() => {
    if (open) setMonth(selected ?? new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Combine the explicit limits with the allowed year range.
  const currentYear = new Date().getFullYear();
  const rangeMin = new Date(currentYear - yearRangeStart, 0, 1);
  const rangeMax = new Date(currentYear + yearRangeEnd, 11, 31);
  const effectiveMin = minDate && minDate > rangeMin ? minDate : rangeMin;
  const effectiveMax = maxDate && maxDate < rangeMax ? maxDate : rangeMax;

  const today = startOfDay(new Date());
  const todayAllowed = today >= startOfDay(effectiveMin) && today <= startOfDay(effectiveMax);

  const commit = (date: Date | undefined) => {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[12.5px] font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-invalid={!!error}
            className={cn(
              "group flex h-9 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-left text-[13px] transition-colors",
              "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50",
              open && "border-primary ring-2 ring-primary/20",
              error && "border-destructive focus-visible:ring-destructive/40"
            )}
          >
            <CalendarIcon className={cn("h-4 w-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("flex-1 truncate", !selected && "text-muted-foreground")}>
              {selected ? format(selected, "dd MMM yyyy") : placeholder}
            </span>
            {selected && !disabled && !required && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear date"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden rounded-xl p-0 shadow-xl" align="start">
          <Calendar
            selected={selected}
            onSelect={commit}
            month={month}
            onMonthChange={setMonth}
            minDate={effectiveMin}
            maxDate={effectiveMax}
          />
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2">
            <button
              type="button"
              onClick={() => commit(undefined)}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={!todayAllowed}
              onClick={() => commit(today)}
              className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-40"
            >
              Today
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
