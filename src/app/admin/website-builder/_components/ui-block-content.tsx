'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
    GripVertical,
    FileText,
    List,
    Monitor,
    Search,
    Settings,
    Palette,
    Mail,
    SlidersHorizontal,
    GalleryHorizontal,
    Folder,
    Star,
    Users,
    Eye,
    Lock,
    RotateCcw,
    Save,
    Sparkles,
    HelpCircle,
    Loader2,
    ExternalLink,
    Layers,
    LayoutGrid,
    DollarSign,
    Video,
    LogIn,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUiBlocksData, useSaveUiBlocks, type UiBlockPayloadItem } from '@/hooks/useUiBlocks';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/common/page-loader';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';

type UiBlockFilter = 'all' | 'visible' | 'hidden';

export interface UiBlockItem {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    visible: boolean;
    locked: boolean;
    required: boolean;
    editUrl?: string;
}

export const PAGES_CONFIG = [
    { slug: 'home', title: 'Home Page' },
    { slug: 'features', title: 'Features Page' },
    { slug: 'template', title: 'Template Page' },
    { slug: 'pricing', title: 'Pricing Page' },
    { slug: 'how-it-works', title: "How It's Work" },
    { slug: 'contact', title: 'Contact Page' },
];

export const GLOBAL_TOP_BLOCKS: UiBlockItem[] = [
    { id: 'header', label: 'Header', description: 'Top bar contacts, social links, logo, and topbar settings.', icon: FileText, visible: true, locked: true, required: true, editUrl: '/admin/website-builder/header' },
    { id: 'navbar', label: 'Navbar', description: 'Main navigation header menu.', icon: List, visible: true, locked: true, required: true, editUrl: '/admin/website-builder/nav-menu' },
    { id: 'hero-section', label: 'Hero Section', description: 'Primary top hero banner.', icon: Monitor, visible: true, locked: true, required: true, editUrl: '/admin/website-builder/hero-section' },
];

export const GLOBAL_BOTTOM_BLOCKS: UiBlockItem[] = [
    { id: 'footer', label: 'Footer', description: 'Global website footer columns and copyright.', icon: Settings, visible: true, locked: true, required: true, editUrl: '/admin/website-builder/footer' },
];

