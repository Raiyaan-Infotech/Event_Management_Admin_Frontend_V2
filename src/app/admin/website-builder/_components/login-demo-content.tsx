'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    LogIn,
    Check,
    Sparkles,
    Loader2,
    Monitor,
    Layers,
    LayoutGrid,
    DollarSign,
    HelpCircle,
    Mail,
    Eye,
    RotateCcw,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyThemeSettings } from '@/hooks/useCompanyWebsiteBuilder';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { parseThemeColors } from '@/components/company-website-preview/sections/preview-shared';
import {
    LoginDemoSection,
    FeaturesFirstHighlightSection,
    SignInDemoSection,
    ContactSignupDemoSection,
    SignupDemoSection,
    ChatSignupDemoSection,
    TemplateDemoSection,
} from '@/components/company-website-preview/sections/login-demo-section';
import { PageLoader } from '@/components/common/page-loader';

export const PAGES_CONFIG = [
    { slug: 'home', title: 'Home Page', icon: Monitor, defaultVariant: 'variant_1' },
    { slug: 'features', title: 'Features Page', icon: Layers, defaultVariant: 'variant_2' },
    { slug: 'template', title: 'Template Page', icon: LayoutGrid, defaultVariant: 'variant_7' },
    { slug: 'pricing', title: 'Pricing Page', icon: DollarSign, defaultVariant: 'variant_3' },
    { slug: 'how-it-works', title: "How It's Work", icon: HelpCircle, defaultVariant: 'variant_4' },
    { slug: 'contact', title: 'Contact Page', icon: Mail, defaultVariant: 'variant_5' },
];

export const LOGIN_DEMO_VARIANTS = [
    {
        id: 'variant_1',
        title: 'Ready to Create Your Event App?',
        subtitle: 'Home Page CTA Banner — Gift Badge, Subtitle & Action Buttons',
        badge: 'Home CTA Style',
        description: 'Clean light banner with Gift icon circle badge, subtext, Get Started Free & View Demo App buttons.',
    },
    {
        id: 'variant_2',
        title: 'And Much More — Features Highlight Showcase',
        subtitle: 'Features Page 3-Column Banner — Mockup Box, Feature Pills Grid & CTA Card',
        badge: 'Features 3-Column Style',
        description: 'Rich 3-column banner featuring tablet app mockup, 6 interactive feature pills, and CTA box.',
    },
    {
        id: 'variant_3',
        title: 'Need Custom Enterprise Pricing?',
        subtitle: 'Pricing Page CTA Banner — Enterprise Subtitle & Action Buttons',
        badge: 'Pricing CTA Style',
        description: 'Clean row banner for pricing with custom enterprise wording and action buttons.',
    },
    {
        id: 'variant_4',
        title: 'See How Easy It Is In Action',
        subtitle: 'How It Works Page CTA Banner — Quick Walkthrough & Demo Buttons',
        badge: 'How It Works Style',
        description: 'Clean row banner with walkthrough subtext and Get Started Free button.',
    },
    {
        id: 'variant_5',
        title: "Have questions before joining? / Can't Find What You're Looking For?",
        subtitle: 'Contact Page Support Banner — 24/7 Support Message',
        badge: 'Contact CTA Style',
        description: 'Clean row banner featuring live support message icon, Chat With Us & Signup Demo buttons.',
    },
    {
        id: 'variant_6',
        title: 'Create, Share & Celebrate Your Special Moments',
        subtitle: 'Features Dark Banner — Deep Dark Container with Highlight Accent Text',
        badge: 'Features Dark Banner',
        description: 'Dark slate container with purple/pink theme accent highlight, Create Your App Now & Book a Demo buttons.',
    },
    {
        id: 'variant_7',
        title: "Can't Find What You're Looking For?",
        subtitle: 'Template Page Banner — Mobile App Mockup, 3 Feature Checklist Badges & Action Buttons',
        badge: 'Template Custom Style',
        description: 'Light tinted banner featuring phone template graphic, 3 feature checklist badges, Create Custom Template button & View How It Works link.',
    },
];

interface LoginDemoContentProps {
    initialPageSlug?: string;
}

