'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Save,
    Plus,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    HelpCircle,
    RotateCcw,
    Quote,
    Star,
    Upload,
    Image as ImageIcon,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCompanyTestimonials } from '@/hooks/useCompanyWebsiteBuilder';
import { mediaApi } from '@/hooks/use-media';
import { PageLoader } from '@/components/common/page-loader';
import { BuilderCountedInput, BuilderCountedTextarea } from './builder-field';
import { cn } from '@/lib/utils';
import { RowTranslateButton } from './row-translate-dialog';
import { useSectionTranslation, handleTranslationSave } from '@/hooks/useSectionTranslation';
import { TranslationSideCard } from './translation-side-card';
import { TranslationModeBanner } from './translation-mode-banner';

interface Testimonial {
    id: string;
    customerName: string;
    eventName: string;
    feedback: string;
    photoUrl: string;
    rating: number;
    showRating: boolean;
    status: boolean;
}

function avatarDataUrl(name: string, background: string) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

    return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="#1e1b4b" />
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="24" fill="url(#g)" />
      <circle cx="80" cy="64" r="30" fill="#ffffff" opacity="0.9" />
      <path d="M30 145c8-34 28-51 50-51s42 17 50 51" fill="#ffffff" opacity="0.9" />
      <text x="80" y="72" text-anchor="middle" font-family="Inter, Arial" font-size="22" font-weight="800" fill="#1e1b4b">${initials}</text>
    </svg>
  `)}`;
}

const emptyTestimonial: Testimonial = {
    id: '',
    customerName: '',
    eventName: '',
    feedback: '',
    photoUrl: '',
    rating: 5,
    showRating: true,
    status: true,
};

