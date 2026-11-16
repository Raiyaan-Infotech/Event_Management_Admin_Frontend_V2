'use client';

import { useState } from 'react';
import {
    Save,
    Plus,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    HelpCircle,
    X,
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
    BuilderImageUploadDropzone,
    BuilderStatusSwitch,
    BuilderEffectSlider,
} from './builder-field';
import { PageLoader } from '@/components/common/page-loader';
import { mediaApi } from '@/hooks/use-media';
import { MediaCropDialog } from '@/components/common/media-crop-dialog';
import { cn } from '@/lib/utils';

type LinkTargetMode = 'page' | 'custom';

interface AdvanceSlide {
    id: string;
    title: string;
    description: string;
    buttonLabel: string;
    targetMode: LinkTargetMode;
    customUrl: string;
    imageUrl: string;
    overlayOpacity: number;
    brightness: number;
    blur: number;
    status: boolean;
}

const targetModeOptions: { label: string; value: LinkTargetMode }[] = [
    { label: 'Page', value: 'page' },
    { label: 'Custom', value: 'custom' },
];

export function AdvanceSliderContent() {
    // Top-level Slider Settings
    const [sliderTitle, setSliderTitle] = useState('Home Page Advanced Slider');

    // Slide Items State
    const [slides, setSlides] = useState<AdvanceSlide[]>([
        {
            id: '1',
            title: 'Creating Unforgettable Moments',
            description:
                'From elegant weddings to corporate events, we handle every detail with creativity and perfection. Let us bring your dream event to life.',
            buttonLabel: 'Explore Events',
            targetMode: 'custom',
            customUrl: '/events',
            imageUrl: '',
            overlayOpacity: 60,
            brightness: 90,
            blur: 0,
            status: true,
        },
        {
            id: '2',
            title: 'Perfect Events, Lasting Memories',
            description:
                'From elegant weddings to corporate events, we handle every detail with creativity and perfection. Let us bring your dream event to life.',
            buttonLabel: 'View Services',
            targetMode: 'custom',
            customUrl: '/services',
            imageUrl: '',
            overlayOpacity: 50,
            brightness: 100,
            blur: 0,
            status: true,
        },
        {
            id: '3',
            title: 'We Plan. You Celebrate.',
            description:
                'Stress-free event management tailored to your specific budget and style preferences.',
            buttonLabel: 'Contact Us',
            targetMode: 'custom',
            customUrl: '/contact',
            imageUrl: '',
            overlayOpacity: 60,
            brightness: 90,
            blur: 0,
            status: true,
        },
    ]);

    const [editingSlideId, setEditingSlideId] = useState<string>('1');
    const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Image Cropper State
    const [cropOpen, setCropOpen] = useState(false);
    const [cropImageRaw, setCropImageRaw] = useState('');
    const [cropFileName, setCropFileName] = useState('advance-slide.jpg');
    const [cropMimeType, setCropMimeType] = useState('image/jpeg');

    const activeSlide = slides.find((s) => s.id === editingSlideId) || slides[0] || null;

    const handleAddSlide = () => {
        const newSlide: AdvanceSlide = {
            id: Date.now().toString(),
            title: 'New Advance Slide',
            description: 'Add advance slide description copy here.',
            buttonLabel: 'Learn More',
            targetMode: 'custom',
            customUrl: '/events',
            imageUrl: '',
            overlayOpacity: 60,
            brightness: 90,
            blur: 0,
            status: true,
        };
        setSlides([...slides, newSlide]);
        setEditingSlideId(newSlide.id);
        setActivePreviewIndex(slides.length);
        toast.info('New advance slide added.');
    };

    const handleDeleteSlide = (id: string) => {
        if (slides.length <= 1) {
            toast.error('At least one slide is required.');
            return;
        }
        const updated = slides.filter((s) => s.id !== id);
        setSlides(updated);
        if (editingSlideId === id) {
            setEditingSlideId(updated[0]?.id || '');
        }
        if (activePreviewIndex >= updated.length) {
            setActivePreviewIndex(Math.max(0, updated.length - 1));
        }
        toast.success('Slide removed.');
    };

    const updateActiveSlide = (field: keyof AdvanceSlide, value: any) => {
        if (!editingSlideId) return;
        setSlides(slides.map((s) => (s.id === editingSlideId ? { ...s, [field]: value } : s)));
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
                toast.success('Advance slide image uploaded successfully', { id: tid });
            } else {
                updateActiveSlide('imageUrl', dataUrl);
                toast.success('Advance slide image cropped successfully', { id: tid });
            }
        } catch {
            updateActiveSlide('imageUrl', dataUrl);
            toast.success('Advance slide image cropped.', { id: tid });
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Advanced Slider settings saved successfully!');
        }, 500);
    };

    const previewSlide = slides[activePreviewIndex] || activeSlide || slides[0];

    const prevPreview = () => {
        setActivePreviewIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
    };

    const nextPreview = () => {
        setActivePreviewIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
    };

    return (
        <div className="space-y-4 p-4 md:p-6 bg-slate-50/50 min-h-screen">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 bg-white p-4 rounded-xl shadow-2xs">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Advance Slider</h1>
                    <p className="text-xs text-slate-500">
                        Configure slider background effects, overlay opacity, brightness, and blur filters.
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
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 h-8"
                        onClick={() => {
                            if (editingSlideId) handleDeleteSlide(editingSlideId);
                        }}
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-4"
                    >
                        <Save className="h-3.5 w-3.5" /> {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>

            {/* 2-Column Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Column: Slide Content Form Card (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-3 px-4 border-b">
                            <CardTitle className="text-sm font-bold text-slate-900">Slide Content</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {/* 1. SLIDER TITLE */}
                            <BuilderCountedInput
                                label="1. SLIDER TITLE"
                                value={sliderTitle}
                                onChange={setSliderTitle}
                                maxLength={100}
                                inputClassName="!h-9 text-xs font-semibold"
                            />

                            {activeSlide && (
                                <>
                                    {/* 2. SLIDE TITLE */}
                                    <BuilderCountedInput
                                        label="2. SLIDE TITLE"
                                        value={activeSlide.title}
                                        onChange={(val) => updateActiveSlide('title', val)}
                                        maxLength={100}
                                        inputClassName="!h-9 text-xs"
                                    />

                                    {/* 3. SLIDE DESCRIPTION */}
                                    <BuilderCountedTextarea
                                        label="3. SLIDE DESCRIPTION"
                                        value={activeSlide.description}
                                        onChange={(val) => updateActiveSlide('description', val)}
                                        maxLength={200}
                                        rows={3}
                                        textareaClassName="text-xs resize-none"
                                    />

                                    {/* 4. BUTTON LABEL */}
                                    <BuilderCountedInput
                                        label="4. BUTTON LABEL"
                                        value={activeSlide.buttonLabel}
                                        onChange={(val) => updateActiveSlide('buttonLabel', val)}
                                        maxLength={30}
                                        inputClassName="!h-9 text-xs"
                                    />

                                    {/* 5. BUTTON LINK */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            5. BUTTON LINK
                                        </label>
                                        <BuilderSegmentedControl
                                            options={targetModeOptions}
                                            value={activeSlide.targetMode}
                                            onChange={(val) => updateActiveSlide('targetMode', val)}
                                        />
                                    </div>

                                    {/* Button Page Dropdown Selector */}
                                    {activeSlide.targetMode === 'page' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                                                Button Page
                                            </label>
                                            <Select
                                                value={activeSlide.customUrl || 'events'}
                                                onValueChange={(val) => updateActiveSlide('customUrl', val)}
                                            >
                                                <SelectTrigger className="h-9 w-full text-xs font-semibold bg-card border-slate-200">
                                                    <SelectValue placeholder="Select Page" />
                                                </SelectTrigger>
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

                                    {/* Custom URL */}
                                    {activeSlide.targetMode === 'custom' && (
                                        <BuilderCountedInput
                                            label="Custom URL"
                                            value={activeSlide.customUrl}
                                            onChange={(val) => updateActiveSlide('customUrl', val)}
                                            maxLength={200}
                                            inputClassName="!h-9 text-xs font-mono"
                                        />
                                    )}

                                    {/* OVERLAY & EFFECTS SECTION */}
                                    <div className="space-y-3 pt-2 border-t">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            OVERLAY & EFFECTS
                                        </p>

                                        {/* 6. Overlay Opacity */}
                                        <BuilderEffectSlider
                                            label="6. Overlay Opacity"
                                            value={activeSlide.overlayOpacity}
                                            onChange={(val) => updateActiveSlide('overlayOpacity', val)}
                                            min={0}
                                            max={100}
                                            unit="%"
                                        />

                                        {/* 7. Brightness */}
                                        <BuilderEffectSlider
                                            label="7. Brightness"
                                            value={activeSlide.brightness}
                                            onChange={(val) => updateActiveSlide('brightness', val)}
                                            min={0}
                                            max={200}
                                            unit="%"
                                        />

                                        {/* 8. Blur */}
                                        <BuilderEffectSlider
                                            label="8. Blur"
                                            value={activeSlide.blur}
                                            onChange={(val) => updateActiveSlide('blur', val)}
                                            min={0}
                                            max={20}
                                            unit="px"
                                        />
                                    </div>

                                    {/* SLIDE IMAGE SECTION */}
                                    <BuilderImageUploadDropzone
                                        label="SLIDE IMAGE"
                                        imageUrl={activeSlide.imageUrl}
                                        onFileSelect={handleFileSelect}
                                        onReCrop={() => {
                                            setCropImageRaw(activeSlide.imageUrl);
                                            setCropOpen(true);
                                        }}
                                        onRemove={() => updateActiveSlide('imageUrl', '')}
                                        recommendedText="Recommended: 1920x800px (Max: 2MB)"
                                    />

                                    {/* STATUS SECTION */}
                                    <BuilderStatusSwitch
                                        label="STATUS"
                                        description="Enable or disable this slide on the website."
                                        checked={activeSlide.status}
                                        onCheckedChange={(val) => updateActiveSlide('status', val)}
                                    />

                                    {/* Card Footer Actions */}
                                    <div className="flex items-center justify-between pt-2 border-t mt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                toast.info('Slide edit cancelled.');
                                            }}
                                            className="gap-1.5 text-xs text-slate-600 h-8"
                                        >
                                            <X className="h-3.5 w-3.5" /> Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                toast.success('Advance slide updated.');
                                            }}
                                            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-4"
                                        >
                                            <Save className="h-3.5 w-3.5" /> Update Slide
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Slider Management (7 Cols) */}
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
                                                            {slide.customUrl || '/'}
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
                                                                onCheckedChange={(val) => {
                                                                    setSlides(
                                                                        slides.map((s) =>
                                                                            s.id === slide.id ? { ...s, status: val } : s
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setEditingSlideId(slide.id);
                                                                    setActivePreviewIndex(idx);
                                                                }}
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
                                                                onClick={() => handleDeleteSlide(slide.id)}
                                                                className="h-7.5 w-7.5 rounded-lg p-0 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
                            <DialogTitle className="text-sm font-bold text-slate-900">Advance Slider — Live Preview</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            This is how your advance slider with filters will appear on the live website.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-0 bg-slate-950 rounded-xl overflow-hidden my-2">
                        {previewSlide ? (
                            <div className="relative flex flex-col justify-center px-8 text-white transition-all duration-300 overflow-hidden h-[340px]">
                                {previewSlide.imageUrl ? (
                                    <div
                                        className="absolute inset-0 transition-all duration-300"
                                        style={{
                                            backgroundImage: `url(${previewSlide.imageUrl})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            filter: `brightness(${previewSlide.brightness}%) blur(${previewSlide.blur}px)`,
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="absolute inset-0 transition-all duration-300"
                                        style={{
                                            background: 'linear-gradient(135deg, #1B0534 0%, #2D0B54 50%, #1B0534 100%)',
                                            filter: `brightness(${previewSlide.brightness}%) blur(${previewSlide.blur}px)`,
                                        }}
                                    />
                                )}

                                <div
                                    className="absolute inset-0 bg-black transition-opacity duration-300"
                                    style={{ opacity: previewSlide.overlayOpacity / 100 }}
                                />

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={prevPreview}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white p-0 shadow-md z-10"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={nextPreview}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white p-0 shadow-md z-10"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>

                                <div className="relative z-10 max-w-md space-y-2.5 pl-4">
                                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-white">
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
