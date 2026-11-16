'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Save,
    Plus,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    HelpCircle,
    Image as ImageIcon,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BuilderCountedInput,
    BuilderCountedTextarea,
    BuilderSegmentedControl,
    BuilderRadioGroup,
    BuilderImageUploadDropzone,
    BuilderStatusSwitch,
} from './builder-field';
import { RowTranslateButton } from './row-translate-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { mediaApi } from '@/hooks/use-media';
import { MediaCropDialog } from '@/components/common/media-crop-dialog';
import { cn } from '@/lib/utils';
import {
    useCompanyPages,
    useCompanySliders,
    useCompanySliderItems,
} from '@/hooks/useCompanyWebsiteBuilder';

type SliderHeight = 'small' | 'medium' | 'large' | 'fullscreen';
type LinkTargetMode = 'page' | 'custom';

/**
 * Simple Slider — backed by `company_website_sliders` (the settings row, one per
 * slider_type) and `company_website_slider_items` (the slides).
 *
 * Slides are written one at a time. The bulk replace path is deliberately not
 * used: it DELETEs and re-INSERTs the table, reassigning ids and orphaning the
 * per-slide translations, which are addressed by `record_id` (session.md §64).
 */
interface Slide {
    id: number;
    title: string;
    description: string;
    buttonLabel: string;
    targetMode: LinkTargetMode;
    pageId: number | null;
    customUrl: string;
    imageUrl: string;
    status: boolean;
    sortOrder: number;
}

const sliderHeightOptions: { label: string; value: SliderHeight }[] = [
    { label: 'Small (400px)', value: 'small' },
    { label: 'Medium (600px)', value: 'medium' },
    { label: 'Large (800px)', value: 'large' },
    { label: 'Fullscreen', value: 'fullscreen' },
];

const toSlide = (row: any, index: number): Slide => ({
    id: Number(row.id),
    title: row.title || '',
    description: row.description || '',
    buttonLabel: row.button_label || '',
    targetMode: row.button_page_id ? 'page' : 'custom',
    pageId: row.button_page_id ? Number(row.button_page_id) : null,
    customUrl: row.button_url || '',
    imageUrl: row.image_url || '',
    status: (row.status || 'active') === 'active',
    sortOrder: Number(row.sort_order) || index + 1,
});

