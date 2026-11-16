'use client';

import { useState } from 'react';
import {
    Plus,
    Trash2,
    Save,
    Upload,
    Sliders,
    Sparkles,
    Pencil,
    Eye,
    Image as ImageIcon,
    Layout,
    Link as LinkIcon,
    Layers,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface SlideItem {
    id: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaUrl: string;
    imageUrl: string;
    status: 'published' | 'draft';
    sortOrder: number;
}

export default function HeroSlidersSettingsPage() {
    // Hero States
    const [heroEyebrow, setHeroEyebrow] = useState('PREMIUM EVENT EXPERIENCE');
    const [heroTitle, setHeroTitle] = useState('Creating Unforgettable Event Moments & Celebrations');
    const [heroDescription, setHeroDescription] = useState('Full-service event management, wedding planning, corporate galas, and customized decor packages tailored to your special occasions.');
    const [heroPrimaryBtnText, setHeroPrimaryBtnText] = useState('Book An Event');
    const [heroPrimaryBtnUrl, setHeroPrimaryBtnUrl] = useState('/contact-us');
    const [heroSecondaryBtnText, setHeroSecondaryBtnText] = useState('Explore Services');
    const [heroSecondaryBtnUrl, setHeroSecondaryBtnUrl] = useState('/services');
    const [heroLayout, setHeroLayout] = useState('split');
    const [heroBgType, setHeroBgType] = useState('image');

    // Advance Sliders States
    const [slides, setSlides] = useState<SlideItem[]>([
        {
            id: '1',
            title: 'Royal Wedding & Reception Decor',
            subtitle: 'Elegant floral styling, stage production, and luxury dining arrangements.',
            ctaLabel: 'View Package',
            ctaUrl: '/events/wedding',
            imageUrl: '/slide1.jpg',
            status: 'published',
            sortOrder: 1,
        },
        {
            id: '2',
            title: 'Corporate Galas & Summits',
            subtitle: 'Professional audio-visual setup, stage lighting, and seamless guest check-ins.',
            ctaLabel: 'Explore Corporate',
            ctaUrl: '/events/corporate',
            imageUrl: '/slide2.jpg',
            status: 'published',
            sortOrder: 2,
        },
    ]);

    // Slide Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSlide, setEditingSlide] = useState<SlideItem | null>(null);
    const [slideFormTitle, setSlideFormTitle] = useState('');
    const [slideFormSubtitle, setSlideFormSubtitle] = useState('');
    const [slideFormCtaLabel, setSlideFormCtaLabel] = useState('');
    const [slideFormCtaUrl, setSlideFormCtaUrl] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    const handleOpenAddSlide = () => {
        setEditingSlide(null);
        setSlideFormTitle('');
        setSlideFormSubtitle('');
        setSlideFormCtaLabel('');
        setSlideFormCtaUrl('');
        setIsDialogOpen(true);
    };

    const handleOpenEditSlide = (slide: SlideItem) => {
        setEditingSlide(slide);
        setSlideFormTitle(slide.title);
        setSlideFormSubtitle(slide.subtitle);
        setSlideFormCtaLabel(slide.ctaLabel);
        setSlideFormCtaUrl(slide.ctaUrl);
        setIsDialogOpen(true);
    };

    const handleSaveSlideItem = () => {
        if (!slideFormTitle) {
            toast.error('Slide title is required.');
            return;
        }

        if (editingSlide) {
            setSlides(
                slides.map((s) =>
                    s.id === editingSlide.id
                        ? {
                              ...s,
                              title: slideFormTitle,
                              subtitle: slideFormSubtitle,
                              ctaLabel: slideFormCtaLabel,
                              ctaUrl: slideFormCtaUrl,
                          }
                        : s
                )
            );
            toast.success('Slide updated.');
        } else {
            const newSlide: SlideItem = {
                id: Date.now().toString(),
                title: slideFormTitle,
                subtitle: slideFormSubtitle,
                ctaLabel: slideFormCtaLabel || 'Learn More',
                ctaUrl: slideFormCtaUrl || '#',
                imageUrl: '/slide-placeholder.jpg',
                status: 'published',
                sortOrder: slides.length + 1,
            };
            setSlides([...slides, newSlide]);
            toast.success('New slide added.');
        }
        setIsDialogOpen(false);
    };

    const handleDeleteSlide = (id: string) => {
        setSlides(slides.filter((s) => s.id !== id));
        toast.success('Slide deleted.');
    };

    const toggleSlideStatus = (id: string) => {
        setSlides(
            slides.map((s) =>
                s.id === id ? { ...s, status: s.status === 'published' ? 'draft' : 'published' } : s
            )
        );
    };

    const handleSaveAll = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Hero section and slider configurations saved!');
        }, 600);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Hero Section & Sliders Editor</h1>
                    <p className="text-sm text-muted-foreground">
                        Customize the main hero banner content, CTAs, layout styles, and interactive sliders.
                    </p>
                </div>

                <Button size="sm" onClick={handleSaveAll} disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>

            <Tabs defaultValue="hero" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="hero" className="gap-2">
                        <Layout className="h-4 w-4" /> Hero Banner
                    </TabsTrigger>
                    <TabsTrigger value="sliders" className="gap-2">
                        <Sliders className="h-4 w-4" /> Advance Sliders
                    </TabsTrigger>
                </TabsList>

                {/* Hero Tab */}
                <TabsContent value="hero" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Hero Banner Content</CardTitle>
                            <CardDescription>Main headline, badge tag, description copy, and CTA buttons.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="heroEyebrow">Eyebrow Badge Text</Label>
                                <Input
                                    id="heroEyebrow"
                                    value={heroEyebrow}
                                    onChange={(e) => setHeroEyebrow(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="heroTitle">Main Headline</Label>
                                <Input
                                    id="heroTitle"
                                    value={heroTitle}
                                    onChange={(e) => setHeroTitle(e.target.value)}
                                    className="font-semibold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="heroDescription">Hero Description Copy</Label>
                                <Textarea
                                    id="heroDescription"
                                    value={heroDescription}
                                    onChange={(e) => setHeroDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {/* Buttons Grid */}
                            <div className="grid gap-4 md:grid-cols-2 pt-2">
                                <div className="space-y-3 rounded-lg border p-4">
                                    <h4 className="font-semibold text-sm">Primary Action Button</h4>
                                    <div className="space-y-2">
                                        <Label htmlFor="heroPrimaryBtnText">Button Label</Label>
                                        <Input
                                            id="heroPrimaryBtnText"
                                            value={heroPrimaryBtnText}
                                            onChange={(e) => setHeroPrimaryBtnText(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="heroPrimaryBtnUrl">Destination URL</Label>
                                        <Input
                                            id="heroPrimaryBtnUrl"
                                            value={heroPrimaryBtnUrl}
                                            onChange={(e) => setHeroPrimaryBtnUrl(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-lg border p-4">
                                    <h4 className="font-semibold text-sm">Secondary Action Button</h4>
                                    <div className="space-y-2">
                                        <Label htmlFor="heroSecondaryBtnText">Button Label</Label>
                                        <Input
                                            id="heroSecondaryBtnText"
                                            value={heroSecondaryBtnText}
                                            onChange={(e) => setHeroSecondaryBtnText(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="heroSecondaryBtnUrl">Destination URL</Label>
                                        <Input
                                            id="heroSecondaryBtnUrl"
                                            value={heroSecondaryBtnUrl}
                                            onChange={(e) => setHeroSecondaryBtnUrl(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Layout Variants & Media */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Layout Variant & Background Media</CardTitle>
                            <CardDescription>Choose hero layout style and upload background media frames.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Hero Layout Style</Label>
                                    <Select value={heroLayout} onValueChange={setHeroLayout}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="split">Split Layout (Left Content + Right Image Frame)</SelectItem>
                                            <SelectItem value="centered">Centered Content (Centered Heading & Buttons)</SelectItem>
                                            <SelectItem value="overlay">Full Overlay (Content on Top of Full Image)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Background Media Type</Label>
                                    <Select value={heroBgType} onValueChange={setHeroBgType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="image">Static High-Res Image</SelectItem>
                                            <SelectItem value="video">Background Video Frame</SelectItem>
                                            <SelectItem value="gradient">Clean Theme Gradient</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label>Hero Frame Preview</Label>
                                <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
                                    <div className="flex h-24 w-40 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                        <ImageIcon className="h-8 w-8" />
                                    </div>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Upload className="h-4 w-4" /> Change Image Frame
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sliders Tab */}
                <TabsContent value="sliders" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-lg">Advance Image Slider Items</CardTitle>
                                <CardDescription>Manage interactive slide items, captions, and links.</CardDescription>
                            </div>
                            <Button size="sm" onClick={handleOpenAddSlide} className="gap-1.5">
                                <Plus className="h-4 w-4" /> Add Slide
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {slides.map((slide, idx) => (
                                <div key={slide.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-20 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">
                                            SLIDE #{idx + 1}
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">{slide.title}</h4>
                                                <Badge variant={slide.status === 'published' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                                                    {slide.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{slide.subtitle}</p>
                                            <span className="text-[11px] text-primary">{slide.ctaLabel} → {slide.ctaUrl}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleSlideStatus(slide.id)}
                                        >
                                            {slide.status === 'published' ? 'Unpublish' : 'Publish'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleOpenEditSlide(slide)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteSlide(slide.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Slide Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingSlide ? 'Edit Slide Item' : 'Add New Slide'}</DialogTitle>
                        <DialogDescription>Fill in slide details, caption, and Call-to-Action link.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="slideTitle">Slide Title</Label>
                            <Input
                                id="slideTitle"
                                value={slideFormTitle}
                                onChange={(e) => setSlideFormTitle(e.target.value)}
                                placeholder="e.g. Luxury Wedding Styling"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slideSubtitle">Slide Subtitle / Description</Label>
                            <Textarea
                                id="slideSubtitle"
                                value={slideFormSubtitle}
                                onChange={(e) => setSlideFormSubtitle(e.target.value)}
                                placeholder="Brief description for the slide caption..."
                                rows={2}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="slideCtaLabel">CTA Button Text</Label>
                                <Input
                                    id="slideCtaLabel"
                                    value={slideFormCtaLabel}
                                    onChange={(e) => setSlideFormCtaLabel(e.target.value)}
                                    placeholder="e.g. View Details"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slideCtaUrl">CTA URL</Label>
                                <Input
                                    id="slideCtaUrl"
                                    value={slideFormCtaUrl}
                                    onChange={(e) => setSlideFormCtaUrl(e.target.value)}
                                    placeholder="/events/wedding"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveSlideItem}>
                            Save Slide
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
