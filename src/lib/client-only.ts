"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** true in the browser, false while server-rendering (no hydration mismatch, no setState in an effect). */
export function useMounted(): boolean {
    return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const subscribeToHistory = (onChange: () => void) => {
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
};

/** A URL query value without useSearchParams (no Suspense boundary needed). undefined while server-rendering. */
export function useQueryParam(name: string): string | null | undefined {
    return useSyncExternalStore(
        subscribeToHistory,
        () => new URLSearchParams(window.location.search).get(name),
        () => undefined,
    );
}