export function TestimonialsContent() {
    // create/update/remove are the per-item CRUD calls the generic list hook
    // already exposes. `replace` (bulk) is deliberately unused here now: it
    // deletes every testimonial and reinserts the whole table with fresh
    // auto-increment ids on every save, which silently orphaned every
    // testimonial's translations (their record_id no longer matched any row)
    // the moment ANY one of them was added, edited, or deleted.
    const {
        data: savedTestimonials = [],
        create: createTestimonial,
        update: updateTestimonial,
        remove: removeTestimonial,
        isLoading,
        isSaving: isSavingTestimonials,
    } = useCompanyTestimonials();
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const router = useRouter();
    const searchParams = useSearchParams();
    // Which testimonial is being edited lives in the URL, not local state —
    // local-only selection reset to the first row on any fresh page load
    // (e.g. after switching language, which navigates to a new ?lang= URL),
    // so translating testimonial #3 could silently end up editing #1 instead.
    const editingIdParam = searchParams.get('id');
    const editingId = editingIdParam || testimonials[0]?.id || '';
    const setEditingId = (id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('id', id);
        router.replace(`?${params.toString()}`);
    };
    const [activePreviewIndex, setActivePreviewIndex] = useState(0);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const isSaving = isSavingTestimonials || isUploadingPhoto || isAddingTestimonial;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (loadedRef.current) return;
        if (savedTestimonials && savedTestimonials.length > 0) {
            const mapped: Testimonial[] = savedTestimonials.map((t: any) => ({
                id: String(t.id),
                customerName: t.customer_name || t.name || '',
                eventName: t.event_name || t.event || '',
                feedback: t.feedback || '',
                photoUrl: t.photo_url || t.photoUrl || avatarDataUrl(t.customer_name || 'Customer', '#6366f1'),
                rating: Number(t.rating ?? 5),
                showRating: t.show_rating !== undefined ? Boolean(t.show_rating) : true,
                status: t.is_active !== undefined ? Boolean(t.is_active) : true,
            }));
            setTestimonials(mapped);
            loadedRef.current = true;
        }
    }, [savedTestimonials]);

    const activeItem = testimonials.find((t) => t.id === editingId) || testimonials[0] || emptyTestimonial;

    // Per-form translation mode (?lang=<id>), same as Hero Section. This page
    // edits one testimonial at a time, so the slot follows activeItem —
    // selecting a different row in the table switches what you translate.
    const translationFields = [
        { key: 'customer_name', label: 'Customer Name', type: 'input' as const, value: activeItem.customerName || '', required: true },
        { key: 'event_name', label: 'Event Name', type: 'input' as const, value: activeItem.eventName || '', required: true },
        { key: 'feedback', label: 'Feedback', type: 'textarea' as const, value: activeItem.feedback || '', required: true },
    ];
    const translation = useSectionTranslation({
        section: 'testimonials',
        recordId: Number(activeItem.id) || undefined,
        fields: translationFields,
    });
    const { isTranslationMode, bind } = translation;
    // Photo and star rating are shared across languages.
    const sharedOnly = cn(isTranslationMode && 'opacity-50 pointer-events-none');

    const updateActiveItem = (patch: Partial<Testimonial>) => {
        setTestimonials((prev) =>
            prev.map((t) => (t.id === activeItem.id ? { ...t, ...patch } : t))
        );
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingPhoto(true);
        const tid = toast.loading('Uploading customer photo...');
        try {
            const res = await mediaApi.upload(file, 'website-builder');
            if (res?.url) {
                updateActiveItem({ photoUrl: res.url });
                toast.success('Customer photo uploaded successfully.', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded image URL.', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload photo.', { id: tid });
        } finally {
            setIsUploadingPhoto(false);
            e.target.value = '';
        }
    };

    // Creates the row immediately (rather than staging a local draft with a
    // fake id) so it has a real database id to select and, from there, to
    // address translations against — a staged-until-Save row could never be
    // translated because there was nothing yet for a slot to point at.
    const handleAddTestimonial = async () => {
        setIsAddingTestimonial(true);
        try {
            const created: any = await createTestimonial({
                customer_name: 'New Customer',
                event_name: 'Event Name',
                feedback: 'Add customer feedback here.',
                photo_url: avatarDataUrl('New Customer', '#6366f1'),
                rating: 5,
                show_rating: 1,
                is_active: 1,
                sort_order: testimonials.length + 1,
            });
            const newId = created?.data?.id ?? created?.id;
            if (newId) setEditingId(String(newId));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to add testimonial');
        } finally {
            setIsAddingTestimonial(false);
        }
    };

    const handleDeleteTestimonial = async (testimonial: Testimonial) => {
        try {
            await removeTestimonial(Number(testimonial.id));
            if (testimonial.id === editingId) {
                const next = testimonials.find((t) => t.id !== testimonial.id);
                if (next) setEditingId(next.id);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to remove testimonial');
        }
    };

    const handleSave = async () => {
        // In translation mode only the selected testimonial's translated text
        // is written; the testimonial rows themselves are untouched.
        if (await handleTranslationSave(translation, 'Testimonial')) return;
        // Updates ONLY the testimonial being edited — not the bulk replace
        // that used to rewrite every other testimonial's row (and id) too.
        try {
            await updateTestimonial({
                id: Number(activeItem.id),
                customer_name: activeItem.customerName,
                event_name: activeItem.eventName,
                feedback: activeItem.feedback,
                photo_url: activeItem.photoUrl,
                rating: activeItem.rating,
                show_rating: activeItem.showRating ? 1 : 0,
                is_active: activeItem.status ? 1 : 0,
            });
            // Fill every language straight off the save — no second button.
            await translation.translateAfterSave();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save testimonial');
        }
    };

    const visibleTestimonials = testimonials.filter((t) => t.status);
    const previewItem = visibleTestimonials[activePreviewIndex] || visibleTestimonials[0] || activeItem;

    return (
        <div className="space-y-5">
            <PageLoader open={isSaving} text="Saving Testimonials..." />
            {/* Header Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                        Testimonials
                        {isTranslationMode && translation.activeLanguage && (
                            <span className="ml-2 text-primary">({translation.activeLanguage.name})</span>
                        )}
                    </h1>
                    <p className="text-xs text-slate-500">
                        Manage your website testimonials and Testimonials settings.
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
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button variant="outline" size="sm" disabled={isTranslationMode} onClick={() => handleDeleteTestimonial(activeItem)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        Delete
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || translation.isSaving}
                        className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        <Save className="h-3.5 w-3.5 mr-1" />{' '}
                        {isSaving || translation.isSaving ? 'Saving...' : isTranslationMode ? 'Save Translation' : 'Update Testimonial'}
                    </Button>
                </div>
            </div>

            {/* Languages + translation mode - scoped to the testimonial being
                edited, since each row is its own slot. */}
            {Number(activeItem.id) ? (
                <div className="flex flex-col gap-3">
                    <div className="w-full self-end lg:w-72">
                        <TranslationSideCard
                            section="testimonials"
                            recordId={Number(activeItem.id)}
                            activeLanguageId={translation.activeLanguage?.id ?? null}
                            buildHref={translation.buildHref}
                        canTranslate={translation.canTranslate}
                            fields={translationFields}
                        />
                    </div>
                    <div className="order-first min-w-0">
                        <TranslationModeBanner translation={translation} label={activeItem.customerName} />
                    </div>
                </div>
            ) : null}

            {/* 2-Column Main Workspace */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Left Column: Form Controls (5/12 width) */}
                <div className="space-y-4 md:col-span-5">
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-3 px-4 border-b bg-slate-50/50">
                            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Testimonial Information
                            </CardTitle>
                            <CardDescription className="text-[11px] text-slate-500">
                                Add customer testimonial and feedback.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 space-y-4">
                            {/* Customer Name */}
                            <BuilderCountedInput
                                label="Customer Name"
                                required
                                maxLength={100}
                                {...bind('customer_name', activeItem.customerName, (val) => updateActiveItem({ customerName: val }))}
                                inputClassName={cn(
                                    '!h-9 text-xs',
                                    translation.errors.customer_name && 'border-red-500 ring-1 ring-red-500'
                                )}
                            />

                            {/* Customer Photo Upload */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                                    Customer Photo
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                                        {/* Render nothing rather than src="" — an empty src makes the
                                            browser re-request the current page as the image. */}
                                        {activeItem.photoUrl ? (
                                            <img
                                                src={activeItem.photoUrl}
                                                alt={activeItem.customerName}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400">No photo</span>
                                        )}
                                    </div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handlePhotoSelect}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-100/50 hover:border-blue-400 transition-all cursor-pointer text-center group"
                                    >
                                        <Upload className="h-4 w-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                                        <p className="text-[11px] font-bold text-slate-800">
                                            <span className="text-blue-600">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">
                                            Recommended: 400x400px (Max: 2MB)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Event Name */}
                            <BuilderCountedInput
                                label="Event Name"
                                required
                                maxLength={100}
                                {...bind('event_name', activeItem.eventName, (val) => updateActiveItem({ eventName: val }))}
                                inputClassName={cn(
                                    '!h-9 text-xs',
                                    translation.errors.event_name && 'border-red-500 ring-1 ring-red-500'
                                )}
                            />

                            {/* Feedback Text */}
                            <BuilderCountedTextarea
                                label="Customer Feedback"
                                required
                                maxLength={500}
                                rows={3}
                                {...bind('feedback', activeItem.feedback, (val) => updateActiveItem({ feedback: val }))}
                                textareaClassName={cn(
                                    translation.errors.feedback && 'border-red-500 ring-1 ring-red-500'
                                )}
                            />

                            {/* Rating Stars */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                                        Rating ({activeItem.rating} Stars)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-500 font-medium">Display Rating</span>
                                        <Switch
                                            checked={activeItem.showRating}
                                            onCheckedChange={(val) => updateActiveItem({ showRating: val })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 p-2 border border-slate-200 rounded-lg bg-white">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => updateActiveItem({ rating: star })}
                                            className="p-1 hover:scale-110 transition-transform"
                                        >
                                            <Star
                                                className={cn(
                                                    'h-5 w-5',
                                                    star <= activeItem.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Added Testimonials Table (7/12 width) */}
                <div className="space-y-4 md:col-span-7">
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-3 px-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                    Testimonials List ({testimonials.length})
                                </CardTitle>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAddTestimonial}
                                className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs gap-1"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add New
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-500">
                                        <tr>
                                            <th className="py-2.5 px-3">Customer</th>
                                            <th className="py-2.5 px-3">Event</th>
                                            <th className="py-2.5 px-3 text-center">Rating</th>
                                            <th className="py-2.5 px-3 text-center">Status</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                         {testimonials.length === 0 ? (
                                             <tr>
                                                 <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                                                     No testimonials found. Click &quot;Add New&quot; to create your first customer review.
                                                 </td>
                                             </tr>
                                         ) : (
                                             testimonials.map((t) => (
                                            <tr
                                                key={t.id}
                                                className={cn(
                                                    'hover:bg-slate-50/80 transition-colors',
                                                    editingId === t.id && 'bg-blue-50/40 font-medium'
                                                )}
                                            >
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-7 w-7 rounded-full overflow-hidden border shrink-0">
                                                            <img src={t.photoUrl} alt={t.customerName} className="h-full w-full object-cover" />
                                                        </div>
                                                        <span className="font-bold text-slate-800 truncate max-w-[120px]">{t.customerName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-slate-600 truncate max-w-[110px]">{t.eventName}</td>
                                                <td className="py-3 px-3 text-center">
                                                    {t.showRating ? (
                                                        <div className="flex items-center justify-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <Star
                                                                    key={s}
                                                                    className={cn(
                                                                        'h-3 w-3',
                                                                        s <= t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">Hidden</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <Switch
                                                        checked={t.status}
                                                        onCheckedChange={(val) => {
                                                            setTestimonials(
                                                                testimonials.map((item) =>
                                                                    item.id === t.id ? { ...item, status: val } : item
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditingId(t.id)}
                                                            className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {/* Field keys match the `testimonials` entry in the
                                                            backend FIELD_CATALOG. */}
                                                        <RowTranslateButton
                                                            section="testimonials"
                                                            recordId={Number(t.id) || undefined}
                                                            rowLabel={t.customerName}
                                                            fields={[
                                                                { key: 'customer_name', label: 'Customer Name', value: t.customerName, required: true },
                                                                { key: 'event_name', label: 'Event Name', value: t.eventName, required: true },
                                                                { key: 'feedback', label: 'Feedback', value: t.feedback, type: 'textarea', required: true },
                                                            ]}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteTestimonial(t)}
                                                            className="h-7 w-7 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                         )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Live Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-3xl border-slate-200">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <DialogTitle className="text-sm font-bold text-slate-900">Testimonials — Live Preview</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            This is how testimonials will appear on the live website.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/20 flex flex-col items-center justify-center relative min-h-[300px] rounded-xl border border-slate-100">
                        {/* Top Badge */}
                        <span className="px-3 py-1 rounded-md bg-blue-600 text-white font-bold text-[11px] mb-3 shadow-xs">
                            Testimonials
                        </span>
                        <h2 className="text-lg font-black text-slate-900 mb-6">What Our Clients Say</h2>

                        {/* Carousel Card */}
                        {previewItem ? (
                            <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-md border border-slate-100 relative flex flex-col items-center text-center">
                                <Quote className="h-8 w-8 text-blue-600 fill-blue-600 mb-3 opacity-90" />

                                <div className="mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-slate-100 shadow-xs">
                                    {previewItem.photoUrl ? (
                                        <img
                                            src={previewItem.photoUrl}
                                            alt={previewItem.customerName}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-[11px] font-black text-slate-400">
                                            {(previewItem.customerName || '?').charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                <h3 className="font-bold text-sm text-slate-900">{previewItem.customerName}</h3>
                                <p className="text-xs font-semibold text-blue-600 mb-2">{previewItem.eventName}</p>

                                {previewItem.showRating && (
                                    <div className="flex items-center gap-1 mb-3">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={cn(
                                                    'h-4 w-4',
                                                    s <= previewItem.rating
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'text-slate-200'
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}

                                <p className="text-xs text-slate-600 leading-relaxed max-w-md italic">
                                    "{previewItem.feedback}"
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 font-medium">No active testimonials to preview.</p>
                        )}

                        {/* Navigation Arrows */}
                        {visibleTestimonials.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setActivePreviewIndex(
                                            (activePreviewIndex - 1 + visibleTestimonials.length) %
                                                visibleTestimonials.length
                                        )
                                    }
                                    className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setActivePreviewIndex(
                                            (activePreviewIndex + 1) % visibleTestimonials.length
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}