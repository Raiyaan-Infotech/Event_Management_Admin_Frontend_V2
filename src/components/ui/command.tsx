'use client';

/**
 * Command — pure React replacement for `cmdk` (zero dependencies, no Radix).
 *
 * Supports: built-in search filtering (value + keywords + item text),
 * CommandEmpty when nothing matches, groups that hide when empty,
 * keyboard navigation (↑ / ↓ / Home / End / Enter) and mouse hover selection.
 * The `cmdk-*` attributes are kept so existing className selectors still work.
 */

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, type DialogProps } from '@/components/ui/dialog';

/* ------------------------------------------------------------------ */
/* Visibility registry — tracks which item ids currently match search  */
/* ------------------------------------------------------------------ */

interface Registry {
    setVisible: (id: string, visible: boolean) => void;
    remove: (id: string) => void;
    visibleCount: number;
}

function useRegistry(): Registry {
    const map = React.useRef(new Map<string, boolean>());
    const [visibleCount, setVisibleCount] = React.useState(0);

    const recount = React.useCallback(() => {
        let n = 0;
        map.current.forEach((v) => {
            if (v) n++;
        });
        setVisibleCount(n);
    }, []);

    const setVisible = React.useCallback(
        (id: string, visible: boolean) => {
            if (map.current.get(id) === visible) return;
            map.current.set(id, visible);
            recount();
        },
        [recount]
    );

    const remove = React.useCallback(
        (id: string) => {
            if (!map.current.delete(id)) return;
            recount();
        },
        [recount]
    );

    return React.useMemo(() => ({ setVisible, remove, visibleCount }), [setVisible, remove, visibleCount]);
}

/* ------------------------------------------------------------------ */
/* Contexts                                                            */
/* ------------------------------------------------------------------ */

interface CommandContextValue {
    search: string;
    setSearch: (value: string) => void;
    shouldFilter: boolean;
    filter: (value: string, search: string, keywords?: string[]) => boolean;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    registry: Registry;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);
const GroupRegistryContext = React.createContext<Registry | null>(null);

function useCommand() {
    const ctx = React.useContext(CommandContext);
    if (!ctx) throw new Error('Command components must be used inside <Command>');
    return ctx;
}

function defaultFilter(value: string, search: string, keywords?: string[]) {
    const haystack = [value, ...(keywords ?? [])].join(' ').toLowerCase();
    return search
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .every((word) => haystack.includes(word));
}

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
    return (node: T | null) => {
        refs.forEach((ref) => {
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
        });
    };
}

const ITEM_SELECTOR = '[cmdk-item]:not([hidden]):not([data-disabled="true"])';

/* ------------------------------------------------------------------ */
/* Command (root)                                                      */
/* ------------------------------------------------------------------ */

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Set false to disable built-in filtering (e.g. server-side search). */
    shouldFilter?: boolean;
    /** Custom filter; return true when the item should be shown. */
    filter?: (value: string, search: string, keywords?: string[]) => boolean;
    /** Controlled search text. */
    search?: string;
    onSearchChange?: (value: string) => void;
}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
    (
        { className, shouldFilter = true, filter = defaultFilter, search: searchProp, onSearchChange, onKeyDown, children, ...props },
        ref
    ) => {
        const rootRef = React.useRef<HTMLDivElement>(null);
        const [innerSearch, setInnerSearch] = React.useState('');
        const [selectedId, setSelectedId] = React.useState<string | null>(null);
        const registry = useRegistry();

        const search = searchProp ?? innerSearch;
        const setSearch = React.useCallback(
            (value: string) => {
                if (searchProp === undefined) setInnerSearch(value);
                onSearchChange?.(value);
            },
            [searchProp, onSearchChange]
        );

        const getItems = React.useCallback(
            () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []),
            []
        );

        const select = React.useCallback((el: HTMLElement | undefined) => {
            if (!el) return;
            setSelectedId(el.getAttribute('data-id'));
            el.scrollIntoView({ block: 'nearest' });
        }, []);

        // Highlight the first visible item whenever the search or the set of visible items changes.
        React.useEffect(() => {
            const items = getItems();
            const current = items.find((el) => el.getAttribute('data-id') === selectedId);
            if (!current) setSelectedId(items[0]?.getAttribute('data-id') ?? null);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [search, registry.visibleCount]);

        const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
            onKeyDown?.(e);
            if (e.defaultPrevented) return;

            const items = getItems();
            if (!items.length) return;
            const index = items.findIndex((el) => el.getAttribute('data-id') === selectedId);

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    select(items[index < 0 ? 0 : Math.min(index + 1, items.length - 1)]);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    select(items[index < 0 ? 0 : Math.max(index - 1, 0)]);
                    break;
                case 'Home':
                    e.preventDefault();
                    select(items[0]);
                    break;
                case 'End':
                    e.preventDefault();
                    select(items[items.length - 1]);
                    break;
                case 'Enter':
                    if (index >= 0 && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        items[index].click();
                    }
                    break;
            }
        };

        const ctx = React.useMemo<CommandContextValue>(
            () => ({ search, setSearch, shouldFilter, filter, selectedId, setSelectedId, registry }),
            [search, setSearch, shouldFilter, filter, selectedId, registry]
        );

        return (
            <CommandContext.Provider value={ctx}>
                <div
                    ref={mergeRefs(ref, rootRef)}
                    cmdk-root=""
                    onKeyDown={handleKeyDown}
                    className={cn(
                        'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
                        className
                    )}
                    {...props}
                >
                    {children}
                </div>
            </CommandContext.Provider>
        );
    }
);
Command.displayName = 'Command';