export function SimpleSliderContent() {
    const {
        data: slidersData,
        isLoading: slidersLoading,
        create: createSlider,
        update: updateSlider,
    } = useCompanySliders();
    const {
        data: slideItemsData,
        isLoading: itemsLoading,
        create: createSlide,
        update: updateSlide,
        remove: removeSlide,
    } = useCompanySliderItems();
    const { data: pagesData } = useCompanyPages();

    const [previewOpen, setPreviewOpen] = useState(false);
    const [sliderTitle, setSliderTitle] = useState('');
    const [sliderHeight, setSliderHeight] = useState<SliderHeight>('medium');
    // Guards the load-once effect so typing isn't overwritten by a refetch.
    const [loadedSliderId, setLoadedSliderId] = useState<number | null>(null);

    const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
    // Local working copy of the selected slide; persisted on "Update Slide" so
    // the form doesn't fire a request per keystroke.
    const [draft, setDraft] = useState<Slide | null>(null);
    const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [savingLabel, setSavingLabel] = useState('Saving slider...');

    // Image Cropper State
    const [cropOpen, setCropOpen] = useState(false);
    const [cropImageRaw, setCropImageRaw] = useState('');
    const [cropFileName, setCropFileName] = useState('slide.jpg');
    const [cropMimeType, setCropMimeType] = useState('image/jpeg');

    const slider = useMemo(() => {
        const rows = slidersData || [];
        return rows.find((s: any) => s.slider_type === 'simple') || rows[0] || null;
    }, [slidersData]);

    const slides: Slide[] = useMemo(() => {
        if (!slider) return [];
        return (slideItemsData || [])
            .filter((row: any) => Number(row.slider_id) === Number(slider.id))
            .map(toSlide);
    }, [slideItemsData, slider]);

    const pages = useMemo(
        () =>
            (pagesData || []).map((p: any) => ({
                id: Number(p.id),
                title: p.title || '',
                slug: p.slug || '',
            })),
        [pagesData]
    );

    // Seed the settings form from the stored slider once it arrives.
    useEffect(() => {
        if (!slider || loadedSliderId === Number(slider.id)) return;
        setSliderTitle(slider.title || '');
        setSliderHeight((slider.slider_height as SliderHeight) || 'medium');
        setLoadedSliderId(Number(slider.id));
    }, [slider, loadedSliderId]);

    // Select the first slide once the list loads, so the editor isn't empty.
    useEffect(() => {
        if (editingSlideId !== null || slides.length === 0) return;
        setEditingSlideId(slides[0].id);
        setDraft(slides[0]);
    }, [slides, editingSlideId]);

    const activeSlide = draft;

    const selectSlide = (slide: Slide, index: number) => {
        setEditingSlideId(slide.id);
        setDraft(slide);
        setActivePreviewIndex(index);
    };

    /** Creates the settings row on first save if the company has none yet. */
    const ensureSlider = async (): Promise<any> => {
        if (slider) return slider;
        return createSlider({
            slider_type: 'simple',
            title: sliderTitle || 'Home Page Slider',
            slider_height: sliderHeight,
            status: 'active',
            is_active: 1,
        } as any);
    };

    const handleAddSlide = async () => {
        setSavingLabel('Adding slide...');
        setIsSaving(true);
        try {
            const target = await ensureSlider();
            const created: any = await createSlide({
                slider_id: Number(target.id),
                title: 'New Slide Title',
                description: 'Add slide description copy here.',
                button_label: 'Learn More',
                button_url: '',
                image_url: '',
                sort_order: slides.length + 1,
                status: 'active',
                is_active: 1,
            } as any);

            if (created?.id) {
                const newSlide = toSlide(created, slides.length);
                setEditingSlideId(newSlide.id);
                setDraft(newSlide);
                setActivePreviewIndex(slides.length);
            }
            toast.info('New slide added and selected for editing.');
        } catch {
            toast.error('Could not add the slide. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSlide = async (slide: Slide) => {
        if (slides.length <= 1) {
            toast.error('At least one slide is required.');
            return;
        }

        setSavingLabel('Deleting slide...');
        setIsSaving(true);
        try {
            await removeSlide(slide.id);
            if (editingSlideId === slide.id) {
                const next = slides.find((s) => s.id !== slide.id) || null;
                setEditingSlideId(next?.id ?? null);
                setDraft(next);
            }
            setActivePreviewIndex((prev) => Math.max(0, Math.min(prev, slides.length - 2)));
            toast.success('Slide removed.');
        } catch {
            toast.error('Could not delete the slide. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateActiveSlide = (field: keyof Slide, value: any) => {
        setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleToggleSlideStatus = async (slide: Slide, next: boolean) => {
        try {
            await updateSlide({ id: slide.id, status: next ? 'active' : 'inactive' } as any);
            if (editingSlideId === slide.id) updateActiveSlide('status', next);
        } catch {
            toast.error('Could not update the slide status. Please try again.');
        }
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
        const tid = toast.loading('Uploading slide image...');
        try {
            const res = await mediaApi.upload(file, 'website-builder');
            if (res?.url) {
                updateActiveSlide('imageUrl', res.url);
                toast.success('Slide image uploaded successfully', { id: tid });
            } else {
                updateActiveSlide('imageUrl', dataUrl);
                toast.success('Slide image cropped successfully', { id: tid });
            }
        } catch {
            updateActiveSlide('imageUrl', dataUrl);
            toast.success('Slide image cropped.', { id: tid });
        }
    };

    /** Persists the slider settings and the slide currently being edited. */
    const handleSave = async () => {
        setSavingLabel('Saving slider...');
        setIsSaving(true);
        try {
            const target = await ensureSlider();
            await updateSlider({
                id: Number(target.id),
                title: sliderTitle,
                slider_height: sliderHeight,
            } as any);

            if (draft) {
                await updateSlide({
                    id: draft.id,
                    title: draft.title,
                    description: draft.description,
                    button_label: draft.buttonLabel,
                    button_page_id: draft.targetMode === 'page' ? draft.pageId : null,
                    button_url: draft.targetMode === 'custom' ? draft.customUrl : '',
                    image_url: draft.imageUrl,
                    status: draft.status ? 'active' : 'inactive',
                } as any);
            }

            toast.success('Simple Slider settings updated successfully!');
        } catch {
            toast.error('Could not save the slider. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const previewSlide = slides[activePreviewIndex] || activeSlide || slides[0];

    const prevPreview = () => {
        setActivePreviewIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
    };

    const nextPreview = () => {
        setActivePreviewIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
    };

    return (
        <div className="space-y-5">
            <PageLoader
                open={slidersLoading || itemsLoading || isSaving}
                text={isSaving ? savingLabel : 'Loading Slider...'}
            />
            {/* Top Page Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Simple Slider</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Manage your website simple slider and Simple Slider settings.
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
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-slate-700 h-8">
                        <HelpCircle className="h-3.5 w-3.5" /> How It Works
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 space-y-4">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-3 px-4 border-b">
                            <CardTitle className="text-sm font-bold text-slate-900">Slide Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <BuilderCountedInput label="Slider Title" value={sliderTitle} onChange={setSliderTitle} maxLength={100} />
                            <BuilderRadioGroup label="Slider Height" name="sliderHeight" options={sliderHeightOptions} value={sliderHeight} onChange={setSliderHeight} />
                            {activeSlide && (
                                <>
                                    <BuilderCountedInput label="Slide Title" value={activeSlide.title} onChange={(val) => updateActiveSlide('title', val)} maxLength={100} />
                                    <BuilderCountedTextarea label="Slide Description" value={activeSlide.description} onChange={(val) => updateActiveSlide('description', val)} maxLength={300} rows={3} />
                                    <BuilderCountedInput label="Button Label" value={activeSlide.buttonLabel} onChange={(val) => updateActiveSlide('buttonLabel', val)} maxLength={50} />
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Link Target</label>
                                        <BuilderSegmentedControl options={[{ label: 'Page', value: 'page' }, { label: 'Custom URL', value: 'custom' }]} value={activeSlide.targetMode} onChange={(val) => updateActiveSlide('targetMode', val as LinkTargetMode)} />
                                    </div>
                                    {activeSlide.targetMode === 'page' ? (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">Select Page</label>
                                            <Select
                                                value={activeSlide.pageId ? String(activeSlide.pageId) : ''}
                                                onValueChange={(val) => updateActiveSlide('pageId', Number(val))}
                                            >
                                                <SelectTrigger className="h-9 text-xs border-slate-200">
                                                    <SelectValue placeholder="Choose a page" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {pages.map((p) => (
                                                        <SelectItem key={p.id} value={String(p.id)}>
                                                            {p.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {pages.length === 0 ? (
                                                <p className="text-[10px] text-slate-400">
                                                    No pages yet — create one under Website Builder › Pages.
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <BuilderCountedInput label="Custom URL" value={activeSlide.customUrl} onChange={(val) => updateActiveSlide('customUrl', val)} maxLength={200} />
                                    )}
                                    <BuilderImageUploadDropzone label="Slide Image" imageUrl={activeSlide.imageUrl} onFileSelect={handleFileSelect} onRemove={() => updateActiveSlide('imageUrl', '')} recommendedText="1920x800px (Max: 5MB)" />
                                    <BuilderStatusSwitch label="Status" checked={activeSlide.status} onCheckedChange={(val) => updateActiveSlide('status', val)} />
                                    <div className="pt-2">
                                        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="w-full h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5">
                                            <Save className="h-3.5 w-3.5" /> {isSaving ? 'Saving...' : 'Update Slide'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-7 space-y-4">
                    {/* Slider Management Card */}
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-900">Slider Management</CardTitle>
                                <CardDescription className="text-xs text-slate-500">
                                    Add, reorder, or remove slides.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleAddSlide}
                                disabled={isSaving}
                                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-3"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add New Slide
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-3 w-8 text-center">#</th>
                                            <th className="py-2.5 px-3">Preview</th>
                                            <th className="py-2.5 px-3">Title</th>
                                            <th className="py-2.5 px-3">Button</th>
                                            <th className="py-2.5 px-3 text-center">Status</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {slides.map((slide, idx) => {
                                            const isEditing = editingSlideId === slide.id;
                                            return (
                                                <tr
                                                    key={slide.id}
                                                    className={cn(
                                                        'transition-colors hover:bg-slate-50/80',
                                                        isEditing && 'bg-blue-50/40 font-medium'
                                                    )}
                                                >
                                                    {/* Index & Drag handle */}
                                                    <td className="py-3 px-3 text-slate-400">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <GripVertical className="h-3.5 w-3.5 text-slate-300 cursor-grab" />
                                                            <span className="font-bold text-slate-600">{idx + 1}</span>
                                                        </div>
                                                    </td>

                                                    {/* Preview Thumbnail */}
                                                    <td className="py-3 px-3">
                                                        <div className="h-9 w-14 rounded-md overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center shadow-xs">
                                                            {slide.imageUrl ? (
                                                                <img
                                                                    src={slide.imageUrl}
                                                                    alt={slide.title}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-full w-full bg-gradient-to-br from-[#1B0534] to-[#2D0B54] flex items-center justify-center">
                                                                    <ImageIcon className="h-3.5 w-3.5 text-white/50" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Title */}
                                                    <td className="py-3 px-3">
                                                        <p className="font-semibold text-slate-900 line-clamp-1">
                                                            {slide.title}
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {slide.targetMode === 'page'
                                                                ? `/${pages.find((p) => p.id === slide.pageId)?.slug || ''}`
                                                                : slide.customUrl || '/'}
                                                        </span>
                                                    </td>

                                                    {/* Button */}
                                                    <td className="py-3 px-3 text-slate-700">
                                                        {slide.buttonLabel}
                                                    </td>

                                                    {/* Status Switch */}
                                                    <td className="py-3 px-3 text-center">
                                                        <div className="flex items-center justify-center">
                                                            <Switch
                                                                checked={slide.status}
                                                                onCheckedChange={(val) => handleToggleSlideStatus(slide, val)}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <RowTranslateButton
                                                                section="sliders"
                                                                recordId={slide.id}
                                                                rowLabel={slide.title}
                                                                fields={[
                                                                    { key: 'title', label: 'Title', value: slide.title },
                                                                    { key: 'description', label: 'Description', value: slide.description, type: 'textarea' },
                                                                    { key: 'button_label', label: 'Button Label', value: slide.buttonLabel },
                                                                ]}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => selectSlide(slide, idx)}
                                                                className={cn(
                                                                    'h-7.5 w-7.5 rounded-lg p-0 transition-colors',
                                                                    isEditing
                                                                        ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-xs'
                                                                        : 'border-slate-200 text-slate-500 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50'
                                                                )}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => handleDeleteSlide(slide)}
                                                                disabled={isSaving}
                                                                className="h-7.5 w-7.5 rounded-lg p-0 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {!slidersLoading && !itemsLoading && slides.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                                                    No slides yet — use “Add New Slide” to create one.
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Live Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl border-slate-200">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <DialogTitle className="text-sm font-bold text-slate-900">Simple Slider — Live Preview</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            This is how your homepage slider will appear on the live website.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-0 bg-slate-950 rounded-xl overflow-hidden my-2">
                        {previewSlide ? (
                            <div
                                className={cn(
                                    'relative flex flex-col justify-center px-8 text-white transition-all duration-300 overflow-hidden',
                                    sliderHeight === 'small'
                                        ? 'h-[240px]'
                                        : sliderHeight === 'large'
                                        ? 'h-[360px]'
                                        : sliderHeight === 'fullscreen'
                                        ? 'h-[440px]'
                                        : 'h-[300px]'
                                )}
                                style={{
                                    background: previewSlide.imageUrl
                                        ? `linear-gradient(to right, rgba(15, 5, 29, 0.85), rgba(45, 11, 84, 0.7)), url(${previewSlide.imageUrl}) center/cover no-repeat`
                                        : 'linear-gradient(135deg, #1B0534 0%, #2D0B54 50%, #1B0534 100%)',
                                }}
                            >
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={prevPreview}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white p-0 shadow-md"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={nextPreview}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white p-0 shadow-md"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>

                                <div className="max-w-md space-y-2.5 pl-4">
                                    <h3 className="text-xl font-extrabold tracking-tight leading-snug text-white">
                                        {previewSlide.title}
                                    </h3>
                                    <p className="text-xs text-white/80 leading-relaxed max-w-sm">
                                        {previewSlide.description}
                                    </p>
                                    <div className="pt-1">
                                        <Button
                                            type="button"
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6C47FF] hover:bg-[#5b3adb] px-4 py-2 text-xs font-bold text-white shadow-md h-8"
                                        >
                                            {previewSlide.buttonLabel}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-white/40">
                                <ImageIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                <p className="text-xs font-bold">No Active Slides to Preview</p>
                            </div>
                        )}
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
        </div>
    );
}
