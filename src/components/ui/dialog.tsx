'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
    const context = React.useContext(DialogContext);
    if (!context) {
        throw new Error('Dialog components must be used within a Dialog');
    }
    return context;
}

export interface DialogProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

export function Dialog({ open: openProp, defaultOpen = false, onOpenChange, children }: DialogProps) {
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

    return <DialogContext.Provider value={{ open: isOpen, setOpen }}>{children}</DialogContext.Provider>;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

export function DialogTrigger({ children, className, asChild, onClick, ...props }: DialogTriggerProps) {
    const { setOpen } = useDialog();

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

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

export function DialogClose({ children, className, asChild, onClick, ...props }: DialogCloseProps) {
    const { setOpen } = useDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        setOpen(false);
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

export function DialogPortal({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in-0 duration-150', className)}
            {...props}
        />
    );
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    onOpenAutoFocus?: (e: any) => void;
    onKeyDown?: (e: any) => void;
}

export function DialogContent({ className, children, onOpenAutoFocus, onKeyDown, ...props }: DialogContentProps) {
    const { open, setOpen } = useDialog();
    const contentRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, setOpen]);

    if (!open || typeof document === 'undefined') return null;

    // Dialogs that set their own padding keep their custom layout.
    const isDefaultPad = !/(^|\s)p[xytb]?-/.test(className || '');

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
                onClick={() => setOpen(false)}
            />

            <div
                ref={contentRef}
                role="dialog"
                aria-modal="true"
                // Header/footer become full-width bars only for the standard p-6 layout;
                // dialogs that set their own padding keep their custom look.
                data-pad={isDefaultPad ? 'default' : 'custom'}
                onKeyDown={onKeyDown}
                className={cn(
                    'ui-dialog relative z-50 w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.28)] text-card-foreground animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200',
                    className
                )}
                {...props}
            >
                {/* Standard layout: close button floats top-right and stays pinned while the body scrolls */}
                {isDefaultPad && (
                    <div className="sticky top-0 z-20 -mr-2 flex h-0 justify-end">{closeButton('-mt-1')}</div>
                )}
                {children}
                {!isDefaultPad && closeButton('absolute right-4 top-4')}
            </div>
        </div>,
        document.body
    );

    function closeButton(position: string) {
        return (
            <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(position, 'z-20 grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30')}
            >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </button>
        );
    }
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('ui-dialog-header flex flex-col gap-0.5 pr-8 text-left mb-4', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('ui-dialog-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-6', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn('text-[16px] font-bold leading-tight text-foreground', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('text-[12.5px] leading-snug text-muted-foreground', className)} {...props} />;
}
