import * as React from 'react';
import { cn } from '@/lib/utils';
import { fieldClasses } from '@/components/ui/input';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
    return <textarea className={cn(fieldClasses, 'flex min-h-[88px] px-3 py-2.5 leading-relaxed', className)} ref={ref} {...props} />;
});
Textarea.displayName = 'Textarea';

export { Textarea };
