'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface PopoverContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover() {
    const context = React.useContext(PopoverContext);
    if (!context) {
        throw new Error('Popover components must be used within a Popover');
    }
    return context;
}

export interface PopoverProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    modal?: boolean;
    children: React.ReactNode;
}

export function Popover({ open: openProp, defaultOpen = false, onOpenChange, children }: PopoverProps) {
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
        <PopoverContext.Provider value={{ open: isOpen, setOpen, triggerRef }}>
            <div className="relative inline-block">{children}</div>
        </PopoverContext.Provider>
    );
}

export interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

export function PopoverTrigger({ children, className, onClick, asChild, ...props }: PopoverTriggerProps) {
    const { open, setOpen, triggerRef } = usePopover();

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

export function PopoverAnchor({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
}

export function PopoverContent({ className, align = 'center', sideOffset = 4, children, ...props }: PopoverContentProps) {
    const { open, setOpen, triggerRef } = usePopover();
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const [rect, setRect] = React.useState<DOMRect | null>(null);

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

    if (!open || !rect || typeof document === 'undefined') return null;

    let leftPos = rect.left;
    if (align === 'center') {
        leftPos = rect.left + rect.width / 2 - 144;
    } else if (align === 'end') {
        leftPos = rect.right - 288;
    }

    return createPortal(
        <div
            ref={contentRef}
            style={{
                position: 'fixed',
                top: rect.bottom + sideOffset,
                left: Math.max(16, leftPos),
                zIndex: 1000,
            }}
            className={cn(
                'w-72 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-[0_12px_32px_-8px_rgba(16,24,40,0.18),0_2px_6px_rgba(16,24,40,0.06)] outline-none animate-in fade-in-0 zoom-in-95 duration-150',
                className
            )}
            {...props}
        >
            {children}
        </div>,
        document.body
    );
}
