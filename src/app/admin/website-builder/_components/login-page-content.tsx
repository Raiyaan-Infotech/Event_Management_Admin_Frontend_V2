'use client';

import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Sparkles, PanelLeft, ImageIcon, ListChecks, Check, Monitor, Smartphone, HelpCircle, RotateCcw, Loader2, Eye } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BuilderCountedInput, BuilderCountedTextarea } from './builder-field';
import { useCompanyLoginSettings } from '@/hooks/useCompanyWebsiteBuilder';
import { mediaApi } from '@/hooks/use-media';
import { PageLoader } from '@/components/common/page-loader';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSectionTranslation, handleTranslationSave } from '@/hooks/useSectionTranslation';
import { TranslationSideCard } from './translation-side-card';
import { TranslationModeBanner } from './translation-mode-banner';

interface BulletRow {
    id: string;
    text: string;
}

const initialBullets: BulletRow[] = [
    { id: '1', text: 'Real-time RSVP & Guest Management' },
    { id: '2', text: 'Direct Messaging with Event Vendors' },
    { id: '3', text: 'Custom Website Builder & Gallery Settings' },
];

export function LoginPageContent() {
    const { data: loginData, isLoading, save, isSaving } = useCompanyLoginSettings();

    const [enabled, setEnabled] = useState(true);
    const [eyebrow, setEyebrow] = useState('Event workspace');
    const [title, setTitle] = useState('Everything for your event, in one place.');
    const [description, setDescription] = useState('Manage enquiries, bookings and event details from one secure account.');
    const [showBackgroundImage, setShowBackgroundImage] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState('');
    const [bullets, setBullets] = useState<BulletRow[]>(initialBullets);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Per-form translation mode (?lang=<id>), same as Hero Section.
    // Field keys match the `login-page` entry in the backend FIELD_CATALOG,
    // registered at page_slug='' with the settings row id as record_id.
    // NOTE: `subtitle` is the DB column; the form labels it 'Description'.
    const translationFields = [
        { key: 'title', label: 'Title', type: 'input' as const, value: title },
        { key: 'subtitle', label: 'Subtitle', type: 'textarea' as const, value: description },
    ];
    const translation = useSectionTranslation({
        section: 'login-page',
        recordId: (loginData as any)?.id,
        fields: translationFields,
    });
    const { isTranslationMode, bind } = translation;
    // Background image, bullets and the panel toggle are shared across
    // languages - they are edited from the English version only.
    const sharedOnly = cn(isTranslationMode && 'opacity-50 pointer-events-none');

    useEffect(() => {
        if (loginData && Object.keys(loginData).length > 0) {
            if (loginData.title) setTitle(loginData.title);
            if (loginData.subtitle) setDescription(loginData.subtitle);
            if (loginData.bg_image_url) {
                setBackgroundImage(loginData.bg_image_url);
                setShowBackgroundImage(true);
            }
            if (loginData.is_active !== undefined) setEnabled(Boolean(loginData.is_active));
        }
    }, [loginData]);

    const MAX_BULLETS = 5;
    const EYEBROW_MAX = 40;
    const TITLE_MAX = 60;
    const DESCRIPTION_MAX = 100;
    const BULLET_MAX = 40;

    const handleSave = async () => {
        if (await handleTranslationSave(translation, 'Login Page')) return;
        try {
            await save({
                title,
                subtitle: description,
                bg_image_url: showBackgroundImage ? backgroundImage : '',
                is_active: enabled ? 1 : 0,
            });
            // Refresh the key catalog so the side card counts and
            // auto-translate see the English text just saved.
            translation.registerKeys();
            toast.success('Login page settings saved successfully');
            // Fill every language straight off the save — no second button.
            await translation.translateAfterSave();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save login page settings');
        }
    };

    const handleReset = () => {
        setEnabled(true);
        setEyebrow('Event workspace');
        setTitle('Everything for your event, in one place.');
        setDescription('Manage enquiries, bookings and event details from one secure account.');
        setShowBackgroundImage(false);
        setBackgroundImage('');
        setBullets(initialBullets);
        setPreviewDevice('desktop');
        toast.info('Login page settings reset to defaults.');
    };

    const handleBackgroundSelect = async (file: File) => {
        const tid = toast.loading('Uploading background image...');
        try {
            const res = await mediaApi.upload(file, 'website-builder');
            if (res?.url) {
                setBackgroundImage(res.url);
                toast.success('Background image uploaded successfully', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded image URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload image', { id: tid });
        }
    };

    const handleAddBullet = () => {
        if (bullets.length >= MAX_BULLETS) {
            toast.error('Maximum 5 highlight bullets allowed.');
            return;
        }
        const newBullet: BulletRow = { id: `bullet-${Date.now()}`, text: '' };
        setBullets([...bullets, newBullet]);
    };

    const handleRemoveBullet = (id: string) => {
        setBullets(bullets.filter((b) => b.id !== id));
    };

    return (
        <div className="space-y-4">
            <PageLoader open={isSaving} text="Saving Login Page Settings..." />
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                    <h1 className="mt-1 text-xl font-bold tracking-tight">
                        Login Page Settings
                        {isTranslationMode && translation.activeLanguage && (
                            <span className="ml-2 text-primary">({translation.activeLanguage.name})</span>
                        )}
                    </h1>
                    <p className="text-xs text-muted-foreground">Customize side panel copy, background image, and highlight bullets for client login.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Customize client login panel background image, copy, and bullet features.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="h-8 px-3 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                        <Eye className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Live Preview
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || translation.isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSaving || translation.isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving || translation.isSaving ? 'Saving...' : isTranslationMode ? 'Save Translation' : 'Save Login Page'}
                    </Button>
                </div>
            </div>

            {/* Languages + translation mode */}
            <div className="flex flex-col gap-3">
                <div className="w-full self-end lg:w-72">
                    <TranslationSideCard
                        section="login-page"
                        recordId={(loginData as any)?.id}
                        activeLanguageId={translation.activeLanguage?.id ?? null}
                        buildHref={translation.buildHref}
                        canTranslate={translation.canTranslate}
                        fields={translationFields}
                    />
                </div>
                <div className="order-first min-w-0">
                    <TranslationModeBanner translation={translation} label="the Login Page" />
                </div>
            </div>

            {/* Preview lives in the Live Preview dialog, matching Hero Section —
                the form gets the full width. */}
            <div className="grid grid-cols-1 gap-4 items-start">
                <div className="space-y-3">
                    {/* Toggle: Show Side Panel */}
                    <Card className="shadow-xs">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-xs text-foreground">Show side panel</h4>
                                    <p className="text-[10px] text-muted-foreground">When off, the login / get started popup shows only the form (no branded side panel).</p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} disabled={isTranslationMode} />
                            </div>
                        </CardContent>
                    </Card>

                    {enabled && (
                        <>
                            {/* Section: Side Panel Content */}
                            <Card className="shadow-xs">
                                <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2 space-y-0">
                                    <PanelLeft className="h-4 w-4 text-primary" />
                                    <div>
                                        <CardTitle className="text-sm font-bold">Side Panel Content</CardTitle>
                                        <CardDescription className="text-[10px]">The marketing copy shown beside the login form.</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 space-y-2.5">
                                    <BuilderCountedInput
                                        label="Eyebrow label"
                                        value={eyebrow}
                                        onChange={setEyebrow}
                                        maxLength={EYEBROW_MAX}
                                        placeholder="Event workspace"
                                    />

                                    <BuilderCountedInput
                                        label="Title"
                                        maxLength={TITLE_MAX}
                                        {...bind('title', title, setTitle)}
                                        placeholder={isTranslationMode ? title : 'Everything for your event, in one place.'}
                                    />

                                    <BuilderCountedTextarea
                                        label="Description"
                                        maxLength={DESCRIPTION_MAX}
                                        rows={2}
                                        {...bind('subtitle', description, setDescription)}
                                        placeholder={isTranslationMode ? description : 'Manage enquiries, bookings and event details...'}
                                    />
                                </CardContent>
                            </Card>

                            {/* Section: Background Image */}
                            <Card className="shadow-xs">
                                <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2 space-y-0">
                                    <ImageIcon className="h-4 w-4 text-primary" />
                                    <div>
                                        <CardTitle className="text-sm font-bold">Background Image</CardTitle>
                                        <CardDescription className="text-[10px]">Optional image shown behind the panel, tinted by your brand color.</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 space-y-2.5">
                                    <div className="flex items-center justify-between rounded-lg border p-2.5 bg-card">
                                        <div>
                                            <h4 className="font-semibold text-xs">Show Background Image</h4>
                                            <p className="text-[10px] text-muted-foreground">Enable image overlay on the left brand panel.</p>
                                        </div>
                                        <Switch checked={showBackgroundImage} onCheckedChange={setShowBackgroundImage} />
                                    </div>

                                    {showBackgroundImage && (
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Panel Background
                                            </label>
                                            {backgroundImage ? (
                                                <div className="relative rounded-md overflow-hidden border bg-card">
                                                    <img src={backgroundImage} alt="Panel Background" className="w-full h-24 object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setBackgroundImage('')}
                                                        className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative flex flex-col items-center justify-center rounded-lg border border-dashed p-4 bg-muted/20 hover:bg-muted/30 cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleBackgroundSelect(file);
                                                        }}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                    <ImageIcon className="h-5 w-5 text-muted-foreground mb-0.5" />
                                                    <p className="text-xs font-semibold text-foreground">Click to upload image</p>
                                                    <p className="text-[9px] text-muted-foreground">Recommended: 900x1200px (Max: 2MB)</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Section: Highlights */}
                            <Card className="shadow-xs">
                                <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-2">
                                        <ListChecks className="h-4 w-4 text-primary" />
                                        <div>
                                            <CardTitle className="text-sm font-bold">Highlights</CardTitle>
                                            <CardDescription className="text-[10px]">Up to 5 short bullet points with a check icon.</CardDescription>
                                        </div>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddBullet} disabled={bullets.length >= MAX_BULLETS} className="gap-1 text-[11px] h-7 px-2">
                                        <Plus className="h-3 w-3" /> Add highlight
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 space-y-2">
                                    {bullets.map((bullet, idx) => (
                                        <div key={bullet.id} className="flex items-center gap-2">
                                            <BuilderCountedInput
                                                value={bullet.text}
                                                onChange={(value) => {
                                                    const updated = [...bullets];
                                                    updated[idx].text = value;
                                                    setBullets(updated);
                                                }}
                                                maxLength={BULLET_MAX}
                                                placeholder={`Highlight ${idx + 1}`}
                                                showCount={false}
                                                className="flex-1 h-8 text-xs"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemoveBullet(bullet.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

            </div>

            {/* Live Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-3xl w-[92vw]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Eye className="h-4 w-4 text-emerald-600" /> Login Page Live Preview
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Real-time preview of the branded side panel shown on the client login modal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] space-y-2 overflow-y-auto py-1">
                        <Card className="border-primary/30 shadow-xs overflow-hidden">
                            <CardHeader className="bg-muted/30 p-3 border-b">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">Live Login Side Panel Preview</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-background shadow-2xs">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDevice('desktop')}
                                            className={cn(
                                                'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition-all',
                                                previewDevice === 'desktop' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                            )}
                                        >
                                            <Monitor className="h-3 w-3" /> Desktop
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDevice('mobile')}
                                            className={cn(
                                                'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition-all',
                                                previewDevice === 'mobile' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                            )}
                                        >
                                            <Smartphone className="h-3 w-3" /> Mobile
                                        </button>
                                    </div>
                                </div>
                                <CardDescription className="text-[10px]">Real-time interactive rendering of client login branded panel.</CardDescription>
                            </CardHeader>

                            <CardContent className="p-0 bg-slate-50/50">
                                {enabled ? (
                                    <div className={cn(
                                        'relative min-h-[440px] flex flex-col justify-between p-5 bg-primary text-primary-foreground overflow-hidden transition-all duration-300',
                                        previewDevice === 'mobile' ? 'max-w-[320px] mx-auto my-3 rounded-xl border border-slate-300 shadow-md' : 'w-full'
                                    )}>
                                        {/* Optional Background Image */}
                                        {showBackgroundImage && backgroundImage && (
                                            <>
                                                <img
                                                    src={backgroundImage}
                                                    alt="Login panel background"
                                                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                                                />
                                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
                                            </>
                                        )}

                                        {/* Top Brand Header */}
                                        <div className="relative z-10 space-y-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/20 backdrop-blur-md text-white font-extrabold text-xs border border-white/30">
                                                    RA
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-extrabold leading-none text-white">RA EVENTS</h3>
                                                    <p className="text-[9px] font-semibold text-white/70 uppercase tracking-widest mt-0.5">Tirunelveli</p>
                                                </div>
                                            </div>

                                            <div className="pt-4 space-y-1.5">
                                                {eyebrow && (
                                                    <span className="text-[9px] font-extrabold text-white/75 uppercase tracking-widest block">
                                                        {eyebrow}
                                                    </span>
                                                )}
                                                {title && (
                                                    <h2 className="text-lg font-black leading-snug text-white">
                                                        {title}
                                                    </h2>
                                                )}
                                                {description && (
                                                    <p className="text-[11px] text-white/80 leading-normal pt-0.5">
                                                        {description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Highlights List */}
                                        {bullets.filter((b) => b.text.trim()).length > 0 && (
                                            <div className="relative z-10 pt-4 space-y-1.5 border-t border-white/20 mt-4">
                                                {bullets.filter((b) => b.text.trim()).map((bullet) => (
                                                    <div key={bullet.id} className="flex items-center gap-2 text-[11px] font-semibold text-white/95">
                                                        <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white/25 text-white">
                                                            <Check className="h-2 w-2" />
                                                        </div>
                                                        <span>{bullet.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                                        <p className="font-semibold text-foreground">Side Panel is Turned Off</p>
                                        <p className="text-[10px]">When off, the client login modal displays only the authentication form.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
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