export const PAGE_SPECIFIC_BLOCKS_MAP: Record<string, UiBlockItem[]> = {
    home: [
        { id: 'home_highlights_1', label: 'Highlights (Outline)', description: 'Outline styled highlight cards section.', icon: Sparkles, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/highlights/home/1' },
        { id: 'templates', label: 'Template Showcase', description: 'Featured invitation templates list.', icon: LayoutGrid, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/templates' },
        { id: 'home_highlights_2', label: 'Highlights (Background Filled)', description: 'Filled background style highlight cards section.', icon: Sparkles, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/highlights/home/2' },
        { id: 'testimonials', label: 'Testimonials', description: 'Client reviews and feedback carousel.', icon: Star, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/testimonials' },
        { id: 'login_demo', label: 'Login & Demo', description: 'Home page Login & Demo callout banner.', icon: LogIn, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/login-demo/home' },
    ],
    features: [
        { id: 'features', label: 'Features', description: 'Detailed feature showcase list.', icon: Layers, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/features' },
        { id: 'sign_in_price_plan', label: 'Sign In with Price Plan', description: 'Sign in callout with price plan overview.', icon: DollarSign, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/pricing-plans' },
        { id: 'features_highlights_1', label: 'Highlights', description: 'Features page highlights block.', icon: Sparkles, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/highlights/features/1' },
        { id: 'sign_in_demo', label: 'Sign In & Demo', description: 'Features page Sign In & Demo CTA banner.', icon: LogIn, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/login-demo/features' },
    ],
    template: [
        { id: 'templates', label: 'Template', description: 'Invitation templates grid section.', icon: LayoutGrid, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/templates' },
        { id: 'sign_in_price_plan', label: 'Sign In with Price Plan', description: 'Sign in callout with price plan overview.', icon: DollarSign, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/pricing-plans' },
        { id: 'template_highlights_1', label: 'Highlights', description: 'Template page highlights section.', icon: Sparkles, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/highlights/template/1' },
    ],
    pricing: [
        { id: 'plans_pricing', label: 'Plans & Pricing', description: 'Promotional pricing tiers and toggle.', icon: DollarSign, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/pricing-plans' },
        { id: 'plan_features', label: 'Plan Features', description: 'Detailed feature comparison table.', icon: Layers, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/features' },
        { id: 'pricing_highlights_1', label: 'Highlights', description: 'Pricing page highlights section.', icon: Sparkles, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/highlights/pricing/1' },
        { id: 'contact_signup_demo', label: 'Contact & Signup Demo', description: 'Contact & demo signup callout banner.', icon: LogIn, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/login-demo/pricing' },
    ],
    'how-it-works': [
        { id: 'videos', label: 'Videos', description: 'How it works video tutorials section.', icon: Video, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/video-tutorials' },
        { id: 'howitworks_highlights_1', label: 'Highlights', description: 'How it works highlights section.', icon: Sparkles, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/highlights/how-it-works/1' },
        { id: 'signup_demo', label: 'Signup Demo', description: 'Signup demo callout banner.', icon: LogIn, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/login-demo/how-it-works' },
    ],
    contact: [
        { id: 'contact_highlights_1', label: 'Highlights', description: 'Contact page highlights section.', icon: Sparkles, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/highlights/contact/1' },
        { id: 'contact_map', label: 'Contact Form with Map', description: 'Interactive contact form and location map.', icon: Mail, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/contact-us' },
        { id: 'faqs', label: 'FAQ\'s', description: 'Frequently asked questions accordion.', icon: HelpCircle, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/faqs' },
        { id: 'chat_signup_demo', label: 'Chat & Signup Demo', description: 'Live chat & signup demo banner.', icon: LogIn, visible: true, locked: false, required: false, editUrl: '/admin/website-builder/login-demo/contact' },
    ],
};

interface UiBlockContentProps {
    initialPageSlug?: string;
}

export function UiBlockContent({ initialPageSlug = 'home' }: UiBlockContentProps) {
    const router = useRouter();
    const activePageSlug = PAGES_CONFIG.some((p) => p.slug === initialPageSlug) ? initialPageSlug : 'home';
    const activePageTitle = PAGES_CONFIG.find((p) => p.slug === activePageSlug)?.title || 'Page';

    const { data: dbBlocks = [], isLoading } = useUiBlocksData(activePageSlug);
    const saveMutation = useSaveUiBlocks(activePageSlug);

    const initialMiddleBlocks = PAGE_SPECIFIC_BLOCKS_MAP[activePageSlug] || PAGE_SPECIFIC_BLOCKS_MAP.home;
    const [middleBlocks, setMiddleBlocks] = useState<UiBlockItem[]>(initialMiddleBlocks);
    const [filter, setFilter] = useState<UiBlockFilter>('all');

    useEffect(() => {
        const defaultList = PAGE_SPECIFIC_BLOCKS_MAP[activePageSlug] || PAGE_SPECIFIC_BLOCKS_MAP.home;
        if (dbBlocks && dbBlocks.length > 0) {
            // Reorder and apply visibility based on dbBlocks
            const merged = defaultList.map((block) => {
                const found = dbBlocks.find((b: any) => b.id === block.id || b.block_key === block.id);
                return {
                    ...block,
                    visible: found ? Boolean(found.visible) : block.visible,
                    sort_order: found ? Number(found.sort_order || 0) : 999,
                };
            });
            // Sort by DB sort order if present
            merged.sort((a: any, b: any) => a.sort_order - b.sort_order);
            setMiddleBlocks(merged);
        } else {
            setMiddleBlocks(defaultList);
        }
    }, [dbBlocks, activePageSlug]);

    const handlePageChange = (slug: string) => {
        router.push(`/admin/website-builder/ui-block/${slug}`);
    };

    const handleSave = async () => {
        try {
            const payload: UiBlockPayloadItem[] = middleBlocks.map((item, index) => ({
                id: item.id,
                label: item.label,
                description: item.description,
                visible: item.visible,
                locked: item.locked,
                required: item.required,
                sort_order: index + 1,
            }));
            await saveMutation.mutateAsync(payload);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save UI blocks');
        }
    };

    const dragIndex = useRef<number | null>(null);

    const visibleCount = middleBlocks.filter((item) => item.visible).length;
    const hiddenCount = middleBlocks.length - visibleCount;

    const filteredMiddleBlocks = useMemo(() => {
        if (filter === 'visible') return middleBlocks.filter((item) => item.visible);
        if (filter === 'hidden') return middleBlocks.filter((item) => !item.visible);
        return middleBlocks;
    }, [middleBlocks, filter]);

    const handleVisibilityChange = (id: string, visible: boolean) => {
        setMiddleBlocks((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    return { ...item, visible };
                }
                return item;
            })
        );
    };

    const handleDragStart = (index: number) => {
        if (filter !== 'all') return;
        dragIndex.current = index;
    };

    const handleDrop = (targetIndex: number) => {
        if (filter !== 'all' || dragIndex.current === null) {
            dragIndex.current = null;
            return;
        }

        const fromIndex = dragIndex.current;
        dragIndex.current = null;

        if (fromIndex === targetIndex) return;

        const next = [...middleBlocks];
        const moved = next[fromIndex];
        if (!moved) return;

        next.splice(fromIndex, 1);
        next.splice(targetIndex, 0, moved);
        setMiddleBlocks(next);
        toast.success(`Reordered ${moved.label}`);
    };

    const [previewOpen, setPreviewOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const handleResetDefaults = () => {
        const defaultList = PAGE_SPECIFIC_BLOCKS_MAP[activePageSlug] || PAGE_SPECIFIC_BLOCKS_MAP.home;
        setMiddleBlocks(defaultList);
        setFilter('all');
        toast.success(`Reset ${activePageTitle} UI blocks to default order.`);
    };

    return (
        <div className="space-y-6">
            <PageLoader open={saveMutation.isPending} text={`Saving ${activePageTitle} UI Blocks...`} />

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pages / UI Block - Enable / Disable</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage section layout sequence and show/hide UI blocks for <strong>{activePageTitle}</strong>.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-8 px-3 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                        <Eye className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Live Preview
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResetDialogOpen(true)}
                        className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset Page Blocks
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {saveMutation.isPending ? 'Saving...' : 'Save Block Layout'}
                    </Button>
                </div>
            </div>

            {/* Page Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
                {PAGES_CONFIG.map((p) => {
                    const isActive = p.slug === activePageSlug;
                    return (
                        <button
                            key={p.slug}
                            type="button"
                            onClick={() => handlePageChange(p.slug)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap',
                                isActive
                                    ? 'bg-primary/10 text-primary border-primary font-extrabold'
                                    : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <Monitor className="h-3.5 w-3.5" />
                            {p.title}
                        </button>
                    );
                })}
            </div>

            {/* Main Page Blocks Card Table */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-lg font-bold">{activePageTitle} — Section Blocks</CardTitle>
                            <CardDescription className="text-xs">
                                Top (Announcement, Navbar, Hero Section) & Footer are fixed globally across all pages. Drag & toggle the middle sections below.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Filter Bar */}
                    <div className="flex items-center gap-2 p-4 bg-muted/20 border-b">
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className={cn(
                                'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-all',
                                filter === 'all'
                                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                                    : 'border-input bg-background text-muted-foreground hover:bg-muted'
                            )}
                        >
                            All Sections <Badge className="text-[10px] bg-emerald-800/20 text-emerald-950 font-bold px-1.5 py-0 border-0">{middleBlocks.length + 4}</Badge>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFilter('visible')}
                            className={cn(
                                'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-all',
                                filter === 'visible'
                                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                    : 'border-input bg-background text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Visible <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0">{visibleCount + 4}</Badge>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFilter('hidden')}
                            className={cn(
                                'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-all',
                                filter === 'hidden'
                                    ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                                    : 'border-input bg-background text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Hidden <Badge variant="secondary" className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0">{hiddenCount}</Badge>
                        </button>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[40px]"></TableHead>
                                    <TableHead className="font-bold text-xs">SECTION BLOCK</TableHead>
                                    <TableHead className="font-bold text-xs w-[180px]">VISIBILITY</TableHead>
                                    <TableHead className="font-bold text-xs w-[140px] text-right">EDIT CONTENT</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* ── Global Pinned Top Blocks ── */}
                                {GLOBAL_TOP_BLOCKS.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <TableRow key={item.id} className="bg-slate-50/80 border-b border-slate-200/60">
                                            <TableCell className="w-[40px] pr-0">
                                                <Lock className="h-3.5 w-3.5 text-slate-400" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-slate-200/60 text-slate-700">
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-xs text-slate-800">{item.label}</span>
                                                            <Badge variant="outline" className="text-[9px] border-emerald-300 bg-emerald-50 text-emerald-700 font-extrabold uppercase">
                                                                Parent: Home (Common for all pages)
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[9px] border-slate-300 bg-slate-100 text-slate-600 font-bold uppercase">
                                                                Fixed Global (Top)
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500">{item.description}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                    Always Visible
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.editUrl && (
                                                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-blue-600 font-semibold hover:bg-blue-50">
                                                        <Link href={item.editUrl}>Edit</Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {/* ── Dynamic Page-Specific Middle Blocks ── */}
                                {filteredMiddleBlocks.map((item, realIndex) => {
                                    const Icon = item.icon;
                                    const dragDisabled = filter !== 'all';

                                    return (
                                        <TableRow
                                            key={item.id}
                                            draggable={!dragDisabled}
                                            onDragStart={() => handleDragStart(realIndex)}
                                            onDragOver={(e) => {
                                                if (!dragDisabled) e.preventDefault();
                                            }}
                                            onDrop={() => handleDrop(realIndex)}
                                            className="group hover:bg-muted/30 transition-colors"
                                        >
                                            <TableCell className="w-[40px] pr-0">
                                                <GripVertical
                                                    className={cn(
                                                        'h-4 w-4',
                                                        dragDisabled ? 'text-muted-foreground/30' : 'cursor-grab text-muted-foreground group-hover:text-foreground'
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm text-foreground">{item.label}</span>
                                                            <Badge variant="outline" className="text-[10px] border-primary/30 bg-primary/5 text-primary font-semibold">
                                                                #{realIndex + 1} Position
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                                        <Eye className="h-3.5 w-3.5" />
                                                        <span>{item.visible ? 'Visible' : 'Hidden'}</span>
                                                    </div>
                                                    <Switch
                                                        checked={item.visible}
                                                        onCheckedChange={(val) => handleVisibilityChange(item.id, val)}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.editUrl ? (
                                                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-blue-600 font-semibold hover:bg-blue-50">
                                                        <Link href={item.editUrl}>Edit Form</Link>
                                                    </Button>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] text-slate-400 font-mono">
                                                        Hardcoded UI
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {/* ── Global Pinned Bottom Block ── */}
                                {GLOBAL_BOTTOM_BLOCKS.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <TableRow key={item.id} className="bg-slate-50/80 border-t border-slate-200/60">
                                            <TableCell className="w-[40px] pr-0">
                                                <Lock className="h-3.5 w-3.5 text-slate-400" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-slate-200/60 text-slate-700">
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-xs text-slate-800">{item.label}</span>
                                                            <Badge variant="outline" className="text-[9px] border-emerald-300 bg-emerald-50 text-emerald-700 font-extrabold uppercase">
                                                                Parent: Home (Common for all pages)
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[9px] border-slate-300 bg-slate-100 text-slate-600 font-bold uppercase">
                                                                Fixed Global (Bottom)
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500">{item.description}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                    Always Visible
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.editUrl && (
                                                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-blue-600 font-semibold hover:bg-blue-50">
                                                        <Link href={item.editUrl}>Edit</Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Live Page Layout Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl border-slate-200">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <DialogTitle className="text-sm font-bold text-slate-900">{activePageTitle} Layout — Live Preview</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            Sequence of active UI section blocks configured for {activePageTitle}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 my-2 max-h-[65vh] overflow-y-auto">
                        <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-between text-slate-300">
                            <span>1. Announcement & Global Header Bar</span>
                            <Badge className="text-[9px] bg-blue-500/20 text-blue-300 border-0 font-extrabold">Fixed Global</Badge>
                        </div>
                        <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-between text-slate-300">
                            <span>2. Navbar & Main Navigation</span>
                            <Badge className="text-[9px] bg-blue-500/20 text-blue-300 border-0 font-extrabold">Fixed Global</Badge>
                        </div>
                        <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-between text-slate-300">
                            <span>3. Hero Section Module ({activePageTitle})</span>
                            <Badge className="text-[9px] bg-emerald-500/20 text-emerald-300 border-0 font-extrabold">Active</Badge>
                        </div>

                        {middleBlocks.filter((b) => b.visible).map((blk, idx) => (
                            <div key={blk.id} className="p-3 bg-slate-850 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-between text-slate-100">
                                <span>{idx + 4}. {blk.label} ({blk.description})</span>
                                <Badge className="text-[9px] bg-emerald-500/20 text-emerald-300 border-0 font-extrabold font-mono">Visible</Badge>
                            </div>
                        ))}

                        <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-between text-slate-300">
                            <span>{middleBlocks.filter((b) => b.visible).length + 4}. Company Footer Block</span>
                            <Badge className="text-[9px] bg-blue-500/20 text-blue-300 border-0 font-extrabold">Fixed Global</Badge>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleResetDefaults}
            />
        </div>
    );
}
