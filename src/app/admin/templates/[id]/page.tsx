'use client';

import { use, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import {
    ArrowLeft,
    Pencil,
    Copy,
    Star,
    Check,
    X,
    FileText,
    Palette,
    LayoutList,
    Globe,
    Download,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageLoader } from '@/components/common/page-loader';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { cn } from '@/lib/utils';
import { downloadNodeAsImage, type ExportFormat } from '@/lib/export-invitation-png';
import {
    useEventTemplate,
    useDuplicateEventTemplate,
    useUpdateEventTemplateFeatured,
    COMPONENT_GROUPS,
    groupsInOrder,
    normaliseOrder,
    type ComponentKey,
} from '@/hooks/use-event-templates';
import { TemplatePreview } from '../_components/template-preview';

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const { data: template, isLoading } = useEventTemplate(id);
    const duplicateTemplate = useDuplicateEventTemplate();
    const updateFeatured = useUpdateEventTemplateFeatured();

    const previewWrapRef = useRef<HTMLDivElement>(null);
    const [downloadFormat, setDownloadFormat] = useState<ExportFormat | null>(null);

    const handleDownload = async (format: ExportFormat) => {
        // The card carries `data-invitation-card` (see template-preview.tsx) —
        // captured on its own, not the device toggle or caption around it.
        const card = previewWrapRef.current?.querySelector<HTMLElement>('[data-invitation-card]');
        if (!card) return;

        setDownloadFormat(format);
        try {
            // The template's NAME, not its `code` — "EVT2025..." means nothing
            // to whoever opens the downloads folder; the title does.
            const readableName =
                template?.name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                || template?.code
                || 'invitation';
            await downloadNodeAsImage(card, readableName, format);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to download the invitation');
        } finally {
            setDownloadFormat(null);
        }
    };

    if (isLoading || !template) {
        return (
            <PermissionGuard permission="event_templates.view">
                <PageLoader open text="Loading template..." />
            </PermissionGuard>
        );
    }

    const active = !!Number(template.is_active);
    const featured = !!Number(template.is_featured);
    const on = (key: ComponentKey) => !!Number(template.components?.[key] ?? 1);
    /**
     * The NINE rows the wizard shows, in the template's order — not the eleven
     * stored keys. Title & Names and Organizer & Contact are one row each, on
     * when either of their two components is on, so this page and the wizard
     * list the same things.
     */
    // Event Photos and Decoration Elements are not rows here: the wizard no
    // longer offers either as a switch.
    const groups = groupsInOrder(normaliseOrder(template.component_order)).filter(
        (g) => g.id !== 'photos' && g.id !== 'decorations'
    );

    return (
        <PermissionGuard permission="event_templates.view">
            <div className="space-y-5">
                <PageLoader open={duplicateTemplate.isPending} text="Duplicating..." />

                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="break-all text-xl font-extrabold tracking-tight text-foreground">
                                {template.name}
                            </h1>
                            <Badge
                                variant="outline"
                                className={cn(
                                    'gap-1.5 border-transparent text-[11px] font-semibold',
                                    active
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                )}
                            >
                                <span
                                    className={cn(
                                        'inline-block h-1.5 w-1.5 rounded-full',
                                        active ? 'bg-emerald-500' : 'bg-rose-500'
                                    )}
                                />
                                {active ? 'Active' : 'Inactive'}
                            </Badge>
                            {template.status === 'draft' && (
                                <Badge variant="outline" className="border-amber-300 text-[11px] text-amber-700">
                                    Draft
                                </Badge>
                            )}
                            {featured && (
                                <Badge variant="outline" className="border-violet-300 text-[11px] text-violet-700">
                                    Featured
                                </Badge>
                            )}
                        </div>
                        <p className="font-mono text-xs uppercase text-muted-foreground">{template.code}</p>
                        {template.description && (
                            <p className="mt-1 max-w-2xl break-words text-xs text-muted-foreground">
                                {template.description}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => router.push('/admin/templates')} className="h-9 gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                updateFeatured.mutate({ id: template.id, is_featured: !featured })
                            }
                            className="h-9 gap-2"
                        >
                            <Star className="h-4 w-4" /> {featured ? 'Unfeature' : 'Feature'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => duplicateTemplate.mutate(template.id)}
                            className="h-9 gap-2"
                        >
                            <Copy className="h-4 w-4" /> Duplicate
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" disabled={!!downloadFormat} className="h-9 gap-2">
                                    {downloadFormat ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    {downloadFormat ? 'Downloading…' : 'Download'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownload('png')}>
                                    Download as PNG
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload('svg')}>
                                    Download as SVG
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            onClick={() => router.push(`/admin/templates/create?id=${template.id}`)}
                            className="h-9 gap-2"
                        >
                            <Pencil className="h-4 w-4" /> Edit Template
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="min-w-0 space-y-4">
                        <DetailCard title="Basic Information" icon={FileText}>
                            <Rows
                                rows={[
                                    ['Event Category', template.category?.name ?? '—'],
                                    ['Style', template.style],
                                    [
                                        'Tags',
                                        template.tags.length ? (
                                            <span className="flex flex-wrap gap-1">
                                                {template.tags.map((t) => (
                                                    <Badge key={t} variant="secondary" className="text-[10px]">
                                                        {t}
                                                    </Badge>
                                                ))}
                                            </span>
                                        ) : (
                                            '—'
                                        ),
                                    ],
                                    ['Created By', template.creator?.full_name ?? '—'],
                                ]}
                            />
                        </DetailCard>

                        <DetailCard title="Design & Background" icon={Palette}>
                            <Rows
                                rows={[
                                    ['Layout Style', template.layout_style],
                                    ['Background Type', template.background_type],
                                    ['Orientation', `${template.orientation} (${template.dimension ?? '—'})`],
                                    ['Overlay', `${template.overlay_opacity}%`],
                                    // Colour rows only where the background IS a
                                    // colour — an Image / Custom template's
                                    // background is its picture.
                                    ...((template.background_type === 'color'
                                        ? [
                                              ['Background Color', <Swatch key="bg" value={template.background_color} />],
                                              ['Secondary Color', <Swatch key="sc" value={template.secondary_color} />],
                                          ]
                                        : template.background_type === 'gradient'
                                          ? [['Accent Color', <Swatch key="sc" value={template.secondary_color} />]]
                                          : []) as Array<[string, React.ReactNode]>),
                                    ['Primary Font', template.primary_font ?? '—'],
                                    ['Secondary Font', template.secondary_font ?? '—'],
                                    // The real artwork, falling back to the CSS border only
                                    // when no frame is chosen — showing `border_style` while
                                    // a frame is set would name the thing that ISN'T drawn.
                                    [
                                        'Border / Frame',
                                        template.frameStyle?.name ?? template.border_style ?? '—',
                                    ],
                                    [
                                        'Decorations',
                                        template.decorationItems?.length
                                            ? template.decorationItems.map((d) => d.name).join(', ')
                                            : '—',
                                    ],
                                ]}
                            />
                        </DetailCard>

                        <DetailCard title="Content & Components" icon={LayoutList}>
                            {/* Listed in component_order, not alphabetically — the order is
                                the design decision, so the detail page has to show it. */}
                            <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {groups.map((group, i) => {
                                    const shown = group.keys.some(on);
                                    return (
                                    <li
                                        key={group.id}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs',
                                            !shown && 'opacity-60'
                                        )}
                                    >
                                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold">
                                            {i + 1}
                                        </span>
                                        <span
                                            className={cn(
                                                'min-w-0 flex-1 break-words font-medium text-foreground',
                                                !shown && 'line-through'
                                            )}
                                        >
                                            {group.label}
                                        </span>
                                        {shown ? (
                                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                        ) : (
                                            <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        )}
                                    </li>
                                );
                                })}
                            </ol>
                        </DetailCard>

                        <DetailCard title="Publishing & Availability" icon={Globe}>
                            <Rows
                                rows={[
                                    ['Publish Status', template.status === 'draft' ? 'Draft' : 'Published'],
                                    ['Status', active ? 'Active' : 'Inactive'],
                                    ['Featured', featured ? 'Yes' : 'No'],
                                    [
                                        'Available For',
                                        template.available_for.length === 2
                                            ? 'Both (Individuals & Companies)'
                                            : template.available_for.length === 0
                                                ? 'Nobody'
                                                : template.available_for[0] === 'individual'
                                                    ? 'Individual Clients'
                                                    : 'Event Management Companies',
                                    ],
                                    [
                                        'Plan Availability',
                                        template.plan_availability === 'all'
                                            ? 'All Plans'
                                            : template.plan_availability === 'trial'
                                                ? 'Free Trial Only'
                                                : `${template.plan_ids.length} selected plan(s)`,
                                    ],
                                    ['Sort Order', String(template.sort_order)],
                                    ['Display On Homepage', Number(template.show_on_homepage) ? 'Yes' : 'No'],
                                ]}
                            />
                        </DetailCard>
                    </div>

                    <div className="min-w-0">
                        <Card className="border-border bg-card shadow-xs xl:sticky xl:top-4">
                            <CardContent className="p-4">
                                <div ref={previewWrapRef}>
                                    <TemplatePreview
                                        template={{
                                            ...template,
                                            // Both come joined on the read, so the detail
                                            // page draws the same artwork the wizard did
                                            // rather than falling back to the CSS border.
                                            frameUrl: template.frameStyle?.file_url ?? null,
                                            decorationItems: template.decorationItems ?? [],
                                        }}
                                        caption="Sample content — a template has no event of its own."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}

function DetailCard({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-border bg-card shadow-xs">
            <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-bold text-foreground">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4">{children}</CardContent>
        </Card>
    );
}

function Rows({ rows }: { rows: Array<[string, React.ReactNode]> }) {
    return (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(([label, value]) => (
                <div key={label} className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    <dd className="break-words text-xs font-medium capitalize text-foreground">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

function Swatch({ value }: { value: string | null }) {
    if (!value) return <span>—</span>;
    return (
        <span className="inline-flex items-center gap-1.5">
            <span
                className="inline-block h-3 w-3 rounded-sm border border-border"
                style={{ backgroundColor: value }}
            />
            <span className="font-mono">{value}</span>
        </span>
    );
}
