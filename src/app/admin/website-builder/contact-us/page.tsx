'use client';

import { useEffect, useState } from 'react';
import {
    Save,
    RotateCcw,
    Sparkles,
    Share2,
    Code2,
    Mail,
    Phone,
    MapPin,
    Lock,
    Monitor,
    Smartphone,
    Send,
    Plus,
    Loader2,
    HelpCircle,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BuilderCountedInput, BuilderCountedTextarea } from '../_components/builder-field';
import { TranslationSideCard } from '../_components/translation-side-card';
import { TranslationModeBanner } from '../_components/translation-mode-banner';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/common/page-loader';
import { useSectionTranslation, handleTranslationSave } from '@/hooks/useSectionTranslation';
import { useCompanyContactSettings } from '@/hooks/useCompanyWebsiteBuilder';

type EditorMode = 'static' | 'dynamic';
type PreviewDevice = 'desktop' | 'mobile';

interface SocialLinkItem {
    id: string;
    num: number;
    name: string;
    url: string;
    show: boolean;
    iconColor: string;
}

export default function ContactUsPage() {
    const {
        data: contactData,
        isLoading,
        save,
        isSaving: isPersisting,
        refetch,
    } = useCompanyContactSettings();

    const [editorMode, setEditorMode] = useState<EditorMode>('static');
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    // Component Toggles
    const [enableContactDetails, setEnableContactDetails] = useState(true);
    const [enableSocialLinks, setEnableSocialLinks] = useState(true);
    const [enableGoogleMap, setEnableGoogleMap] = useState(true);

    // Contact Information — seeded from the DB row once it loads.
    const [contactMode, setContactMode] = useState<'default' | 'alternative'>('default');
    const [socialHeading, setSocialHeading] = useState('FOLLOW US ON SOCIAL MEDIA');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');

    // Social Links List
    const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([
        { id: '1', num: 1, name: 'YouTube', url: 'https://youtube.com/eventinvite', show: true, iconColor: 'bg-rose-500 text-white' },
        { id: '2', num: 2, name: 'Instagram', url: 'https://insta.com', show: true, iconColor: 'bg-pink-500 text-white' },
    ]);

    // Google Map Coordinates
    const [latitude, setLatitude] = useState('17.385044');
    const [longitude, setLongitude] = useState('78.486671');

    const [isSaving, setIsSaving] = useState(false);
    // Guards the load-once effect so typing isn't overwritten by a refetch.
    const [loadedId, setLoadedId] = useState<number | null>(null);

    const settings = contactData as any;

    useEffect(() => {
        if (!settings?.id || loadedId === Number(settings.id)) return;
        setEditorMode((settings.mode as EditorMode) || 'static');
        setEmail(settings.email || '');
        setMobile(settings.mobile || '');
        setAddress(settings.address || '');
        setEnableContactDetails(Number(settings.contact_form_enabled ?? 1) === 1);
        setEnableSocialLinks(Number(settings.social_links_enabled ?? 1) === 1);
        setEnableGoogleMap(Number(settings.google_map_enabled ?? 0) === 1);
        if (settings.latitude) setLatitude(String(settings.latitude));
        if (settings.longitude) setLongitude(String(settings.longitude));
        setLoadedId(Number(settings.id));
    }, [settings, loadedId]);

    // Translation mode. `address` is the only free text on this row — email,
    // phone and the map coordinates read the same in every language, so they
    // stay shared and are edited from the English version.
    const translation = useSectionTranslation({
        section: 'contact-settings',
        recordId: settings?.id ? Number(settings.id) : undefined,
        fields: [
            { key: 'address', label: 'Address', type: 'textarea', value: address },
        ],
    });
    const { isTranslationMode, bind } = translation;
    const sharedOnly = cn(isTranslationMode && 'opacity-50 pointer-events-none');

    const handleToggleSocial = (id: string, show: boolean) => {
        setSocialLinks((prev) =>
            prev.map((item) => (item.id === id ? { ...item, show } : item))
        );
    };

    /** Discards local edits and re-reads the stored settings. */
    const handleReset = async () => {
        setLoadedId(null);
        await refetch();
        toast.info('Reloaded contact settings from the saved version.');
    };

    const handleSave = async () => {
        if (await handleTranslationSave(translation, 'Contact Information')) return;

        setIsSaving(true);
        try {
            await save({
                mode: editorMode,
                email,
                mobile,
                address,
                contact_form_enabled: enableContactDetails ? 1 : 0,
                social_links_enabled: enableSocialLinks ? 1 : 0,
                google_map_enabled: enableGoogleMap ? 1 : 0,
                latitude: latitude || null,
                longitude: longitude || null,
            } as any);
            // Refresh the key catalog so the side card counts and auto-translate
            // see the English text that was just saved.
            translation.registerKeys();
            toast.success('Contact Us settings saved successfully!');
            // Fill every language straight off the save — no second button.
            await translation.translateAfterSave();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save contact settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageLoader
                open={isLoading || isSaving || isPersisting}
                text={isLoading ? 'Loading Contact Settings...' : 'Saving Contact Settings...'}
            />
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Live Preview</DialogTitle>
                        <DialogDescription>View how your contact section will appear to users.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-8 bg-slate-100 rounded-lg">
                        Preview Content Placeholder
                    </div>
                </DialogContent>
            </Dialog>

            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Contact Us</h1>
                    <p className="text-sm text-muted-foreground">
                        Create and manage your contact form. Choose a method to build your form.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="h-8 px-3 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                        <Eye className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Live Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info('Configure your site contact details, social links, map, and dynamic form.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || isPersisting || translation.isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSaving || translation.isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving || translation.isSaving ? 'Saving...' : isTranslationMode ? 'Save Translation' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Languages + translation mode */}
            <div className="flex flex-col gap-3">
                <div className="w-full self-end lg:w-72">
                    <TranslationSideCard
                        section="contact-settings"
                        recordId={settings?.id ? Number(settings.id) : undefined}
                        activeLanguageId={translation.activeLanguage?.id ?? null}
                        buildHref={translation.buildHref}
                        canTranslate={translation.canTranslate}
                        fields={[
                            { key: 'address', label: 'Address', value: address, type: 'textarea' },
                        ]}
                    />
                </div>
                <div className="order-first min-w-0">
                    <TranslationModeBanner translation={translation} label="Contact Information" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-4">
                    <Card className="shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold">Choose Your Editor</CardTitle>
                            <CardDescription className="text-xs">Select how you want to build your contact section.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button type="button" onClick={() => setEditorMode('static')} className={cn('flex items-center justify-center gap-2.5 rounded-xl border p-3.5 text-xs font-bold transition-all', editorMode === 'static' ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-xs ring-1 ring-blue-600/30' : 'border-slate-200 bg-background text-slate-600 hover:bg-slate-50')}>
                                    <Share2 className="h-4 w-4" /> Static (Information)
                                </button>
                                <button type="button" onClick={() => setEditorMode('dynamic')} className={cn('flex items-center justify-center gap-2.5 rounded-xl border p-3.5 text-xs font-bold transition-all', editorMode === 'dynamic' ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-xs ring-1 ring-blue-600/30' : 'border-slate-200 bg-background text-slate-600 hover:bg-slate-50')}>
                                    <Code2 className="h-4 w-4" /> Dynamic (Form)
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold">Enable / Disable Components</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {editorMode === 'static' && (
                                <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50/40">
                                    <div>
                                        <h4 className="font-bold text-xs text-foreground">Contact Details</h4>
                                        <p className="text-[11px] text-muted-foreground">Contact information is required and always visible.</p>
                                    </div>
                                    <Switch checked={enableContactDetails} onCheckedChange={setEnableContactDetails} />
                                </div>
                            )}
                            <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50/40">
                                <div>
                                    <h4 className="font-bold text-xs text-foreground">Social Links</h4>
                                    <p className="text-[11px] text-muted-foreground">Show selected social links.</p>
                                </div>
                                <Switch checked={enableSocialLinks} onCheckedChange={setEnableSocialLinks} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50/40">
                                <div>
                                    <h4 className="font-bold text-xs text-foreground">Google Map</h4>
                                    <p className="text-[11px] text-muted-foreground">Show map from vendor location.</p>
                                </div>
                                <Switch checked={enableGoogleMap} onCheckedChange={setEnableGoogleMap} />
                            </div>
                        </CardContent>
                    </Card>

                    {editorMode === 'static' && enableContactDetails && (
                        <Card className="shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold">Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className={cn('flex items-center justify-between p-2 rounded-lg bg-slate-50 border mb-2', sharedOnly)}>
                                    <span className="text-xs font-bold text-slate-700">Contact Mode</span>
                                    <div className="flex items-center gap-1 rounded-md bg-white border p-1">
                                        <button type="button" onClick={() => setContactMode('default')} className={cn('px-2.5 py-0.5 text-[11px] font-bold rounded', contactMode === 'default' ? 'bg-blue-600 text-white' : 'text-slate-600')}>Default</button>
                                        <button type="button" onClick={() => setContactMode('alternative')} className={cn('px-2.5 py-0.5 text-[11px] font-bold rounded', contactMode === 'alternative' ? 'bg-blue-600 text-white' : 'text-slate-600')}>Alternative</button>
                                    </div>
                                </div>
                                <div className={sharedOnly}>
                                    <BuilderCountedInput label="Mobile" value={mobile} onChange={setMobile} maxLength={20} />
                                </div>
                                <div className={sharedOnly}>
                                    <BuilderCountedInput label="Email" value={email} onChange={setEmail} maxLength={80} />
                                </div>
                                <BuilderCountedTextarea
                                    label="Address"
                                    maxLength={160}
                                    rows={2}
                                    {...bind('address', address, setAddress)}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {enableSocialLinks && (
                        <Card className="shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold">Social Links</CardTitle>
                                <CardDescription className="text-xs">Social links heading and icons.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <BuilderCountedInput label="Social Links Heading" value={socialHeading} onChange={setSocialHeading} maxLength={80} />
                                <div className="space-y-2 pt-2">
                                    <label className="text-xs font-bold text-slate-700">Select Social Networks</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {socialLinks.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50/50">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold", item.iconColor)}>{item.name.charAt(0)}</div>
                                                    <span className="text-xs font-bold text-slate-800">{item.name}</span>
                                                </div>
                                                <Switch checked={item.show} onCheckedChange={(val) => setSocialLinks(prev => prev.map(s => s.id === item.id ? { ...s, show: val } : s))} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {enableGoogleMap && (
                        <Card className="shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold">Google Map Settings</CardTitle>
                                <CardDescription className="text-xs">Map location coordinates.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <BuilderCountedInput label="Latitude" value={latitude} onChange={setLatitude} maxLength={30} lockInput />
                                    <BuilderCountedInput label="Longitude" value={longitude} onChange={setLongitude} maxLength={30} lockInput />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl border-slate-200">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-6">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <DialogTitle className="text-sm font-bold text-slate-900">
                                    Contact Us — Live Preview ({editorMode === 'static' ? 'Static Info' : 'Dynamic Form'})
                                </DialogTitle>
                            </div>
                            <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/40">
                                <button type="button" onClick={() => setPreviewDevice('desktop')} className={cn('flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold', previewDevice === 'desktop' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground')}>
                                    <Monitor className="h-3.5 w-3.5" /> Desktop
                                </button>
                                <button type="button" onClick={() => setPreviewDevice('mobile')} className={cn('flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold', previewDevice === 'mobile' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground')}>
                                    <Smartphone className="h-3.5 w-3.5" /> Mobile
                                </button>
                            </div>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            This is how your contact section will appear on the live website.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 bg-slate-50/50 rounded-xl overflow-hidden my-2">
                        <div className={cn('mx-auto rounded-xl border bg-background p-6 shadow-sm space-y-6 transition-all duration-300', previewDevice === 'mobile' ? 'max-w-[320px]' : 'w-full')}>
                            <div className="text-center space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">GET IN TOUCH</span>
                                <h3 className="text-xl font-extrabold tracking-tight text-slate-900">CONTACT US</h3>
                                <p className="text-xs text-slate-500">Have questions about our event management services? Reach out to us anytime.</p>
                            </div>

                            {editorMode === 'static' ? (
                                <div className="space-y-6">
                                    {enableContactDetails && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                                            <div className="p-3 rounded-lg border bg-slate-50/50 space-y-1">
                                                <Phone className="h-4 w-4 text-blue-600 mx-auto" />
                                                <p className="text-xs font-bold text-slate-800">Phone</p>
                                                <p className="text-[11px] text-slate-500">{mobile}</p>
                                            </div>
                                            <div className="p-3 rounded-lg border bg-slate-50/50 space-y-1">
                                                <Mail className="h-4 w-4 text-blue-600 mx-auto" />
                                                <p className="text-xs font-bold text-slate-800">Email</p>
                                                <p className="text-[11px] text-slate-500">{email}</p>
                                            </div>
                                            <div className="p-3 rounded-lg border bg-slate-50/50 space-y-1">
                                                <MapPin className="h-4 w-4 text-blue-600 mx-auto" />
                                                <p className="text-xs font-bold text-slate-800">Location</p>
                                                <p className="text-[11px] text-slate-500">{address}</p>
                                            </div>
                                        </div>
                                    )}
                                    {enableSocialLinks && (
                                        <div className="text-center space-y-2 pt-2 border-t">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{socialHeading}</span>
                                            <div className="flex items-center justify-center gap-2">
                                                {socialLinks.filter(s => s.show).map((item) => (
                                                    <div key={item.id} className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-xs cursor-pointer", item.iconColor)}>
                                                        {item.name.charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {enableGoogleMap && (
                                        <div className="relative h-36 w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                                            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                                                <div className="flex h-5 w-5 items-center justify-center rounded bg-white shadow-xs text-[10px] font-bold text-slate-700 cursor-pointer">+</div>
                                                <div className="flex h-5 w-5 items-center justify-center rounded bg-white shadow-xs text-[10px] font-bold text-slate-700 cursor-pointer">-</div>
                                            </div>
                                            <div className="absolute top-2 left-8 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-blue-600 shadow-xs border">Leaflet Map</div>
                                            <div className="h-3.5 w-3.5 rounded-full bg-rose-500 ring-4 ring-rose-200 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-700">Name *</Label>
                                            <Input readOnly placeholder="Enter your name" className="h-8 text-xs bg-slate-50" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-slate-700">Email *</Label>
                                            <Input readOnly placeholder="Enter your email" className="h-8 text-xs bg-slate-50" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-700">Category *</Label>
                                        <Select disabled>
                                            <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue placeholder="Select a Category" /></SelectTrigger>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-700">Message *</Label>
                                        <textarea readOnly rows={3} placeholder="Type your message here..." className="w-full rounded-md border border-input bg-slate-50 p-2 text-xs outline-none" />
                                    </div>
                                    <div className="flex justify-center pt-1">
                                        <Button size="sm" className="gap-2 bg-blue-600 text-white text-xs px-6">
                                            <Send className="h-3.5 w-3.5" /> Send Message
                                        </Button>
                                    </div>
                                    <p className="text-[9px] text-center text-slate-400">🔒 Your information is safe with us. We don't share your details with anyone.</p>
                                    {enableSocialLinks && (
                                        <div className="text-center space-y-2 pt-2 border-t">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">FOLLOW US</span>
                                            <div className="flex items-center justify-center gap-2">
                                                {socialLinks.filter(s => s.show).map((item) => (
                                                    <div key={item.id} className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-xs cursor-pointer", item.iconColor)}>
                                                        {item.name.charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {enableGoogleMap && (
                                        <div className="relative h-36 w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                                            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                                                <div className="flex h-5 w-5 items-center justify-center rounded bg-white shadow-xs text-[10px] font-bold text-slate-700 cursor-pointer">+</div>
                                                <div className="flex h-5 w-5 items-center justify-center rounded bg-white shadow-xs text-[10px] font-bold text-slate-700 cursor-pointer">-</div>
                                            </div>
                                            <div className="absolute top-2 left-8 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-blue-600 shadow-xs border">Leaflet Map</div>
                                            <div className="h-3.5 w-3.5 rounded-full bg-rose-500 ring-4 ring-rose-200 animate-pulse" />
                                        </div>
                                    )}
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
