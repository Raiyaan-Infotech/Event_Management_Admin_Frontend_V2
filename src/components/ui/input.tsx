import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Shared field styling — also used by Textarea and Select triggers. */
export const fieldClasses = cn(
    'w-full rounded-md border border-input bg-card text-[13px] text-foreground',
    'transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70',
    'hover:border-foreground/20',
    'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15',
    'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/15',
    'disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60'
);

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                fieldClasses,
                'flex h-9 px-3 py-1.5',
                'file:mr-3 file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = 'Input';

export { Input };
