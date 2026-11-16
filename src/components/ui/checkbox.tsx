'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
    ({ checked = false, onCheckedChange, disabled, className, onClick, ...props }, ref) => {
        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(e);
            if (!disabled && onCheckedChange) onCheckedChange(!checked);
        };

        return (
            <button
                ref={ref}
                type="button"
                role="checkbox"
                aria-checked={checked}
                data-state={checked ? 'checked' : 'unchecked'}
                disabled={disabled}
                onClick={handleClick}
                className={cn(
                    'peer flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-[background-color,border-color,box-shadow] duration-150',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-transparent hover:border-primary/60',
                    className
                )}
                {...props}
            >
                <Check className={cn('h-3 w-3 stroke-[3.5] transition-transform duration-150', checked ? 'scale-100' : 'scale-0')} />
            </button>
        );
    }
);

Checkbox.displayName = 'Checkbox';
