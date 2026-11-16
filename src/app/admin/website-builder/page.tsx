'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowDown,
    ArrowUp,
    Check,
    ExternalLink,
    Eye,
    EyeOff,
    Globe,
    Grid,
    HelpCircle,
    Layers,
    LayoutGrid,
    Lock,
    Pencil,
    RotateCcw,
    Save,
    Sliders,
    Sparkles,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface UIBlock {
    id: string;
    key: string;
    title: string;
    description: string;
    category: string;
    isVisible: boolean;
    isLocked: boolean;
    sortOrder: number;
    editUrl: string;
}

const INITIAL_BLOCKS: UIBlock[] = [
    {
        id: '1',
        key: 'header',
        title: 'Header (Top Bar & Contact)',
        description: 'Site logo, top bar contacts, social links, and email/phone details.',
        category: 'Parent: Home (Common for all pages)',
        isVisible: true,
        isLocked: true,
        sortOrder: 1,
        editUrl: '/admin/website-builder/header',
    },
    {
        id: '2',
        key: 'navbar',
        title: 'Navbar (Main Navigation Menu)',
        description: 'Main header menu links, submenus, and page routing.',
        category: 'Parent: Home (Common for all pages)',
        isVisible: true,
        isLocked: true,
        sortOrder: 2,
        editUrl: '/admin/website-builder/nav-menu',
    },
    {
        id: '3',
        key: 'hero-section',
        title: 'Hero Section',
        description: 'Primary banner with headline, eyebrow badge, description, and Call-to-Action buttons.',
        category: 'Banner',
        isVisible: true,
        isLocked: false,
        sortOrder: 3,
        editUrl: '/admin/website-builder/hero-section',
    },
    {
        id: '4',
        key: 'advance-slider',
        title: 'Advance Image Slider',
        description: 'Interactive slide showcase with captions, links, and background overlays.',
        category: 'Media Showcase',
        isVisible: true,
        isLocked: false,
        sortOrder: 4,
        editUrl: '/admin/website-builder/advance-slider',
    },
    {
        id: '5',
        key: 'gallery-images',
        title: 'Event Gallery & Categories',
        description: 'Filterable photo gallery organized by event category tags.',
        category: 'Media Showcase',
        isVisible: true,
        isLocked: false,
        sortOrder: 5,
        editUrl: '/admin/website-builder/gallery',
    },
    {
        id: '6',
        key: 'testimonials',
        title: 'Customer Testimonials',
        description: 'Client reviews carousel with star ratings and client avatars.',
        category: 'Social Proof',
        isVisible: true,
        isLocked: false,
        sortOrder: 6,
        editUrl: '/admin/website-builder/testimonials',
    },
    {
        id: '7',
        key: 'logo-wall',
        title: 'Clients & Sponsors Marquee',
        description: 'Continuous scrolling logo wall featuring key partners and client brands.',
        category: 'Social Proof',
        isVisible: true,
        isLocked: false,
        sortOrder: 7,
        editUrl: '/admin/website-builder/sponsors',
    },
    {
        id: '8',
        key: 'contact-us',
        title: 'Contact Us & Map',
        description: 'Contact form, location details, phone/email, and Google Maps embed.',
        category: 'Contact',
        isVisible: true,
        isLocked: false,
        sortOrder: 8,
        editUrl: '/admin/website-builder/contact-us',
    },
    {
        id: '9',
        key: 'pricing-plans',
        title: 'Pricing Plans & Feature Matrix',
        description: 'Pricing tier cards, billing cycles, custom CTA labels, and feature comparison table.',
        category: 'Pricing',
        isVisible: true,
        isLocked: false,
        sortOrder: 9,
        editUrl: '/admin/website-builder/pricing-plans',
    },
    {
        id: '10',
        key: 'footer-section',
        title: 'Footer & Quick Links',
        description: 'Footer columns, legal links, newsletter subscription, and copyright notice.',
        category: 'Parent: Home (Common for all pages)',
        isVisible: true,
        isLocked: true,
        sortOrder: 10,
        editUrl: '/admin/website-builder/footer',
    },
];

