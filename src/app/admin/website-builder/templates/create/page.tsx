'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Upload,
    CheckCircle2,
    Lightbulb,
    Monitor,
    Smartphone,
    ExternalLink,
    Loader2,
    Heart,
    Sparkles,
    Gift,
    Cake,
    Calendar,
    MoreHorizontal,
    PartyPopper,
    X,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/common/page-loader';
import {
    BuilderCountedInput,
    BuilderCountedTextarea,
} from '../../_components/builder-field';
import { cn } from '@/lib/utils';
import { useSectionTranslation, handleTranslationSave } from '@/hooks/useSectionTranslation';
import { TranslationSideCard } from '../../_components/translation-side-card';
import { TranslationModeBanner } from '../../_components/translation-mode-banner';
import { ImageCropper } from '@/components/common/image-cropper';
import {
    useTemplates,
    useTemplateCategories,
    useTemplateById,
    useSaveTemplate,
    type Template,
} from '@/hooks/useTemplates';
import { mediaApi } from '@/hooks/use-media';

const TEMPLATE_TYPES = [
    { id: 'wedding', label: 'Wedding', desc: 'Wedding & Engagement', icon: Heart },
    { id: 'engagement', label: 'Engagement', desc: 'Engagement & Roka Ceremony', icon: RingIcon },
    { id: 'birthday', label: 'Birthday', desc: 'Birthday Party & Celebration', icon: Cake },
    { id: 'anniversary', label: 'Anniversary', desc: 'Anniversary & Milestone', icon: Gift },
    { id: 'other', label: 'Other', desc: 'Other Events & Occasions', icon: MoreHorizontal },
];

const DESIGN_STYLES = [
    { id: 'classic', label: 'Classic', bg: 'from-amber-100 to-amber-50 border-amber-200' },
    { id: 'modern', label: 'Modern', bg: 'from-slate-900 to-slate-800 border-slate-700 text-white' },
    { id: 'minimal', label: 'Minimal', bg: 'from-stone-100 to-stone-50 border-stone-200' },
    { id: 'floral', label: 'Floral', bg: 'from-rose-100 to-pink-50 border-pink-200' },
    { id: 'traditional', label: 'Traditional', bg: 'from-red-900 to-amber-900 border-amber-500 text-amber-200' },
];

function RingIcon({ className }: { className?: string }) {
    return <Sparkles className={className} />;
}

function CreateTemplatePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const templateId = searchParams.get('id');

    const { data: dbTemplates } = useTemplates();
    const { data: categories } = useTemplateCategories();
    const saveTemplateMutation = useSaveTemplate();

    const [templateName, setTemplateName] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [templateType, setTemplateType] = useState<Template['template_type']>('wedding');
    const [designStyle, setDesignStyle] = useState<Template['design_style']>('classic');
    const [primaryColor, setPrimaryColor] = useState('#6A38F5');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [templateFileUrl, setTemplateFileUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [allowCustomize, setAllowCustomize] = useState(true);
    const [viewDevice, setViewDevice] = useState<'desktop' | 'mobile'>('mobile');
    const [fullScreenPreview, setFullScreenPreview] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const [errors, setErrors] = useState<{
        name?: boolean;
        category?: boolean;
        thumbnail?: boolean;
        file?: boolean;
    }>({});

    const isSaving = saveTemplateMutation.isPending;

    // Per-form translation mode (?lang=<id>), same as Hero Section.
    // Field keys match the `templates` entry in the backend FIELD_CATALOG,
    // registered at page_slug='' with the template row id as record_id.
    const translationFields = [
        { key: 'template_name', label: 'Template Name', type: 'input' as const, value: templateName, required: true },
        { key: 'description', label: 'Description', type: 'textarea' as const, value: description },
    ];
    const translation = useSectionTranslation({
        section: 'templates',
        recordId: templateId ? Number(templateId) : undefined,
        fields: translationFields,
    });
    const { isTranslationMode, bind } = translation;
    // Category, type, colors, uploads and settings are shared across
    // languages - they are edited from the English version only.
    const sharedOnly = cn(isTranslationMode && 'opacity-50 pointer-events-none');

    // Load existing template data when editing
    useEffect(() => {
        if (templateId && dbTemplates) {
            const found = dbTemplates.find((t) => String(t.id) === String(templateId));
            if (found) {
                setTemplateName(found.template_name);
                setCategoryId(found.category_id ? String(found.category_id) : '');
                setDescription(found.description || '');
                setTemplateType(found.template_type || 'wedding');
                setDesignStyle(found.design_style || 'classic');
                setPrimaryColor(found.primary_color || '#6A38F5');
                setThumbnailUrl(found.thumbnail_url || '');
                setTemplateFileUrl(found.template_file_url || '');
                setIsActive(found.is_active !== false);
                setAllowCustomize(found.allow_customize !== false);
            }
        }
    }, [templateId, dbTemplates]);

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tid = toast.loading('Uploading thumbnail...');
        try {
            const res = await mediaApi.upload(file, 'templates');
            if (res?.url) {
                setThumbnailUrl(res.url);
                setErrors((prev) => ({ ...prev, thumbnail: false }));
                toast.success('Thumbnail uploaded successfully', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded thumbnail URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload thumbnail', { id: tid });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tid = toast.loading('Uploading template package...');
        try {
            const res = await mediaApi.upload(file, 'templates');
            if (res?.url) {
                setTemplateFileUrl(res.url);
                setErrors((prev) => ({ ...prev, file: false }));
                toast.success('Template package uploaded successfully', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded template file URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload template package', { id: tid });
        }
    };

    const handleSave = async (isDraft = false) => {
        // In translation mode only the translated text is written; the template
        // row is untouched, so the English validation below does not apply.
        if (await handleTranslationSave(translation, 'Template')) return;
        const newErrors: typeof errors = {};
        if (!templateName.trim()) newErrors.name = true;
        if (!categoryId) newErrors.category = true;
        if (!thumbnailUrl) newErrors.thumbnail = true;
        if (!templateFileUrl) newErrors.file = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fill in all required fields marked with *');
            return;
        }
        setErrors({});

        saveTemplateMutation.mutate(
            {
                id: templateId ? Number(templateId) : undefined,
                template_name: templateName,
                category_id: categoryId ? Number(categoryId) : null,
                description,
                template_type: templateType,
                design_style: designStyle,
                primary_color: primaryColor,
                thumbnail_url: thumbnailUrl,
                template_file_url: templateFileUrl,
                is_active: isActive,
                allow_customize: allowCustomize,
                is_draft: isDraft,
            },
            {
                onSuccess: (created: any) => {
                    // Stay on the form instead of bouncing to the list — a
                    // translation slot needs a saved record id, so leaving
                    // immediately after Add meant there was never a page where
                    // the language card could appear. Editing an existing
                    // template already has ?id= and needs no navigation at all.
                    // Fill every language straight off the save — no second
                    // button. On create the id only exists here, so it is
                    // passed in explicitly.
                    if (!templateId) {
                        const newId = created?.data?.id;
                        if (newId) router.replace(`/admin/website-builder/templates/create?id=${newId}`);
                        if (newId) translation.translateAfterSave(Number(newId));
                    } else {
                        translation.translateAfterSave();
                    }
                },
            }
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <PageLoader open={isSaving || translation.isSaving} text="Saving Template..." />
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">
                        {templateId ? 'Edit Template' : 'Add Template'}
                        {isTranslationMode && translation.activeLanguage && (
                            <span className="ml-2 text-primary">({translation.activeLanguage.name})</span>
                        )}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Create a beautiful event invitation template that your users can customize.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/admin/website-builder/templates">
                        <Button variant="outline" size="sm" className="h-9 text-xs font-semibold">
                            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Templates
                        </Button>
                    </Link>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-9 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                        <Eye className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Live Preview
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleSave(false)}
                        disabled={isSaving || translation.isSaving}
                        className="h-9 px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
                    >
                        {isSaving || translation.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {isSaving || translation.isSaving ? 'Saving...' : isTranslationMode ? 'Save Translation' : 'Save Template'}
                    </Button>
                </div>
            </div>

            {/* 2-Column Workspace Grid */}
            {/* Languages + translation mode - only once the template exists,
                since a translation slot is addressed by the saved row's id. */}
            {templateId ? (
                <div className="flex flex-col gap-3">
                    <div className="w-full self-end lg:w-72">
                        <TranslationSideCard
                            section="templates"
                            recordId={Number(templateId)}
                            activeLanguageId={translation.activeLanguage?.id ?? null}
                            buildHref={translation.buildHref}
                        canTranslate={translation.canTranslate}
                            fields={translationFields}
                        />
                    </div>
                    <div className="order-first min-w-0">
                        <TranslationModeBanner translation={translation} label="this template" />
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column - 4 Form Sections */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Section 1: Basic Information */}
                    <Card className="shadow-xs border-border">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                                    1
                                </span>
                                <h3 className="text-sm font-bold text-foreground">Basic Information</h3>
                            </div>

                            <BuilderCountedInput
                                label="Template Name"
                                required
                                maxLength={100}
                                {...bind('template_name', templateName, (val) => {
                                    setTemplateName(val);
                                    if (errors.name) setErrors(prev => ({ ...prev, name: false }));
                                })}
                                placeholder={isTranslationMode ? templateName : 'e.g., Royal Wedding Invitation'}
                                inputClassName={cn(
                                    '!h-10 text-xs',
                                    (errors.name || translation.errors.template_name) && 'border-red-500 ring-1 ring-red-500'
                                )}
                            />

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                    Category <span className="text-rose-500">*</span>
                                </label>
                                <Select
                                    value={categoryId}
                                    onValueChange={(val) => {
                                        setCategoryId(val);
                                        if (errors.category) setErrors(prev => ({ ...prev, category: false }));
                                    }}
                                >
                                    <SelectTrigger className={cn('h-10 text-xs border-border bg-card', errors.category && 'border-red-500 ring-1 ring-red-500')}>
                                        <SelectValue placeholder="Select Category">
                                            {(categories || []).find((c) => String(c.id) === String(categoryId) || c.name === categoryId)?.name ||
                                                (categoryId && isNaN(Number(categoryId)) ? categoryId : '')}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(categories || []).map((cat) => (
                                            <SelectItem key={cat.id || cat.name} value={String(cat.id || cat.name)}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <BuilderCountedTextarea
                                label="Description (Optional)"
                                maxLength={200}
                                {...bind('description', description, setDescription)}
                                placeholder={isTranslationMode ? description : 'A short description about this template...'}
                                textareaClassName="min-h-[80px] text-xs py-2"
                            />
                        </CardContent>
                    </Card>

                    {/* Section 2: Template Type & Style - shared across languages */}
                    <Card className={cn('shadow-xs border-border', sharedOnly)}>
                        <CardContent className="p-5 space-y-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                                    2
                                </span>
                                <h3 className="text-sm font-bold text-foreground">Template Type & Style</h3>
                            </div>

                            {/* Template Type Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                                    Template Type <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                    {TEMPLATE_TYPES.map((type) => {
                                        const IconComp = type.icon;
                                        const isSelected = templateType === type.id;
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setTemplateType(type.id as Template['template_type'])}
                                                className={cn(
                                                    'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer relative',
                                                    isSelected
                                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs'
                                                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                                                )}
                                            >
                                                <div className={cn(
                                                    'h-8 w-8 rounded-full flex items-center justify-center mb-1.5',
                                                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                                )}>
                                                    <IconComp className="h-4 w-4" />
                                                </div>
                                                <span className="text-xs font-bold leading-tight text-foreground">{type.label}</span>
                                                <span className="text-[9px] text-muted-foreground leading-tight mt-0.5">{type.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Design Style Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                                    Design Style <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                    {DESIGN_STYLES.map((style) => {
                                        const isSelected = designStyle === style.id;
                                        return (
                                            <button
                                                key={style.id}
                                                type="button"
                                                onClick={() => setDesignStyle(style.id as Template['design_style'])}
                                                className={cn(
                                                    'p-2.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer relative',
                                                    isSelected
                                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                                                        : 'border-border bg-card hover:border-primary/50'
                                                )}
                                            >
                                                <div className={cn(
                                                    'h-12 w-full rounded-lg bg-gradient-to-br border mb-2 flex items-center justify-center text-[10px] font-extrabold shadow-2xs',
                                                    style.bg
                                                )}>
                                                    {style.label}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn(
                                                        'h-3.5 w-3.5 rounded-full border flex items-center justify-center',
                                                        isSelected ? 'border-primary bg-primary' : 'border-border'
                                                    )}>
                                                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                                                    </div>
                                                    <span className="text-xs font-semibold text-foreground">{style.label}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Primary Color */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                                    Primary Color
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="h-10 w-12 rounded-lg border border-border cursor-pointer p-0.5 bg-card"
                                    />
                                    <Input
                                        type="text"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="h-10 w-36 text-xs font-mono uppercase border-border"
                                    />
                                    <div
                                        className="h-10 w-10 rounded-lg shadow-xs border border-border flex items-center justify-center text-white"
                                        style={{ backgroundColor: primaryColor }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: Template Design Uploads - shared across languages */}
                    <Card className={cn('shadow-xs border-border', sharedOnly)}>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                                    3
                                </span>
                                <h3 className="text-sm font-bold text-foreground">Template Design</h3>
                            </div>

                            {/* Thumbnail Upload using ImageCropper */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                                    <span>Template Thumbnail <span className="text-rose-500">*</span></span>
                                    {errors.thumbnail && <span className="text-rose-500 font-bold lowercase">Required</span>}
                                </label>
                                {/* ImageCropper has no error state of its own, so the
                                    required-field styling is applied to a wrapper —
                                    matching the Template File dropzone below. */}
                                <div className={cn(
                                    'rounded-xl transition-colors',
                                    errors.thumbnail && 'border-2 border-dashed border-red-500 ring-1 ring-red-500 bg-red-50/20 p-1'
                                )}>
                                <ImageCropper
                                    title="Template Thumbnail"
                                    description="Upload & crop your template thumbnail image"
                                    targetWidth={800}
                                    targetHeight={1200}
                                    currentImage={thumbnailUrl}
                                    onImageCropped={async (croppedFile: File) => {
                                        const tid = toast.loading('Uploading cropped thumbnail...');
                                        try {
                                            const res = await mediaApi.upload(croppedFile, 'templates');
                                            if (res?.url) {
                                                setThumbnailUrl(res.url);
                                                setErrors((prev) => ({ ...prev, thumbnail: false }));
                                                toast.success('Thumbnail uploaded successfully', { id: tid });
                                            } else {
                                                toast.error('Failed to retrieve uploaded thumbnail URL', { id: tid });
                                            }
                                        } catch (err: any) {
                                            toast.error(err?.message || 'Failed to upload thumbnail', { id: tid });
                                        }
                                    }}
                                    onRemove={() => setThumbnailUrl('')}
                                />
                                </div>
                            </div>

                            {/* Template File Upload */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                                    <span>Template File <span className="text-rose-500">*</span></span>
                                    {errors.file && <span className="text-rose-500 font-bold lowercase">Required</span>}
                                </label>
                                {templateFileUrl ? (
                                    <div className="relative rounded-xl border border-border p-3 bg-card flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-foreground truncate max-w-xs">{templateFileUrl}</p>
                                            <p className="text-[10px] text-emerald-600 font-semibold">File uploaded successfully</p>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setTemplateFileUrl('')} className="h-8 px-2 text-xs text-red-500 border-red-200 hover:bg-red-50 cursor-pointer">
                                            <X className="h-3.5 w-3.5 mr-1" /> Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <label className={cn(
                                        'border-2 border-dashed transition-colors rounded-xl p-6 text-center bg-muted/20 cursor-pointer relative flex flex-col items-center justify-center',
                                        errors.file ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-border hover:border-primary/60'
                                    )}>
                                        <input type="file" accept="*/*" onClick={(e) => (e.currentTarget.value = '')} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-xs font-bold text-foreground">Click to upload template file</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">ZIP, HTML, PNG, JPG or WEBP (Max. 10MB)</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Upload full template file package</p>
                                    </label>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 4: Settings - shared across languages */}
                    <Card className={cn('shadow-xs border-border', sharedOnly)}>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                                    4
                                </span>
                                <h3 className="text-sm font-bold text-foreground">Settings</h3>
                            </div>

                            <div className="rounded-xl border border-border p-3.5 flex items-center justify-between bg-card">
                                <div>
                                    <p className="text-xs font-bold text-foreground">Make this template active</p>
                                    <p className="text-[11px] text-muted-foreground">Active templates will be visible to users.</p>
                                </div>
                                <Switch checked={isActive} onCheckedChange={setIsActive} />
                            </div>

                            <div className="rounded-xl border border-border p-3.5 flex items-center justify-between bg-card">
                                <div>
                                    <p className="text-xs font-bold text-foreground">Allow users to customize</p>
                                    <p className="text-[11px] text-muted-foreground">Users can edit text, images, colors and other elements.</p>
                                </div>
                                <Switch checked={allowCustomize} onCheckedChange={setAllowCustomize} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Live Preview & Tips */}
                <div className="lg:col-span-5 space-y-6 sticky top-6">

                    {/* Tips Card */}
                    <Card className="shadow-xs border-border bg-gradient-to-br from-amber-500/5 to-primary/5">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                                <Lightbulb className="h-4 w-4" />
                                Tips for Great Templates
                            </div>

                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Use high quality images (300 DPI)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Keep important text in the center</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Use readable fonts</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Full Screen Preview Modal */}
            {/* Live Preview Modal - opened from the header button rather than
                occupying a permanent side column, matching Hero Section. */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-2xl w-[92vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Eye className="h-4 w-4 text-emerald-600" /> Template Live Preview
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Real-time preview of how this template appears to your users.
                        </DialogDescription>
                    </DialogHeader>
                        {/* Template Preview Card */}
                        <Card className="shadow-xs border-border overflow-hidden">
                            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                <h4 className="text-xs font-bold text-foreground">Template Preview ({viewDevice})</h4>
                                <div className="flex items-center border border-border rounded-lg p-0.5 bg-card">
                                    <button
                                        type="button"
                                        onClick={() => setViewDevice('desktop')}
                                        className={cn(
                                            'p-1 rounded-md text-xs transition-colors cursor-pointer',
                                            viewDevice === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                                        )}
                                        title="Desktop View"
                                    >
                                        <Monitor className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewDevice('mobile')}
                                        className={cn(
                                            'p-1 rounded-md text-xs transition-colors cursor-pointer',
                                            viewDevice === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                                        )}
                                        title="Mobile View"
                                    >
                                        <Smartphone className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            <CardContent className="p-6 flex flex-col items-center justify-center bg-slate-900/10 min-h-[380px]">
                                {/* Invitation Card Mockup */}
                                <div
                                    className={cn(
                                        'w-full transition-all duration-300 rounded-2xl border-4 p-6 shadow-xl text-center space-y-3 relative overflow-hidden bg-gradient-to-br',
                                        viewDevice === 'mobile' ? 'max-w-[280px]' : 'max-w-full',
                                        DESIGN_STYLES.find(s => s.id === designStyle)?.bg || 'from-amber-100 to-amber-50 border-amber-200'
                                    )}
                                    style={{ borderColor: primaryColor }}
                                >
                                    {thumbnailUrl ? (
                                        <img src={thumbnailUrl} alt="Thumbnail Preview" className="h-56 w-full object-cover rounded-xl border border-border mb-2" />
                                    ) : (
                                        <div className="h-28 w-full rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs" style={{ backgroundColor: primaryColor }}>
                                            {templateName || 'Template Preview'}
                                        </div>
                                    )}

                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
                                        {templateType.toUpperCase()} INVITATION
                                    </p>

                                    <h2 className="text-xl font-serif font-extrabold tracking-tight capitalize">
                                        {templateName || 'Template Name'}
                                    </h2>

                                    <div className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block bg-white/20 backdrop-blur-xs border border-white/30">
                                        Style: {designStyle}
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFullScreenPreview(true)}
                                    className="mt-4 text-xs font-semibold text-primary border-primary/30 w-full cursor-pointer bg-card hover:bg-primary/10"
                                >
                                    Preview Full Screen <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                                </Button>
                            </CardContent>
                        </Card>
                </DialogContent>
            </Dialog>

            <Dialog open={fullScreenPreview} onOpenChange={setFullScreenPreview}>
                <DialogContent className="max-w-4xl p-6 border-border bg-card text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Full Screen Template Preview</DialogTitle>
                    </DialogHeader>
                    <div className="p-8 flex justify-center bg-slate-950 rounded-2xl">
                        <div
                            className={cn(
                                'w-full max-w-md rounded-2xl border-4 p-8 text-center space-y-4 shadow-2xl bg-gradient-to-br',
                                DESIGN_STYLES.find(s => s.id === designStyle)?.bg || 'from-amber-100 to-amber-50 border-amber-200'
                            )}
                            style={{ borderColor: primaryColor }}
                        >
                            {thumbnailUrl ? (
                                <img src={thumbnailUrl} alt="Full Preview" className="h-56 w-full object-cover rounded-xl border" />
                            ) : (
                                <div className="h-36 w-full rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: primaryColor }}>
                                    {templateName || 'Template Preview'}
                                </div>
                            )}
                            <p className="text-xs font-black uppercase tracking-widest opacity-80">{templateType} INVITATION</p>
                            <h2 className="text-2xl font-extrabold capitalize">{templateName || 'Template Name'}</h2>
                            <p className="text-xs opacity-90">{description || 'Full screen template details preview.'}</p>
                            <div className="text-xs font-bold uppercase px-3 py-1 rounded-full inline-block bg-white/20 border border-white/30">
                                Style: {designStyle}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function CreateTemplatePageWrapper() {
    return (
        <Suspense fallback={
            <div className="py-12 text-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Loading template editor...
            </div>
        }>
            <CreateTemplatePage />
        </Suspense>
    );
}
