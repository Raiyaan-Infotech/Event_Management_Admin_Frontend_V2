/**
 * toast — pure TypeScript replacement for `sonner` (zero dependencies).
 *
 * Same call API as sonner, so existing code works unchanged:
 *   toast('Saved')                         toast.success('Saved')
 *   toast.error('Failed', { description }) toast.info / toast.warning / toast.message
 *   const id = toast.loading('Uploading…'); toast.success('Done', { id })   // updates in place
 *   toast.dismiss(id) / toast.dismiss()    toast.promise(p, { loading, success, error })
 *
 * Toasts raised before <Toaster> mounts are queued and shown once it mounts,
 * so a toast fired from a mount effect is never dropped.
 */

import type { ReactNode } from 'react';

export type ToastType = 'default' | 'success' | 'error' | 'info' | 'warning' | 'loading';
export type ToastId = string | number;

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastOptions {
    /** Reuse an id to update an existing toast (e.g. loading → success). */
    id?: ToastId;
    description?: ReactNode;
    /** Milliseconds before auto-dismiss. `Infinity` keeps it open. */
    duration?: number;
    action?: ToastAction;
    /** Show the close (×) button. Default true. */
    dismissible?: boolean;
    onDismiss?: (id: ToastId) => void;
}

export interface ToastItem {
    id: ToastId;
    type: ToastType;
    title: ReactNode;
    description?: ReactNode;
    duration: number;
    action?: ToastAction;
    dismissible: boolean;
    onDismiss?: (id: ToastId) => void;
    /** Bumped on every update so the timer/progress restarts. */
    version: number;
    /** Set when dismissed — the Toaster plays the exit animation, then removes it. */
    leaving: boolean;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
    default: 4000,
    success: 4000,
    info: 4000,
    warning: 5000,
    error: 5000,
    loading: Infinity,
};

const MAX_TOASTS = 5;

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let counter = 0;
const listeners = new Set<Listener>();

function emit() {
    const snapshot = [...toasts];
    listeners.forEach((l) => l(snapshot));
}

function create(type: ToastType, title: ReactNode, options: ToastOptions = {}): ToastId {
    const id = options.id ?? `toast-${++counter}`;
    const existing = toasts.find((t) => t.id === id);

    const next: ToastItem = {
        id,
        type,
        title,
        description: options.description,
        duration: options.duration ?? DEFAULT_DURATION[type],
        action: options.action,
        dismissible: options.dismissible ?? true,
        onDismiss: options.onDismiss,
        version: (existing?.version ?? 0) + 1,
        leaving: false,
    };

    if (existing) {
        toasts = toasts.map((t) => (t.id === id ? next : t));
    } else {
        toasts = [...toasts, next];
        // Keep the stack short: mark the oldest visible ones as leaving.
        const visible = toasts.filter((t) => !t.leaving);
        if (visible.length > MAX_TOASTS) {
            const drop = new Set(visible.slice(0, visible.length - MAX_TOASTS).map((t) => t.id));
            toasts = toasts.map((t) => (drop.has(t.id) ? { ...t, leaving: true } : t));
        }
    }

    emit();
    return id;
}

function dismiss(id?: ToastId) {
    toasts = toasts.map((t) => {
        if (id !== undefined && t.id !== id) return t;
        if (!t.leaving) t.onDismiss?.(t.id);
        return { ...t, leaving: true };
    });
    emit();
}

/** Internal — called by <Toaster> once the exit animation finishes. */
function remove(id: ToastId) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
}

function subscribe(listener: Listener) {
    listeners.add(listener);
    listener([...toasts]);
    return () => {
        listeners.delete(listener);
    };
}

interface PromiseMessages<T> {
    loading: ReactNode;
    success: ReactNode | ((data: T) => ReactNode);
    error: ReactNode | ((err: unknown) => ReactNode);
}

function promise<T>(p: Promise<T> | (() => Promise<T>), msgs: PromiseMessages<T>, options: ToastOptions = {}) {
    const id = create('loading', msgs.loading, options);
    const run = typeof p === 'function' ? p() : p;
    run.then(
        (data) => {
            const msg = typeof msgs.success === 'function' ? (msgs.success as (d: T) => ReactNode)(data) : msgs.success;
            create('success', msg, { ...options, id });
        },
        (err) => {
            const msg = typeof msgs.error === 'function' ? (msgs.error as (e: unknown) => ReactNode)(err) : msgs.error;
            create('error', msg, { ...options, id });
        }
    );
    return id;
}

type ToastFn = ((title: ReactNode, options?: ToastOptions) => ToastId) & {
    success: (title: ReactNode, options?: ToastOptions) => ToastId;
    error: (title: ReactNode, options?: ToastOptions) => ToastId;
    info: (title: ReactNode, options?: ToastOptions) => ToastId;
    warning: (title: ReactNode, options?: ToastOptions) => ToastId;
    loading: (title: ReactNode, options?: ToastOptions) => ToastId;
    message: (title: ReactNode, options?: ToastOptions) => ToastId;
    promise: typeof promise;
    dismiss: (id?: ToastId) => void;
};

export const toast: ToastFn = Object.assign((title: ReactNode, options?: ToastOptions) => create('default', title, options), {
    success: (title: ReactNode, options?: ToastOptions) => create('success', title, options),
    error: (title: ReactNode, options?: ToastOptions) => create('error', title, options),
    info: (title: ReactNode, options?: ToastOptions) => create('info', title, options),
    warning: (title: ReactNode, options?: ToastOptions) => create('warning', title, options),
    loading: (title: ReactNode, options?: ToastOptions) => create('loading', title, options),
    message: (title: ReactNode, options?: ToastOptions) => create('default', title, options),
    promise,
    dismiss,
});

/** Internal store used by <Toaster>. */
export const toastStore = { subscribe, remove, dismiss };
