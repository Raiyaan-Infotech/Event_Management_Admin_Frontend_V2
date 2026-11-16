'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
    value?: string;
    onValueChange?: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error('Tabs components must be used within a Tabs container');
    return context;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
}

export function Tabs({ value: valueProp, defaultValue, onValueChange, className, children, ...props }: TabsProps) {
    const [valueState, setValueState] = React.useState(defaultValue || '');
    const isControlled = valueProp !== undefined;
    const activeValue = isControlled ? valueProp : valueState;

    const handleValueChange = React.useCallback(
        (val: string) => {
            if (!isControlled) setValueState(val);
            onValueChange?.(val);
        },
        [isControlled, onValueChange]
    );

    const ctx = React.useMemo(() => ({ value: activeValue, onValueChange: handleValueChange }), [activeValue, handleValueChange]);

    return (
        <TabsContext.Provider value={ctx}>
            <div className={cn('w-full', className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export function TabsList({ className, onKeyDown, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    // ← / → / Home / End move between tabs.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
        const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
        if (index < 0) return;
        let next = -1;
        if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next >= 0) {
            e.preventDefault();
            tabs[next].focus();
            tabs[next].click();
        }
    };

    return (
        <div
            role="tablist"
            onKeyDown={handleKeyDown}
            className={cn(
                'inline-flex h-10 items-center justify-center gap-0.5 rounded-lg border border-border/60 bg-muted/60 p-1 text-muted-foreground',
                className
            )}
            {...props}
        />
    );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
}

export function TabsTrigger({ value, className, children, onClick, ...props }: TabsTriggerProps) {
    const { value: activeValue, onValueChange } = useTabs();
    const isActive = activeValue === value;

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            data-state={isActive ? 'active' : 'inactive'}
            onClick={(e) => {
                onClick?.(e);
                onValueChange?.(value);
            }}
            className={cn(
                'inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-[color,background-color,box-shadow] duration-150',
                'hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
                'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
                'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgba(16,24,40,0.08),0_0_0_1px_rgba(16,24,40,0.04)]',
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
    const { value: activeValue } = useTabs();
    if (activeValue !== value) return null;

    return (
        <div
            role="tabpanel"
            tabIndex={0}
            className={cn('mt-3 animate-in fade-in-0 duration-200 focus-visible:outline-none', className)}
            {...props}
        >
            {children}
        </div>
    );
}
