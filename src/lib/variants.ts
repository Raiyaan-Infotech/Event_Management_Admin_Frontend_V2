/**
 * variants — tiny, dependency-free replacement for `class-variance-authority`.
 *
 *   const button = variants('base classes', {
 *     variants: { size: { sm: 'h-8', md: 'h-9' } },
 *     defaultVariants: { size: 'md' },
 *   });
 *   button({ size: 'sm', className: 'extra' }) // → "base classes h-8 extra"
 *
 * `cva` and `VariantProps` are exported as aliases so existing code keeps working.
 */

type VariantMap = Record<string, Record<string, string>>;

type VariantSelection<V extends VariantMap> = {
    [K in keyof V]?: keyof V[K] | null;
};

interface VariantConfig<V extends VariantMap> {
    variants?: V;
    defaultVariants?: VariantSelection<V>;
}

export type VariantProps<T extends (...args: never[]) => string> = Omit<NonNullable<Parameters<T>[0]>, 'className' | 'class'>;

export function variants<V extends VariantMap = Record<string, never>>(base: string, config: VariantConfig<V> = {}) {
    return (props?: VariantSelection<V> & { className?: string; class?: string }): string => {
        const out: string[] = [base];
        const all = config.variants ?? ({} as V);
        for (const key of Object.keys(all) as (keyof V)[]) {
            const chosen = props?.[key] ?? config.defaultVariants?.[key];
            if (chosen != null) {
                const cls = all[key][chosen as string];
                if (cls) out.push(cls);
            }
        }
        if (props?.className) out.push(props.className);
        if (props?.class) out.push(props.class);
        return out.join(' ');
    };
}

export const cva = variants;
