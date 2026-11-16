'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface AlertDialogContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialog() {
    const context = React.useContext(AlertDialogContext);
    if (!context) {
        throw new Error('AlertDialog components must be used within an AlertDialog');
    }
    return context;
}

export interface AlertDialogProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

export function AlertDialog({ open: openProp, defaultOpen = false, onOpenChange, children }: AlertDialogProps) {
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

    return <AlertDialogContext.Provider value={{ open: isOpen, setOpen }}>{children}</AlertDialogContext.Provider>;
}

export interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

export function AlertDialogTrigger({ children, className, asChild, onClick, ...props }: AlertDialogTriggerProps) {
    const { setOpen } = useAlertDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        setOpen(true);
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<any>;
        return React.cloneElement(child, {
            ...props,
            onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                child.props.onClick?.(e);
                handleClick(e);
            },
            className: cn(className, child.props.className),
        });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            className={className}
            {...props}
        >
            {children}
        </button>
    );
}

export function AlertDialogPortal({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export function AlertDialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in-0 duration-150', className)}
            {...props}
        />
    );
}

export interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function AlertDialogContent({ className, children, ...props }: AlertDialogContentProps) {
    const { open } = useAlertDialog();

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in-0 duration-150" />
            <div
                role="alertdialog"
                aria-modal="true"
                className={cn(
                    'relative z-50 grid w-full max-w-lg gap-4 border border-border bg-card p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.28)] rounded-2xl text-card-foreground animate-in fade-in-0 zoom-in-95 duration-200',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

export function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn('text-lg font-semibold text-foreground', className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function AlertDialogAction({ className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { setOpen } = useAlertDialog();

    return (
        <button
            type="button"
            onClick={(e) => {
                onClick?.(e);
                setOpen(false);
            }}
            className={cn(buttonVariants(), className)}
            {...props}
        />
    );
}

export function AlertDialogCancel({ className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { setOpen } = useAlertDialog();

    return (
        <button
            type="button"
            onClick={(e) => {
                onClick?.(e);
                setOpen(false);
            }}
            className={cn(buttonVariants({ variant: 'outline' }), className)}
            {...props}
        />
    );
}
