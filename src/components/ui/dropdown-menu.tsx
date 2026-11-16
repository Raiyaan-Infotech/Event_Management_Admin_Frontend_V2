'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownMenuContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
    const context = React.useContext(DropdownMenuContext);
    if (!context) {
        throw new Error('DropdownMenu components must be used within a DropdownMenu');
    }
    return context;
}

export interface DropdownMenuProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

export function DropdownMenu({ open: openProp, defaultOpen = false, onOpenChange, children }: DropdownMenuProps) {
    const [openState, setOpenState] = React.useState(defaultOpen);
    const isControlled = openProp !== undefined;
    const isOpen = isControlled ? openProp : openState;
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const setOpen = React.useCallback(
        (val: boolean) => {
            if (!isControlled) {
                setOpenState(val);
            }
            onOpenChange?.(val);
        },
        [isControlled, onOpenChange]
    );

    return (
        <DropdownMenuContext.Provider value={{ open: isOpen, setOpen, triggerRef }}>
            <div className="relative inline-block text-left">{children}</div>
        </DropdownMenuContext.Provider>
    );
}

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

export function DropdownMenuTrigger({ children, className, onClick, asChild, ...props }: DropdownMenuTriggerProps) {
    const { open, setOpen, triggerRef } = useDropdownMenu();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        setOpen(!open);
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<any>;
        return React.cloneElement(child, {
            ...props,
            ref: triggerRef,
            'aria-expanded': open,
            onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                child.props.onClick?.(e);
                handleClick(e);
            },
            className: cn(className, child.props.className),
        });
    }

    return (
        <button
            ref={triggerRef}
            type="button"
            aria-expanded={open}
            onClick={handleClick}
            className={className}
            {...props}
        >
            {children}
        </button>
    );
}

export function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export function DropdownMenuGroup({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={className} {...props}>{children}</div>;
}

export function DropdownMenuSub({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
}

export function DropdownMenuRadioGroup({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
}

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
}

export function DropdownMenuContent({ className, align = 'end', sideOffset = 4, children, ...props }: DropdownMenuContentProps) {
    const { open, setOpen, triggerRef } = useDropdownMenu();
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const [rect, setRect] = React.useState<DOMRect | null>(null);
    // Measured after the menu paints. Until it is known the menu stays hidden,
    // otherwise it would flash at the unflipped position first.
    const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);

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

    // Reset the measurement each time it opens — the item list can differ
    // between openings (disabled rows, Activate vs Deactivate).
    React.useLayoutEffect(() => {
        if (!open) setSize(null);
    }, [open]);

    React.useLayoutEffect(() => {
        if (!open || !contentRef.current) return;
        const box = contentRef.current.getBoundingClientRect();
        setSize((prev) =>
            prev && Math.abs(prev.h - box.height) < 1 && Math.abs(prev.w - box.width) < 1
                ? prev
                : { w: box.width, h: box.height }
        );
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

    // Close on Escape, which a keyboard user expects from any menu.
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
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 0;
    const GUTTER = 8;

    const contentW = size?.w ?? 192;
    const contentH = size?.h ?? 0;

    // Horizontal: align to the trigger, then clamp so it never leaves the viewport.
    let left = rect.left;
    if (align === 'end') left = rect.right - contentW;
    else if (align === 'center') left = rect.left + rect.width / 2 - contentW / 2;
    left = Math.min(Math.max(GUTTER, left), Math.max(GUTTER, viewportW - contentW - GUTTER));

    // Vertical: flip above the trigger when there is not enough room below —
    // this is what was cutting the menu off on the last rows of a table.
    const spaceBelow = viewportH - rect.bottom - sideOffset;
    const spaceAbove = rect.top - sideOffset;
    const flipUp = contentH > 0 && spaceBelow < contentH && spaceAbove > spaceBelow;

    let top = flipUp ? rect.top - sideOffset - contentH : rect.bottom + sideOffset;
    top = Math.min(Math.max(GUTTER, top), Math.max(GUTTER, viewportH - contentH - GUTTER));

    // Last resort: a menu taller than the viewport scrolls inside itself rather
    // than overflowing off-screen.
    const maxHeight = Math.max(120, viewportH - 2 * GUTTER);

    return createPortal(
        <div
            ref={contentRef}
            style={{
                position: 'fixed',
                top,
                left,
                zIndex: 1000,
                maxHeight,
                overflowY: contentH > maxHeight ? 'auto' : undefined,
                visibility: size ? 'visible' : 'hidden',
            }}
            className={cn(
                'min-w-[10rem] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_12px_32px_-8px_rgba(16,24,40,0.18),0_2px_6px_rgba(16,24,40,0.06)] animate-in fade-in-0 zoom-in-95 duration-150',
                className
            )}
            {...props}
        >
            {children}
        </div>,
        document.body
    );
}


export type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    inset?: boolean;
    asChild?: boolean;
};

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
    ({ className, inset, onClick, asChild, children, ...props }, ref) => {
        const { setOpen } = useDropdownMenu();

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(e);
            setOpen(false);
        };

        if (asChild && React.isValidElement(children)) {
            const child = children as React.ReactElement<any>;
            return React.cloneElement(child, {
                ...props,
                ref,
                onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                    child.props.onClick?.(e);
                    handleClick(e);
                },
                className: cn(
                    'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
                    inset && 'pl-8',
                    className,
                    child.props.className
                ),
            });
        }

        return (
            <button
                ref={ref}
                type="button"
                className={cn(
                    'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
                    inset && 'pl-8',
                    className
                )}
                onClick={handleClick}
                {...props}
            >
                {children}
            </button>
        );
    }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export function DropdownMenuSubTrigger({ className, inset, children, asChild, ...props }: DropdownMenuItemProps) {
    return (
        <button
            type="button"
            className={cn(
                'flex w-full cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none hover:bg-muted',
                inset && 'pl-8',
                className
            )}
            {...props}
        >
            {children}
            <ChevronRight className="ml-auto h-4 w-4" />
        </button>
    );
}

export function DropdownMenuSubContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('p-1 border border-border bg-popover rounded-xl shadow-[0_12px_32px_-8px_rgba(16,24,40,0.18),0_2px_6px_rgba(16,24,40,0.06)]', className)} {...props} />;
}

export function DropdownMenuCheckboxItem({
    className,
    children,
    checked,
    asChild,
    onClick,
    ...props
}: DropdownMenuItemProps & { checked?: boolean }) {
    const { setOpen } = useDropdownMenu();

    return (
        <button
            type="button"
            className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2.5 text-sm outline-none transition-colors hover:bg-muted',
                className
            )}
            onClick={(e) => {
                onClick?.(e);
                setOpen(false);
            }}
            {...props}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {checked ? <Check className="h-4 w-4 text-primary" /> : null}
            </span>
            {children}
        </button>
    );
}

export function DropdownMenuRadioItem({ className, children, asChild, ...props }: DropdownMenuItemProps) {
    const { setOpen } = useDropdownMenu();

    return (
        <button
            type="button"
            className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2.5 text-sm outline-none transition-colors hover:bg-muted',
                className
            )}
            onClick={(e) => {
                props.onClick?.(e);
                setOpen(false);
            }}
            {...props}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                <Circle className="h-2 w-2 fill-primary text-primary" />
            </span>
            {children}
        </button>
    );
}

export function DropdownMenuLabel({ className, inset, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
    return <div className={cn('px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', inset && 'pl-8', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
    return <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />;
}
