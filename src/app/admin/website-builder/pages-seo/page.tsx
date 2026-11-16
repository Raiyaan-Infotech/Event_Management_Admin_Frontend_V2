'use client';

import { useState } from 'react';
import {
    Plus,
    Trash2,
    Save,
    Upload,
    Sparkles,
    Pencil,
    FileText,
    Globe,
    RotateCcw,
    Lock,
    Search,
    Code,
    Check,
    HelpCircle,
    Loader2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';

interface WebPageItem {
    id: string;
    title: string;
    slug: string;
    type: 'system' | 'custom';
    status: 'published' | 'draft';
    updatedAt: string;
}

const initialPagesSeo: WebPageItem[] = [
    { id: '1', title: 'About Us', slug: 'about-us', type: 'system', status: 'published', updatedAt: '2026-07-20' },
    { id: '2', title: 'Services & Offerings', slug: 'services', type: 'system', status: 'published', updatedAt: '2026-07-21' },
    { id: '3', title: 'Events & Packages', slug: 'events', type: 'system', status: 'published', updatedAt: '2026-07-21' },
    { id: '4', title: 'Terms & Conditions', slug: 'terms-conditions', type: 'system', status: 'published', updatedAt: '2026-07-22' },
    { id: '5', title: 'Privacy Policy', slug: 'privacy-policy', type: 'system', status: 'published', updatedAt: '2026-07-22' },
    { id: '6', title: 'Maintenance Notice', slug: 'maintenance', type: 'system', status: 'published', updatedAt: '2026-07-22' },
    { id: '7', title: 'FAQ & Event Guide', slug: 'event-guide', type: 'custom', status: 'published', updatedAt: '2026-07-23' },
];

export default function PagesSeoSettingsPage() {
    // Pages State
    const [pages, setPages] = useState<WebPageItem[]>(initialPagesSeo);

    // SEO States
    const [metaTitle, setMetaTitle] = useState('Event Management — Premier Luxury Events & Wedding Planning');
    const [metaDescription, setMetaDescription] = useState('Leading event management platform delivering bespoke wedding decor, corporate summits, and customized package planning.');
    const [metaKeywords, setMetaKeywords] = useState('event planning, wedding decor, corporate galas, venue booking, catering packages');
    const [analyticsId, setAnalyticsId] = useState('G-89X72K109P');
    const [pixelId, setPixelId] = useState('1098234789123049');
    const [searchAnalyticsCode, setSearchAnalyticsCode] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const handleResetAll = () => {
        setPages(initialPagesSeo);
        setMetaTitle('Event Management — Premier Luxury Events & Wedding Planning');
        setMetaDescription('Leading event management platform delivering bespoke wedding decor, corporate summits, and customized package planning.');
        setMetaKeywords('event planning, wedding decor, corporate galas, venue booking, catering packages');
        setAnalyticsId('G-89X72K109P');
        setPixelId('1098234789123049');
        toast.info('Pages and SEO settings reset to defaults.');
    };

    const handleResetSystemPage = (title: string) => {
        toast.info(`"${title}" system page content reset to default copy.`);
    };

    const togglePageStatus = (id: string) => {
        setPages(
            pages.map((p) => {
                if (p.id === id) {
                    if (p.type === 'system') {
                        toast.error('System pages cannot be set to draft mode.');
                        return p;
                    }
                    return { ...p, status: p.status === 'published' ? 'draft' : 'published' };
                }
                return p;
            })
        );
    };

    const handleDeletePage = (id: string) => {
        const page = pages.find((p) => p.id === id);
        if (page?.type === 'system') {
            toast.error('System pages cannot be deleted.');
            return;
        }
        setPages(pages.filter((p) => p.id !== id));
        toast.success('Custom page deleted.');
    };

    const handleSaveSeo = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Pages and SEO configurations saved!');
        }, 600);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Website Pages & SEO Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage system & custom page content, meta tags, OpenGraph previews, and tracking codes.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Configure site page lists, SEO metadata, and Google/FB tracking IDs.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSaveSeo} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="pages" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="pages" className="gap-2">
                        <FileText className="h-4 w-4" /> System & Custom Pages
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="gap-2">
                        <Search className="h-4 w-4" /> SEO & Analytics
                    </TabsTrigger>
                </TabsList>

                {/* Pages Tab */}
                <TabsContent value="pages" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-lg">Website Pages List</CardTitle>
                                <CardDescription>Auto-seeded system pages and custom vendor pages.</CardDescription>
                            </div>
                            <Button size="sm" className="gap-1.5">
                                <Plus className="h-4 w-4" /> Create Custom Page
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pages.map((page) => (
                                <div key={page.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold">{page.title}</h4>
                                            <span className="text-xs text-muted-foreground">/{page.slug}</span>
                                            <Badge variant={page.type === 'system' ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                                                {page.type === 'system' && <Lock className="mr-1 h-2.5 w-2.5" />} {page.type}
                                            </Badge>
                                            <Badge variant={page.status === 'published' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                                                {page.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Last updated: {page.updatedAt}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {page.type === 'system' ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                                onClick={() => handleResetSystemPage(page.title)}
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" /> Reset Default
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => togglePageStatus(page.id)}
                                                >
                                                    {page.status === 'published' ? 'Save Draft' : 'Publish'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeletePage(page.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SEO Tab */}
                <TabsContent value="seo" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Meta Tags & Search Engine Optimization</CardTitle>
                            <CardDescription>Default search engine meta titles, descriptions, and keywords.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="metaTitle">Default Meta Title</Label>
                                <Input
                                    id="metaTitle"
                                    value={metaTitle}
                                    onChange={(e) => setMetaTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="metaDescription">Meta Description</Label>
                                <Textarea
                                    id="metaDescription"
                                    value={metaDescription}
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="metaKeywords">Meta Keywords</Label>
                                <Input
                                    id="metaKeywords"
                                    value={metaKeywords}
                                    onChange={(e) => setMetaKeywords(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Analytics & Tracking Scripts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Analytics & Tracking Scripts</CardTitle>
                            <CardDescription>Google Analytics 4, Meta Facebook Pixel, and web tracking IDs.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="analyticsId">Google Analytics Measurement ID</Label>
                                    <Input
                                        id="analyticsId"
                                        value={analyticsId}
                                        onChange={(e) => setAnalyticsId(e.target.value)}
                                        placeholder="G-XXXXXXXXXX"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pixelId">Meta Facebook Pixel ID</Label>
                                    <Input
                                        id="pixelId"
                                        value={pixelId}
                                        onChange={(e) => setPixelId(e.target.value)}
                                        placeholder="1234567890"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleResetAll}
            />
        </div>
    );
}
