import * as React from 'react';
import { cn } from '@/lib/utils';
import { variants, type VariantProps } from '@/lib/variants';

/** Soft, tinted status pills — readable in light and dark mode, follow the theme primary. */
const badgeVariants = variants(
    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 transition-colors [&_svg]:size-3 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'border-primary/20 bg-primary/10 text-primary',
                secondary: 'border-border bg-muted text-muted-foreground',
                destructive: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
                outline: 'border-border bg-transparent text-foreground',
                success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                warning: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