export default function UIBlocksHubPage() {
    const [blocks, setBlocks] = useState<UIBlock[]>(INITIAL_BLOCKS);
    const [isSaving, setIsSaving] = useState(false);

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newBlocks.length) return;

        // Skip swap if locked to top or bottom position
        if (newBlocks[index].isLocked || newBlocks[targetIndex].isLocked) {
            toast.error('Locked sections (Header & Footer) cannot be reordered from their pinned positions.');
            return;
        }

        const temp = newBlocks[index];
        newBlocks[index] = newBlocks[targetIndex];
        newBlocks[targetIndex] = temp;

        // Update sort order values
        newBlocks.forEach((b, idx) => {
            b.sortOrder = idx + 1;
        });

        setBlocks(newBlocks);
    };

    const toggleVisibility = (id: string) => {
        setBlocks((prev) =>
            prev.map((b) => {
                if (b.id === id) {
                    if (b.isLocked) {
                        toast.error('Pinned system sections cannot be hidden.');
                        return b;
                    }
                    return { ...b, isVisible: !b.isVisible };
                }
                return b;
            })
        );
    };

    const handleSaveOrder = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('UI Block order and visibility layout saved successfully!');
        }, 600);
    };

    const handleResetDefault = () => {
        setBlocks(INITIAL_BLOCKS);
        toast.info('UI Block layout reset to standard defaults.');
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">UI Blocks Hub & Reordering</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage section layout sequence, show/hide blocks, and configure home page structure.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleResetDefault} className="gap-2">
                        <RotateCcw className="h-4 w-4" /> Reset Layout
                    </Button>
                    <Button size="sm" onClick={handleSaveOrder} disabled={isSaving} className="gap-2">
                        <Save className="h-4 w-4" /> {isSaving ? 'Saving Order...' : 'Save Block Layout'}
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center justify-between p-5">
                        <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Total UI Blocks</p>
                            <p className="text-2xl font-bold">{blocks.length}</p>
                        </div>
                        <div className="rounded-lg bg-primary/10 p-3 text-primary">
                            <LayoutGrid className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center justify-between p-5">
                        <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Active / Visible</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {blocks.filter((b) => b.isVisible).length}
                            </p>
                        </div>
                        <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-600">
                            <Eye className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center justify-between p-5">
                        <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Hidden Blocks</p>
                            <p className="text-2xl font-bold text-amber-600">
                                {blocks.filter((b) => !b.isVisible).length}
                            </p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 p-3 text-amber-600">
                            <EyeOff className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center justify-between p-5">
                        <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Pinned System</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {blocks.filter((b) => b.isLocked).length}
                            </p>
                        </div>
                        <div className="rounded-lg bg-blue-500/10 p-3 text-blue-600">
                            <Lock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Block Reordering List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-lg">Homepage Section Ordering</CardTitle>
                        <CardDescription>
                            Use arrow controls to reorder homepage sections. Pinned sections stay at the top/bottom.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {blocks.map((block, index) => (
                        <div
                            key={block.id}
                            className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 transition-all ${
                                !block.isVisible ? 'bg-muted/40 opacity-70' : 'bg-card hover:border-primary/40'
                            }`}
                        >
                            {/* Sequence Number & Icon */}
                            <div className="flex items-center gap-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
                                    #{index + 1}
                                </div>

                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-foreground">{block.title}</h3>
                                        <Badge variant="outline" className="text-[10px]">
                                            {block.category}
                                        </Badge>
                                        {block.isLocked && (
                                            <Badge variant="secondary" className="gap-1 text-[10px] text-blue-600">
                                                <Lock className="h-2.5 w-2.5" /> Pinned
                                            </Badge>
                                        )}
                                        {block.isVisible ? (
                                            <Badge variant="default" className="bg-emerald-600 text-[10px]">
                                                Visible
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="text-[10px]">
                                                Hidden
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{block.description}</p>
                                </div>
                            </div>

                            {/* Actions & Controls */}
                            <div className="flex items-center gap-3">
                                {/* Order Arrows */}
                                <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={index === 0 || block.isLocked || blocks[index - 1]?.isLocked}
                                        onClick={() => moveBlock(index, 'up')}
                                        title="Move Up"
                                    >
                                        <ArrowUp className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={
                                            index === blocks.length - 1 ||
                                            block.isLocked ||
                                            blocks[index + 1]?.isLocked
                                        }
                                        onClick={() => moveBlock(index, 'down')}
                                        title="Move Down"
                                    >
                                        <ArrowDown className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {/* Visibility Toggle */}
                                <div className="flex items-center gap-2 border-l pl-3">
                                    <span className="text-xs font-medium text-muted-foreground">Show</span>
                                    <Switch
                                        checked={block.isVisible}
                                        disabled={block.isLocked}
                                        onCheckedChange={() => toggleVisibility(block.id)}
                                    />
                                </div>

                                {/* Edit Section Button */}
                                <Button type="button" variant="outline" size="sm" asChild className="gap-1.5">
                                    <Link href={block.editUrl}>
                                        <Pencil className="h-3.5 w-3.5" /> Edit Form
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
