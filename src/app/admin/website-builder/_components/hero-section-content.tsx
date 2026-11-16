'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Save,
    RotateCcw,
    Sparkles,
    Upload,
    Monitor,
    Smartphone,
    Crop,
    Trash2,
    Phone,
    Mail,
    HelpCircle,
    Loader2,
    Eye,
    ArrowLeft,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { BuilderCountedInput, BuilderCountedTextarea } from './builder-field';
import { MediaCropDialog } from '@/components/common/media-crop-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { useCompanyHeroSection } from '@/hooks/useCompanyWebsiteBuilder';
import { TranslationSideCard, type TranslatableField } from './translation-side-card';
import { TranslationModeBanner } from './translation-mode-banner';
import { useSectionTranslation, handleTranslationSave } from '@/hooks/useSectionTranslation';
import {
    useRegisterTranslationKeys,
} from '@/hooks/useWebsiteBuilderTranslations';
import { mediaApi } from '@/hooks/use-media';
import { PageLoader } from '@/components/common/page-loader';
import { cn } from '@/lib/utils';

type PreviewDevice = 'desktop' | 'mobile';
type HeroHeight = 'small' | 'medium' | 'large' | 'fullscreen';
type ButtonStyle = 'Primary' | 'Outline' | 'Ghost';
type ButtonLayout = 'left' | 'center' | 'right' | 'space-between' | 'stack';
type ContentAlign = 'left' | 'center' | 'right';
type LinkTargetMode = 'page' | 'custom';

interface HeroSectionContentProps {
    pageSlug?: string;
}

// Heroes saved before the colour picker existed have no stored value; white is
// what they rendered as, so it stays the default here and in `buildHero`.
const DEFAULT_HERO_TEXT_COLOR = '#FFFFFF';

const PAGES_CONFIG = [
    { slug: 'home', title: 'Home Page' },
    { slug: 'features', title: 'Features Page' },
    { slug: 'template', title: 'Template Page' },
    { slug: 'pricing', title: 'Pricing Page' },
    { slug: 'how-it-works', title: "How It's Work" },
    { slug: 'contact', title: 'Contact Page' },
];

