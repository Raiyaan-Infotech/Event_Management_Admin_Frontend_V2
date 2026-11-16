'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Save,
    ArrowLeft,
    Plus,
    X,
    GripVertical,
    Upload,
    Monitor,
    Smartphone,
    Loader2,
    Calendar,
    MapPin,
    Users,
    Image as ImageIcon,
    MessageSquare,
    Gift,
    Video,
    Music,
    Heart,
    Bell,
    Scan,
    QrCode,
    Sparkles,
    Check,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Icon } from '@iconify/react';
import { IconPickerDialog } from '@/components/common/icon-picker-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/common/page-loader';
import { useFeaturesData, useCreateFeature, useUpdateFeature, type FeatureItem } from '@/hooks/useFeatures';
import { mediaApi } from '@/hooks/use-media';
import { useSectionTranslation, handleTranslationSave } from '@/hooks/useSectionTranslation';
import { TranslationSideCard } from '../../_components/translation-side-card';
import { TranslationModeBanner } from '../../_components/translation-mode-banner';
import {
    BuilderCountedInput,
    BuilderCountedTextarea,
} from '../../_components/builder-field';

const ICON_PRESETS = [
    { name: 'calendar', Icon: Calendar },
    { name: 'map-pin', Icon: MapPin },
    { name: 'users', Icon: Users },
    { name: 'image', Icon: ImageIcon },
    { name: 'message', Icon: MessageSquare },
    { name: 'gift', Icon: Gift },
    { name: 'video', Icon: Video },
    { name: 'music', Icon: Music },
    { name: 'heart', Icon: Heart },
    { name: 'bell', Icon: Bell },
    { name: 'scan', Icon: Scan },
    { name: 'qr-code', Icon: QrCode },
];

function getIconComponent(iconName?: string) {
    const found = ICON_PRESETS.find((i) => i.name === iconName);
    return found ? found.Icon : Calendar;
}

function FeatureFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const featureId = searchParams.get('id');

    const { data: dbFeatures, isLoading: isFeaturesLoading } = useFeaturesData();
    // Per-item create/update, NOT the bulk list-replace hook: that endpoint
    // deletes every feature and reinserts the whole table with fresh
    // auto-increment ids on every single save, which silently orphaned every
    // feature's translations (their record_id no longer matched any row) the
    // moment ANY feature was added or edited.
    const createFeatureMutation = useCreateFeature();
    const updateFeatureMutation = useUpdateFeature();

    const [selectedIcon, setSelectedIcon] = useState('lucide:sparkles');
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [shortDesc, setShortDesc] = useState('');
    const [detailedDesc, setDetailedDesc] = useState('');
    const [bullets, setBullets] = useState<string[]>([]);
    const [newBulletText, setNewBulletText] = useState('');
    const [showInMenu, setShowInMenu] = useState(true);
    const [menuOrder, setMenuOrder] = useState('1');
    const [status, setStatus] = useState<'Active' | 'Inactive' | 'Draft'>('Active');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [previewOpen, setPreviewOpen] = useState(false);

    const [customIconUrl, setCustomIconUrl] = useState<string>('');
    const [featureImageUrl, setFeatureImageUrl] = useState<string>('');
    const [errors, setErrors] = useState<{ title?: boolean; shortDesc?: boolean; detailedDesc?: boolean }>({});

    const isSaving = createFeatureMutation.isPending || updateFeatureMutation.isPending;

    // Per-form translation mode (?lang=<id>), same as Hero Section.
    // Field keys match the `features` entry in the backend FIELD_CATALOG,
    // which registers at page_slug='' with the feature row id as record_id.
    const translationFields = [
        { key: 'title', label: 'Title', type: 'input' as const, value: title, required: true },
        { key: 'short_description', label: 'Short Description', type: 'textarea' as const, value: shortDesc, required: true },
        { key: 'detailed_description', label: 'Detailed Description', type: 'textarea' as const, value: detailedDesc },
        // Bullet text is translatable content (the backend flattens
        // bullet_points_json to bullet_1, bullet_2, …). Positions are 1-based on
        // both sides and must stay that way, or translated text lands on the
        // wrong bullet.
        ...bullets.map((bullet, idx) => ({
            key: `bullet_${idx + 1}`,
            label: `Bullet ${idx + 1}`,
            type: 'input' as const,
            value: bullet,
        })),
    ];
    const translation = useSectionTranslation({
        section: 'features',
        recordId: featureId ? Number(featureId) : undefined,
        fields: translationFields,
    });
    const { isTranslationMode, bind } = translation;
    // Icons, images, bullet points and display options are shared across
    // languages - they are edited from the English version only.
    const sharedOnly = cn(isTranslationMode && 'opacity-50 pointer-events-none');

    // Load feature data if editing
    useEffect(() => {
        if (featureId && dbFeatures) {
            const found = dbFeatures.find((f) => String(f.id) === String(featureId));
            if (found) {
                setTitle(found.title);
                setShortDesc(found.short_description);
                setDetailedDesc(found.detailed_description || '');
                setSelectedIcon(found.icon || 'calendar');
                if (found.icon?.startsWith('data:') || found.icon?.startsWith('http')) {
                    setCustomIconUrl(found.icon);
                }
                if (found.image_url) {
                    setFeatureImageUrl(found.image_url);
                }
                setBullets(found.bullet_points_json || []);
                setShowInMenu(found.show_in_menu !== false);
                setMenuOrder(String(found.menu_order || 1));
                setStatus(found.status || 'Active');
            }
        }
    }, [featureId, dbFeatures]);

    const handleCustomIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tid = toast.loading('Uploading custom icon...');
        try {
            const res = await mediaApi.upload(file, 'features');
            if (res?.url) {
                setCustomIconUrl(res.url);
                setSelectedIcon(res.url);
                toast.success('Custom icon uploaded successfully', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded icon URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload custom icon', { id: tid });
        }
    };

    const handleFeatureImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tid = toast.loading('Uploading feature image...');
        try {
            const res = await mediaApi.upload(file, 'features');
            if (res?.url) {
                setFeatureImageUrl(res.url);
                toast.success('Feature image uploaded successfully', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded image URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload feature image', { id: tid });
        }
    };

    const handleAddBullet = () => {
        if (!newBulletText.trim()) return;
        setBullets((prev) => [...prev, newBulletText.trim()]);
        setNewBulletText('');
    };

    const handleRemoveBullet = (idx: number) => {
        setBullets((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSaveFeature = async () => {
        // In translation mode only the translated text is written; the feature
        // row is untouched, so the English validation below does not apply.
        if (await handleTranslationSave(translation, 'Feature')) return;
        const newErrors: { title?: boolean; shortDesc?: boolean } = {};
        if (!title.trim()) newErrors.title = true;
        if (!shortDesc.trim()) newErrors.shortDesc = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fill in all required fields marked with *');
            return;
        }
        setErrors({});

        const featurePayload: Partial<FeatureItem> = {
            title,
            description: shortDesc,
            short_description: shortDesc,
            detailed_description: detailedDesc,
            icon: customIconUrl || selectedIcon,
            image_url: featureImageUrl || undefined,
            bullet_points_json: bullets,
            show_in_menu: showInMenu,
            menu_order: parseInt(menuOrder, 10) || 1,
            status,
        };

        if (featureId) {
            updateFeatureMutation.mutate(
                { id: Number(featureId), payload: featurePayload },
                // Stay on the form — nothing to navigate, ?id= already points here.
                // Translating every language runs straight off the save, so the
                // admin never has to press a second button.
                { onSuccess: () => translation.translateAfterSave() },
            );
        } else {
            createFeatureMutation.mutate(featurePayload as FeatureItem, {
                onSuccess: (created: any) => {
                    // Stay on the form instead of bouncing to the list — a
                    // translation slot needs a saved record id, so leaving
                    // immediately after Add meant there was never a page where
                    // the language card could appear.
                    const newId = created?.data?.id;
                    if (newId) router.replace(`/admin/website-builder/features/create?id=${newId}`);
                    // The id only exists here, so it is passed in explicitly.
                    if (newId) translation.translateAfterSave(Number(newId));
                },
            });
        }
    };

    const CurrentIcon = getIconComponent(selectedIcon);

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-12 text-foreground">
            <PageLoader open={isSaving || translation.isSaving} text="Saving Feature..." />
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Link href="/admin/website-builder/features" className="hover:underline">
                            Features List
                        </Link>
                        <span>›</span>
                        <span className="font-semibold text-foreground">{featureId ? 'Edit Feature' : 'Add New Feature'}</span>
                    </div>
                    <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                        {featureId ? 'Edit Feature' : 'Add New Feature'}
                        {isTranslationMode && translation.activeLanguage && (
                            <span className="ml-2 text-primary">({translation.activeLanguage.name})</span>
                        )}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Configure feature details, display options, and view real-time card preview.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/admin/website-builder/features">
                        <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold border-border gap-1.5 cursor-pointer">
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to Features List
                        </Button>
                    </Link>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-9 px-3 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1.5 cursor-pointer"
                    >
                        <Eye className="h-3.5 w-3.5 text-emerald-600" /> Live Preview
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSaveFeature}
                        disabled={isSaving || translation.isSaving}
                        className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5 cursor-pointer"
                    >
                        {isSaving || translation.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isTranslationMode ? 'Save Translation' : 'Save Feature'}
                    </Button>
                </div>
            </div>

            {/* Languages + translation mode - only once the feature exists,
                since a translation slot is addressed by the saved row's id. */}
            {featureId ? (
                <div className="flex flex-col gap-3">
                    <div className="w-full self-end lg:w-72">
                        <TranslationSideCard
                            section="features"
                            recordId={Number(featureId)}
                            activeLanguageId={translation.activeLanguage?.id ?? null}
                            buildHref={translation.buildHref}
                        canTranslate={translation.canTranslate}
                            fields={translationFields}
                        />
                    </div>
                    <div className="order-first min-w-0">
                        <TranslationModeBanner translation={translation} label="this feature" />
                    </div>
                </div>
            ) : null}

            {/* Form Layout: 2 Columns */}
            <div className="grid grid-cols-1 gap-6 items-start">
                {/* Left Column: 5 Section Cards (7 cols) */}
                <div className="space-y-6">
                    {/* Section 1: Basic Information */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardHeader className="py-3.5 px-4 border-b border-border flex flex-row items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                                1
                            </div>
                            <div className="text-left">
                                <CardTitle className="text-sm font-bold text-foreground">Basic Information</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Select icon, title, and short summary</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-foreground">
                                    Feature Icon <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
                                        {customIconUrl ? (
                                            <img src={customIconUrl} alt="Custom Icon" className="h-6 w-6 object-contain" />
                                        ) : (
                                            <Icon icon={selectedIcon || 'lucide:sparkles'} className="h-6 w-6 text-primary" />
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIconPickerOpen(true)}
                                        className="h-10 text-xs font-semibold border-border hover:bg-accent gap-1.5 cursor-pointer"
                                    >
                                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Select / Change Icon
                                    </Button>
                                    <label className="flex h-10 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/60 cursor-pointer transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCustomIconUpload}
                                            className="hidden"
                                        />
                                        <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Custom Image
                                    </label>
                                    {customIconUrl ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCustomIconUrl('')}
                                            className="h-10 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                        >
                                            <X className="h-3.5 w-3.5 mr-1" /> Clear Custom Image
                                        </Button>
                                    ) : null}
                                </div>
                                <IconPickerDialog
                                    open={iconPickerOpen}
                                    onOpenChange={setIconPickerOpen}
                                    onSelect={(val) => {
                                        setSelectedIcon(val);
                                        setCustomIconUrl('');
                                        setIconPickerOpen(false);
                                    }}
                                />
                            </div>

                            <BuilderCountedInput
                                label="Feature Title"
                                required
                                maxLength={50}
                                {...bind('title', title, (val) => {
                                    setTitle(val);
                                    if (errors.title) setErrors(prev => ({ ...prev, title: false }));
                                })}
                                placeholder={isTranslationMode ? title : 'e.g. Agenda & Schedule'}
                                inputClassName={cn(
                                    '!h-9 text-xs border-border bg-card text-foreground',
                                    (errors.title || translation.errors.title) && 'border-red-500 ring-1 ring-red-500'
                                )}
                            />

                            <BuilderCountedInput
                                label="Short Description"
                                required
                                maxLength={120}
                                {...bind('short_description', shortDesc, (val) => {
                                    setShortDesc(val);
                                    if (errors.shortDesc) setErrors(prev => ({ ...prev, shortDesc: false }));
                                })}
                                placeholder={isTranslationMode ? shortDesc : 'e.g. Manage events and schedules with beautiful timelines.'}
                                inputClassName={cn(
                                    '!h-9 text-xs border-border bg-card text-foreground',
                                    (errors.shortDesc || translation.errors.short_description) && 'border-red-500 ring-1 ring-red-500'
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Section 2: Feature Description */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardHeader className="py-3.5 px-4 border-b border-border flex flex-row items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                                2
                            </div>
                            <div className="text-left">
                                <CardTitle className="text-sm font-bold text-foreground">Feature Description</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Comprehensive detailed description</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            <BuilderCountedTextarea
                                label="Detailed Description"
                                maxLength={500}
                                {...bind('detailed_description', detailedDesc, setDetailedDesc)}
                                placeholder={isTranslationMode ? detailedDesc : 'Explain how this feature helps guests or event hosts...'}
                                textareaClassName="min-h-[100px] text-xs border-border bg-card text-foreground"
                            />
                        </CardContent>
                    </Card>

                    {/* Section 3: Bullet Points. The TEXT is translatable; only
                        the list structure (adding, removing, reordering) is
                        shared, so the card itself must not be blanket-disabled. */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardHeader className="py-3.5 px-4 border-b border-border flex flex-row items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                                3
                            </div>
                            <div className="text-left">
                                <CardTitle className="text-sm font-bold text-foreground">Bullet Points (Key Benefits)</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Highlight top features or capabilities</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="space-y-2">
                                {bullets.map((bullet, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2 text-xs"
                                    >
                                        <GripVertical className={cn('h-4 w-4 text-muted-foreground cursor-grab shrink-0', sharedOnly)} />
                                        {isTranslationMode ? (
                                            <Input
                                                value={translation.values[`bullet_${idx + 1}`] ?? ''}
                                                onChange={(e) => translation.setValue(`bullet_${idx + 1}`, e.target.value)}
                                                placeholder={bullet}
                                                className="h-8 flex-1 text-xs border-border bg-card text-foreground"
                                            />
                                        ) : (
                                            <span className="flex-1 font-medium text-foreground">{bullet}</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveBullet(idx)}
                                            className={cn(
                                                'text-muted-foreground hover:text-destructive p-1 cursor-pointer',
                                                sharedOnly
                                            )}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Adding a bullet changes the list for every
                                language, so it stays English-only. */}
                            <div className={cn('flex gap-2', sharedOnly)}>
                                <Input
                                    placeholder="Add bullet point (e.g. Easy to Update)"
                                    value={newBulletText}
                                    onChange={(e) => setNewBulletText(e.target.value)}
                                    className="h-9 text-xs flex-1 border-border bg-card text-foreground"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddBullet();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddBullet}
                                    className="h-9 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Bullet Point
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 4: Display Settings - shared across languages */}
                    <Card className={cn('border-border bg-card shadow-xs', sharedOnly)}>
                        <CardHeader className="py-3.5 px-4 border-b border-border flex flex-row items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                                4
                            </div>
                            <div className="text-left">
                                <CardTitle className="text-sm font-bold text-foreground">Display Settings</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Menu visibility, order, and status</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-foreground">
                                    Show in Menu <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowInMenu(true)}
                                        className={cn(
                                            'flex-1 rounded-xl border p-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer',
                                            showInMenu
                                                ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                                                : 'border-border bg-card hover:bg-accent text-muted-foreground'
                                        )}
                                    >
                                        <span className={cn('h-2.5 w-2.5 rounded-full', showInMenu ? 'bg-primary' : 'bg-muted')} />
                                        Yes, show in menu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowInMenu(false)}
                                        className={cn(
                                            'flex-1 rounded-xl border p-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer',
                                            !showInMenu
                                                ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                                                : 'border-border bg-card hover:bg-accent text-muted-foreground'
                                        )}
                                    >
                                        <span className={cn('h-2.5 w-2.5 rounded-full', !showInMenu ? 'bg-primary' : 'bg-muted')} />
                                        No, hide from menu
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-foreground">
                                        Menu Order <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        value={menuOrder}
                                        onChange={(e) => setMenuOrder(e.target.value)}
                                        className="h-9 text-xs border-border bg-card text-foreground"
                                    />
                                    <span className="text-[10px] text-muted-foreground">Lower numbers show first</span>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-foreground">
                                        Status <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="flex gap-2">
                                        {(['Active', 'Inactive'] as const).map((st) => (
                                            <button
                                                key={st}
                                                type="button"
                                                onClick={() => setStatus(st)}
                                                className={cn(
                                                    'flex-1 rounded-lg border p-2 text-xs font-semibold transition-all cursor-pointer',
                                                    status === st
                                                        ? 'border-primary bg-primary/10 text-primary font-bold'
                                                        : 'border-border bg-card text-muted-foreground hover:bg-accent'
                                                )}
                                            >
                                                {st}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 5: Additional Options - shared across languages */}
                    <Card className={cn('border-border bg-card shadow-xs', sharedOnly)}>
                        <CardHeader className="py-3.5 px-4 border-b border-border flex flex-row items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                                5
                            </div>
                            <div className="text-left">
                                <CardTitle className="text-sm font-bold text-foreground">Additional Options (Optional)</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Feature image or media illustration</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            <Label className="text-xs font-bold text-foreground">Feature Image</Label>
                            {featureImageUrl ? (
                                <div className="relative rounded-xl overflow-hidden border border-border p-2 bg-card flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={featureImageUrl} alt="Feature Preview" className="h-16 w-24 object-cover rounded-lg border border-border" />
                                        <div>
                                            <p className="text-xs font-bold text-foreground">Uploaded Image</p>
                                            <p className="text-[10px] text-muted-foreground">Ready for feature page</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFeatureImageUrl('')}
                                        className="h-8 px-2 text-xs text-red-500 border-red-200 hover:bg-red-50 cursor-pointer"
                                    >
                                        <X className="h-3.5 w-3.5 mr-1" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center hover:bg-muted/40 transition-all cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFeatureImageUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                                    <span className="text-xs font-semibold text-foreground">Click to upload image</span>
                                    <span className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG or WEBP (Max 2MB) — Recommended size: 600 x 400px</span>
                                </label>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Live Preview Modal — preview opens from the header button
                rather than occupying a permanent side column, matching
                Hero Section and the rest of the builder. */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-3xl w-[92vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Eye className="h-4 w-4 text-emerald-600" /> Feature Card Live Preview
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Real-time preview of how this feature card appears on your website.
                        </DialogDescription>
                    </DialogHeader>
                    {/* Right Column: Live Feature Card Preview (5 cols) */}
                    <div className="lg:col-span-5 space-y-5 sticky top-6">
                        <Card className="shadow-xs border-border bg-card overflow-hidden">
                            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wide">
                                        Live Feature Card Preview
                                    </CardTitle>
                                </div>

                                <div className="flex items-center border border-border rounded-lg p-0.5 bg-card">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice('desktop')}
                                        className={cn(
                                            'p-1 rounded-md text-xs transition-colors cursor-pointer',
                                            previewDevice === 'desktop'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                        title="Desktop View"
                                    >
                                        <Monitor className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice('mobile')}
                                        className={cn(
                                            'p-1 rounded-md text-xs transition-colors cursor-pointer',
                                            previewDevice === 'mobile'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                        title="Mobile View"
                                    >
                                        <Smartphone className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </CardHeader>

                            <CardContent className="p-5 flex justify-center bg-muted/10">
                                <div
                                    className={cn(
                                        'transition-all duration-300 w-full',
                                        previewDevice === 'mobile' ? 'max-w-[320px]' : 'max-w-full'
                                    )}
                                >
                                    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                                        {featureImageUrl ? (
                                            <img src={featureImageUrl} alt="Preview Header" className="h-36 w-full object-cover rounded-xl border border-border mb-2" />
                                        ) : null}
                                        <div className="flex items-center justify-between">
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shadow-md overflow-hidden p-2">
                                                {customIconUrl ? (
                                                    <img src={customIconUrl} alt="Icon" className="h-6 w-6 object-contain" />
                                                ) : (
                                                    <Icon icon={selectedIcon?.includes(':') ? selectedIcon : `lucide:${selectedIcon || 'sparkles'}`} className="h-6 w-6 text-white" />
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                                                {status}
                                            </Badge>
                                        </div>

                                        <div>
                                            <h3 className="text-base font-extrabold text-foreground tracking-tight">
                                                {title || 'Feature Title'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                {shortDesc || 'Feature short description explaining key benefits for event organizers.'}
                                            </p>
                                        </div>

                                        {detailedDesc ? (
                                            <p className="text-[11px] text-muted-foreground/90 bg-muted/40 p-2.5 rounded-xl border border-border">
                                                {detailedDesc}
                                            </p>
                                        ) : null}

                                        {bullets.length > 0 ? (
                                            <ul className="space-y-1.5 pt-1">
                                                {bullets.map((bullet, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                        <span>{bullet}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function CreateFeaturePage() {
    return (
        <Suspense fallback={
            <div className="py-12 text-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Loading feature editor...
            </div>
        }>
            <FeatureFormContent />
        </Suspense>
    );
}
