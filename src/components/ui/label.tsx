'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(
            'select-none text-[12.5px] font-semibold leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
            className
        )}
        {...props}
    />
));

Label.displayName = 'Label';