export function LoginDemoContent({ initialPageSlug = 'home' }: LoginDemoContentProps) {
    const router = useRouter();
    const activePageSlug = PAGES_CONFIG.some((p) => p.slug === initialPageSlug) ? initialPageSlug : 'home';
    const currentPageConfig = PAGES_CONFIG.find((p) => p.slug === activePageSlug) || PAGES_CONFIG[0];

    const { data: themeData } = useCompanyThemeSettings();
    const theme = parseThemeColors(themeData);

    // Local storage key per page for selected variant
    const storageKey = `login_demo_variant_${activePageSlug}`;

    const [selectedVariant, setSelectedVariant] = useState<string>(currentPageConfig.defaultVariant);
    const [appliedVariant, setAppliedVariant] = useState<string>(currentPageConfig.defaultVariant);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const searchParams = useSearchParams();
    const urlVariant = searchParams?.get('variant');

    useEffect(() => {
        if (urlVariant && LOGIN_DEMO_VARIANTS.some((v) => v.id === urlVariant)) {
            setSelectedVariant(urlVariant);
            setAppliedVariant(urlVariant);
            return;
        }
        const saved = localStorage.getItem(storageKey);
        if (saved && LOGIN_DEMO_VARIANTS.some((v) => v.id === saved)) {
            setSelectedVariant(saved);
            setAppliedVariant(saved);
        } else {
            setSelectedVariant(currentPageConfig.defaultVariant);
            setAppliedVariant(currentPageConfig.defaultVariant);
        }
    }, [activePageSlug, currentPageConfig.defaultVariant, storageKey, urlVariant]);

    const handlePageChange = (slug: string) => {
        router.push(`/admin/website-builder/login-demo/${slug}`);
    };

    const handleApply = async () => {
        setIsSaving(true);
        try {
            // Save to localStorage for instant UI persistence
            localStorage.setItem(storageKey, selectedVariant);
            setAppliedVariant(selectedVariant);
            await new Promise((resolve) => setTimeout(resolve, 500));
            toast.success(`Login & Demo block applied to ${currentPageConfig.title}!`);
        } catch (err: any) {
            toast.error('Failed to apply Login & Demo block');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        const defaultVar = currentPageConfig.defaultVariant;
        setSelectedVariant(defaultVar);
        setAppliedVariant(defaultVar);
        localStorage.removeItem(storageKey);
        toast.info('Reset to default variant.');
    };

    const [previewOpen, setPreviewOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const activeVariantDetails = LOGIN_DEMO_VARIANTS.find((v) => v.id === selectedVariant) || LOGIN_DEMO_VARIANTS[0];

    return (
        <div className="space-y-6">
            <PageLoader open={isSaving} text="Saving Login & Demo..." />
            {/* Top Page Selector Tabs */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        {currentPageConfig.title} — Login & Demo Block
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Select which Login & Demo design block variant to display on {currentPageConfig.title}.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="gap-1.5 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
                    >
                        <Eye className="h-3.5 w-3.5 text-emerald-600" /> Live Preview
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="gap-2 h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5" /> Reset Default
                    </Button>
                </div>
            </div>

            {/* Selection Box & Apply Button */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Select Login & Demo Variant for {currentPageConfig.title}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Choose a design template from the dropdown menu below and click Apply.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        {/* Dropdown Selector */}
                        <div className="flex-1">
                            <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                                <SelectTrigger className="w-full h-11 border-border bg-background font-medium text-sm">
                                    <SelectValue>{activeVariantDetails.title}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {LOGIN_DEMO_VARIANTS.map((variant) => (
                                        <SelectItem key={variant.id} value={variant.id} className="py-2.5">
                                            <div className="flex flex-col gap-0.5 text-left">
                                                <span className="font-semibold text-sm text-foreground">
                                                    {variant.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {variant.subtitle}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Apply Button */}
                        <Button
                            size="lg"
                            onClick={handleApply}
                            disabled={isSaving}
                            className="h-11 px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md min-w-[140px]"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {isSaving ? 'Applying...' : 'Apply'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Live Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-5xl border-border bg-card">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <DialogTitle className="text-sm font-bold text-foreground">Login & Demo Block — Live Preview</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Variant: {activeVariantDetails.title} ({currentPageConfig.title})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="w-full border rounded-xl overflow-hidden shadow-inner my-2 bg-background">
                        {selectedVariant === 'variant_1' && <LoginDemoSection theme={theme} companyName="Event Management" />}
                        {selectedVariant === 'variant_2' && <FeaturesFirstHighlightSection theme={theme} companyName="Event Management" />}
                        {selectedVariant === 'variant_3' && <ContactSignupDemoSection theme={theme} companyName="Event Management" />}
                        {selectedVariant === 'variant_4' && <SignupDemoSection theme={theme} companyName="Event Management" />}
                        {selectedVariant === 'variant_5' && <ChatSignupDemoSection theme={theme} companyName="Event Management" />}
                        {selectedVariant === 'variant_6' && <SignInDemoSection theme={theme} companyName="Event Management" />}
                        {selectedVariant === 'variant_7' && <TemplateDemoSection theme={theme} companyName="Event Management" />}
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}
