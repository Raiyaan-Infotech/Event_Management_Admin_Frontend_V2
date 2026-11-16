import * as React from 'react';
import { cn } from '@/lib/utils';
import { variants, type VariantProps } from '@/lib/variants';

const alertVariants = variants(
    'relative w-full rounded-xl border px-4 py-3.5 text-sm [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-4 [&>svg~*]:pl-7',
    {
        variants: {
            variant: {
                default: 'border-border bg-card text-foreground [&>svg]:text-muted-foreground',
                destructive: 'border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-400 [&>svg]:text-red-500',
                success: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-400 [&>svg]:text-emerald-500',
                warning: 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-400 [&>svg]:text-amber-500',
                info: 'border-primary/20 bg-primary/5 text-foreground [&>svg]:text-primary',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
    ({ className, variant, ...props }, ref) => (
        <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
    )
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-semibold leading-tight tracking-tight', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn('text-sm opacity-90 [&_p]:leading-relaxed', className)} {...props} />
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