/* ------------------------------------------------------------------ */
/* CommandDialog                                                       */
/* ------------------------------------------------------------------ */

const CommandDialog = ({ children, ...props }: DialogProps) => {
    return (
        <Dialog {...props}>
            <DialogContent className="overflow-hidden p-0">
                <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
                    {children}
                </Command>
            </DialogContent>
        </Dialog>
    );
};

/* ------------------------------------------------------------------ */
/* CommandInput                                                        */
/* ------------------------------------------------------------------ */

interface CommandInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    value?: string;
    onValueChange?: (value: string) => void;
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
    ({ className, value, onValueChange, ...props }, ref) => {
        const { search, setSearch } = useCommand();

        // Keep the root search in sync when the input is controlled from outside.
        React.useEffect(() => {
            if (value !== undefined && value !== search) setSearch(value);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [value]);

        return (
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                    ref={ref}
                    cmdk-input=""
                    type="text"
                    role="combobox"
                    aria-expanded
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={value ?? search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        onValueChange?.(e.target.value);
                    }}
                    className={cn(
                        'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);
CommandInput.displayName = 'CommandInput';

/* ------------------------------------------------------------------ */
/* CommandList                                                         */
/* ------------------------------------------------------------------ */

const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            cmdk-list=""
            role="listbox"
            className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
            {...props}
        />
    )
);
CommandList.displayName = 'CommandList';

/* ------------------------------------------------------------------ */
/* CommandEmpty                                                        */
/* ------------------------------------------------------------------ */

const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        const { registry } = useCommand();
        if (registry.visibleCount > 0) return null;
        return <div ref={ref} cmdk-empty="" role="presentation" className={cn('py-6 text-center text-sm', className)} {...props} />;
    }
);
CommandEmpty.displayName = 'CommandEmpty';

/* ------------------------------------------------------------------ */
/* CommandGroup                                                        */
/* ------------------------------------------------------------------ */

interface CommandGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'heading'> {
    heading?: React.ReactNode;
}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
    ({ className, heading, children, ...props }, ref) => {
        const groupRegistry = useRegistry();
        const headingId = React.useId();

        return (
            <GroupRegistryContext.Provider value={groupRegistry}>
                <div
                    ref={ref}
                    cmdk-group=""
                    role="presentation"
                    hidden={groupRegistry.visibleCount === 0 ? true : undefined}
                    className={cn(
                        'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
                        className
                    )}
                    {...props}
                >
                    {heading && (
                        <div cmdk-group-heading="" id={headingId} aria-hidden>
                            {heading}
                        </div>
                    )}
                    <div cmdk-group-items="" role="group" aria-labelledby={heading ? headingId : undefined}>
                        {children}
                    </div>
                </div>
            </GroupRegistryContext.Provider>
        );
    }
);
CommandGroup.displayName = 'CommandGroup';

/* ------------------------------------------------------------------ */
/* CommandSeparator                                                    */
/* ------------------------------------------------------------------ */

const CommandSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        const { search } = useCommand();
        if (search) return null;
        return <div ref={ref} cmdk-separator="" role="separator" className={cn('-mx-1 h-px bg-border', className)} {...props} />;
    }
);
CommandSeparator.displayName = 'CommandSeparator';

/* ------------------------------------------------------------------ */
/* CommandItem                                                         */
/* ------------------------------------------------------------------ */

interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
    value?: string;
    keywords?: string[];
    disabled?: boolean;
    onSelect?: (value: string) => void;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
    ({ className, value, keywords, disabled, onSelect, onClick, onPointerMove, children, ...props }, ref) => {
        const { search, shouldFilter, filter, selectedId, setSelectedId, registry } = useCommand();
        const groupRegistry = React.useContext(GroupRegistryContext);
        const id = React.useId();
        const innerRef = React.useRef<HTMLDivElement>(null);
        const [text, setText] = React.useState('');

        // Read the rendered text so items without `value` can still be searched.
        React.useLayoutEffect(() => {
            setText(innerRef.current?.textContent?.trim() ?? '');
        }, [children]);

        const itemValue = (value ?? text).trim();
        const visible = !shouldFilter || !search.trim() || filter(itemValue, search, keywords);

        React.useEffect(() => {
            registry.setVisible(id, visible);
            groupRegistry?.setVisible(id, visible);
        }, [id, visible, registry, groupRegistry]);

        React.useEffect(
            () => () => {
                registry.remove(id);
                groupRegistry?.remove(id);
            },
            [id, registry, groupRegistry]
        );

        const selected = selectedId === id;

        return (
            <div
                ref={mergeRefs(ref, innerRef)}
                cmdk-item=""
                role="option"
                data-id={id}
                data-value={itemValue}
                aria-selected={selected}
                aria-disabled={disabled}
                data-selected={selected}
                data-disabled={!!disabled}
                hidden={visible ? undefined : true}
                onPointerMove={(e) => {
                    onPointerMove?.(e);
                    if (!disabled && !selected) setSelectedId(id);
                }}
                onClick={(e) => {
                    onClick?.(e);
                    if (!disabled && !e.defaultPrevented) onSelect?.(itemValue);
                }}
                className={cn(
                    'relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
CommandItem.displayName = 'CommandItem';

/* ------------------------------------------------------------------ */
/* CommandShortcut                                                     */
/* ------------------------------------------------------------------ */

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
    return <span className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)} {...props} />;
};
CommandShortcut.displayName = 'CommandShortcut';

export {
    Command,
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandShortcut,
    CommandSeparator,
};
