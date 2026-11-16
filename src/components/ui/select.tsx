'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextValue {
    disabled?: boolean;
    value?: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    onValueChange?: (value: any) => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    /** value -> the SelectItem's label, so the trigger can show text not the raw value. */
    labels: Map<string, React.ReactNode>;
}

/**
 * Walk the JSX tree for SelectItem elements and record value -> label.
 *
 * Done by inspecting children rather than having each item register itself on
 * mount, because SelectContent renders nothing while the menu is closed — the
 * items do not exist to register, and the trigger still has to show a label.
 */
function collectItemLabels(children: React.ReactNode, map: Map<string, React.ReactNode>) {
    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;

        if (child.type === SelectItem) {
            const { value, children: label } = child.props as { value: string; children: React.ReactNode };
            if (value !== undefined) map.set(String(value), label);
            return;
        }

        const nested = (child.props as { children?: React.ReactNode })?.children;
        if (nested) collectItemLabels(nested, map);
    });
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
    const context = React.useContext(SelectContext);
    if (!context) {
        throw new Error('Select components must be used inside Select');
    }
    return context;
}

export interface SelectProps {
    value?: string;
    defaultValue?: string;
    disabled?: boolean;
    onValueChange?: (value: any) => void;
    children: React.ReactNode;
}

export function Select({ value: valueProp, defaultValue, disabled, onValueChange, children }: SelectProps) {
    const [open, setOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const isControlled = valueProp !== undefined;
    const activeValue = isControlled ? valueProp : internalValue;

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const labels = React.useMemo(() => {
        const map = new Map<string, React.ReactNode>();
        collectItemLabels(children, map);
        return map;
    }, [children]);

    const handleValueChange = React.useCallback(
        (val: any) => {
            if (!isControlled) {
                setInternalValue(val);
            }
            onValueChange?.(val);
        },
        [isControlled, onValueChange]
    );

    return (
        <SelectContext.Provider value={{ value: activeValue, disabled, open, setOpen, onValueChange: handleValueChange, triggerRef, labels }}>
            <div className="relative flex w-full">{children}</div>
        </SelectContext.Provider>
    );
}

export function SelectTrigger({
    className,
    children,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { disabled, open, setOpen, triggerRef } = useSelect();

    return (
        <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn(
                'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-[13px] text-foreground outline-none transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60',
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
    );
}

export function SelectValue({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) {
    const { value, labels } = useSelect();

    // An explicit label always wins.
    if (children !== undefined && children !== null) {
        return <span className="line-clamp-1 font-medium">{children}</span>;
    }

    // Show the matching item's label rather than the raw value: `value` is
    // usually an id or a slug ("1", "pending"), and printing it was showing
    // users "1" where the option reads "Active".
    const label = value !== undefined && value !== '' ? labels.get(String(value)) : undefined;
    if (label !== undefined && label !== null && label !== '') {
        return <span className="line-clamp-1 font-medium">{label}</span>;
    }

    // No match — options may still be loading, or the value is stale. The
    // placeholder is a better answer than a bare id. Falling back to `value`
    // only when there is no placeholder keeps something visible.
    return <span className="line-clamp-1 font-medium">{placeholder ?? value}</span>;
}

export function SelectContent({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    const { open, setOpen, triggerRef } = useSelect();
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const [rect, setRect] = React.useState<DOMRect | null>(null);
    const [height, setHeight] = React.useState(0);

    React.useLayoutEffect(() => {
        if (!open) return;
        const update = () => {
            if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [open, triggerRef]);

    React.useLayoutEffect(() => {
        if (!open) { setHeight(0); return; }
        if (!contentRef.current) return;
        const h = contentRef.current.getBoundingClientRect().height;
        setHeight((prev) => (Math.abs(prev - h) < 1 ? prev : h));
    }, [open, rect, children]);

    React.useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (contentRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open, setOpen, triggerRef]);

    React.useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, setOpen]);

    if (!open || !rect || typeof document === 'undefined') return null;

    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0;
    const GUTTER = 8;

    // Flip above the trigger when there is not enough room below, so a select
    // near the bottom of a form is not clipped off-screen.
    const spaceBelow = viewportH - rect.bottom - 4;
    const spaceAbove = rect.top - 4;
    const flipUp = height > 0 && spaceBelow < height && spaceAbove > spaceBelow;

    let top = flipUp ? rect.top - 4 - height : rect.bottom + 4;
    top = Math.min(Math.max(GUTTER, top), Math.max(GUTTER, viewportH - height - GUTTER));

    // Never taller than the side it opened on.
    const maxHeight = Math.max(160, Math.min(260, (flipUp ? spaceAbove : spaceBelow) - GUTTER));

    return createPortal(
        <div
            ref={contentRef}
            style={{
                position: 'fixed',
                top,
                left: rect.left,
                minWidth: rect.width,
                maxHeight,
                zIndex: 1000,
                visibility: height ? 'visible' : 'hidden',
            }}
            className={cn(
                'overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_12px_32px_-8px_rgba(16,24,40,0.18),0_2px_6px_rgba(16,24,40,0.06)] animate-in fade-in-0 zoom-in-95 duration-150',
                className
            )}
        >
            {children}
        </div>,
        document.body
    );
}


export function SelectItem({
    value,
    disabled,
    className,
    children,
}: {
    value: string;
    disabled?: boolean;
    className?: string;
    children: React.ReactNode;
}) {
    const { setOpen, onValueChange, value: selectedValue } = useSelect();
    const isSelected = selectedValue === value;

    return (
        <button
            type="button"
            disabled={disabled}
            className={cn(
                'relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] outline-none transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
                isSelected ? 'bg-primary/10 font-medium text-primary hover:bg-primary/10' : '',
                className
            )}
            onClick={() => {
                if (!disabled) {
                    onValueChange?.(value);
                    setOpen(false);
                }
            }}
        >
            <span className="line-clamp-1">{children}</span>
            {isSelected ? <Check className="h-4 w-4 shrink-0 stroke-[2.5] text-primary" /> : null}
        </button>
    );
}

export function SelectGroup({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
}

export function SelectLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', className)}
            {...props}
        />
    );
}

export function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export function SelectScrollUpButton() {
    return null;
}

export function SelectScrollDownButton() {
    return null;
}
