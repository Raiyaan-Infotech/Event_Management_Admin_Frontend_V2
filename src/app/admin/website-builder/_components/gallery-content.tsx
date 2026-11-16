'use client';

import { useState, useRef } from 'react';
import {
    Save,
    Upload,
    Trash2,
    Plus,
    HelpCircle,
    RotateCcw,
    Image as ImageIcon,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { BuilderCountedInput } from './builder-field';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/common/page-loader';

interface GalleryImage {
    id: string;
    url: string;
    alt?: string;
    category: string;
}

export function GalleryContent() {
    const [eventName, setEventName] = useState('Sarah & Michael Wedding');
    const [eventType, setEventType] = useState('wedding');
    const [city, setCity] = useState('New York, USA');
    const [activeFilter, setActiveFilter] = useState('All');
    const [isSaving, setIsSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const [categories, setCategories] = useState([
        'All',
        'Wedding Decor',
        'Corporate Summits',
        'Private Parties',
        'Exhibition',
    ]);

    const [images, setImages] = useState<GalleryImage[]>([
        { id: '1', url: '', category: 'wedding', alt: 'Royal Wedding Stage' },
        { id: '2', url: '', category: 'corporate', alt: 'Tech Summit Stage' },
        { id: '3', url: '', category: 'private', alt: 'Birthday Floral Setup' },
        { id: '4', url: '', category: 'wedding', alt: 'Reception Hall' },
        { id: '5', url: '', category: 'exhibition', alt: 'Art Exhibition' },
        { id: '6', url: '', category: 'corporate', alt: 'Corporate Gala' },
    ]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const newImgs: GalleryImage[] = files.map((file, idx) => ({
            id: `${Date.now()}-${idx}`,
            url: URL.createObjectURL(file),
            alt: file.name,
            category: eventType,
        }));

        setImages((prev) => [...prev, ...newImgs]);
        toast.success(`Uploaded ${files.length} gallery image(s).`);
    };

    const handleRemoveImage = (id: string) => {
        setImages((prev) => prev.filter((img) => img.id !== id));
        toast.success('Image removed from gallery.');
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Gallery saved successfully!');
        }, 600);
    };

    const handleReset = () => {
        setEventName('Sarah & Michael Wedding');
        setEventType('wedding');
        setCity('New York, USA');
        setActiveFilter('All');
        toast.info('Gallery form reset to defaults.');
    };

    const visibleImages =
        activeFilter === 'All'
            ? images
            : images.filter(
                  (img) =>
                      img.category.toLowerCase() === activeFilter.toLowerCase() ||
                      activeFilter.toLowerCase().includes(img.category.toLowerCase())
              );

    return (
        <div className="space-y-5">
            <PageLoader open={isSaving} text="Saving Gallery..." />
            {/* Header Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Gallery</h1>
                    <p className="text-xs text-slate-500">Manage your website gallery and Gallery settings.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold"
                    >
                        <Eye className="h-3.5 w-3.5 text-emerald-600" /> Live Preview
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-slate-600 border-slate-200">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 font-semibold">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                        <Save className="h-3.5 w-3.5" /> {isSaving ? 'Saving...' : 'Save Gallery'}
                    </Button>
                </div>
            </div>

            {/* Main Workspace (6+6 Cols) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Gallery Info */}
                <div className="md:col-span-5 space-y-4">
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-3 px-4 border-b bg-slate-50/50">
                            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Gallery Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <BuilderCountedInput
                                label="Event Title"
                                value={eventName}
                                onChange={setEventName}
                                maxLength={100}
                                placeholder="Sarah & Michael Wedding"
                            />
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase">Event Type</label>
                                <Select value={eventType} onValueChange={setEventType}>
                                    <SelectTrigger className="h-9 text-xs border-slate-200">
                                        <SelectValue placeholder="Select event type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="wedding">Wedding Celebration</SelectItem>
                                        <SelectItem value="corporate">Corporate Event</SelectItem>
                                        <SelectItem value="birthday">Birthday Gala</SelectItem>
                                        <SelectItem value="reception">Reception Party</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <BuilderCountedInput
                                label="City / Location"
                                value={city}
                                onChange={setCity}
                                maxLength={100}
                                placeholder="New York, USA"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Upload Images & Categories */}
                <div className="md:col-span-7 space-y-4">
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-3 px-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Gallery Images ({images.length})
                            </CardTitle>
                            <Button
                                size="sm"
                                onClick={() => {
                                    const newCat = prompt('Enter new category name:');
                                    if (newCat) {
                                        setCategories([...categories, newCat]);
                                        toast.success(`Category "${newCat}" added.`);
                                    }
                                }}
                                className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Category
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAddImages}
                                multiple
                                accept="image/*"
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-100/60 cursor-pointer transition-all text-center group"
                            >
                                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Upload className="h-5 w-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800">
                                    <span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">Recommended: 1200x800px (Max: 5MB each)</p>
                            </div>

                            {/* Image Thumbnails */}
                            {images.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                                    {images.map((img) => (
                                        <div
                                            key={img.id}
                                            className="group relative aspect-square rounded-lg border border-slate-200 bg-slate-100 overflow-hidden"
                                        >
                                            {img.url ? (
                                                <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                                    <ImageIcon className="h-4 w-4 text-slate-400" />
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(img.id)}
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                            <DialogTitle className="text-sm font-bold text-slate-900">Gallery — Live Preview</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            This is how your event gallery will appear on the live website.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4">
                        {/* Category Filter Pills */}
                        <div className="flex flex-wrap gap-1.5">
                            {categories.map((cat) => {
                                const isSelected = activeFilter.toLowerCase() === cat.toLowerCase();
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setActiveFilter(cat)}
                                        className={cn(
                                            'px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer',
                                            isSelected
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        )}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Responsive Image Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {visibleImages.length > 0 ? (
                                visibleImages.map((img) => (
                                    <div
                                        key={img.id}
                                        className="group relative aspect-[4/3] rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shadow-2xs transition-all hover:shadow-md"
                                    >
                                        {img.url ? (
                                            <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 flex flex-col items-center justify-center p-2 text-center">
                                                <ImageIcon className="h-6 w-6 text-slate-400 mb-1" />
                                                <span className="text-[10px] font-semibold text-slate-500 line-clamp-1">
                                                    {img.alt || 'Gallery Image'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-14 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <ImageIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-600">No Gallery Images Found</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Upload images to display in this category.</p>
                                </div>
                            )}
                        </div>
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
