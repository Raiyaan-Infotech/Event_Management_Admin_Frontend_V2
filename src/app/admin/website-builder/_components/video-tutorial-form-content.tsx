'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import {
    ArrowLeft,
    Upload,
    Play,
    Loader2,
    Calendar,
    Plus,
    Check,
    Video,
    Link as LinkIcon,
    Sparkles,
    Image as ImageIcon,
    Send
} from 'lucide-react';
import {
    useVideoTutorial,
    useCreateVideoTutorial,
    useUpdateVideoTutorial,
    useVideoTutorialCategories,
    useVideoTutorialSubCategories,
    useVideoTutorialDifficultyLevels,
    useVideoTutorialTypes,
    CreateVideoTutorialPayload
} from '@/hooks/useVideoTutorials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { BuilderCountedInput, BuilderCountedTextarea } from './builder-field';
import { mediaApi } from '@/hooks/use-media';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSectionTranslation, handleTranslationSave } from '@/hooks/useSectionTranslation';
import { TranslationSideCard } from './translation-side-card';
import { TranslationModeBanner } from './translation-mode-banner';
import { PageLoader } from '@/components/common/page-loader';

interface VideoTutorialFormContentProps {
    id?: number;
}

const PRESET_THUMBNAIL = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop';

export function VideoTutorialFormContent({ id }: VideoTutorialFormContentProps) {
    const router = useRouter();
    const isEdit = Boolean(id);

    // Queries
    const { data: categories = [] } = useVideoTutorialCategories();
    const { data: difficultyLevels = [] } = useVideoTutorialDifficultyLevels();
    const { data: tutorialTypes = [] } = useVideoTutorialTypes();

    const { data: tutorial, isLoading: isTutorialLoading } = useVideoTutorial(id);

    // Mutations
    const createMutation = useCreateVideoTutorial();
    const updateMutation = useUpdateVideoTutorial();

    // Form State
    const [title, setTitle] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [subcategoryId, setSubcategoryId] = useState<string>('');
    const [tags, setTags] = useState('');

    const [videoSource, setVideoSource] = useState<'upload' | 'youtube' | 'vimeo'>('upload');
    const [videoUrl, setVideoUrl] = useState('');
    const [videoFileUrl, setVideoFileUrl] = useState('');
    const [durationSeconds, setDurationSeconds] = useState<number>(332);
    const [durationDisplay, setDurationDisplay] = useState('05:32');

    const [difficultyLevelId, setDifficultyLevelId] = useState<string>('');
    const [tutorialTypeId, setTutorialTypeId] = useState<string>('');
    const [keyTakeaways, setKeyTakeaways] = useState('');

    const [thumbnailUrl, setThumbnailUrl] = useState(PRESET_THUMBNAIL);
    const [isActive, setIsActive] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [sortOrder, setSortOrder] = useState<number>(1);
    const [publishDate, setPublishDate] = useState('');

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Query Subcategories filtered by categoryId
    const { data: subcategories = [] } = useVideoTutorialSubCategories({
        category_id: categoryId ? categoryId : undefined
    });

    // Populate data when editing
    useEffect(() => {
        if (tutorial) {
            setTitle(tutorial.title || '');
            setShortDescription(tutorial.short_description || '');
            setCategoryId(String(tutorial.category_id || ''));
            setSubcategoryId(tutorial.subcategory_id ? String(tutorial.subcategory_id) : '');
            setTags(tutorial.tags || (tutorial.tags_json ? tutorial.tags_json.join(', ') : ''));

            setVideoSource(tutorial.video_source || (tutorial.video_file_url ? 'upload' : 'youtube'));
            setVideoUrl(tutorial.video_url || '');
            setVideoFileUrl(tutorial.video_file_url || '');

            const durSecs = tutorial.duration_seconds || 332;
            setDurationSeconds(durSecs);
            const m = Math.floor(durSecs / 60);
            const s = durSecs % 60;
            setDurationDisplay(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);

            setDifficultyLevelId(tutorial.difficulty_level_id ? String(tutorial.difficulty_level_id) : '');
            setTutorialTypeId(tutorial.tutorial_type_id ? String(tutorial.tutorial_type_id) : '');
            setKeyTakeaways(tutorial.key_takeaways || '');

            setThumbnailUrl(tutorial.thumbnail_url || PRESET_THUMBNAIL);
            setIsActive(Number(tutorial.is_active) === 1 || tutorial.is_active === true);
            setIsFeatured(Boolean(tutorial.is_featured));
            setSortOrder(tutorial.sort_order ?? 1);
            setPublishDate(tutorial.publish_date ? tutorial.publish_date.split('T')[0] : '');
        } else if (!isEdit) {
            if (categories.length > 0 && !categoryId) setCategoryId(String(categories[0].id));
            if (difficultyLevels.length > 0 && !difficultyLevelId) setDifficultyLevelId(String(difficultyLevels[0].id));
            if (tutorialTypes.length > 0 && !tutorialTypeId) setTutorialTypeId(String(tutorialTypes[0].id));
        }
    }, [tutorial, categories, difficultyLevels, tutorialTypes, isEdit]);

    const isSaving = createMutation.isPending || updateMutation.isPending;

    // Per-form translation mode (?lang=<id>), same as Hero Section.
    // Field keys match the `video-tutorials` entry in the backend
    // FIELD_CATALOG, registered at page_slug='' with the row id as record_id.
    const translationFields = [
        { key: 'title', label: 'Title', type: 'input' as const, value: title, required: true },
        { key: 'short_description', label: 'Short Description', type: 'textarea' as const, value: shortDescription, required: true },
        { key: 'key_takeaways', label: 'Key Takeaways', type: 'textarea' as const, value: keyTakeaways },
    ];
    const translation = useSectionTranslation({
        section: 'video-tutorials',
        recordId: id,
        fields: translationFields,
    });
    const { isTranslationMode, bind } = translation;
    // Video URL, thumbnail, category, difficulty and status are shared across
    // languages - they are edited from the English version only.
    const sharedOnly = cn(isTranslationMode && 'opacity-50 pointer-events-none');

    // Handle File Uploads
    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tid = toast.loading('Uploading thumbnail...');
        try {
            const res = await mediaApi.upload(file, 'video-tutorials');
            if (res?.url) {
                setThumbnailUrl(res.url);
                toast.success('Thumbnail uploaded successfully', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded image URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload thumbnail', { id: tid });
        }
    };

    const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tid = toast.loading('Uploading video file...');
        try {
            const res = await mediaApi.upload(file, 'video-tutorials');
            if (res?.url) {
                setVideoFileUrl(res.url);
                toast.success('Video file uploaded successfully', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded video URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload video file', { id: tid });
        }
    };

    // Save Handler
    const handleSave = async (asDraft: boolean = false) => {
        // In translation mode only the translated text is written; the tutorial
        // row is untouched, so the English validation below does not apply.
        if (await handleTranslationSave(translation, 'Video Tutorial')) return;
        const newErr: Record<string, string> = {};
        if (!title.trim()) newErr.title = 'Tutorial title is required';
        if (!shortDescription.trim()) newErr.short_description = 'Short description is required';
        if (!categoryId) newErr.category_id = 'Category is required';
        if (sortOrder === undefined || sortOrder === null || isNaN(sortOrder) || sortOrder <= 0) {
            newErr.sort_order = 'Display order is required';
        }
        if (videoSource === 'upload' && !videoFileUrl.trim()) {
            newErr.video_file = 'Video file is required';
        } else if ((videoSource === 'youtube' || videoSource === 'vimeo') && !videoUrl.trim()) {
            newErr.video_url = 'Video URL is required';
        }

        if (Object.keys(newErr).length > 0) {
            setErrors(newErr);
            return;
        }

        setErrors({});

        // Calculate seconds from duration display string
        let secs = durationSeconds;
        if (durationDisplay.includes(':')) {
            const parts = durationDisplay.split(':');
            secs = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        }

        const payload: CreateVideoTutorialPayload = {
            category_id: categoryId ? Number(categoryId) : null,
            subcategory_id: subcategoryId ? Number(subcategoryId) : null,
            difficulty_level_id: difficultyLevelId ? Number(difficultyLevelId) : null,
            tutorial_type_id: tutorialTypeId ? Number(tutorialTypeId) : null,
            title: title.trim(),
            short_description: shortDescription.trim(),
            key_takeaways: keyTakeaways.trim() || null,
            thumbnail_url: thumbnailUrl || null,
            video_source: videoSource,
            video_url: videoUrl.trim() || null,
            video_file_url: videoFileUrl.trim() || null,
            duration_seconds: secs,
            tags: tags.trim() || null,
            is_featured: isFeatured,
            sort_order: sortOrder,
            is_active: asDraft ? false : isActive,
            publish_date: publishDate || null,
        };

        if (isEdit && id) {
            updateMutation.mutate({ id, data: payload }, {
                // Translate before navigating away, so the overlay is visible
                // and the run isn't torn down by the route change.
                onSuccess: async () => {
                    await translation.translateAfterSave();
                    router.push('/admin/website-builder/video-tutorials');
                },
            });
        } else {
            createMutation.mutate(payload, {
                onSuccess: async (created: any) => {
                    // The id exists only here, so it is passed in explicitly.
                    const newId = Number(created?.id ?? created?.data?.id);
                    if (newId) await translation.translateAfterSave(newId);
                    router.push('/admin/website-builder/video-tutorials');
                },
            });
        }
    };

    if (isEdit && isTutorialLoading) {
        return (
            <div className="py-24 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">Loading video tutorial details...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 text-foreground relative">
            <PageLoader open={isSaving} text="Saving Video Tutorial..." />
            {/* Full Page Loading Overlay */}
            {isSaving && (
                <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-sm font-extrabold text-foreground">Saving Video Tutorial...</p>
                        <p className="text-xs text-muted-foreground">Please wait while your changes are updated.</p>
                    </div>
                </div>
            )}

            {/* Breadcrumb & Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-semibold">
                        <span>Help Center</span>
                        <span>&rsaquo;</span>
                        <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/admin/website-builder/video-tutorials')}>Video Tutorials</span>
                        <span>&rsaquo;</span>
                        <span className="text-foreground font-bold">{isEdit ? 'Edit Tutorial' : 'Add Tutorial'}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                        {isEdit ? 'Edit Video Tutorial' : 'Add Video Tutorial'}
                        {isTranslationMode && translation.activeLanguage && (
                            <span className="ml-2 text-primary">({translation.activeLanguage.name})</span>
                        )}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Upload and manage step-by-step video tutorials to help your users learn.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/admin/website-builder/video-tutorials')}
                    className="gap-2 border-border bg-card text-foreground font-semibold cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tutorials
                </Button>
            </div>

            {/* Languages + translation mode - only once the tutorial exists,
                since a translation slot is addressed by the saved row's id. */}
            {isEdit && id ? (
                <div className="flex flex-col gap-3">
                    <div className="w-full self-end lg:w-72">
                        <TranslationSideCard
                            section="video-tutorials"
                            recordId={id}
                            activeLanguageId={translation.activeLanguage?.id ?? null}
                            buildHref={translation.buildHref}
                        canTranslate={translation.canTranslate}
                            fields={translationFields}
                        />
                    </div>
                    <div className="order-first min-w-0">
                        <TranslationModeBanner translation={translation} label="this tutorial" />
                    </div>
                </div>
            ) : null}

            {/* Main Form 2-Column Workspace Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN (Sections 1, 2, 3) */}
                <div className="xl:col-span-8 space-y-6">

                    {/* Section 1. Basic Information */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="p-6 space-y-5">
                            <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
                                Basic Information
                            </h3>

                            {/* Title Field */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    Title <span className="text-rose-500">*</span>
                                </Label>
                                <BuilderCountedInput
                                    {...bind('title', title, (val) => {
                                        setTitle(val);
                                        if (errors.title) setErrors((e) => ({ ...e, title: '' }));
                                    })}
                                    maxLength={100}
                                    placeholder={isTranslationMode ? title : 'Enter tutorial title...'}
                                    className="bg-background text-xs border-border"
                                    inputClassName={cn(
                                        (errors.title || translation.errors.title) &&
                                            'border-red-500 ring-1 ring-red-500 bg-red-50/10'
                                    )}
                                />
                                {errors.title && <p className="text-xs text-rose-500 font-semibold">{errors.title}</p>}
                                <p className="text-[11px] text-muted-foreground">Enter a clear and attractive title for your video tutorial.</p>
                            </div>

                            {/* Short Description */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    Short Description <span className="text-rose-500">*</span>
                                </Label>
                                <BuilderCountedTextarea
                                    {...bind('short_description', shortDescription, (val) => {
                                        setShortDescription(val);
                                        if (errors.short_description) setErrors((e) => ({ ...e, short_description: '' }));
                                    })}
                                    maxLength={200}
                                    rows={3}
                                    placeholder={isTranslationMode ? shortDescription : 'Enter a brief description about this tutorial...'}
                                    className="bg-background text-xs border-border"
                                    textareaClassName={cn(
                                        (errors.short_description || translation.errors.short_description) &&
                                            'border-red-500 ring-1 ring-red-500 bg-red-50/10'
                                    )}
                                />
                                {errors.short_description && <p className="text-xs text-rose-500 font-semibold">{errors.short_description}</p>}
                                <p className="text-[11px] text-muted-foreground">This will be displayed on the tutorial card.</p>
                            </div>

                            {/* Category & Sub Category Side-by-Side */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Category Dropdown */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">
                                        Category <span className="text-rose-500">*</span>
                                    </Label>
                                    <Select
                                        value={categoryId}
                                        onValueChange={(val) => {
                                            setCategoryId(val);
                                            setSubcategoryId('');
                                            if (errors.category_id) setErrors((e) => ({ ...e, category_id: '' }));
                                        }}
                                    >
                                        <SelectTrigger className={cn(
                                            'h-9 text-xs border-border bg-background text-foreground w-full',
                                            errors.category_id && 'border-red-500 ring-1 ring-red-500 bg-red-50/10'
                                        )}>
                                            <SelectValue placeholder="Select a category">
                                                {categories.find((c) => String(c.id) === String(categoryId))?.name}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.category_id && <p className="text-xs text-rose-500 font-semibold">{errors.category_id}</p>}
                                </div>

                                {/* Sub Category Dropdown */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">
                                        Sub Category <span className="text-muted-foreground font-normal">(Optional)</span>
                                    </Label>
                                    <Select
                                        value={subcategoryId}
                                        onValueChange={setSubcategoryId}
                                        disabled={!categoryId}
                                    >
                                        <SelectTrigger className="h-9 text-xs border-border bg-background text-foreground w-full">
                                            <SelectValue placeholder="Select a sub category">
                                                {subcategories.find((sc) => String(sc.id) === String(subcategoryId))?.name}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subcategories.map((sc) => (
                                                <SelectItem key={sc.id} value={String(sc.id)}>
                                                    {sc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Tags Input */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    Tags <span className="text-muted-foreground font-normal">(Optional)</span>
                                </Label>
                                <Input
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="Add tags and press Enter... (e.g. invitation, rsvp, billing)"
                                    className="bg-background text-xs border-border"
                                />
                                <p className="text-[11px] text-muted-foreground">Example: invitation, rsvp, billing</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 2. Video Information */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="p-6 space-y-5">
                            <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
                                Video Information
                            </h3>

                            {/* Video Source Radio Options */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-foreground">
                                    Video Source <span className="text-rose-500">*</span>
                                </Label>
                                <div className="flex items-center gap-6 pt-1">
                                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-foreground">
                                        <input
                                            type="radio"
                                            name="videoSource"
                                            checked={videoSource === 'upload'}
                                            onChange={() => {
                                                setVideoSource('upload');
                                                if (errors.video_file || errors.video_url) setErrors((e) => ({ ...e, video_file: '', video_url: '' }));
                                            }}
                                            className="accent-primary"
                                        />
                                        Upload Video
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-foreground">
                                        <input
                                            type="radio"
                                            name="videoSource"
                                            checked={videoSource === 'youtube'}
                                            onChange={() => {
                                                setVideoSource('youtube');
                                                if (errors.video_file || errors.video_url) setErrors((e) => ({ ...e, video_file: '', video_url: '' }));
                                            }}
                                            className="accent-primary"
                                        />
                                        YouTube Link
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-foreground">
                                        <input
                                            type="radio"
                                            name="videoSource"
                                            checked={videoSource === 'vimeo'}
                                            onChange={() => {
                                                setVideoSource('vimeo');
                                                if (errors.video_file || errors.video_url) setErrors((e) => ({ ...e, video_file: '', video_url: '' }));
                                            }}
                                            className="accent-primary"
                                        />
                                        Vimeo Link
                                    </label>
                                </div>
                            </div>

                            {/* Conditional Video Input: Dropzone OR URL */}
                            {videoSource === 'upload' ? (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">
                                        Upload Video File <span className="text-rose-500">*</span>
                                    </Label>
                                    <div className={cn(
                                        'border-2 border-dashed rounded-2xl p-6 text-center space-y-3 relative group transition-colors',
                                        errors.video_file ? 'border-red-500 ring-1 ring-red-500 bg-red-50/10' : 'border-primary/30 bg-primary/5 hover:border-primary'
                                    )}>
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={(e) => {
                                                handleVideoFileUpload(e);
                                                if (errors.video_file) setErrors((err) => ({ ...err, video_file: '' }));
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">Drag & drop your video file here</p>
                                            <p className="text-[11px] text-muted-foreground">or</p>
                                            <Button type="button" variant="outline" size="sm" className="mt-1.5 h-8 px-4 text-xs font-bold border-primary text-primary hover:bg-primary hover:text-white pointer-events-none">
                                                Choose File
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">MP4, MOV, WebM up to 500MB</p>
                                        {videoFileUrl && (
                                            <p className="text-xs font-bold text-emerald-600 truncate max-w-md mx-auto pt-1">
                                                ✓ Video file selected
                                            </p>
                                        )}
                                    </div>
                                    {errors.video_file && <p className="text-xs text-rose-500 font-semibold">{errors.video_file}</p>}
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">
                                        {videoSource === 'youtube' ? 'YouTube Video URL' : 'Vimeo Video URL'} <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        value={videoUrl}
                                        onChange={(e) => {
                                            setVideoUrl(e.target.value);
                                            if (errors.video_url) setErrors((err) => ({ ...err, video_url: '' }));
                                        }}
                                        placeholder={videoSource === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://vimeo.com/...'}
                                        className={cn(
                                            'bg-background text-xs border-border',
                                            errors.video_url && 'border-red-500 ring-1 ring-red-500 bg-red-50/10'
                                        )}
                                    />
                                    {errors.video_url && <p className="text-xs text-rose-500 font-semibold">{errors.video_url}</p>}
                                </div>
                            )}

                            {/* Duration Field */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    Duration <span className="text-muted-foreground font-normal">(Auto-detected / mm:ss)</span>
                                </Label>
                                <Input
                                    value={durationDisplay}
                                    onChange={(e) => setDurationDisplay(e.target.value)}
                                    placeholder="00:00:00"
                                    className="bg-background text-xs border-border max-w-xs"
                                />
                                <p className="text-[11px] text-muted-foreground">Video duration will be detected automatically or enter manually.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3. Tutorial Details */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="p-6 space-y-5">
                            <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">3</span>
                                Tutorial Details
                            </h3>

                            {/* Difficulty Level & Tutorial Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">Difficulty Level</Label>
                                    <Select value={difficultyLevelId} onValueChange={setDifficultyLevelId}>
                                        <SelectTrigger className="h-9 text-xs border-border bg-background text-foreground w-full">
                                            <SelectValue placeholder="Select difficulty">
                                                {difficultyLevels.find((d) => String(d.id) === String(difficultyLevelId))?.name}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {difficultyLevels.map((d) => (
                                                <SelectItem key={d.id} value={String(d.id)}>
                                                    {d.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">Tutorial Type</Label>
                                    <Select value={tutorialTypeId} onValueChange={setTutorialTypeId}>
                                        <SelectTrigger className="h-9 text-xs border-border bg-background text-foreground w-full">
                                            <SelectValue placeholder="Select type">
                                                {tutorialTypes.find((t) => String(t.id) === String(tutorialTypeId))?.name}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tutorialTypes.map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* What You'll Learn (Key Takeaways) */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    What You'll Learn (Key Takeaways)
                                </Label>
                                <BuilderCountedTextarea
                                    {...bind('key_takeaways', keyTakeaways, setKeyTakeaways)}
                                    maxLength={300}
                                    rows={3}
                                    placeholder={isTranslationMode ? keyTakeaways : 'Enter key points users will learn from this tutorial...'}
                                    className="bg-background text-xs border-border"
                                />
                                <p className="text-[11px] text-muted-foreground">List the main outcomes or takeaways from this tutorial.</p>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* RIGHT COLUMN (Sections 4, 5 & Live Card Preview) */}
                <div className="xl:col-span-4 space-y-6">

                    {/* Section 4. Thumbnail Upload & Preview */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="p-6 space-y-5">
                            <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">4</span>
                                Thumbnail
                            </h3>

                            {/* Upload Box */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    Thumbnail Image <span className="text-rose-500">*</span>
                                </Label>
                                <div className="border-2 border-dashed border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 bg-rose-50/20 text-center space-y-2 relative group hover:border-rose-400 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                    <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
                                        <ImageIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-rose-500">Upload Thumbnail</p>
                                        <p className="text-[10px] text-muted-foreground">or drag & drop</p>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Recommended size: 1280x720px (16:9)<br />JPG, PNG up to 2MB</p>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] font-bold border-rose-300 text-rose-600 pointer-events-none">
                                        Choose Image
                                    </Button>
                                </div>
                            </div>

                            {/* Live Card Preview */}
                            <div className="space-y-2 pt-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preview</Label>
                                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                                    <div className="relative aspect-video bg-slate-900 overflow-hidden">
                                        <img src={thumbnailUrl} alt="Preview" className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                                                <Play className="h-4 w-4 fill-primary-foreground ml-0.5" />
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 right-2 bg-black/80 text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow-xs">
                                            {durationDisplay}
                                        </div>
                                    </div>
                                    <div className="p-3.5 space-y-1">
                                        <h5 className="font-extrabold text-xs text-foreground line-clamp-1">
                                            {title || 'How to Create a Digital Invitation'}
                                        </h5>
                                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                                            {shortDescription || 'Learn how to create a beautiful invitation from scratch in just a few minutes.'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center">This is how your thumbnail will appear.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 5. Settings */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="p-6 space-y-5">
                            <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">5</span>
                                Settings
                            </h3>

                            {/* Status Switch */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold text-foreground">Status <span className="text-rose-500">*</span></Label>
                                    <p className="text-[11px] text-muted-foreground">Active tutorials will be visible to users.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                                    <span className={`text-xs font-bold ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            {/* Display Order */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">Display Order <span className="text-rose-500">*</span></Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={sortOrder}
                                    onChange={(e) => {
                                        setSortOrder(parseInt(e.target.value, 10));
                                        if (errors.sort_order) setErrors((err) => ({ ...err, sort_order: '' }));
                                    }}
                                    className={cn(
                                        'bg-background text-xs border-border',
                                        errors.sort_order && 'border-red-500 ring-1 ring-red-500 bg-red-50/10'
                                    )}
                                />
                                <p className="text-[11px] text-muted-foreground">Set the order in which this tutorial will appear.</p>
                                {errors.sort_order && <p className="text-xs text-rose-500 font-semibold">{errors.sort_order}</p>}
                            </div>

                            {/* Featured Tutorial Switch */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold text-foreground">Featured Tutorial</Label>
                                    <p className="text-[11px] text-muted-foreground">Featured tutorials will be highlighted.</p>
                                </div>
                                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                            </div>

                            {/* Publish Date */}
                            <div className="space-y-1.5 pt-1">
                                <Label className="text-xs font-bold text-foreground">Publish Date</Label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        value={publishDate}
                                        onChange={(e) => setPublishDate(e.target.value)}
                                        className="bg-background text-xs border-border"
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">Leave empty to publish immediately.</p>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Bottom Action Footer Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/website-builder/video-tutorials')}
                    className="h-10 px-5 text-xs font-bold border-border bg-card hover:bg-accent text-foreground cursor-pointer"
                >
                    Cancel
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSave(true)}
                    disabled={isSaving || translation.isSaving || isTranslationMode}
                    className="h-10 px-5 text-xs font-bold border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer gap-2"
                >
                    Save as Draft
                </Button>

                <Button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={isSaving || translation.isSaving}
                    className="h-10 px-6 text-xs font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer gap-2"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4" />
                            {isEdit ? 'Save Changes' : 'Publish Tutorial'}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
