'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function TooltipProvider({ children, delayDuration }: { children: React.ReactNode; delayDuration?: number }) {
    return <>{children}</>;
}

interface TooltipContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltip() {
    const context = React.useContext(TooltipContext);
    if (!context) {
        throw new Error('Tooltip components must be used within a Tooltip');
    }
    return context;
}

export interface TooltipProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    delayDuration?: number;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function Tooltip({ children, delayDuration, defaultOpen = false, open: openProp, onOpenChange, className, ...props }: TooltipProps) {
    const [openState, setOpenState] = React.useState(defaultOpen);
    const isControlled = openProp !== undefined;
    const isOpen = isControlled ? openProp : openState;

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
        <TooltipContext.Provider value={{ open: isOpen, setOpen }}>
            <div
                className={cn('relative inline-block', className)}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                {...props}
            >
                {children}
            </div>
        </TooltipContext.Provider>
    );
}

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
    asChild?: boolean;
}

export function TooltipTrigger({ children, className, asChild, ...props }: TooltipTriggerProps) {
    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<any>;
        return React.cloneElement(child, {
            ...props,
            className: cn(className, child.props.className),
        });
    }

    return (
        <div className={cn('inline-block', className)} {...props}>
            {children}
        </div>
    );
}

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
    sideOffset?: number;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
}

export function TooltipContent({ className, side = 'top', align = 'center', sideOffset = 4, children, ...props }: TooltipContentProps) {
    const { open } = useTooltip();
    if (!open) return null;

    return (
        <div
            className={cn(
                'absolute z-50 overflow-hidden rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-100',
                side === 'top' && 'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
                side === 'bottom' && 'top-full mt-1.5 left-1/2 -translate-x-1/2',
                side === 'left' && 'right-full mr-1.5 top-1/2 -translate-y-1/2',
                side === 'right' && 'left-full ml-1.5 top-1/2 -translate-y-1/2',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
