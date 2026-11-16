import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slot } from '@/lib/slot';
import { variants, type VariantProps } from '@/lib/variants';

const buttonVariants = variants(
    [
        'relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-semibold',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    ].join(' '),
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(16,24,40,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-primary/90',
                destructive:
                    'bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgba(16,24,40,0.08)] hover:bg-destructive/90 focus-visible:ring-destructive/30',
                outline:
                    'border border-border bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-foreground/20 hover:bg-muted/60',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                ghost: 'text-foreground/80 hover:bg-muted hover:text-foreground',
                link: 'h-auto px-0 text-primary underline-offset-4 hover:underline active:translate-y-0',
                'destructive-outline':
                    'border border-destructive/30 bg-destructive/5 text-destructive hover:border-destructive/60 hover:bg-destructive/10 focus-visible:ring-destructive/30',
            },
            size: {
                default: 'h-9 px-4',
                sm: 'h-8 rounded-md px-3 text-[12.5px] [&_svg]:size-3.5',
                lg: 'h-10 px-6',
                icon: 'h-9 w-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }, ref) => {
        if (asChild) {
            return (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Slot className={cn(buttonVariants({ variant, size }), className)} ref={ref as any} {...(props as any)}>
                    {children}
                </Slot>
            );
        }
        return (
            <button
                className={cn(buttonVariants({ variant, size }), className)}
                ref={ref}
                disabled={isLoading || disabled}
                aria-busy={isLoading || undefined}
                {...props}
            >
                {isLoading && <Loader2 className="animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
