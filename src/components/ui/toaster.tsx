'use client';

/**
 * Toaster — renders toasts raised with `toast` from `@/lib/toast`.
 * Pure React, no dependencies. Mounted once in the root layout.
 *
 * Design: theme-aware card, tinted status icon, title + description,
 * optional action button, close button, and a progress bar that pauses
 * while the pointer is over the stack.
 */

import * as React from 'react';
import { CheckCircle2, Info, Loader2, TriangleAlert, X, XCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastStore, type ToastItem, type ToastType } from '@/lib/toast';

const TYPE_STYLES: Record<ToastType, { icon: React.ElementType; tint: string; bar: string }> = {
    default: { icon: Bell, tint: 'bg-primary/10 text-primary', bar: 'bg-primary' },
    success: { icon: CheckCircle2, tint: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
    error: { icon: XCircle, tint: 'bg-red-500/15 text-red-600 dark:text-red-400', bar: 'bg-red-500' },
    warning: { icon: TriangleAlert, tint: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
    info: { icon: Info, tint: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', bar: 'bg-sky-500' },
    loading: { icon: Loader2, tint: 'bg-primary/10 text-primary', bar: 'bg-primary' },
};

function ToastCard({ item, paused }: { item: ToastItem; paused: boolean }) {
    const { icon: Icon, tint, bar } = TYPE_STYLES[item.type];
    const timed = Number.isFinite(item.duration) && item.type !== 'loading';

    return (
        <div
            role={item.type === 'error' ? 'alert' : 'status'}
            aria-live={item.type === 'error' ? 'assertive' : 'polite'}
            onAnimationEnd={(e) => {
                if (item.leaving && e.target === e.currentTarget) toastStore.remove(item.id);
            }}
            className={cn(
                'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 pr-10 text-card-foreground shadow-lg shadow-black/5 ring-1 ring-black/[0.02] dark:shadow-black/40',
                item.leaving
                    ? 'animate-out fade-out-0 slide-out-to-right-full duration-200 fill-mode-forwards'
                    : 'animate-in fade-in-0 slide-in-from-right-full duration-300'
            )}
        >
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', tint)}>
                <Icon className={cn('h-5 w-5', item.type === 'loading' && 'animate-spin')} />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-sm font-semibold leading-snug break-words">{item.title}</div>
                {item.description && (
                    <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground break-words">{item.description}</div>
                )}
                {item.action && (
                    <button
                        type="button"
                        onClick={() => {
                            item.action?.onClick();
                            toastStore.dismiss(item.id);
                        }}
                        className="mt-2.5 inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        {item.action.label}
                    </button>
                )}
            </div>

            {item.dismissible && (
                <button
                    type="button"
                    aria-label="Close notification"
                    onClick={() => toastStore.dismiss(item.id)}
                    className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <X className="h-4 w-4" />
                </button>
            )}

            {timed && !item.leaving && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-muted/60">
                    <span
                        // key restarts the countdown whenever the toast is updated
                        key={item.version}
                        className={cn('block h-full origin-left', bar)}
                        style={{
                            animation: `toast-progress ${item.duration}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running',
                        }}
                        onAnimationEnd={(e) => {
                            e.stopPropagation();
                            toastStore.dismiss(item.id);
                        }}
                    />
                </span>
            )}
        </div>
    );
}

export function Toaster() {
    const [items, setItems] = React.useState<ToastItem[]>([]);
    const [paused, setPaused] = React.useState(false);

    React.useEffect(() => toastStore.subscribe(setItems), []);

    // Esc closes the newest toast.
    React.useEffect(() => {
        if (!items.length) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            const last = [...items].reverse().find((t) => !t.leaving);
            if (last) toastStore.dismiss(last.id);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [items]);

    return (
        <section
            aria-label="Notifications"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="pointer-events-none fixed left-4 right-4 top-4 z-[100] flex flex-col gap-2.5 sm:left-auto sm:w-[380px]"
        >
            {items.map((item) => (
                <ToastCard key={item.id} item={item} paused={paused} />
            ))}
        </section>
    );
}
