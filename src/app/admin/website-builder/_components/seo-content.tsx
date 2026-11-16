'use client';

import { useEffect, useState } from 'react';
import { Save, Sparkles, FileText, Settings2, Upload, Crop, Trash2, HelpCircle, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BuilderCountedInput, BuilderCountedTextarea } from './builder-field';
import { MediaCropDialog } from '@/components/common/media-crop-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { useCompanySeoSettings } from '@/hooks/useCompanyWebsiteBuilder';
import { mediaApi } from '@/hooks/use-media';
import { PageLoader } from '@/components/common/page-loader';
import { useSectionTranslation, handleTranslationSave } from '@/hooks/useSectionTranslation';
import { TranslationSideCard } from './translation-side-card';
import { TranslationModeBanner } from './translation-mode-banner';
import { cn } from '@/lib/utils';

export function SeoContent() {
    const { data: seoData, isLoading, save, isSaving } = useCompanySeoSettings();

    const [metaTitle, setMetaTitle] = useState('Eventify - Best Event Management & Planning Services');
    const [metaDescription, setMetaDescription] = useState('Eventify offers top-notch event management and planning services for weddings, corporate events, birthdays, and more.');
    const [keywords, setKeywords] = useState('event management, event planning, wedding events, corporate events, birthday parties');
    const [ogImageUrl, setOgImageUrl] = useState('');
    const [cropOpen, setCropOpen] = useState(false);
    const [cropImageRaw, setCropImageRaw] = useState('');
    const [cropFileName, setCropFileName] = useState('og-image.jpg');
    const [cropMimeType, setCropMimeType] = useState('image/jpeg');

    const [robotsMeta, setRobotsMeta] = useState('index-follow');
    const [canonicalUrl, setCanonicalUrl] = useState('https://www.eventify.com');
    const [author, setAuthor] = useState('Eventify Team');
    const [language, setLanguage] = useState('en');
    const [siteName, setSiteName] = useState('Eventify');
    const [sitemapEnabled, setSitemapEnabled] = useState(true);
    const [structuredData, setStructuredData] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    useEffect(() => {
        if (seoData && Object.keys(seoData).length > 0) {
            if (seoData.default_title) setMetaTitle(seoData.default_title);
            if (seoData.default_description) setMetaDescription(seoData.default_description);
            if (seoData.default_keywords) setKeywords(seoData.default_keywords);
            if (seoData.og_image_url) setOgImageUrl(seoData.og_image_url);
            if (seoData.author) setAuthor(seoData.author);
            if (seoData.language) setLanguage(seoData.language);
            if (seoData.site_name) setSiteName(seoData.site_name);
            if (seoData.canonical_url) setCanonicalUrl(seoData.canonical_url);
            if (seoData.sitemap_enabled !== undefined) setSitemapEnabled(Boolean(seoData.sitemap_enabled));
            if (seoData.structured_data_enabled !== undefined) setStructuredData(Boolean(seoData.structured_data_enabled));
        }
    }, [seoData]);

    const TITLE_MAX = 60;
    const DESC_MAX = 160;
    const CANONICAL_MAX = 200;
    const AUTHOR_MAX = 80;
    const SITENAME_MAX = 60;

    const handleReset = () => {
        setMetaTitle('Eventify - Best Event Management & Planning Services');
        setMetaDescription('Eventify offers top-notch event management and planning services for weddings, corporate events, birthdays, and more.');
        setKeywords('event management, event planning, wedding events, corporate events, birthday parties');
        setOgImageUrl('');
        setRobotsMeta('index-follow');
        setCanonicalUrl('https://www.eventify.com');
        setAuthor('Eventify Team');
        setLanguage('en');
        setSiteName('Eventify');
        setSitemapEnabled(true);
        setStructuredData(false);
        toast.info('SEO settings reset to defaults.');
    };

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
        const tid = toast.loading('Uploading OG image...');
        try {
            const res = await mediaApi.upload(file, 'website-builder');
            if (res?.url) {
                setOgImageUrl(res.url);
                toast.success('OG image uploaded successfully', { id: tid });
            } else {
                setOgImageUrl(dataUrl);
                toast.success('OG image cropped successfully', { id: tid });
            }
        } catch {
            setOgImageUrl(dataUrl);
            toast.success('OG image cropped.', { id: tid });
        }
    };

    // Translation mode. Field keys match the `seo` entry in the backend's
    // FIELD_CATALOG; the scan registers this section at page_slug='' with the
    // settings row's id as record_id.
    const translation = useSectionTranslation({
        section: 'seo',
        recordId: (seoData as any)?.id,
        fields: [
            { key: 'site_name', label: 'Site Name', type: 'input', value: siteName },
            { key: 'default_title', label: 'Default Title', type: 'input', value: metaTitle },
            { key: 'default_description', label: 'Default Description', type: 'textarea', value: metaDescription },
        ],
    });
    const { isTranslationMode, bind } = translation;
    // Everything that isn't translatable text is shared across languages and
    // must be edited from the English version.
    const sharedOnly = cn(isTranslationMode && 'opacity-50 pointer-events-none');

    const handleSave = async () => {
        if (await handleTranslationSave(translation, 'SEO Settings')) return;
        try {
            await save({
                default_title: metaTitle,
                default_description: metaDescription,
                default_keywords: keywords,
                og_image_url: ogImageUrl,
                author,
                language,
                site_name: siteName,
                canonical_url: canonicalUrl,
                sitemap_enabled: sitemapEnabled ? 1 : 0,
                structured_data_enabled: structuredData ? 1 : 0,
            });
            // Refresh the key catalog so the side card counts and auto-translate
            // see the English text that was just saved.
            translation.registerKeys();
            toast.success('SEO settings saved successfully');
            // Fill every language straight off the save — no second button.
            await translation.translateAfterSave();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save SEO settings');
        }
    };

    return (
        <div className="space-y-6">
            <PageLoader open={isSaving} text="Saving SEO Settings..." />
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">
                        SEO Settings
                        {isTranslationMode && translation.activeLanguage && (
                            <span className="ml-2 text-primary">({translation.activeLanguage.name})</span>
                        )}
                    </h1>
                    <p className="text-sm text-muted-foreground">Manage metadata, OpenGraph images, robots indexing, canonical URLs, and structured data.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Configure meta titles, OpenGraph images, canonical URLs, and index tags for SEO.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || translation.isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSaving || translation.isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving || translation.isSaving ? 'Saving...' : isTranslationMode ? 'Save Translation' : 'Save SEO Settings'}
                    </Button>
                </div>
            </div>

            {/* Languages + translation mode */}
            <div className="flex flex-col gap-3">
                <div className="w-full self-end lg:w-72">
                    <TranslationSideCard
                        section="seo"
                        recordId={(seoData as any)?.id}
                        activeLanguageId={translation.activeLanguage?.id ?? null}
                        buildHref={translation.buildHref}
                        canTranslate={translation.canTranslate}
                        fields={[
                            { key: 'site_name', label: 'Site Name', value: siteName },
                            { key: 'default_title', label: 'Default Title', value: metaTitle },
                            { key: 'default_description', label: 'Default Description', value: metaDescription, type: 'textarea' },
                        ]}
                    />
                </div>
                <div className="order-first min-w-0">
                    <TranslationModeBanner translation={translation} label="SEO Settings" />
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Section 1: Metadata Information */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                            <CardTitle className="text-lg">Metadata Information</CardTitle>
                            <CardDescription>Optimize how your website appears in search engine results.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Meta Title */}
                        <BuilderCountedInput
                            label="Meta Title"
                            maxLength={TITLE_MAX}
                            {...bind('default_title', metaTitle, setMetaTitle)}
                        />

                        {/* Meta Description */}
                        <BuilderCountedTextarea
                            label="Meta Description"
                            maxLength={DESC_MAX}
                            rows={3}
                            {...bind('default_description', metaDescription, setMetaDescription)}
                        />

                        {/* Keywords — shared across languages */}
                        <div className={cn("space-y-2", sharedOnly)}>
                            <Label htmlFor="keywords" className="text-xs font-semibold text-muted-foreground">Keywords</Label>
                            <Input
                                id="keywords"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                placeholder="event management, wedding planning, corporate events"
                                className="h-9 text-sm"
                            />
                            <p className="text-[11px] text-slate-500 font-medium">Enter keyword and press Enter (or separate keywords with commas).</p>
                            
                            {/* Interactive Keyword Badge Pills */}
                            {keywords.trim() && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {keywords.split(',').map((kw, idx) => {
                                        const tag = kw.trim();
                                        if (!tag) return null;
                                        return (
                                            <Badge key={idx} variant="secondary" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-xs py-0.5 px-2 font-semibold">
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = keywords
                                                            .split(',')
                                                            .map((k) => k.trim())
                                                            .filter((_, i) => i !== idx)
                                                            .join(', ');
                                                        setKeywords(updated);
                                                    }}
                                                    className="hover:text-blue-900 ml-0.5"
                                                >
                                                    ×
                                                </button>
                                            </Badge>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* OG Image Upload & Image Cropper — shared across languages */}
                        <div className={cn("space-y-2 pt-1", sharedOnly)}>
                            <Label className="text-xs font-semibold text-muted-foreground">OG Image (Social Preview)</Label>
                            {ogImageUrl ? (
                                <div className="relative rounded-lg overflow-hidden border bg-card p-2 flex items-center gap-4">
                                    <img src={ogImageUrl} alt="OG Preview" className="h-20 w-36 object-cover rounded border" />
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-foreground">OG Image Selected</p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setCropImageRaw(ogImageUrl);
                                                    setCropOpen(true);
                                                }}
                                                className="h-7 text-xs gap-1"
                                            >
                                                <Crop className="h-3.5 w-3.5" /> Re-crop Image
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setOgImageUrl('')}
                                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Remove
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative flex items-center justify-between gap-4 border border-dashed rounded-lg p-4 bg-muted/20 hover:bg-muted/30 cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileSelect(file);
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground border">
                                        1200x630
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-foreground">Upload & Crop OG Image</p>
                                        <p className="text-[10px] text-muted-foreground">Click to upload social media preview image.</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="gap-2 pointer-events-none text-xs">
                                        <Upload className="h-4 w-4" /> Upload
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Additional Settings */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                        <Settings2 className="h-4 w-4 text-primary" />
                        <div>
                            <CardTitle className="text-lg">Additional Settings</CardTitle>
                            <CardDescription>Configure indexing, authorship, language, and technical SEO options.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Robots Meta Tag Dropdown — shared across languages */}
                        <div className={cn("space-y-1.5", sharedOnly)}>
                            <Label className="text-xs font-semibold text-muted-foreground">Robots Meta Tag</Label>
                            <Select value={robotsMeta} onValueChange={setRobotsMeta}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Robots Meta" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="index-follow">Index, Follow</SelectItem>
                                    <SelectItem value="noindex-nofollow">NoIndex, NoFollow</SelectItem>
                                    <SelectItem value="index-nofollow">Index, NoFollow</SelectItem>
                                    <SelectItem value="noindex-follow">NoIndex, Follow</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Canonical URL — shared across languages */}
                        <BuilderCountedInput
                            lockInput={isTranslationMode}
                            label="Canonical URL"
                            value={canonicalUrl}
                            onChange={setCanonicalUrl}
                            maxLength={CANONICAL_MAX}
                        />

                        {/* Author — shared across languages */}
                        <BuilderCountedInput
                            lockInput={isTranslationMode}
                            label="Author"
                            value={author}
                            onChange={setAuthor}
                            maxLength={AUTHOR_MAX}
                        />

                        {/* Language & Site Name Dropdowns */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className={cn("space-y-1.5", sharedOnly)}>
                                <Label className="text-xs font-semibold text-muted-foreground">Language</Label>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Language" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English (en)</SelectItem>
                                        <SelectItem value="es">Spanish (es)</SelectItem>
                                        <SelectItem value="fr">French (fr)</SelectItem>
                                        <SelectItem value="de">German (de)</SelectItem>
                                        <SelectItem value="ar">Arabic (ar)</SelectItem>
                                        <SelectItem value="hi">Hindi (hi)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <BuilderCountedInput
                                label="Site Name"
                                maxLength={SITENAME_MAX}
                                {...bind('site_name', siteName, setSiteName)}
                            />
                        </div>

                        {/* Sitemap & Structured Data Toggles */}
                        <div className={cn("space-y-3 pt-2", sharedOnly)}>
                            <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
                                <div>
                                    <h4 className="font-semibold text-xs text-foreground">Enable Sitemap</h4>
                                    <p className="text-[10px] text-muted-foreground">Auto-generate XML sitemap for search engines.</p>
                                </div>
                                <Switch checked={sitemapEnabled} onCheckedChange={setSitemapEnabled} />
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
                                <div>
                                    <h4 className="font-semibold text-xs text-foreground">Structured Data (JSON-LD)</h4>
                                    <p className="text-[10px] text-muted-foreground">Inject rich snippet schema markup into page head.</p>
                                </div>
                                <Switch checked={structuredData} onCheckedChange={setStructuredData} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* SEO Optimization Tip Callout Box */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900 shadow-2xs">
                <Sparkles className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                <div className="space-y-0.5">
                    <p className="font-bold text-blue-950 text-sm">💡 SEO Optimization Tip</p>
                    <p className="text-blue-800 leading-relaxed">
                        Keep your <strong>Meta Title</strong> under 60 characters and <strong>Meta Description</strong> under 160 characters for optimal display in search engine snippets. Using accurate <strong>Robots Meta</strong> and canonical URLs prevents duplicate indexing issues.
                    </p>
                </div>
            </div>

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