export function HeroSectionContent({ pageSlug = 'home' }: HeroSectionContentProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlPage = searchParams.get('page');
    const activePageSlug = urlPage || pageSlug || 'home';
    const activePageTitle = PAGES_CONFIG.find((p) => p.slug === activePageSlug)?.title || 'Home Page';

    const langParam = searchParams.get('lang');
    const activeLanguageId = langParam ? Number(langParam) : null;

    const { data: heroData, isLoading, save, isSaving } = useCompanyHeroSection(activePageSlug);
    const registerTranslationKeys = useRegisterTranslationKeys();

    // Translations are keyed by the hero row's id — must match what the backend
    // content scan registers, otherwise saved translations won't be found.
    const heroRecordId = heroData?.id;


    const [previewOpen, setPreviewOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    // Hero Content
    const [badgeText, setBadgeText] = useState('Best Event Management');
    const [title, setTitle] = useState('We Create Unforgettable Moments');
    const [description, setDescription] = useState('From elegant weddings to corporate events, we handle every detail with creativity and perfection.');
    const [heroImage, setHeroImage] = useState('');

    // Button 1
    const [btn1Enabled, setBtn1Enabled] = useState(true);
    const [btn1Label, setBtn1Label] = useState('Explore Events');
    const [btn1Style, setBtn1Style] = useState<ButtonStyle>('Primary');
    const [btn1TargetMode, setBtn1TargetMode] = useState<LinkTargetMode>('custom');
    const [btn1CustomUrl, setBtn1CustomUrl] = useState('/events');

    // Button 2
    const [btn2Enabled, setBtn2Enabled] = useState(true);
    const [btn2Label, setBtn2Label] = useState('Contact Us');
    const [btn2Style, setBtn2Style] = useState<ButtonStyle>('Outline');
    const [btn2TargetMode, setBtn2TargetMode] = useState<LinkTargetMode>('custom');
    const [btn2CustomUrl, setBtn2CustomUrl] = useState('/contact');

    // Middle Column Settings
    const [heroHeight, setHeroHeight] = useState<HeroHeight>('medium');
    const [overlayEnabled, setOverlayEnabled] = useState(true);
    const [overlayColor, setOverlayColor] = useState('#000000');
    const [overlayOpacity, setOverlayOpacity] = useState(60);
    // Hero text was hardcoded white, which vanishes on a light hero image.
    // Per page, because each page has its own image.
    const [titleColor, setTitleColor] = useState(DEFAULT_HERO_TEXT_COLOR);
    const [descriptionColor, setDescriptionColor] = useState(DEFAULT_HERO_TEXT_COLOR);
    const [buttonLayout, setButtonLayout] = useState<ButtonLayout>('left');
    const [contentAlign, setContentAlign] = useState<ContentAlign>('left');

    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');

    // Cropper State
    const [cropOpen, setCropOpen] = useState(false);
    const [cropImageRaw, setCropImageRaw] = useState('');
    const [cropFileName, setCropFileName] = useState('hero.jpg');
    const [cropMimeType, setCropMimeType] = useState('image/jpeg');

    useEffect(() => {
        if (heroData && Object.keys(heroData).length > 0) {
            setBadgeText(heroData.badge_text ?? '');
            setTitle(heroData.title ?? '');
            setDescription(heroData.description ?? '');
            setHeroImage(heroData.image_url ?? '');
            setHeroHeight((heroData.hero_height as HeroHeight) || 'medium');
            setOverlayEnabled(heroData.overlay_enabled !== undefined ? Boolean(heroData.overlay_enabled) : true);
            setOverlayColor(heroData.overlay_color || '#000000');
            setOverlayOpacity(heroData.overlay_opacity !== undefined ? Number(heroData.overlay_opacity) : 60);
            setButtonLayout((heroData.button_layout as ButtonLayout) || 'left');
            setContentAlign((heroData.content_alignment as ContentAlign) || 'left');
            setTitleColor(heroData.title_color || DEFAULT_HERO_TEXT_COLOR);
            setDescriptionColor(heroData.description_color || DEFAULT_HERO_TEXT_COLOR);

            if (heroData.button_1_json) {
                setBtn1Enabled(Boolean(heroData.button_1_json.enabled));
                setBtn1Label(heroData.button_1_json.label ?? '');
                setBtn1Style(heroData.button_1_json.style || 'Primary');
                setBtn1CustomUrl(heroData.button_1_json.url ?? '');
            } else {
                setBtn1Enabled(true);
                setBtn1Label('Explore Events');
                setBtn1Style('Primary');
                setBtn1CustomUrl('/events');
            }

            if (heroData.button_2_json) {
                setBtn2Enabled(Boolean(heroData.button_2_json.enabled));
                setBtn2Label(heroData.button_2_json.label ?? '');
                setBtn2Style(heroData.button_2_json.style || 'Outline');
                setBtn2CustomUrl(heroData.button_2_json.url ?? '');
            } else {
                setBtn2Enabled(true);
                setBtn2Label('Contact Us');
                setBtn2Style('Outline');
                setBtn2CustomUrl('/contact');
            }
        } else {
            setBadgeText('Best Event Management');
            setTitle('We Create Unforgettable Moments');
            setDescription('From elegant weddings to corporate events, we handle every detail with creativity and perfection.');
            setHeroImage('');
            setHeroHeight('medium');
            setOverlayEnabled(true);
            setOverlayColor('#000000');
            setOverlayOpacity(60);
            setButtonLayout('left');
            setContentAlign('left');
            setTitleColor(DEFAULT_HERO_TEXT_COLOR);
            setDescriptionColor(DEFAULT_HERO_TEXT_COLOR);
            setBtn1Enabled(true);
            setBtn1Label('Explore Events');
            setBtn1Style('Primary');
            setBtn1CustomUrl('/events');
            setBtn2Enabled(true);
            setBtn2Label('Contact Us');
            setBtn2Style('Outline');
            setBtn2CustomUrl('/contact');
        }
    }, [heroData, activePageSlug]);

    const handleSave = async () => {
        // Translation mode: only the text fields exist per-language — everything
        // else (image, colors, layout) is shared and edited from the English version.
        if (await handleTranslationSave(translation, activePageTitle)) return;

        try {
            await save({
                page_slug: activePageSlug,
                badge_text: badgeText,
                title,
                description,
                image_url: heroImage,
                hero_height: heroHeight,
                overlay_enabled: overlayEnabled ? 1 : 0,
                overlay_color: overlayColor,
                overlay_opacity: overlayOpacity,
                button_layout: buttonLayout,
                content_alignment: contentAlign,
                // Not columns on company_website_hero_sections — the hook nests
                // the whole payload under design_json[page_slug] and layers it
                // back on read, so new fields persist without a migration.
                title_color: titleColor,
                description_color: descriptionColor,
                button_1_json: { enabled: btn1Enabled, label: btn1Label, style: btn1Style, url: btn1CustomUrl },
                button_2_json: { enabled: btn2Enabled, label: btn2Label, style: btn2Style, url: btn2CustomUrl },
            });

            // Register/refresh the translation key catalog so the language
            // side card and auto-translate always see this section's current fields.
            registerTranslationKeys.mutate({
                section: 'hero-section',
                page_slug: activePageSlug,
                record_id: heroRecordId,
                fields: [
                    { key: 'badge_text', label: 'Badge Text', type: 'input', value: badgeText },
                    { key: 'title', label: 'Title', type: 'input', value: title },
                    { key: 'description', label: 'Description', type: 'textarea', value: description },
                    { key: 'button_1_label', label: 'Button 1 Label', type: 'input', value: btn1Label },
                    { key: 'button_2_label', label: 'Button 2 Label', type: 'input', value: btn2Label },
                ],
            });

            toast.success(`Hero section settings for ${activePageTitle} saved successfully`);
            // Fill every language straight off the save — no second button.
            await translation.translateAfterSave();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save hero section');
        }
    };

    const translatableFields: TranslatableField[] = [
        { key: 'badge_text', label: 'Badge Text', value: badgeText, type: 'input', maxLength: 60 },
        { key: 'title', label: 'Title', value: title, type: 'input', maxLength: 120, required: true },
        { key: 'description', label: 'Description', value: description, type: 'textarea', maxLength: 300 },
        { key: 'button_1_label', label: 'Button 1 Label', value: btn1Label, type: 'input', maxLength: 40 },
        { key: 'button_2_label', label: 'Button 2 Label', value: btn2Label, type: 'input', maxLength: 40 },
    ];

    // Shared per-form translation mode — same hook every other section uses, so
    // Hero gets the full-screen progress loader and identical behaviour.
    const translation = useSectionTranslation({
        section: 'hero-section',
        pageSlug: activePageSlug,
        recordId: heroRecordId,
        fields: translatableFields,
    });
    const activeLanguage = translation.activeLanguage;
    const isTranslationMode = translation.isTranslationMode;

    // Mobile Settings
    const [hideBtn2Mobile, setHideBtn2Mobile] = useState(false);
    const [centerMobile, setCenterMobile] = useState(true);
    const [mobileHeroHeight, setMobileHeroHeight] = useState('medium-500');

    const handleFileSelect = (file: File) => {
        setCropFileName(file.name);
        setCropMimeType(file.type || 'image/jpeg');
        const reader = new FileReader();
        reader.onload = (e) => {
            setCropImageRaw(e.target?.result as string);
            setCropOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropped = async (file: File, dataUrl: string) => {
        setCropOpen(false);
        const tid = toast.loading('Uploading hero image...');
        try {
            const res = await mediaApi.upload(file, 'website-builder');
            if (res?.url) {
                setHeroImage(res.url);
                toast.success('Hero image uploaded successfully', { id: tid });
            } else {
                setHeroImage(dataUrl);
                toast.success('Hero image cropped successfully', { id: tid });
            }
        } catch {
            setHeroImage(dataUrl);
            toast.success('Hero image cropped.', { id: tid });
        }
    };

    const handleReset = () => {
        setBadgeText('Best Event Management');
        setTitle('We Create Unforgettable Moments');
        setDescription('From elegant weddings to corporate events, we handle every detail with creativity and perfection. Let us bring your dream event to life.');
        setHeroHeight('medium');
        setOverlayEnabled(true);
        setOverlayOpacity(60);
        setButtonLayout('left');
        setContentAlign('left');
        setTitleColor(DEFAULT_HERO_TEXT_COLOR);
        setDescriptionColor(DEFAULT_HERO_TEXT_COLOR);
        toast.info('Hero Section settings reset.');
    };

    const isSavingAny = isSaving || translation.isSaving;

    return (
        <div className="space-y-4">
            <PageLoader open={isSavingAny || isLoading} text={`Loading ${activePageTitle} Hero Section...`} />

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
                <div>
                    <h1 className="mt-1 text-xl font-bold tracking-tight">
                        Hero Section — {activePageTitle}
                        {isTranslationMode && activeLanguage && (
                            <span className="ml-2 text-primary">({activeLanguage.name})</span>
                        )}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {isTranslationMode
                            ? `Translating this section's text into ${activeLanguage?.name}.`
                            : `Manage your website hero section and Hero Section settings for ${activePageTitle}.`}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-8 px-3 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                        <Eye className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Live Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info('Configure homepage hero title, subtitle, CTA buttons, and background banner.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    {!isTranslationMode && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                            <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                        </Button>
                    )}
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSavingAny} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSavingAny ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSavingAny ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Translation Mode Banner (shared component: carries the
                full-screen progress loader for auto-translate) */}
            <TranslationModeBanner translation={translation} label={activePageTitle} />
            {/* Page Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
                {PAGES_CONFIG.map((p) => {
                    const isActive = p.slug === activePageSlug;
                    return (
                        <button
                            key={p.slug}
                            type="button"
                            onClick={() => router.push(`/admin/website-builder/hero-section?page=${p.slug}`)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer',
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

            {/* 2-Column Expanded Form Layout (6 + 6 Cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Column 1: Hero Content, Button 1 & Button 2 (6 Cols) */}
                <div className="xl:col-span-6 space-y-4">
                    {/* Hero Content Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2.5 px-3 border-b">
                            <CardTitle className="text-xs font-bold text-slate-800">Hero Content</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2.5">
                            {/* Hero Image Upload Box — shared across all languages, edit from English */}
                            <div className={cn('space-y-1', isTranslationMode && 'opacity-50 pointer-events-none')}>
                                <Label className="text-[9px] font-black uppercase tracking-wider text-slate-500">HERO IMAGE</Label>
                                {heroImage ? (
                                    <div className="relative rounded-lg overflow-hidden border bg-card p-1.5 flex items-center gap-2.5">
                                        <img src={heroImage} alt="Hero Preview" className="h-14 w-24 object-cover rounded border" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-foreground">Hero Image</p>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setCropImageRaw(heroImage);
                                                        setCropOpen(true);
                                                    }}
                                                    className="h-5.5 text-[9px] px-1.5 gap-1"
                                                >
                                                    <Crop className="h-2.5 w-2.5" /> Re-crop
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setHeroImage('')}
                                                    className="h-5.5 text-[9px] px-1.5 text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-2.5 w-2.5" /> Remove
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col items-center justify-center h-20 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/60 cursor-pointer p-2 text-center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileSelect(file);
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Upload className="h-4 w-4 text-slate-400 mb-0.5" />
                                        <span className="text-[11px] font-bold text-slate-700">Click to upload or drag & drop</span>
                                        <span className="text-[9px] text-slate-400">Recommended: 1920x1080px (Max: 2MB)</span>
                                    </div>
                                )}
                            </div>

                            <BuilderCountedInput
                                label="Badge Text (Optional)"
                                {...translation.bind('badge_text', badgeText, setBadgeText)}
                                maxLength={50}
                                inputClassName="!h-7.5 text-xs"
                            />

                            <BuilderCountedInput
                                label="Title"
                                required
                                {...translation.bind('title', title, setTitle)}
                                maxLength={70}
                                inputClassName={cn(
                                    '!h-7.5 text-xs',
                                    translation.errors.title && 'border-red-500 ring-1 ring-red-500'
                                )}
                            />

                            <BuilderCountedTextarea
                                label="Description"
                                {...translation.bind('description', description, setDescription)}
                                maxLength={300}
                                textareaClassName="!min-h-[52px] !max-h-[52px] text-xs resize-none"
                            />
                        </CardContent>
                    </Card>

                    {/* Button 1 (Primary CTA) Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-800">Button 1 (Primary CTA)</CardTitle>
                            <Switch checked={btn1Enabled} onCheckedChange={setBtn1Enabled} disabled={isTranslationMode} />
                        </CardHeader>
                        {btn1Enabled && (
                            <CardContent className="p-3 space-y-2">
                                <BuilderCountedInput
                                    label="Label"
                                    {...translation.bind('button_1_label', btn1Label, setBtn1Label)}
                                    maxLength={30}
                                    inputClassName="!h-7.5 text-xs"
                                />

                                <div className={cn('space-y-1', isTranslationMode && 'opacity-50 pointer-events-none')}>
                                    <Label className="text-[10px] font-semibold text-slate-600">Style</Label>
                                    <Select value={btn1Style} onValueChange={(val: ButtonStyle) => setBtn1Style(val)}>
                                        <SelectTrigger className="h-7.5 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Primary">Primary</SelectItem>
                                            <SelectItem value="Outline">Outline</SelectItem>
                                            <SelectItem value="Ghost">Ghost</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className={cn('space-y-2', isTranslationMode && 'opacity-50 pointer-events-none')}>
                                    <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100/70 border border-slate-200 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setBtn1TargetMode('page')}
                                            className={cn('flex items-center justify-center gap-1 py-0.5 rounded-md font-semibold text-[11px] transition-all', btn1TargetMode === 'page' ? 'bg-white text-blue-600 shadow-xs border border-blue-600/30' : 'text-slate-500')}
                                        >
                                            <span className={cn('h-2 w-2 rounded-full border', btn1TargetMode === 'page' ? 'bg-blue-600 border-blue-600' : 'border-slate-400')} /> Page
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBtn1TargetMode('custom')}
                                            className={cn('flex items-center justify-center gap-1 py-0.5 rounded-md font-semibold text-[11px] transition-all', btn1TargetMode === 'custom' ? 'bg-white text-blue-600 shadow-xs border border-blue-600/30' : 'text-slate-500')}
                                        >
                                            <span className={cn('h-2 w-2 rounded-full border', btn1TargetMode === 'custom' ? 'bg-blue-600 border-blue-600' : 'border-slate-400')} /> Custom
                                        </button>
                                    </div>

                                    {btn1TargetMode === 'custom' && (
                                        <BuilderCountedInput
                                            label="Custom URL"
                                            value={btn1CustomUrl}
                                            onChange={setBtn1CustomUrl}
                                            maxLength={200}
                                            inputClassName="!h-7.5 text-xs"
                                        />
                                    )}
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Button 2 (Optional CTA) Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-800">Button 2 (Optional CTA)</CardTitle>
                            <Switch checked={btn2Enabled} onCheckedChange={setBtn2Enabled} disabled={isTranslationMode} />
                        </CardHeader>
                        {btn2Enabled && (
                            <CardContent className="p-3 space-y-2">
                                <BuilderCountedInput
                                    label="Label"
                                    {...translation.bind('button_2_label', btn2Label, setBtn2Label)}
                                    maxLength={30}
                                    inputClassName="!h-7.5 text-xs"
                                />

                                <div className={cn('space-y-2', isTranslationMode && 'opacity-50 pointer-events-none')}>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-slate-600">Style</Label>
                                    <Select value={btn2Style} onValueChange={(val: ButtonStyle) => setBtn2Style(val)}>
                                        <SelectTrigger className="h-7.5 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Primary">Primary</SelectItem>
                                            <SelectItem value="Outline">Outline</SelectItem>
                                            <SelectItem value="Ghost">Ghost</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100/70 border border-slate-200 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setBtn2TargetMode('page')}
                                        className={cn('flex items-center justify-center gap-1 py-0.5 rounded-md font-semibold text-[11px] transition-all', btn2TargetMode === 'page' ? 'bg-white text-blue-600 shadow-xs border border-blue-600/30' : 'text-slate-500')}
                                    >
                                        <span className={cn('h-2 w-2 rounded-full border', btn2TargetMode === 'page' ? 'bg-blue-600 border-blue-600' : 'border-slate-400')} /> Page
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBtn2TargetMode('custom')}
                                        className={cn('flex items-center justify-center gap-1 py-0.5 rounded-md font-semibold text-[11px] transition-all', btn2TargetMode === 'custom' ? 'bg-white text-blue-600 shadow-xs border border-blue-600/30' : 'text-slate-500')}
                                    >
                                        <span className={cn('h-2 w-2 rounded-full border', btn2TargetMode === 'custom' ? 'bg-blue-600 border-blue-600' : 'border-slate-400')} /> Custom
                                    </button>
                                </div>

                                {btn2TargetMode === 'page' && (
                                     <div className="space-y-1">
                                         <Label className="text-[10px] font-semibold text-slate-600">Button Page</Label>
                                         <Select value={btn2CustomUrl || 'contact'} onValueChange={setBtn2CustomUrl}>
                                             <SelectTrigger className="h-7.5 text-xs border-slate-200"><SelectValue placeholder="Select Page" /></SelectTrigger>
                                             <SelectContent>
                                                 <SelectItem value="home">Home</SelectItem>
                                                 <SelectItem value="about">About Us</SelectItem>
                                                 <SelectItem value="services">Services</SelectItem>
                                                 <SelectItem value="events">Events</SelectItem>
                                                 <SelectItem value="gallery">Gallery</SelectItem>
                                                 <SelectItem value="contact">Contact Us</SelectItem>
                                             </SelectContent>
                                         </Select>
                                     </div>
                                 )}

                                {btn2TargetMode === 'custom' && (
                                    <BuilderCountedInput
                                        label="Custom URL"
                                        value={btn2CustomUrl}
                                        onChange={setBtn2CustomUrl}
                                        maxLength={200}
                                        inputClassName="!h-7.5 text-xs"
                                    />
                                )}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* Column 2: Height, Overlay, Mobile, Layout & Alignment (6 Cols) */}
                <div className="xl:col-span-6 space-y-4">
                    {/* Translations Side Card */}
                    <TranslationSideCard
                        section="hero-section"
                        pageSlug={activePageSlug}
                        recordId={heroRecordId}
                        fields={translatableFields}
                        activeLanguageId={activeLanguageId}
                        buildHref={(languageId) => {
                            const params = new URLSearchParams();
                            params.set('page', activePageSlug);
                            if (languageId) params.set('lang', String(languageId));
                            return `/admin/website-builder/hero-section?${params.toString()}`;
                        }}
                    />

                    {/* The cards below are shared across all languages — disabled while translating */}
                    <div className={cn('space-y-4', isTranslationMode && 'opacity-50 pointer-events-none')}>

                    {/* Hero Height Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2 px-3 border-b">
                            <CardTitle className="text-xs font-bold text-slate-800">Hero Height</CardTitle>
                            <CardDescription className="text-[10px]">Set height of hero section.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 space-y-1.5">
                            {[
                                { label: 'Small (400px)', value: 'small' },
                                { label: 'Medium (600px)', value: 'medium' },
                                { label: 'Large (800px)', value: 'large' },
                                { label: 'Full Screen', value: 'fullscreen' },
                            ].map((opt) => (
                                <label key={opt.value} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="heroHeight"
                                        value={opt.value}
                                        checked={heroHeight === opt.value}
                                        onChange={() => setHeroHeight(opt.value as HeroHeight)}
                                        className="h-3 w-3 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Overlay Settings Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2 px-3 border-b">
                            <CardTitle className="text-xs font-bold text-slate-800">Overlay Settings</CardTitle>
                            <CardDescription className="text-[10px]">Improve text readability.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-700">Enable Overlay</Label>
                                <Switch checked={overlayEnabled} onCheckedChange={setOverlayEnabled} />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-600">Overlay Color</Label>
                                <div className="flex items-center gap-2 rounded-lg border p-1 bg-white">
                                    <input
                                        type="color"
                                        value={overlayColor}
                                        onChange={(e) => setOverlayColor(e.target.value)}
                                        className="h-6 w-7 cursor-pointer p-0.5 rounded border"
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-700">{overlayColor}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <Label className="text-[10px] font-semibold text-slate-600">Overlay Opacity</Label>
                                    <span className="font-bold text-slate-700">{overlayOpacity}%</span>
                                </div>
                                <Slider
                                    value={[overlayOpacity]}
                                    onValueChange={(val) => setOverlayOpacity(val[0])}
                                    min={0}
                                    max={100}
                                    step={1}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Text Colors Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2 px-3 border-b">
                            <CardTitle className="text-xs font-bold text-slate-800">Text Colors</CardTitle>
                            <CardDescription className="text-[10px]">Pick colors that read against this page&apos;s hero image.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2.5">
                            {[
                                { label: 'Title Color', value: titleColor, set: setTitleColor },
                                { label: 'Description Color', value: descriptionColor, set: setDescriptionColor },
                            ].map((field) => (
                                <div key={field.label} className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-slate-600">{field.label}</Label>
                                    <div className="flex items-center gap-2 rounded-lg border p-1 bg-white">
                                        <input
                                            type="color"
                                            value={field.value}
                                            onChange={(e) => field.set(e.target.value)}
                                            className="h-6 w-7 cursor-pointer p-0.5 rounded border"
                                        />
                                        <span className="text-xs font-mono font-bold text-slate-700">{field.value.toUpperCase()}</span>
                                        {field.value.toUpperCase() !== DEFAULT_HERO_TEXT_COLOR && (
                                            <button
                                                type="button"
                                                onClick={() => field.set(DEFAULT_HERO_TEXT_COLOR)}
                                                className="ml-auto mr-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Mobile Settings Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2 px-3 border-b">
                            <CardTitle className="text-xs font-bold text-slate-800">Mobile Settings</CardTitle>
                            <CardDescription className="text-[10px]">Customize for mobile devices.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-semibold text-slate-700">Hide Button 2 on Mobile</Label>
                                <Switch checked={hideBtn2Mobile} onCheckedChange={setHideBtn2Mobile} />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-semibold text-slate-700">Center Content on Mobile</Label>
                                <Switch checked={centerMobile} onCheckedChange={setCenterMobile} />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-600">Mobile Hero Height</Label>
                                <Select value={mobileHeroHeight} onValueChange={setMobileHeroHeight}>
                                    <SelectTrigger className="h-7.5 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small-300">Small (300px)</SelectItem>
                                        <SelectItem value="medium-500">Medium (500px)</SelectItem>
                                        <SelectItem value="large-700">Large (700px)</SelectItem>
                                        <SelectItem value="fullscreen">Full Screen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Button Layout Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2 px-3 border-b">
                            <CardTitle className="text-xs font-bold text-slate-800">Button Layout</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2.5">
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    { value: 'left', label: 'Left' },
                                    { value: 'center', label: 'Center' },
                                    { value: 'right', label: 'Right' },
                                    { value: 'space-between', label: 'Space Between' },
                                    { value: 'stack', label: 'Stack Vertical' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setButtonLayout(opt.value as ButtonLayout)}
                                        className={cn(
                                            'flex flex-col items-center justify-center py-1.5 px-2 rounded border text-[10px] font-bold transition-all',
                                            buttonLayout === opt.value
                                                ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Content Alignment Card */}
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-2 px-3 border-b">
                            <CardTitle className="text-xs font-bold text-slate-800">Content Alignment</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2.5">
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { value: 'left', label: 'Left' },
                                    { value: 'center', label: 'Center' },
                                    { value: 'right', label: 'Right' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setContentAlign(opt.value as ContentAlign)}
                                        className={cn(
                                            'rounded border p-1.5 text-center text-xs font-semibold transition-colors',
                                            contentAlign === opt.value
                                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    </div>
                </div>
            </div>

            {/* Live Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl border-slate-200">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <DialogTitle className="text-sm font-bold text-slate-900">Hero Section — Live Preview</DialogTitle>
                            </div>
                            <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/40 mr-6">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={cn(
                                        'flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-semibold',
                                        previewDevice === 'desktop' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                                    )}
                                >
                                    <Monitor className="h-3.5 w-3.5" /> Desktop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={cn(
                                        'flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-semibold',
                                        previewDevice === 'mobile' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                                    )}
                                >
                                    <Smartphone className="h-3.5 w-3.5" /> Mobile
                                </button>
                            </div>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            Real-time interactive website hero preview.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 bg-slate-100 rounded-xl overflow-hidden">
                        <div className={cn(
                            'mx-auto rounded-xl overflow-hidden shadow-xl transition-all duration-300 border border-slate-800',
                            previewDevice === 'mobile' ? 'max-w-[340px]' : 'w-full'
                        )}>
                            {/* Simulated Website Header Bar */}
                            <div className="bg-[#0B0D17] px-3 py-1.5 text-[9px] text-white/70 border-b border-white/10 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 truncate">
                                    <span className="flex items-center gap-1 shrink-0"><Phone className="h-2.5 w-2.5 text-blue-400" /> +91 98765 43210</span>
                                    {previewDevice === 'desktop' && (
                                        <span className="flex items-center gap-1 truncate"><Mail className="h-2.5 w-2.5 text-blue-400" /> hello@eventify.com</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-[8px] font-bold text-white/70 shrink-0">
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/90">in</span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/90">ig</span>
                                </div>
                            </div>

                            {/* Simulated Nav Bar */}
                            <div className="bg-white px-3 py-2 flex items-center justify-between gap-2 text-xs text-slate-800 font-semibold border-b shadow-2xs">
                                <span className="font-bold text-xs tracking-tight text-slate-900 shrink-0 flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                                    Eventify
                                </span>
                                {previewDevice === 'desktop' && (
                                    <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium truncate mx-1">
                                        <span>Home</span>
                                        <span>About</span>
                                        <span>Services</span>
                                        <span>Events</span>
                                        <span>Contact</span>
                                    </div>
                                )}
                                <Button size="sm" className="h-6 text-[10px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 whitespace-nowrap">
                                    Book Now
                                </Button>
                            </div>

                            {/* Hero Banner Live Container */}
                            <div className={cn(
                                'relative flex flex-col justify-center p-6 text-white min-h-[360px]',
                                heroHeight === 'small' ? 'min-h-[280px]' : heroHeight === 'large' ? 'min-h-[460px]' : 'min-h-[360px]'
                            )}>
                                {/* Hero Background Image */}
                                {heroImage ? (
                                    <img src={heroImage} alt="Hero Background" className="absolute inset-0 h-full w-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 bg-[#0B0D17]" />
                                )}

                                {/* Overlay */}
                                {overlayEnabled && (
                                    <div
                                        className="absolute inset-0 transition-opacity"
                                        style={{ backgroundColor: overlayColor, opacity: overlayOpacity / 100 }}
                                    />
                                )}

                                {/* Content Wrapper */}
                                <div className={cn(
                                    'relative z-10 space-y-3 max-w-xl',
                                    contentAlign === 'center' || (previewDevice === 'mobile' && centerMobile)
                                        ? 'mx-auto text-center'
                                        : contentAlign === 'right'
                                            ? 'ml-auto text-right'
                                            : 'text-left'
                                )}>
                                    {badgeText && (
                                        <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                            {badgeText}
                                        </span>
                                    )}

                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight" style={{ color: titleColor }}>
                                        {title || 'We Create Unforgettable Moments'}
                                    </h1>

                                    <p className="text-xs leading-relaxed max-w-md" style={{ color: descriptionColor }}>
                                        {description || 'From elegant weddings to corporate events, we handle every detail with creativity and perfection.'}
                                    </p>

                                    {/* Action Buttons */}
                                    <div className={cn(
                                        'flex flex-wrap gap-2 pt-1',
                                        buttonLayout === 'center' || (previewDevice === 'mobile' && centerMobile)
                                            ? 'justify-center'
                                            : buttonLayout === 'right'
                                                ? 'justify-end'
                                                : buttonLayout === 'space-between'
                                                    ? 'justify-between'
                                                    : buttonLayout === 'stack'
                                                        ? 'flex-col items-stretch'
                                                        : 'justify-start'
                                    )}>
                                        {btn1Enabled && (
                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 h-8">
                                                {btn1Label}
                                            </Button>
                                        )}

                                        {btn2Enabled && !(previewDevice === 'mobile' && hideBtn2Mobile) && (
                                            <Button variant="outline" size="sm" className="border-white/40 text-white hover:bg-white/10 font-bold text-xs px-4 h-8 bg-transparent">
                                                {btn2Label}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Media Crop Dialog */}
            <MediaCropDialog
                open={cropOpen}
                imageUrl={cropImageRaw}
                fileName={cropFileName}
                mimeType={cropMimeType}
                onClose={() => setCropOpen(false)}
                onCropped={handleCropped}
            />

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}
